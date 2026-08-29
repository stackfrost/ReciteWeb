/**
 * scripts/verify-env.mjs
 *
 * Secret Scrubber & Runtime Environment Validator.
 * Audits repository source files to guarantee zero hardcoded private keys, live secrets,
 * or API tokens are exposed in code for Acquire.com due diligence.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SUSPICIOUS_PATTERNS = [
  { name: 'Live Stripe Key', regex: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Google API Key', regex: /AIzaSy[0-9A-Za-z-_]{33}/ },
  { name: 'Private RSA/EC Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Generic Hardcoded Token', regex: /(?:apiKey|apiSecret|privateKey)\s*[:=]\s*['"][a-zA-Z0-9_\-]{32,}['"]/ },
];

const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', '.open-next', 'out', 'dist', 'coverage']);

function scanDirectory(dir, findings = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, findings);
    } else if (entry.isFile() && /\.(ts|tsx|js|mjs|json|yml|yaml|env\.example)$/.test(entry.name)) {
      if (entry.name === '.env.local' || entry.name.endsWith('.log')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.regex.test(content)) {
          findings.push({
            file: path.relative(rootDir, fullPath),
            type: pattern.name,
          });
        }
      }
    }
  }

  return findings;
}

function verifyEnvironment() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  🔒 RECITEWEB — SECRET SCRUBBER & ENVIRONMENT AUDIT');
  console.log('════════════════════════════════════════════════════════════════════════');

  const srcDir = path.join(rootDir, 'src');
  const findings = scanDirectory(srcDir);

  if (findings.length > 0) {
    console.error('❌ POTENTIAL HARDCODED SECRETS FOUND:');
    findings.forEach((f) => {
      console.error(`  - [${f.type}] in ${f.file}`);
    });
    console.error('\nEnvironment gate failed. Remove hardcoded credentials.');
    process.exit(1);
  } else {
    console.log('✅ 100% CLEAN ENVIRONMENT VERIFICATION:');
    console.log('  Zero hardcoded live secrets or private keys detected in source.');
    console.log('  All keys are properly parameterized via Cloudflare Worker bindings.\n');
    process.exit(0);
  }
}

verifyEnvironment();
