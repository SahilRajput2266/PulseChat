import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { generalApiLimiter } from './security/rateLimiter';
import { authRoutes } from './routes/authRoutes';
import { whatsappRoutes } from './routes/whatsappRoutes';
import { conversationRoutes } from './routes/conversationRoutes';
import { messageRoutes } from './routes/messageRoutes';
import { userRoutes } from './routes/userRoutes';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // Basic security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows QR base64 data URLs
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // General rate limit
  app.use('/api', generalApiLimiter);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'PulseChat',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    });
  });

  // Mount API route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/whatsapp', whatsappRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/user', userRoutes);

  // Serve static frontend from client/dist if available
  const candidatePaths = [
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(__dirname, '../../client/dist')
  ];
  const clientDistPath = candidatePaths.find((p) => fs.existsSync(p));
  if (clientDistPath) {
    app.use(express.static(clientDistPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // 404 Handler
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
  });

  // Centralized Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err, path: req.path }, 'Unhandled API error');
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error occurred.'
    });
  });

  return app;
}
