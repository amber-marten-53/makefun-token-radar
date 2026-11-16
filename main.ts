/**
 * Token Radar Value Formula:
 * V = base_liquidity * momentumFactor * breadthFactor * ageDiscount
 * where momentumFactor = 1 + clamp(change_7d / 100, -0.5, 2.0)
 * breadthFactor = 1 + 0.1 * chains.length + (category === 'DeFi' ? 0.2 : 0.0)
 * ageDiscount = max(0.5, 1 - 0.05 * ageYears)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';

// Argument parsing
const args = process.argv.slice(2);
let inputPath = '/input/snapshot.json';
let outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) {
    inputPath = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputDir = args[i + 1];
    i++;
  }
}

// Snapshot loading
if (!fs.existsSync(inputPath)) {
  console.error(`Error: input snapshot not found at ${inputPath}`);
  process.exit(1);
}

const rawSnapshot = fs.readFileSync(inputPath, 'utf8');
const snapshot = JSON.parse(rawSnapshot);

// Factor helper functions
function ageYears(listed_at: string | number, as_of: string | number): number {
  const listed = typeof listed_at === 'string' ? new Date(listed_at).getTime() : listed_at;
  const now = typeof as_of === 'string' ? new Date(as_of).getTime() : as_of;
  const diffMs = now - listed;
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

function momentumFactor(change_7d: number): number {
  const normalized = change_7d / 100;
  const clamped = Math.max(-0.5, Math.min(2.0, normalized));
  return 1 + clamped;
}

function breadthFactor(chains: string[] = [], category: string = ''): number {
  let factor = 1 + 0.1 * (Array.isArray(chains) ? chains.length : 0);
  if (category && category.toLowerCase() === 'defi') {
    factor += 0.2;
  }
  return factor;
}

function impliedValue(protocol: any, asOf: string | number): number {
  const tvl = Number(protocol.tvl_usd) || 0;
  const change7d = Number(protocol.change_7d) || 0;
  const chains = protocol.chains || [];
  const category = protocol.category || '';
  const listedAt = protocol.listed_at || asOf;
  const aYears = ageYears(listedAt, asOf);
  const mom = momentumFactor(change7d);
  const breadth = breadthFactor(chains, category);
  const ageDisc = Math.max(0.5, 1 - 0.05 * aYears);

  let baseMult = 1.0;
  const hasMcap = protocol.mcap_usd !== undefined && protocol.mcap_usd !== null && !isNaN(Number(protocol.mcap_usd));
  
  if (!hasMcap) {
    baseMult = 3.5;
  } else {
    baseMult = 0.2;
  }

  return tvl * baseMult * mom * breadth * ageDisc;
}

// __NEXT_CHUNK__
