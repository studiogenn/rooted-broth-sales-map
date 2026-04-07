// Merge expanded cold-weather state leads into all-targets.json
// States: CO, MT, AK, VT, ME, NH
const fs = require('fs');
const path = require('path');

const EXPANSION = require('./cold-weather-expansion.json');

// Read existing data
const dataPath = path.join(__dirname, 'public', 'all-targets.json');
const existing = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log('Existing leads:', existing.length);

// Normalize for dedup
const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Build dedup set from existing
const seen = new Set();
existing.forEach(b => {
  seen.add(normalize(b.name) + '|' + normalize(b.address));
});

// Add expansion leads
let added = 0;
let skipped = 0;
EXPANSION.forEach(lead => {
  const key = normalize(lead.name) + '|' + normalize(lead.address);
  if (seen.has(key)) {
    skipped++;
    return;
  }

  // Add borough field matching existing format
  const stateNames = {
    'CO': 'Colorado', 'MT': 'Montana', 'AK': 'Alaska',
    'VT': 'Vermont', 'ME': 'Maine', 'NH': 'New Hampshire'
  };

  existing.push({
    name: lead.name,
    category: lead.category,
    address: lead.address,
    neighborhood: lead.neighborhood || lead.city,
    city: lead.city,
    state: lead.state,
    borough: stateNames[lead.state] || lead.state,
    territory: 'danielle'
  });

  seen.add(key);
  added++;
});

// Write back
fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));
console.log('Added:', added, 'new cold-weather expansion leads');
console.log('Skipped (duplicates):', skipped);
console.log('Total:', existing.length);

// Also copy to root for GitHub Pages
fs.copyFileSync(dataPath, path.join(__dirname, 'all-targets.json'));
console.log('Copied to root all-targets.json');

// Stats
const byState = {};
const byCat = {};
EXPANSION.forEach(e => {
  byState[e.state] = (byState[e.state] || 0) + 1;
  byCat[e.category] = (byCat[e.category] || 0) + 1;
});
console.log('\nExpansion breakdown by state:', JSON.stringify(byState, null, 2));
console.log('\nExpansion breakdown by category:', JSON.stringify(byCat, null, 2));
