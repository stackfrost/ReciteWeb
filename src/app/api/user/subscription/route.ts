import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFallbackDb } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Subscription & OAuth Entitlement API
 *
 * GET: Retrieves authenticated user subscription tier directly from Better-Auth OAuth session.
 * POST: Handles 1-click dev-mode tier toggling (FREE <-> PRO) for seamless local sandbox testing.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({
        authenticated: false,
        licenseStatus: 'FREE',
        planName: 'Free Starter Tier',
        features: {
          maxClaimsPerAudit: 10,
          unlimitedDragnet: false,
          piComplianceBriefings: false,
          airGappedExports: true,
        },
      });
    }

    const user = session.user as any;
    const licenseStatus = user.licenseStatus || 'FREE';
    const isPro = licenseStatus === 'PRO' || licenseStatus === 'ANNUAL_PRO' || licenseStatus === 'LAB_PASS';

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      licenseStatus,
      isPro,
      planName: isPro ? 'Researcher Pro' : 'Free Starter Tier',
      features: {
        maxClaimsPerAudit: isPro ? 500 : 10,
        unlimitedDragnet: isPro,
        piComplianceBriefings: isPro,
        airGappedExports: true,
      },
    });
  } catch (err: any) {
    console.error('[SubscriptionAPI] Error retrieving subscription status:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve subscription status', licenseStatus: 'FREE', isPro: false },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const isDev = process.env.NODE_ENV !== 'production' || req.headers.get('host')?.includes('localhost');

    // Dev sandbox mode: allows instant toggle between FREE and PRO for testing
    if (isDev) {
      const body = await req.json().catch(() => ({}));
      const requestedTier = body.tier === 'PRO' ? 'PRO' : 'FREE';

      if (session?.user) {
        const db = getFallbackDb();
        await db
          .update(schema.user)
          .set({ licenseStatus: requestedTier, updatedAt: new Date() })
          .where(eq(schema.user.id, session.user.id));
      }

      return NextResponse.json({
        status: 'success',
        devMode: true,
        licenseStatus: requestedTier,
        message: `Dev Sandbox: Account tier set to ${requestedTier}`,
      });
    }

    // Production mode: redirect to Dodo Payments checkout or billing portal
    return NextResponse.json({
      status: 'success',
      checkoutUrl: '/pricing',
    });
  } catch (err: any) {
    console.error('[SubscriptionAPI] Error updating subscription tier:', err);
    return NextResponse.json(
      { error: 'Failed to update subscription tier' },
      { status: 500 }
    );
  }
}
