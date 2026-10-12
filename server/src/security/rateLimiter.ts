import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

// General API rate limiter
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoints rate limiter (brute force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// In-memory per-user cooldown & sliding window tracker for message sending
interface UserMessageTracker {
  lastSentAt: number;
  timestamps: number[];
}

const userTrackers = new Map<string, UserMessageTracker>();

// Cleanup stale trackers every 10 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [userId, tracker] of userTrackers.entries()) {
    tracker.timestamps = tracker.timestamps.filter(ts => now - ts < windowMs);
    if (tracker.timestamps.length === 0 && now - tracker.lastSentAt > 10 * 60 * 1000) {
      userTrackers.delete(userId);
    }
  }
}, 10 * 60 * 1000);

export function checkMessageRateLimit(userId: string): { allowed: boolean; waitSeconds?: number; reason?: string } {
  const now = Date.now();
  let tracker = userTrackers.get(userId);

  if (!tracker) {
    tracker = { lastSentAt: 0, timestamps: [] };
    userTrackers.set(userId, tracker);
  }

  // 1. Cooldown check between consecutive manual sends
  const cooldownMs = env.MESSAGE_COOLDOWN_SECONDS * 1000;
  const timeSinceLast = now - tracker.lastSentAt;
  if (tracker.lastSentAt > 0 && timeSinceLast < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - timeSinceLast) / 1000);
    return {
      allowed: false,
      waitSeconds,
      reason: `Anti-spam cooldown active. Please wait ${waitSeconds}s before sending another message.`
    };
  }

  // 2. Sliding window check (max messages per minute)
  const windowMs = 60 * 1000;
  tracker.timestamps = tracker.timestamps.filter(ts => now - ts < windowMs);

  if (tracker.timestamps.length >= env.MAX_MESSAGES_PER_MINUTE) {
    const oldest = tracker.timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return {
      allowed: false,
      waitSeconds,
      reason: `Message rate limit reached (${env.MAX_MESSAGES_PER_MINUTE} messages/min). Cooldown for ${waitSeconds}s.`
    };
  }

  return { allowed: true };
}

export function recordMessageSent(userId: string): void {
  const now = Date.now();
  let tracker = userTrackers.get(userId);
  if (!tracker) {
    tracker = { lastSentAt: now, timestamps: [now] };
    userTrackers.set(userId, tracker);
  } else {
    tracker.lastSentAt = now;
    tracker.timestamps.push(now);
  }
}
