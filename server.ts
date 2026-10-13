import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logHandler from './api/log';
import logsHandler from './api/logs';
import askHandler from './api/ask';
import insightsHandler from './api/insights';
import omiWebhookHandler from './api/omi-webhook';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // API Routes
  app.post('/api/log', async (req, res) => {
    await logHandler(req, res);
  });

  app.get('/api/logs', async (req, res) => {
    await logsHandler(req, res);
  });

  app.post('/api/ask', async (req, res) => {
    await askHandler(req, res);
  });

  app.get('/api/insights', async (req, res) => {
    await insightsHandler(req, res);
  });

  app.all('/api/omi-webhook', async (req, res) => {
    await omiWebhookHandler(req, res);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'HabitMind API',
      configured: {
        lyzr: !!(process.env.LYZR_API_KEY && process.env.LYZR_AGENT_ID && process.env.LYZR_USER_ID),
        qdrant: !!process.env.QDRANT_URL,
      },
    });
  });

  if (!isProd) {
    // Create Vite server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Serve production static assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HabitMind server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
