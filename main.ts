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
function farmSteps(protocol: any): string[] {
  const name = protocol.name || 'Protocol';
  const category = (protocol.category || '').toLowerCase();
  const chains = Array.isArray(protocol.chains) && protocol.chains.length > 0 ? protocol.chains : ['Ethereum'];
  const chainList = chains.join(', ');

  let templates: string[] = [];

  if (category.includes('lending') || category.includes('cdp') || category.includes('collateral')) {
    templates = [
      `Deposit USDC into ${name} on ${chainList} to supply liquidity and earn lending yield. Est cost: $12 gas, $200 capital. Cadence: weekly.`,
      `Borrow against collateral on ${name} across ${chainList} to optimize capital efficiency. Est cost: $15 gas, $500 capital. Cadence: daily.`,
      `Monitor health factor on ${name} (${chainList}) and rebalance positions if volatility spikes. Est cost: $8 gas, $0 capital. Cadence: daily.`,
      `Claim staking rewards and governance emissions from ${name} on ${chainList}. Est cost: $5 gas, $0 capital. Cadence: weekly.`
    ];
  } else if (category.includes('dex') || category.includes('liquidity') || category.includes('amm')) {
    templates = [
      `Provide token pairs into liquidity pools on ${name} on ${chainList} to earn trading fee share. Est cost: $14 gas, $300 capital. Cadence: weekly.`,
      `Stake LP tokens in ${name} farms across ${chainList} for enhanced yield incentives. Est cost: $10 gas, $150 capital. Cadence: weekly.`,
      `Harvest trading fees and reward tokens from ${name} on ${chainList}. Est cost: $6 gas, $0 capital. Cadence: weekly.`,
      `Rebalance concentrated liquidity ranges on ${name} (${chainList}) to avoid impermanent loss. Est cost: $18 gas, $400 capital. Cadence: daily.`
    ];
  } else if (category.includes('liquid staking') || category.includes('restaking') || category.includes('staking')) {
    templates = [
      `Stake native assets for liquid staking derivatives via ${name} on ${chainList}. Est cost: $10 gas, $250 capital. Cadence: weekly.`,
      `Restake liquid tokens through ${name} across ${chainList} to secure active validation services. Est cost: $16 gas, $300 capital. Cadence: weekly.`,
      `Compound staking rewards and restaking points on ${name} (${chainList}). Est cost: $7 gas, $0 capital. Cadence: weekly.`,
      `Verify validator performance and withdrawal queue status on ${name} (${chainList}). Est cost: $4 gas, $0 capital. Cadence: daily.`
    ];
  } else if (category.includes('yield') || category.includes('aggregator') || category.includes('farm')) {
    templates = [
      `Deposit stablecoins into ${name} vaults on ${chainList} for automated yield compounding. Est cost: $12 gas, $300 capital. Cadence: weekly.`,
      `Rotate yield strategies across ${chainList} via ${name} to capture highest APY. Est cost: $20 gas, $500 capital. Cadence: weekly.`,
      `Claim compounding yields and governance rewards from ${name} on ${chainList}. Est cost: $6 gas, $0 capital. Cadence: weekly.`,
      `Audit vault risk parameters and tvl utilization on ${name} (${chainList}). Est cost: $5 gas, $0 capital. Cadence: weekly.`
    ];
  } else if (category.includes('derivatives') || category.includes('perpetuals') || category.includes('options') || category.includes('synthetics')) {
    templates = [
      `Open delta-neutral perp positions or provide margin to ${name} on ${chainList}. Est cost: $15 gas, $400 capital. Cadence: daily.`,
      `Stake platform tokens in ${name} insurance or safety module across ${chainList}. Est cost: $10 gas, $200 capital. Cadence: weekly.`,
      `Claim trading fee rebates and staking yields from ${name} on ${chainList}. Est cost: $5 gas, $0 capital. Cadence: weekly.`,
      `Monitor funding rates and margin ratios on ${name} (${chainList}) to prevent liquidation. Est cost: $8 gas, $0 capital. Cadence: daily.`
    ];
  } else if (category.includes('bridge') || category.includes('cross chain') || category.includes('canonical')) {
    templates = [
      `Transfer assets across supported networks using ${name} bridge infrastructure (${chainList}). Est cost: $25 gas, $500 capital. Cadence: weekly.`,
      `Provide liquidity to ${name} bridge pools on ${chainList} to earn relay fees. Est cost: $14 gas, $300 capital. Cadence: weekly.`,
      `Claim cross-chain relay rewards and bridge incentives from ${name} (${chainList}). Est cost: $6 gas, $0 capital. Cadence: weekly.`,
      `Check bridge security proofs and validator set updates for ${name}. Est cost: $4 gas, $0 capital. Cadence: weekly.`
    ];
  } else {
    templates = [
      `Interact with core smart contracts of ${name} deployed on ${chainList} to maintain active user status. Est cost: $10 gas, $100 capital. Cadence: weekly.`,
      `Participate in governance votes and community proposals for ${name} across ${chainList}. Est cost: $4 gas, $0 capital. Cadence: weekly.`,
      `Stake governance tokens in ${name} safety modules on ${chainList} to earn protocol revenue. Est cost: $8 gas, $150 capital. Cadence: weekly.`,
      `Claim periodic rewards and ecosystem incentives distributed by ${name} (${chainList}). Est cost: $5 gas, $0 capital. Cadence: weekly.`
    ];
  }

  // Ensure 4 to 8 steps
  const steps = [...templates];
  if (steps.length < 5) {
    steps.push(`Perform supplementary transaction on ${name} (${chainList}) to boost onchain interaction history. Est cost: $9 gas, $50 capital. Cadence: weekly.`);
  }
  if (steps.length < 6) {
    steps.push(`Review security advisories and audit updates for ${name} across ${chainList}. Est cost: $3 gas, $0 capital. Cadence: weekly.`);
  }

  return steps;
}
// __NEXT_CHUNK__
  const rows = tokens.map(token => {
    return {
      symbol: token.symbol,
      name: token.name,
      chain: token.chain,
      launch_date: token.launch_date,
      current_price_usd: token.current_price_usd,
      market_cap_usd: token.market_cap_usd,
      volume_24h_usd: token.volume_24h_usd,
      liquidity_usd: token.liquidity_usd,
      fdv_usd: token.fdv_usd,
      holder_count: token.holder_count,
      score: token.score,
      risk_rating: token.risk_rating,
      checklist: generateChecklist(token),
      history: generateHistory(token)
    };
  });

  const outDir = Deno.args[0] || 'out';
  await Deno.mkdir(outDir, { recursive: true });

  const board = { rows };
  await Deno.writeTextFile(`${outDir}/board.json`, JSON.stringify(board, null, 2));

  const asOf = new Date().toISOString();
  const floorUsd = 1000; // default floor usd or calculated
  const dataJsContent = `window.RADAR_DATA = ${JSON.stringify({ ...board, as_of: asOf, floor_usd: floorUsd }, null, 2)};\n`;
  await Deno.writeTextFile(`${outDir}/data.js`, dataJsContent);

  try {
    const dashStat = await Deno.stat('dashboard');
    if (dashStat.isDirectory) {
      await cpDir('dashboard', `${outDir}/dashboard`);
    }
  } catch {}

  try {
    const ssStat = await Deno.stat('screenshots');
    if (ssStat.isDirectory) {
      await cpDir('screenshots', `${outDir}/screenshots`);
    }
  } catch {}

  try {
    const dossierText = buildDossier({ tokens, rows });
    const trimmedDossier = dossierText.length > 65535 ? dossierText.slice(0, 65535) : dossierText;
    await Deno.writeTextFile(`${outDir}/dossier.json`, JSON.stringify({ dossier: trimmedDossier }, null, 2));
  } catch (e) {
    console.error("Error building dossier:", e);
  }
}

async function cpDir(src: string, dest: string) {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;
    if (entry.isDirectory) {
      await cpDir(srcPath, destPath);
    } else if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

main().catch(err => {
  console.error(err);
  Deno.exit(1);
});
