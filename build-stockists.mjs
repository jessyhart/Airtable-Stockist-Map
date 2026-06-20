// build-stockists.mjs
// Pulls every stockist from Airtable and writes a static stockists.json
// in the exact shape the map embed expects.
//
// Run locally:   AIRTABLE_TOKEN=pat... node build-stockists.mjs
// Or in CI:      token comes from a GitHub Actions secret (see workflow).
//
// Requires Node 18+ (global fetch).

import { writeFileSync } from 'node:fs';

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE  = process.env.AIRTABLE_BASE_ID || 'appjBjVxJC4A6DoQE';
const TABLE = process.env.AIRTABLE_TABLE   || 'Stockists';
const VIEW  = process.env.AIRTABLE_VIEW    || 'Published';

if (!TOKEN) {
  console.error('Missing AIRTABLE_TOKEN environment variable.');
  process.exit(1);
}

const baseUrl = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`;
const headers = { Authorization: `Bearer ${TOKEN}` };

const out = [];
let offset;

do {
  const params = new URLSearchParams({ pageSize: '100', view: VIEW });
  if (offset) params.set('offset', offset);

  const res = await fetch(`${baseUrl}?${params}`, { headers });
  if (!res.ok) {
    console.error(`Airtable ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();

  for (const r of data.records) {
    const f = r.fields;
    const lat = parseFloat(f['Latitude']);
    const lng = parseFloat(f['Longitude']);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

    const ranges = [];
    if (f['Sauces'])       ranges.push('sauces');
    if (f['Smoothies'])    ranges.push('smoothies');
    if (f['Lean & Loud'])  ranges.push('lean');

    out.push({
      id: r.id,
      name: f['Store Name'] || 'Unknown store',
      address: f['Address'] || '',
      suburb: f['Suburb'] || '',
      state: f['State'] || '',
      postcode: f['Postcode'] || '',
      phone: f['Phone'] || '',
      website: f['Website'] || '',
      hours: f['Hours'] || '',
      lat, lng, ranges
    });
  }

  offset = data.offset;
} while (offset);

out.sort((a, b) => a.name.localeCompare(b.name));

// Minified — no need for pretty whitespace in a file the browser downloads
writeFileSync('stockists.json', JSON.stringify(out));
console.log(`Wrote stockists.json with ${out.length} stockists.`);
