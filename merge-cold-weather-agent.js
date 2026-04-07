const fs = require('fs');
const path = require('path');

// Load existing data (already has our 86 manual cold-weather leads)
const dataPath = path.join(__dirname, 'public', 'all-targets.json');
const existing = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log('Current total:', existing.length);

// Load agent's 240 leads
const agentData = JSON.parse(fs.readFileSync('/Users/danielled/.claude-worktrees/studiogen-leadgen/zen-maxwell/src/funnels/rooted-broth-cold-weather-leads.json', 'utf-8'));
const agentLeads = agentData.leads;
console.log('Agent leads:', agentLeads.length);

// Build dedup set from existing
const seen = new Set(existing.map(b => b.name.toLowerCase().trim()));

let added = 0;
agentLeads.forEach(l => {
  const key = l.name.toLowerCase().trim();
  if (!seen.has(key)) {
    existing.push({
      name: l.name,
      category: l.category,
      address: l.address,
      neighborhood: l.neighborhood || l.city,
      city: l.city,
      state: l.state,
      borough: l.state, // Use state as borough for non-NYC
      territory: 'danielle', // All cold-weather assigned to Danielle
    });
    seen.add(key);
    added++;
  }
});

console.log('New leads added:', added);
console.log('Final total:', existing.length);

fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));
fs.copyFileSync(dataPath, path.join(__dirname, 'all-targets.json'));
console.log('Written to both locations');
