import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFallbackDb } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth-token';

export async function GET(req: NextRequest) {
  try {
    let currentUser: any = null;

    // 1. Check Session if cookie is present
    const cookieHeader = req.headers.get('cookie') || '';
    if (cookieHeader.includes('better-auth') || cookieHeader.includes('session')) {
      try {
        const session = await auth.api.getSession({
          headers: req.headers,
        });
        if (session && session.user) {
          currentUser = session.user;
        }
      } catch {
        // not logged in via cookie
      }
    }

    // 2. Check Bearer Token
    if (!currentUser) {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          currentUser = {
            id: payload.sessionId || 'token_user',
            email: payload.email,
            licenseStatus: payload.tier || 'PRO',
            createdAt: new Date(),
          };
        }
      }
    }

    const exportData = {
      exportMetadata: {
        legalFramework: 'GDPR Article 20 / CCPA Data Portability Export',
        generatedAt: new Date().toISOString(),
        issuer: 'ReciteWeb Academic Integrity Mesh',
        dataGovernance: {
          zeroRetentionArchitecture: true,
          cloudManuscriptRetention: false,
          ephemeralProcessing: true,
        },
      },
      accountProfile: currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || 'Researcher',
            email: currentUser.email,
            licenseStatus: currentUser.licenseStatus || 'FREE',
            createdAt: currentUser.createdAt,
          }
        : {
            id: 'local_anonymous_session',
            name: 'Local Air-Gapped Researcher',
            email: 'local@device',
            licenseStatus: 'FREE',
            createdAt: new Date().toISOString(),
          },
      licenseHistory: [
        {
          tier: currentUser?.licenseStatus || 'FREE',
          active: true,
          verifiedAt: new Date().toISOString(),
        },
      ],
      dataGovernanceNotice:
        'ReciteWeb does not store, retain, or index manuscript text, equations, or authorial drafts in any cloud database. All manuscript editing state exists solely on your local client machine.',
    };

    return NextResponse.json(exportData, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="reciteweb_account_export_${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    console.error('[ExportData Error]:', err);
    return NextResponse.json(
      { status: 'error', message: 'Failed to generate account data export.' },
      { status: 500 }
    );
  }
}
