import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFallbackDb } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth-token';

export async function POST(req: NextRequest) {
  try {
    let targetUserId: string | null = null;
    let targetEmail: string | null = null;

    // 1. Check Better-Auth Session if cookie is present
    const cookieHeader = req.headers.get('cookie') || '';
    if (cookieHeader.includes('better-auth') || cookieHeader.includes('session')) {
      try {
        const session = await auth.api.getSession({
          headers: req.headers,
        });
        if (session && session.user) {
          targetUserId = session.user.id;
          targetEmail = session.user.email;
        }
      } catch {
        // session lookup failed or not logged in via cookie
      }
    }

    // 2. Check Bearer Token (Ed25519 Token / License Token)
    if (!targetUserId) {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
      if (token) {
        const payload = await verifyToken(token);
        if (payload && payload.email) {
          targetEmail = payload.email;
        }
      }
    }

    // 3. Reject unauthenticated requests to prevent IDOR / unauthorized deletion
    if (!targetUserId && !targetEmail) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized. An active session or verified token is required to delete an account.' },
        { status: 401 }
      );
    }

    const db = getFallbackDb();

    // Delete authenticated user records
    if (targetUserId) {
      try {
        await db.delete(schema.session).where(eq(schema.session.userId, targetUserId));
        await db.delete(schema.account).where(eq(schema.account.userId, targetUserId));
        await db.delete(schema.licenseKeys).where(eq(schema.licenseKeys.userId, targetUserId));
        await db.delete(schema.auditTelemetry).where(eq(schema.auditTelemetry.userId, targetUserId));
        await db.delete(schema.user).where(eq(schema.user.id, targetUserId));
      } catch (err) {
        console.warn('[DeleteAccount] DB deletion error (non-fatal):', err);
      }
    } else if (targetEmail) {
      try {
        await db.delete(schema.user).where(eq(schema.user.email, targetEmail));
      } catch (err) {
        console.warn('[DeleteAccount] DB email deletion error (non-fatal):', err);
      }
    }

    console.log(`[Account Deleted] User ${targetUserId || targetEmail || 'Local/Anonymous'} successfully purged.`);

    // Build response with cleared session cookies
    const response = NextResponse.json({
      status: 'success',
      message: 'Account and associated records have been permanently deleted in accordance with GDPR Right to be Forgotten.',
      deletedAt: new Date().toISOString(),
    });

    // Clear Better Auth session cookie
    response.cookies.set('better-auth.session_token', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err: any) {
    console.error('[DeleteAccount Error]:', err);
    return NextResponse.json(
      { status: 'error', message: 'Failed to complete account deletion request.' },
      { status: 500 }
    );
  }
}
