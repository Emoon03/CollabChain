# CollabChain: Spotify Shortest Artist Path Finder

Find the shortest collaboration path between two artists using Spotify data and bidirectional BFS.

## Overview

CollabChain explores artist connections through collaboration history. Search for any two artists and discover how many "degrees of collaboration" separate them, with interactive graph visualization and detailed search analytics.

## Quick Start

### Prerequisites
- Node.js 16+
- Spotify Developer account

### Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3001` in your browser.

## Usage

1. **Search**: Enter two artist names in the search fields with autocomplete suggestions.
2. **View Results**: See the shortest path connecting the artists.
3. **Analyze**: Toggle between **Path graph** (shortest path only) and **Full explored graph** (all visited nodes/edges) to inspect the BFS exploration.
4. **Metrics**: Review analytics including graph density, node degree, bidirectional search balance, and frontier expansion layers.

## Building & Deployment

- Development: `npm run dev`
- Production build: `npm run build`
- Start production app: `npm start`

## API Endpoints

### Health Check
```
GET /api/health
```

### Find Artist Connection
```
POST /api/music/connections
Content-Type: application/json

{
  "sourceArtist": "Taylor Swift",
  "targetArtist": "Bon Iver",
  "maxDepth": 6,
  "maxAlbumsPerArtist": 15,
  "maxTracksPerAlbum": 20
}
```

**Response includes:**
- Shortest path (sequence of artists)
- Explored subgraph (all visited nodes/edges)
- Connection metadata
- Search analytics (density, balance score, frontier layers)

### Artist Search
```
GET /api/music/artists/search?q=<artist name>
```

Returns matching artists with Spotify data.

## Features

- **Bidirectional BFS**: Efficient pathfinding from both source and target simultaneously
- **Interactive Graph Visualization**: Cytoscape.js rendering with layout toggle
- **Search Analytics**: Metrics on graph structure and search behavior
- **Real-time Artist Autocomplete**: Type to search Spotify's artist database
- **Customizable Search Limits**: Control search depth and data fetched per artist

## Architecture

- **Backend**: Express.js + TypeScript with Spotify API integration
- **Frontend**: Vanilla JavaScript with Cytoscape.js for graph visualization
- **Algorithm**: Bidirectional BFS with early termination on path discovery
