'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth Client Instance
 * Exports React hooks and OAuth authentication methods
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
});

export const { signIn, signOut, useSession, getSession } = authClient;
