import { describe, it, expect } from 'vitest';
import * as schema from '@/db/schema';
import { auth } from '@/lib/auth';

describe('Phase 1 Auth & Drizzle Schema Specification', () => {
  it('defines the core Better Auth tables targeting SQLite / D1', () => {
    expect(schema.user).toBeDefined();
    expect(schema.session).toBeDefined();
    expect(schema.account).toBeDefined();
    expect(schema.verification).toBeDefined();
  });

  it('includes required user table appends: licenseStatus and isBanned', () => {
    expect(schema.user.licenseStatus).toBeDefined();
    expect(schema.user.isBanned).toBeDefined();
  });

  it('defines the SaaS telemetry and business tables', () => {
    expect(schema.licenseKeys).toBeDefined();
    expect(schema.auditTelemetry).toBeDefined();
    expect(schema.citationCache).toBeDefined();

    // Verify license_keys columns
    expect(schema.licenseKeys.key).toBeDefined();
    expect(schema.licenseKeys.tier).toBeDefined();
    expect(schema.licenseKeys.status).toBeDefined();
    expect(schema.licenseKeys.expiresAt).toBeDefined();

    // Verify audit_telemetry columns
    expect(schema.auditTelemetry.action).toBeDefined();
    expect(schema.auditTelemetry.creditsUsed).toBeDefined();
    expect(schema.auditTelemetry.timestamp).toBeDefined();

    // Verify citation_cache columns
    expect(schema.citationCache.claimHash).toBeDefined();
    expect(schema.citationCache.verifiedPayload).toBeDefined();
  });

  it('enforces OAuth-only authentication with emailAndPassword disabled', () => {
    // Better Auth options verification
    expect(auth.options.emailAndPassword?.enabled).toBe(false);
    expect(auth.options.socialProviders?.google).toBeDefined();
    expect(auth.options.socialProviders?.github).toBeDefined();
    expect(auth.options.socialProviders?.microsoft).toBeDefined();
  });

  it('exposes additional user fields in Better Auth options', () => {
    const additionalFields = auth.options.user?.additionalFields;
    expect(additionalFields).toBeDefined();
    expect(additionalFields?.licenseStatus).toBeDefined();
    expect(additionalFields?.licenseStatus?.defaultValue).toBe('FREE');
    expect(additionalFields?.isBanned).toBeDefined();
    expect(additionalFields?.isBanned?.defaultValue).toBe(false);
  });
});
