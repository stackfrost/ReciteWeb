import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '@/db/schema';
import { getFallbackDb } from '@/db';

/**
 * Better Auth Server Configuration
 * - Strictly OAuth-Only (Google, Microsoft, GitHub)
 * - emailAndPassword explicitly disabled
 * - Drizzle ORM SQLite / Cloudflare D1 adapter
 * - Custom SaaS user fields: licenseStatus, isBanned
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || 'citeassist_dev_super_secret_jwt_auth_key_2026_d1',
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  database: drizzleAdapter(getFallbackDb(), {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'google_dev_placeholder_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google_dev_placeholder_client_secret',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || 'github_dev_placeholder_client_id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'github_dev_placeholder_client_secret',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || 'microsoft_dev_placeholder_client_id',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'microsoft_dev_placeholder_client_secret',
    },
  },
  user: {
    additionalFields: {
      licenseStatus: {
        type: 'string',
        required: false,
        defaultValue: 'FREE',
        input: false,
      },
      isBanned: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
});
