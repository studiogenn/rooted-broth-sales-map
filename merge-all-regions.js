// Merge all regional research into the master all-targets.json
// Handles deduplication by name (lowercase)
const fs = require('fs');
const path = require('path');

const DEPLOY_DATA = path.join(__dirname, 'public', 'all-targets.json');
const WK = '/Users/danielled/.claude-worktrees/studiogen-leadgen/zen-maxwell/src';

// Load current master data
let master = JSON.parse(fs.readFileSync(DEPLOY_DATA, 'utf-8'));
console.log('Starting total:', master.length);

// Build dedup set
const seen = new Set(master.map(b => b.name.toLowerCase().trim()));

function mergeFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`[${label}] File not found: ${filePath} — skipping`);
    return 0;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  // Handle multiple formats: flat array, {leads:[]}, {metro_name:[]}
  let leads;
  if (Array.isArray(raw)) {
    leads = raw;
  } else if (raw.leads) {
    leads = raw.leads;
  } else if (raw.targets) {
    leads = raw.targets;
  } else {
    // Try merging all top-level arrays (metro-keyed format)
    leads = [];
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) leads.push(...v);
      else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        // nested object with arrays inside
        for (const [k2, v2] of Object.entries(v)) {
          if (Array.isArray(v2)) leads.push(...v2);
        }
      }
    }
    if (leads.length === 0) {
      console.log(`[${label}] No arrays found — skipping`);
      return 0;
    }
  }
  let added = 0;
  leads.forEach(l => {
    const key = (l.name || '').toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    master.push({
      name: l.name,
      category: l.category || l.cat || '',
      address: l.address || '',
      neighborhood: l.neighborhood || l.city || '',
      city: l.city || '',
      state: l.state || '',
      borough: l.state || l.borough || '',
      territory: 'danielle',
    });
    added++;
  });
  console.log(`[${label}] Added ${added} new leads (${leads.length} total in file)`);
  return added;
}

// Merge all regional files
let totalAdded = 0;
totalAdded += mergeFile(path.join(WK, 'upper-midwest-leads.json'), 'Upper Midwest');
totalAdded += mergeFile(path.join(WK, 'portland-targets.json'), 'Portland OR');
totalAdded += mergeFile(path.join(WK, 'seattle-targets.json'), 'Seattle WA');
totalAdded += mergeFile(path.join(WK, 'cold-weather-expansion.json'), 'Cold Weather Expansion');

// Try any other files the agents might create
totalAdded += mergeFile(path.join(WK, 'pacific-northwest-leads.json'), 'PNW');
totalAdded += mergeFile(path.join(WK, 'mountain-west-new-england-leads.json'), 'Mountain/NE');
totalAdded += mergeFile(path.join(WK, 'rooted-broth-cold-weather-leads.json'), 'Cold weather original');

// Also check for any JSON files starting with "rooted-broth" that we haven't merged
const srcFiles = fs.readdirSync(WK).filter(f => f.endsWith('.json') && !f.includes('node_modules'));
srcFiles.forEach(f => {
  if (!f.includes('upper-midwest') && !f.includes('pacific-northwest') && !f.includes('mountain')) {
    // Already tried these above
  }
});

console.log('\nTotal new leads added this run:', totalAdded);
console.log('Final total:', master.length);

// Write
fs.writeFileSync(DEPLOY_DATA, JSON.stringify(master, null, 2));
fs.writeFileSync(path.join(__dirname, 'all-targets.json'), JSON.stringify(master, null, 2));
console.log('Written to both locations');
