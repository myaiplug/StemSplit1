/**
 * License Validation API Route
 * Handles server-side license verification
 * 
 * POST /api/license/validate
 * Request: { license_key: string }
 * Response: { isValid: boolean, tier: string, expiresAt?: string, features?: string[], error?: string }
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Mock license database - replace with real database in production
 */
const LICENSE_DATABASE: Map<
  string,
  {
    tier: 'free' | 'pro' | 'enterprise';
    email: string;
    expiresAt: string;
    createdAt: string;
    active: boolean;
  }
> = new Map([
  [
    'STEM-TEST-1234-5678-9ABC',
    {
      tier: 'pro',
      email: 'test@example.com',
      expiresAt: '2027-12-31T23:59:59Z',
      createdAt: '2024-01-01T00:00:00Z',
      active: true,
    },
  ],
  [
    'STEM-DEMO-0000-0000-DEMO',
    {
      tier: 'free',
      email: 'demo@example.com',
      expiresAt: '2026-12-31T23:59:59Z',
      createdAt: '2025-01-01T00:00:00Z',
      active: true,
    },
  ],
]);

/**
 * Feature mapping by tier
 */
const TIER_FEATURES: Record<'free' | 'pro' | 'enterprise', string[]> = {
  free: [
    'Basic stem separation',
    'Standard quality',
    'Single file processing',
  ],
  pro: [
    'All Free features',
    'Batch processing (up to 10 files)',
    'HD quality output',
    'Priority support',
    'Cloud storage (1GB)',
  ],
  enterprise: [
    'All Pro features',
    'Unlimited batch processing',
    'Premium quality output',
    'Dedicated support',
    'Cloud storage (100GB)',
    'API access',
    'Custom models',
  ],
};

/**
 * Rate limiting helper
 */
const validateAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = validateAttempts.get(ip);

  if (!attempt || now > attempt.resetTime) {
    validateAttempts.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (attempt.count >= 5) {
    return false; // Max 5 attempts per minute
  }

  attempt.count++;
  return true;
}

/**
 * Main validation handler
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          isValid: false,
          error: 'Too many validation attempts. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Parse request
    const body = await request.json();
    const { license_key } = body;

    if (!license_key || typeof license_key !== 'string') {
      return NextResponse.json(
        {
          isValid: false,
          error: 'Invalid license key format',
        },
        { status: 400 }
      );
    }

    // Normalize and validate format
    const normalizedKey = license_key.trim().toUpperCase();

    // IMPORTANT: In production, validate signature and expiration
    // against a real database with proper encryption
    if (!normalizedKey.startsWith('STEM-') || normalizedKey.length !== 24) {
      return NextResponse.json({
        isValid: false,
        error: 'Invalid license key format. Expected: STEM-XXXX-XXXX-XXXX-XXXX',
      });
    }

    // Lookup in database (mock)
    const licenseData = LICENSE_DATABASE.get(normalizedKey);

    if (!licenseData) {
      // Log failed validation attempt
      console.warn(`[License] Invalid key attempted: ${normalizedKey} from ${ip}`);

      return NextResponse.json({
        isValid: false,
        error: 'License key not found. Please check and try again.',
      });
    }

    // Check if license is active
    if (!licenseData.active) {
      return NextResponse.json({
        isValid: false,
        error: 'This license has been deactivated.',
      });
    }

    // Check expiration
    const expiresAt = new Date(licenseData.expiresAt);
    const now = new Date();

    if (now > expiresAt) {
      return NextResponse.json({
        isValid: false,
        error:
          'License has expired. Please renew your subscription to continue using premium features.',
      });
    }

    // Get features for this tier
    const features = TIER_FEATURES[licenseData.tier];

    // Log successful validation
    console.log(`[License] Valid: ${normalizedKey} (${licenseData.tier}) for ${licenseData.email}`);

    // Return success response
    return NextResponse.json({
      isValid: true,
      tier: licenseData.tier,
      email: licenseData.email,
      expiresAt: licenseData.expiresAt,
      features,
      daysRemaining: Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    });
  } catch (error) {
    console.error('[License] Validation error:', error);

    return NextResponse.json(
      {
        isValid: false,
        error:
          'An error occurred during license validation. Please try again later.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check license status (with key from query)
 * Security: Only for display purposes, verify using POST
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Use POST method for license validation',
    },
    { status: 405 }
  );
}
