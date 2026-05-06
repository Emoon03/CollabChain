# CollabChain: Spotify Shortest Artist Path Finder

Find the shortest collaboration path between two artists using Spotify data and bidirectional BFS.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open <http://localhost:3001>.

## Main Features

- Shortest-path search between two artists
- Autocomplete artist search
- Graph visualization toggle (**Path graph** / **Full explored graph**)
- Analytics (graph density, average node degree, nodes/edges explored, frontier layers, bidirectional balance)

## API Endpoints

- `GET /api/health`
- `POST /api/music/connections`
- `GET /api/music/artists/search?q=<artist name>`

## Full Documentation

For complete setup instructions, feature walkthrough, and screenshots, see **`user-manual.md`**.
