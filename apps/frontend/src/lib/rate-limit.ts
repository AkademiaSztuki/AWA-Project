/**
 * Simple in-memory rate limiter
 * For production, consider using Redis/Upstash for distributed rate limiting
 */

import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (cleared on serverless function restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP, userHash, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with success status and remaining requests
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000 // 1 minute default
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    });

    // Cleanup old entries periodically (every 100 requests)
    if (rateLimitStore.size > 1000) {
      const entriesToDelete: string[] = [];
      for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetAt) {
          entriesToDelete.push(key);
        }
      }
      entriesToDelete.forEach(key => rateLimitStore.delete(key));
    }

    return {
      success: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // If limit exceeded
  if (entry.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to request IP (may be undefined in serverless)
  return request.ip || 'unknown';
}
