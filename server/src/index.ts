import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocketIO } from './realtime/socketManager';
import { shutdownAllSessions, restoreSavedSessions } from './whatsapp/baileysManager';
import { logger } from './utils/logger';

// Prevent process crashes on transient library rejections
process.on('unhandledRejection', (reason) => {
  logger.warn({ reason }, 'Unhandled Promise Rejection caught at process level');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception caught at process level');
});

async function bootstrap() {
  try {
    // 1. Connect to MongoDB (with embedded fallback if no external URI)
    await connectDatabase();

    // 2. Initialize Express application
    const app = createApp();
    const server = http.createServer(app);

    // 3. Attach Socket.IO
    initializeSocketIO(server);

    // 4. Start HTTP Server
    server.listen(env.PORT, async () => {
      logger.info(`🚀 PulseChat Server listening on http://localhost:${env.PORT}`);
      logger.info(`📡 Socket.IO gateway ready with multi-tenant room isolation`);

      // 5. Restore previously active sessions
      await restoreSavedSessions();
    });

    // Graceful Shutdown Handler
    async function gracefulShutdown(signal: string) {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');

        try {
          await shutdownAllSessions();
          await disconnectDatabase();
          logger.info('Graceful shutdown completed successfully.');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force exit after 10s if hung
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err) {
    logger.fatal({ err }, 'Failed to start PulseChat server');
    process.exit(1);
  }
}

bootstrap();
