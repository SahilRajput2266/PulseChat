import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { initializeSocketIO } from '../realtime/socketManager';

describe('PulseChat API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let userToken: string;
  let userRefreshToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectDatabase();
    const app = createApp();
    server = http.createServer(app);
    initializeSocketIO(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}/api`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDatabase();
  });

  it('GET /api/health should return 200 OK', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.app).toBe('PulseChat');
  });

  it('POST /api/auth/signup should create a new user and return tokens', async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Engineer',
        email: 'alice.test@example.com',
        password: 'Password12345!'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.name).toBe('Alice Engineer');
    expect(body.user.email).toBe('alice.test@example.com');
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();

    userToken = body.accessToken;
    userRefreshToken = body.refreshToken;
    userId = body.user.id;
  });

  it('POST /api/auth/login should authenticate user with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.test@example.com',
        password: 'Password12345!'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe('alice.test@example.com');
    expect(body.accessToken).toBeDefined();
  });

  it('POST /api/auth/login should reject incorrect password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.test@example.com',
        password: 'WrongPassword!'
      })
    });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me should return current authenticated user', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.name).toBe('Alice Engineer');
  });

  it('GET /api/whatsapp/status should return disconnected initially', async () => {
    const res = await fetch(`${baseUrl}/whatsapp/status`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('disconnected');
  });

  it('POST /api/conversations should validate recipient phone and create conversation', async () => {
    const res = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        phone: '+14155552671',
        name: 'Bob Colleague'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.conversation.name).toBe('Bob Colleague');
    expect(body.conversation.phoneNumber).toBe('+14155552671');
    expect(body.conversation.jid).toBe('14155552671@s.whatsapp.net');
  });

  it('POST /api/conversations should reject invalid phone numbers', async () => {
    const res = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        phone: 'invalid-number'
      })
    });

    expect(res.status).toBe(400);
  });

  it('GET /api/conversations should list conversations for the authenticated user', async () => {
    const res = await fetch(`${baseUrl}/conversations`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations.length).toBeGreaterThanOrEqual(1);
    expect(body.conversations[0].name).toBe('Bob Colleague');
  });

  it('PUT /api/user/profile should update profile name and theme preference', async () => {
    const res = await fetch(`${baseUrl}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        name: 'Alice Updated',
        themePreference: 'light'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.name).toBe('Alice Updated');
    expect(body.user.themePreference).toBe('light');
  });

  it('POST /api/messages/send without active WhatsApp session should return friendly error', async () => {
    const res = await fetch(`${baseUrl}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        recipientPhone: '+14155552671',
        text: 'Hello from test!'
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('WhatsApp is not connected');
  });
});
