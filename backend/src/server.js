import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadRouter } from './routes/upload.js';
import { transcribeRouter } from './routes/transcribe.js';
import { renderRouter } from './routes/render.js';
import { silenceRouter } from './routes/silence.js';
import { exportRouter } from './routes/export.js';
import { templateRouter } from './routes/templates.js';
import { errorHandler } from './middleware/errorHandler.js';
import { db } from './utils/db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/storage', express.static(path.join(__dirname, '../storage')));

app.use('/api/upload', uploadRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/render-captions', renderRouter);
app.use('/api/remove-silence', silenceRouter);
app.use('/api/export', exportRouter);
app.use('/api/templates', templateRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  Glido.ai API running at http://localhost:${PORT}`);
    console.log(`  Storage: ./backend/storage/\n`);
  });
});
