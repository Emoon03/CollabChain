import { Request, Response, Router } from 'express';
import { findCollaborationPath, searchArtistsByQuery } from '../services/spotifyCollaborationService';

interface FindConnectionRequestBody {
  sourceArtist?: unknown;
  targetArtist?: unknown;
  maxDepth?: unknown;
  maxAlbumsPerArtist?: unknown;
  maxTracksPerAlbum?: unknown;
}

const router = Router();
const CONNECTION_SEARCH_TIMEOUT_MS = 30_000;
const CONNECTION_SEARCH_TIMEOUT_MESSAGE =
  'Search timed out. Try reducing depth/albums/tracks or use a different artist pair.';

router.get('/artists/search', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 2) {
      return res.json({
        items: [],
      });
    }

    const suggestions = await searchArtistsByQuery(query, 8);
    return res.json({
      items: suggestions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search artists';
    return res.status(500).json({
      error: 'Internal Server Error',
      message,
      statusCode: 500,
    });
  }
});

function parseOptionalInteger(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

router.post('/connections', async (req: Request, res: Response) => {
  try {
    const body = req.body as FindConnectionRequestBody;
    const sourceArtist = typeof body.sourceArtist === 'string' ? body.sourceArtist.trim() : '';
    const targetArtist = typeof body.targetArtist === 'string' ? body.targetArtist.trim() : '';

    if (!sourceArtist || !targetArtist) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'sourceArtist and targetArtist are required string fields',
        statusCode: 400,
      });
    }

    const maxDepth = parseOptionalInteger(body.maxDepth);
    const maxAlbumsPerArtist = parseOptionalInteger(body.maxAlbumsPerArtist);
    const maxTracksPerAlbum = parseOptionalInteger(body.maxTracksPerAlbum);

    if (body.maxDepth !== undefined && maxDepth === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'maxDepth must be an integer',
        statusCode: 400,
      });
    }

    if (body.maxAlbumsPerArtist !== undefined && maxAlbumsPerArtist === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'maxAlbumsPerArtist must be an integer',
        statusCode: 400,
      });
    }

    if (body.maxTracksPerAlbum !== undefined && maxTracksPerAlbum === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'maxTracksPerAlbum must be an integer',
        statusCode: 400,
      });
    }

    const path = await Promise.race([
      findCollaborationPath(sourceArtist, targetArtist, {
        maxDepth,
        maxAlbumsPerArtist,
        maxTracksPerAlbum,
      }),
      new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error(CONNECTION_SEARCH_TIMEOUT_MESSAGE));
        }, CONNECTION_SEARCH_TIMEOUT_MS);
      }),
    ]);

    if (!path) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No collaboration path found within search limits',
        statusCode: 404,
      });
    }

    return res.json(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to find collaboration path';
    const statusCode = message.startsWith('No Spotify artist found for "')
      ? 404
      : message.startsWith('Spotify API failed (429)')
        ? 429
      : message === CONNECTION_SEARCH_TIMEOUT_MESSAGE
        ? 504
        : 500;

    return res.status(statusCode).json({
      error:
        statusCode === 404
          ? 'Not Found'
          : statusCode === 429
            ? 'Too Many Requests'
            : statusCode === 504
              ? 'Gateway Timeout'
              : 'Internal Server Error',
      message,
      statusCode,
    });
  }
});

export default router;
