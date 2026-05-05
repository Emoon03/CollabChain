"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchArtistsByQuery = searchArtistsByQuery;
exports.findCollaborationPath = findCollaborationPath;
const SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';
const TOKEN_EXPIRY_BUFFER_MS = 60000;
const ARTIST_ALBUMS_PAGE_LIMIT = 10;
const ALBUM_TRACKS_PAGE_LIMIT = 50;
const SPOTIFY_REQUEST_MIN_INTERVAL_MS = 1000;
const SPOTIFY_RATE_LIMIT_MAX_ATTEMPTS = 4;
const SPOTIFY_RATE_LIMIT_BASE_DELAY_MS = 2000;
const SPOTIFY_RATE_LIMIT_MAX_DELAY_MS = 8000;
const DEFAULT_SEARCH_OPTIONS = {
    maxDepth: 6,
    maxAlbumsPerArtist: 30,
    maxTracksPerAlbum: 50,
};
let tokenCache = null;
let lastSpotifyApiRequestAtMs = 0;
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
function getRetryAfterMs(response) {
    const retryAfterHeader = response.headers.get('retry-after');
    if (!retryAfterHeader) {
        return null;
    }
    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
        return Math.ceil(retryAfterSeconds * 1000);
    }
    const retryAfterDateMs = Date.parse(retryAfterHeader);
    if (Number.isNaN(retryAfterDateMs)) {
        return null;
    }
    return Math.max(0, retryAfterDateMs - Date.now());
}
async function waitForRequestSlot() {
    const elapsedMs = Date.now() - lastSpotifyApiRequestAtMs;
    const jitterMs = Math.random() * 200;
    if (elapsedMs < SPOTIFY_REQUEST_MIN_INTERVAL_MS) {
        await sleep(SPOTIFY_REQUEST_MIN_INTERVAL_MS - elapsedMs + jitterMs);
    }
}
function getSpotifyCredentials() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Missing Spotify credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
    }
    return { clientId, clientSecret };
}
async function getSpotifyAccessToken() {
    if (tokenCache && Date.now() < tokenCache.expiresAtMs - TOKEN_EXPIRY_BUFFER_MS) {
        return tokenCache.accessToken;
    }
    const { clientId, clientSecret } = getSpotifyCredentials();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Spotify auth failed (${response.status}): ${body}`);
    }
    const tokenData = (await response.json());
    tokenCache = {
        accessToken: tokenData.access_token,
        expiresAtMs: Date.now() + tokenData.expires_in * 1000,
    };
    return tokenData.access_token;
}
function toSpotifyApiPath(urlOrPath) {
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
        const parsed = new URL(urlOrPath);
        const fullPath = `${parsed.pathname}${parsed.search}`;
        return fullPath.startsWith('/v1/') ? fullPath.slice(3) : fullPath;
    }
    return urlOrPath;
}
async function spotifyGet(pathOrUrl, accessToken) {
    const path = toSpotifyApiPath(pathOrUrl);
    for (let attempt = 0; attempt < SPOTIFY_RATE_LIMIT_MAX_ATTEMPTS; attempt += 1) {
        await waitForRequestSlot();
        const response = await fetch(`${SPOTIFY_API_BASE_URL}${path}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        lastSpotifyApiRequestAtMs = Date.now();
        if (response.ok) {
            return (await response.json());
        }
        const body = await response.text();
        if (response.status === 429 && attempt < SPOTIFY_RATE_LIMIT_MAX_ATTEMPTS - 1) {
            const retryAfterMs = getRetryAfterMs(response);
            const fallbackBackoffMs = SPOTIFY_RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt;
            const delayMs = Math.min(Math.max(retryAfterMs ?? 0, fallbackBackoffMs), SPOTIFY_RATE_LIMIT_MAX_DELAY_MS);
            await sleep(delayMs);
            continue;
        }
        throw new Error(`Spotify API failed (${response.status}) for ${path}: ${body}`);
    }
    throw new Error(`Spotify API failed (429) for ${path}: Too many requests`);
}
async function searchArtistByName(name, accessToken) {
    const query = new URLSearchParams({
        q: name,
        type: 'artist',
        limit: '10',
    });
    const data = await spotifyGet(`/search?${query.toString()}`, accessToken);
    if (data.artists.items.length === 0) {
        throw new Error(`No Spotify artist found for "${name}"`);
    }
    const exact = data.artists.items.find((artist) => artist.name.trim().toLowerCase() === name.trim().toLowerCase());
    return exact ?? data.artists.items[0];
}
async function searchArtistsByQuery(queryText, maxResults = 8) {
    const query = queryText.trim();
    if (!query) {
        return [];
    }
    const accessToken = await getSpotifyAccessToken();
    const queryParams = new URLSearchParams({
        q: query,
        type: 'artist',
        limit: String(Math.min(Math.max(maxResults, 1), 10)),
    });
    const data = await spotifyGet(`/search?${queryParams.toString()}`, accessToken);
    return data.artists.items.map((artist) => ({
        id: artist.id,
        name: artist.name,
    }));
}
async function getArtistAlbums(artistId, maxAlbums, accessToken) {
    const albumIds = new Set();
    const firstPageLimit = Math.min(maxAlbums, ARTIST_ALBUMS_PAGE_LIMIT);
    let nextPath = `/artists/${artistId}/albums?include_groups=album,single,appears_on,compilation&limit=${firstPageLimit}&offset=0`;
    while (nextPath && albumIds.size < maxAlbums) {
        const page = await spotifyGet(nextPath, accessToken);
        for (const album of page.items) {
            albumIds.add(album.id);
            if (albumIds.size >= maxAlbums) {
                break;
            }
        }
        nextPath = page.next;
    }
    return Array.from(albumIds);
}
async function getAlbumTracks(albumId, maxTracks, accessToken) {
    const tracks = [];
    const firstPageLimit = Math.min(maxTracks, ALBUM_TRACKS_PAGE_LIMIT);
    let nextPath = `/albums/${albumId}/tracks?limit=${firstPageLimit}&offset=0`;
    while (nextPath && tracks.length < maxTracks) {
        const page = await spotifyGet(nextPath, accessToken);
        for (const track of page.items) {
            tracks.push(track);
            if (tracks.length >= maxTracks) {
                break;
            }
        }
        nextPath = page.next;
    }
    return tracks;
}
async function getCollaborationsForArtist(artistId, options, accessToken, artistNameById) {
    const albums = await getArtistAlbums(artistId, options.maxAlbumsPerArtist, accessToken);
    const edgesByCollaborator = new Map();
    for (const albumId of albums) {
        const tracks = await getAlbumTracks(albumId, options.maxTracksPerAlbum, accessToken);
        for (const track of tracks) {
            if (!track.artists.some((artist) => artist.id === artistId) || track.artists.length < 2) {
                continue;
            }
            for (const artist of track.artists) {
                artistNameById.set(artist.id, artist.name);
                if (artist.id === artistId || edgesByCollaborator.has(artist.id)) {
                    continue;
                }
                edgesByCollaborator.set(artist.id, {
                    fromArtistId: artistId,
                    toArtistId: artist.id,
                    trackId: track.id,
                    trackName: track.name,
                });
            }
        }
    }
    return Array.from(edgesByCollaborator.values());
}
function sanitizeOptions(rawOptions) {
    const maxDepth = Number.isInteger(rawOptions?.maxDepth) ? Number(rawOptions?.maxDepth) : DEFAULT_SEARCH_OPTIONS.maxDepth;
    const maxAlbumsPerArtist = Number.isInteger(rawOptions?.maxAlbumsPerArtist)
        ? Number(rawOptions?.maxAlbumsPerArtist)
        : DEFAULT_SEARCH_OPTIONS.maxAlbumsPerArtist;
    const maxTracksPerAlbum = Number.isInteger(rawOptions?.maxTracksPerAlbum)
        ? Number(rawOptions?.maxTracksPerAlbum)
        : DEFAULT_SEARCH_OPTIONS.maxTracksPerAlbum;
    return {
        maxDepth: Math.min(Math.max(maxDepth, 1), 8),
        maxAlbumsPerArtist: Math.min(Math.max(maxAlbumsPerArtist, 1), 100),
        maxTracksPerAlbum: Math.min(Math.max(maxTracksPerAlbum, 1), 50),
    };
}
function buildPathResult(meetingArtistId, sourceArtist, targetArtist, parentsFromSource, parentsFromTarget, artistNameById) {
    const leftPath = [meetingArtistId];
    while (parentsFromSource.has(leftPath[0])) {
        const step = parentsFromSource.get(leftPath[0]);
        if (!step) {
            break;
        }
        leftPath.unshift(step.previousArtistId);
    }
    const rightPath = [];
    let current = meetingArtistId;
    while (parentsFromTarget.has(current)) {
        const step = parentsFromTarget.get(current);
        if (!step) {
            break;
        }
        rightPath.push(step.previousArtistId);
        current = step.previousArtistId;
    }
    const fullPath = [...leftPath, ...rightPath];
    const path = fullPath.map((id) => ({
        id,
        name: artistNameById.get(id) ?? id,
    }));
    const collaborations = [];
    for (let i = 0; i < fullPath.length - 1; i += 1) {
        const fromArtistId = fullPath[i];
        const toArtistId = fullPath[i + 1];
        const stepFromSource = parentsFromSource.get(toArtistId);
        if (stepFromSource && stepFromSource.previousArtistId === fromArtistId) {
            collaborations.push({
                fromArtist: { id: fromArtistId, name: artistNameById.get(fromArtistId) ?? fromArtistId },
                toArtist: { id: toArtistId, name: artistNameById.get(toArtistId) ?? toArtistId },
                track: {
                    id: stepFromSource.edge.trackId,
                    name: stepFromSource.edge.trackName,
                },
            });
            continue;
        }
        const stepFromTarget = parentsFromTarget.get(fromArtistId);
        if (stepFromTarget && stepFromTarget.previousArtistId === toArtistId) {
            collaborations.push({
                fromArtist: { id: fromArtistId, name: artistNameById.get(fromArtistId) ?? fromArtistId },
                toArtist: { id: toArtistId, name: artistNameById.get(toArtistId) ?? toArtistId },
                track: {
                    id: stepFromTarget.edge.trackId,
                    name: stepFromTarget.edge.trackName,
                },
            });
        }
    }
    return {
        source: { id: sourceArtist.id, name: sourceArtist.name },
        target: { id: targetArtist.id, name: targetArtist.name },
        distance: Math.max(0, fullPath.length - 1),
        path,
        collaborations,
    };
}
async function findCollaborationPath(sourceArtistName, targetArtistName, rawOptions) {
    const sourceName = sourceArtistName.trim();
    const targetName = targetArtistName.trim();
    if (!sourceName || !targetName) {
        throw new Error('Both sourceArtist and targetArtist are required.');
    }
    const options = sanitizeOptions(rawOptions);
    const accessToken = await getSpotifyAccessToken();
    const sourceArtist = await searchArtistByName(sourceName, accessToken);
    const targetArtist = await searchArtistByName(targetName, accessToken);
    const artistNameById = new Map([
        [sourceArtist.id, sourceArtist.name],
        [targetArtist.id, targetArtist.name],
    ]);
    if (sourceArtist.id === targetArtist.id) {
        return {
            source: { id: sourceArtist.id, name: sourceArtist.name },
            target: { id: targetArtist.id, name: targetArtist.name },
            distance: 0,
            path: [{ id: sourceArtist.id, name: sourceArtist.name }],
            collaborations: [],
        };
    }
    const cache = new Map();
    const getNeighbors = async (artistId) => {
        const cached = cache.get(artistId);
        if (cached) {
            return cached;
        }
        const edges = await getCollaborationsForArtist(artistId, options, accessToken, artistNameById);
        cache.set(artistId, edges);
        return edges;
    };
    let frontierFromSource = new Set([sourceArtist.id]);
    let frontierFromTarget = new Set([targetArtist.id]);
    const visitedFromSource = new Set([sourceArtist.id]);
    const visitedFromTarget = new Set([targetArtist.id]);
    const parentsFromSource = new Map();
    const parentsFromTarget = new Map();
    let depthFromSource = 0;
    let depthFromTarget = 0;
    while (frontierFromSource.size > 0 && frontierFromTarget.size > 0 && depthFromSource + depthFromTarget < options.maxDepth) {
        const expandFromSource = frontierFromSource.size <= frontierFromTarget.size;
        const currentFrontier = expandFromSource ? frontierFromSource : frontierFromTarget;
        const nextFrontier = new Set();
        for (const artistId of currentFrontier) {
            const neighbors = await getNeighbors(artistId);
            for (const edge of neighbors) {
                const neighborId = edge.toArtistId;
                const currentVisited = expandFromSource ? visitedFromSource : visitedFromTarget;
                if (currentVisited.has(neighborId)) {
                    continue;
                }
                currentVisited.add(neighborId);
                nextFrontier.add(neighborId);
                if (expandFromSource) {
                    parentsFromSource.set(neighborId, {
                        previousArtistId: artistId,
                        edge,
                    });
                }
                else {
                    parentsFromTarget.set(neighborId, {
                        previousArtistId: artistId,
                        edge: {
                            fromArtistId: neighborId,
                            toArtistId: artistId,
                            trackId: edge.trackId,
                            trackName: edge.trackName,
                        },
                    });
                }
                const oppositeVisited = expandFromSource ? visitedFromTarget : visitedFromSource;
                if (oppositeVisited.has(neighborId)) {
                    return buildPathResult(neighborId, sourceArtist, targetArtist, parentsFromSource, parentsFromTarget, artistNameById);
                }
            }
        }
        if (expandFromSource) {
            frontierFromSource = nextFrontier;
            depthFromSource += 1;
        }
        else {
            frontierFromTarget = nextFrontier;
            depthFromTarget += 1;
        }
    }
    return null;
}
