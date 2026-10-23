const fs = require('fs');
const path = require('path');
const e = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted.json'), 'utf8'));

function pick(text, re, d) { const m = text.match(re); return m ? m[1].trim() : d; }

const names = {
  'yadea-t5l': ['Yadea T5L', 'Family Rides, Miles of Smiles'],
  'yadea-keeness': ['Yadea Keeness', ''],
  'yadea-velax': ['Yadea Velax', ''],
  'yadea-m3h': ['Yadea M3H', ''],
  'yadea-ruibin-s': ['Yadea Ruibin S', ''],
  'yadea-gt30': ['Yadea GT30', ''],
  'yadea-epoc-h': ['Yadea Epoc H', ''],
  'yadea-g5': ['Yadea G5', ''],
  'yadea-m3': ['Yadea M3', ''],
  'ruibin-l': ['Ruibin L', ''],
  'gt-70': ['GT70 Cyber', ''],
  'yadea-ruibin-l': ['Ruibin L', ''],
  'yadea-gt70-cyber': ['GT70 Cyber', ''],
  'yadea-t5l-electric-scooter-e-bike': ['Yadea T5L', ''],
  'yadea-t5-electric-scooter-e-bike': ['Yadea T5', ''],
  'yadea-epoch-top-electric-scooter-in-pakistan-for-daily-commutes': ['Yadea Epoch', ''],
};

const models = [];
const seen = new Set();
for (const m of e.models) {
  const key = names[m.slug] ? names[m.slug][0] : m.title;
  if (seen.has(key)) continue;
  seen.add(key);
  const t = m.text;
  const price = pick(t, /(?:Price\s*)?([0-9][0-9,]{4,})\s*(?:PKR|₨|Rs)/i,
    pick(t, /₨\s*([0-9,]{5,})/i, ''));
  const speed = pick(t, /(?:Top Speed|Max\.?\s*Speed)\s*([0-9]+\s*(?:km\/h|kmh))/i, '');
  const range = pick(t, /(?:^|\n)(?:Range|Per Charge)\s*\n?([0-9]+-?[0-9]*\s*km)/im,
    pick(t, /([0-9]+-[0-9]+\s*km)\s*Per Charge/i, ''));
  const battery = pick(t, /([0-9]+V\s*[0-9]+Ah)/i, '');
  const charge = pick(t, /([0-9.]+\s*hr(?:aving)?\s*Charging Time|[0-9.]+hr\s*Charging)/i, '');
  const motor = pick(t, /([0-9]+W\s*(?:Peak Power )?Motor)/i, pick(t, /([0-9]+W)\s*Peak/i, ''));
  const ty = pick(t, /([0-9]+"\s*Tubeless Tires)/i, '');
  const wty = pick(t, /([0-9]+-?[years]*,?\s*[0-9,]*\s*km)\s*Battery Warranty/i, '');
  const tagline = names[m.slug] && names[m.slug][1] ? names[m.slug][1]
    : (m.headings[1] && m.headings[1].split('\n')[0].trim()) || '';
  const hero = m.images[0] || '';
  models.push({
    name: key, slug: m.slug, tagline, price, speed, range, battery,
    charging: charge, motor, tires: ty, warranty: wty, hero, gallery: m.images.slice(0, 6)
  });
}

fs.writeFileSync(path.join(__dirname, 'models.json'), JSON.stringify(models, null, 2), 'utf8');
console.table(models.map(m => ({ name: m.name, price: m.price, speed: m.speed, range: m.range, battery: m.battery, hero: (m.hero || '').slice(-40) })));
