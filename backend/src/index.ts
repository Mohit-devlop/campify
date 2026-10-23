import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { prisma } from './prisma/client';
import apiRouter from './routes/api.routes';
import { initSocketServer } from './services/socket.service';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Security configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploads static assets
app.use('/uploads', express.static(uploadsDir));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global Rate Limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Root status and welcome endpoint
app.get('/', async (req, res) => {
  let dbStatus = 'CONNECTED';
  let dbError = '';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = 'DISCONNECTED';
    dbError = err?.message || String(err);
    console.error('[DB Check Error]:', dbError);
  }

  if (req.accepts('html')) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Campify Backend API</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080d1a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #111a2e; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 20px; padding: 40px; max-width: 540px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); text-align: center; }
            h1 { color: #38bdf8; margin: 0 0 12px 0; font-size: 26px; }
            p { color: #94a3b8; line-height: 1.6; font-size: 15px; margin: 8px 0; }
            .badge-container { margin: 18px 0; }
            .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; background: #064e3b; color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
            .badge.err { background: #7f1d1d; color: #f87171; border-color: rgba(248, 113, 113, 0.3); }
            .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; }
            .badge.err .badge-dot { background: #f87171; }
            .links { margin-top: 26px; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
            a { color: #38bdf8; text-decoration: none; padding: 10px 18px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; font-size: 14px; font-weight: 500; transition: all 0.2s; }
            a:hover { background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🚀 Campify Backend API</h1>
            <p>Your backend server is successfully deployed and running!</p>
            <div class="badge-container">
              <span class="badge ${dbStatus === 'CONNECTED' ? '' : 'err'}">
                <span class="badge-dot"></span>
                Database: ${dbStatus}
              </span>
            </div>
            ${
              dbStatus === 'DISCONNECTED'
                ? `
              <div style="margin: 16px 0; padding: 14px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; font-size: 13px; color: #fca5a5; text-align: left;">
                <div style="font-weight: 600; margin-bottom: 6px; color: #f87171;">⚠️ Connection Notice:</div>
                <div style="font-family: monospace; font-size: 11px; max-height: 80px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; word-break: break-all;">
                  ${dbError ? dbError.slice(0, 300) : 'DATABASE_URL environment variable is missing.'}
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #cbd5e1;">
                  💡 <b>Fix:</b> Go to your <b>Render Dashboard</b> ➔ Service ➔ <b>Environment</b> tab ➔ Add <code>DATABASE_URL</code> (without quotes).
                </div>
              </div>
            `
                : ''
            }
            <p style="font-size: 13px; color: #64748b;">Connect your Next.js frontend by setting <code>NEXT_PUBLIC_API_URL</code> to this URL + <code>/api</code>.</p>
            <div class="links">
              <a href="/health">Health Endpoint</a>
              <a href="/api/posts/feed">Test Posts Feed</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  return res.status(200).json({
    name: 'Campify Backend API',
    status: 'ONLINE',
    database: dbStatus,
    error: dbError || undefined,
    health: '/health',
    api: '/api',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'OK', database: 'CONNECTED' });
  } catch (error) {
    return res.status(500).json({ status: 'DEGRADED', database: 'DISCONNECTED', error: String(error) });
  }
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize Socket.io Server
initSocketServer(server);

// Start server
server.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`\n==========================================`);
  console.log(`  Campify Backend Server Running  `);
  console.log(`  Port: ${PORT}                      `);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==========================================\n`);
  
  try {
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL database via Prisma ORM.');
  } catch (error) {
    console.error('Failed to connect to database during startup:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Http server closed.');
    process.exit(0);
  });
});
