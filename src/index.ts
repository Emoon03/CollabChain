import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import path from 'node:path';
import musicRoutes from './routes/musicRoutes';

const app = express();
const PORT = process.env.PORT || 3001;
const STATIC_DIR = path.resolve(__dirname, '..', 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(STATIC_DIR));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/music', musicRoutes);

app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    statusCode: 404,
  });
});

app.listen(PORT, () => {
  console.log(`Spotify Artist Graph API running on http://localhost:${PORT}`);
  console.log(`UI available at http://localhost:${PORT}`);
  console.log('POST /api/music/connections');
  console.log('GET /api/health');
});
