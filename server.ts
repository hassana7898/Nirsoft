import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initDb } from './src/db/index.ts';
import { runDevelopmentSeed } from './src/server/seed/seed.ts';
import { requestIdMiddleware } from './src/server/middleware/requestId.ts';
import { authenticate } from './src/server/middleware/auth.ts';
import { errorHandler } from './src/server/middleware/errorHandler.ts';

import healthRouter from './src/server/routes/health.ts';
import authRouter from './src/server/routes/auth.ts';
import systemRouter from './src/server/routes/system.ts';
import catalogRouter from './src/server/routes/catalog.ts';
import farmingRouter from './src/server/routes/farming.ts';
import ordersRouter from './src/server/routes/orders.ts';
import inventoryRouter from './src/server/routes/inventory.ts';
import productionRouter from './src/server/routes/production.ts';
import logisticsRouter from './src/server/routes/logistics.ts';
import reportsRouter from './src/server/routes/reports.ts';
import migrationRouter from './src/server/routes/migration.ts';
import aiRouter from './src/server/routes/ai.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPort = (): number => {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  if (process.env.DEFAULT_APP_PORT) {
    return parseInt(process.env.DEFAULT_APP_PORT, 10);
  }
  if (process.env.APP_PORT) {
    return parseInt(process.env.APP_PORT, 10);
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    return parseInt(process.env.PORT, 10);
  }
  return 3000;
};

const PORT = getPort();
const app = express();

// 1. Core Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite inline scripts and HMR in preview
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(authenticate);

// 2. API v1 Domain Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/system', systemRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/farming', farmingRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/production', productionRouter);
app.use('/api/v1/logistics', logisticsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/migration', migrationRouter);
app.use('/api/v1/ai', aiRouter);

// Legacy health aliases for standard container monitoring
app.get('/health', (req, res) => res.redirect('/api/v1/health'));
app.get('/ready', (req, res) => res.redirect('/api/v1/ready'));

// 3. Centralized API Error Handler
app.use(errorHandler);

// 4. Vite Dev or Production Static Serving
async function startServer() {
  try {
    // Initialize PostgreSQL engine & schema
    await initDb();
    console.log('[NIRWARE NEXT] PostgreSQL schema & tables initialized successfully.');

    // Run safe development seed
    await runDevelopmentSeed();
    console.log('[NIRWARE NEXT] Development seed data verified.');

    if (process.env.NODE_ENV === 'production') {
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[NIRWARE NEXT] Application server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[NIRWARE NEXT] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
