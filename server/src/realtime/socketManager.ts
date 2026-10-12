import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../security/authMiddleware';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = verifyAccessToken(token);
      (socket as any).userId = decoded.userId;
      (socket as any).userEmail = decoded.email;
      next();
    } catch (err) {
      logger.warn({ err }, 'Socket connection authentication failed');
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userRoom = `user:${userId}`;

    // Strictly join ONLY the authenticated user's isolated room
    socket.join(userRoom);
    logger.info({ userId, socketId: socket.id }, 'Socket client connected and joined user room');

    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'Socket client disconnected');
    });

    // Explicitly disallow arbitrary room joining from frontend
    socket.on('join_room', () => {
      socket.emit('error', { message: 'Unauthorized room manipulation is blocked.' });
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO is not initialized yet');
  }
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitWhatsAppStatus(userId: string, data: {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  phoneNumber?: string;
  pushName?: string;
  jid?: string;
  error?: string;
}): void {
  emitToUser(userId, 'whatsapp:status', data);
}

export function emitWhatsAppQR(userId: string, data: { qrCode: string; expiresAt?: string }): void {
  emitToUser(userId, 'whatsapp:qr', data);
}

export function emitNewMessage(userId: string, data: unknown): void {
  emitToUser(userId, 'message:new', data);
}

export function emitMessageUpdate(userId: string, data: unknown): void {
  emitToUser(userId, 'message:update', data);
}

export function emitConversationUpdate(userId: string, data: unknown): void {
  emitToUser(userId, 'conversation:update', data);
}
