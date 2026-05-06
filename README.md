# Spotify Artist Graph API

Find collaboration connections between two artists using Spotify data.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
3. Install dependencies:
   - `npm install`

## Run

- Development: `npm run dev`
- Build: `npm run build`
- Start built app: `npm start`

## Web UI

- Open `http://localhost:3001` in your browser.
- Enter source and target artist names (with dropdown suggestions), then click **Find connection**.
- In graph visualization, switch between **Path graph** and **Full explored graph** to inspect BFS exploration.
- Results now include graph analytics (explored nodes/edges, graph density, average node degree, and BFS exploration depth/layers).

## Endpoints

- `GET /api/health`
- `POST /api/music/connections`
- `GET /api/music/artists/search?q=<artist name>`

Example request body:

```json
{
  "sourceArtist": "Taylor Swift",
  "targetArtist": "Bon Iver",
  "maxDepth": 6,
  "maxAlbumsPerArtist": 30,
  "maxTracksPerAlbum": 50
}
```
