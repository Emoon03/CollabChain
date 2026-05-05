"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const musicRoutes_1 = __importDefault(require("./routes/musicRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const STATIC_DIR = node_path_1.default.resolve(__dirname, '..', 'public');
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(STATIC_DIR));
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});
app.use('/api/music', musicRoutes_1.default);
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
