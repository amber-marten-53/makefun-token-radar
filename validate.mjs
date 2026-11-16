import fs from 'node:fs';

const boardPath = 'out/board.json';
const snapshotPath = '/data/work/token-radar-01-kit/input/snapshot.json';

const failures = [];

if (!fs.existsSync(boardPath)) {
  failures.push('out/board.json does not exist');
}
if (!fs.existsSync(snapshotPath)) {
  failures.push('snapshot.json does not exist');
}

if (failures.length === 0) {
  const board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  const rows = board.rows || board;
  if (!Array.isArray(rows)) {
    failures.push('board is not an array of rows');
  } else {
    if (rows.length < 150 || rows.length > 300) {
      failures.push(`Rows count ${rows.length} is outside 150..300 range`);
    }

    const watchlists = snapshot.watchlists || [];
    for (const wl of watchlists) {
      const found = rows.some(r => r.slug === wl || r.token === wl || r.name === wl);
      if (!found) {
        failures.push(`Watchlist slug missing: ${wl}`);
      }
    }

    let prevVal = Infinity;
    let allEqual = true;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const expectedRank = i + 1;
      if (r.rank !== expectedRank) {
        failures.push(`Row ${i} rank is ${r.rank}, expected ${expectedRank}`);
      }
      const val = r.implied_value_usd;
      if (typeof val !== 'number' || val <= 0 || !Number.isInteger(val)) {
        failures.push(`Row ${expectedRank} implied_value_usd is invalid: ${val}`);
      }
      if (i > 0) {
        if (val > prevVal) {
          failures.push(`Implied value increased from rank ${i} to ${expectedRank}`);
        }
        if (val !== prevVal) {
          allEqual = false;
        }
      }
      prevVal = val;

      const steps = r.farm_steps;
      if (!Array.isArray(steps) || steps.length < 3 || steps.length > 12) {
        failures.push(`Row ${expectedRank} farm_steps count invalid: ${steps ? steps.length : 'not array'}`);
      } else {
        for (let s = 0; s < steps.length; s++) {
          const stepStr = steps[s];
          if (typeof stepStr !== 'string' || stepStr.length < 20 || stepStr.length > 600) {
            failures.push(`Row ${expectedRank} farm_step ${s} length/type invalid: ${stepStr ? stepStr.length : 'not string'}`);
          }
        }
      }
    }
    if (allEqual && rows.length > 0) {
      failures.push('All implied_value_usd values are equal');
    }
  }
}

if (failures.length > 0) {
  console.log('FAIL:');
  for (const f of failures) {
    console.log(` - ${f}`);
  }
  process.exit(1);
} else {
  console.log('PASS');
}
