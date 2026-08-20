import { LicenseState } from '@/lib/store';
import nacl from 'tweetnacl';

// 32-byte mocked public key for Ed25519 verification
const RECITE_PUBLIC_KEY = new Uint8Array([
  177, 222, 114, 211, 48, 25, 12, 104, 
  11, 203, 111, 5, 233, 8, 14, 219, 
  93, 22, 149, 44, 250, 118, 55, 91, 
  105, 41, 74, 18, 100, 212, 153, 99
]);

function decodeBase64(base64: string): Uint8Array {
  if (typeof window !== 'undefined') {
    const binString = window.atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

export class LicenseManager {
  /**
   * Retrieves a persistent machine identifier.
   */
  static async getMachineId(): Promise<string> {
    if (typeof window !== 'undefined') {
      let machineId = localStorage.getItem('recite_machine_id');
      if (!machineId) {
        machineId = crypto.randomUUID();
        localStorage.setItem('recite_machine_id', machineId);
      }
      return machineId;
    }
    return 'UNKNOWN_MACHINE';
  }

  /**
   * Cryptographically verifies an offline license string using Ed25519.
   * Format expected: base64(payload)
   * 
   * Note: For this mock, we assume a specific test key bypasses the check,
   * otherwise it attempts actual verification.
   */
  static async verifyLicenseSignature(licenseString: string): Promise<boolean> {
    const trimmed = licenseString.trim();
    if (!trimmed) return false;

    // Developer / QA bypass for testing
    if (trimmed.startsWith('RECITE-DEV-')) {
      return true;
    }

    try {
      // In a real implementation, the license string would contain 
      // the message and the signature concatenated or structured.
      // Here we mock the parsing for demonstration.
      const parts = trimmed.split('.');
      if (parts.length !== 2) return false;
      
      const messageBytes = new TextEncoder().encode(parts[0]);
      const signatureBytes = decodeBase64(parts[1]);

      return nacl.sign.detached.verify(messageBytes, signatureBytes, RECITE_PUBLIC_KEY);
    } catch (e) {
      console.error('License signature verification failed:', e);
      return false;
    }
  }

  /**
   * Verifies the license key locally and returns the updated state.
   */
  static async verifyLicenseWithServer(key: string): Promise<LicenseState> {
    // Simulate slight processing delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (key.trim().toUpperCase() === 'EXPIRED-KEY') {
      return {
        key: key.trim(),
        status: 'EXPIRED',
        lastChecked: Date.now(),
      };
    }

    const isValid = await this.verifyLicenseSignature(key);

    if (!isValid) {
      throw new Error('Invalid or corrupted license signature.');
    }

    return {
      key: key.trim(),
      status: 'ACTIVE',
      lastChecked: Date.now(),
    };
  }

  /**
   * Checks the heartbeat to see if the offline grace period has elapsed.
   */
  static async checkHeartbeat(license: LicenseState): Promise<LicenseState | null> {
    if (!license || license.status === 'UNVERIFIED' || !license.key) {
      return null;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - license.lastChecked;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    if (timeSinceLastCheck > SEVEN_DAYS_MS) {
      return { ...license, status: 'UNVERIFIED' };
    }

    return null;
  }
}
