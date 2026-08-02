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
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
server.listen(PORT, async () => {
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
