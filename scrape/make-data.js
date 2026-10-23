const fs = require('fs');
const path = require('path');
const T = 'C:\\Users\\ok\\AppData\\Local\\Temp\\opencode';
const OUT = path.join(__dirname, '..', 'db', 'data');
fs.mkdirSync(OUT, { recursive: true });

const read = (f) => fs.readFileSync(path.join(T, f), 'utf8').replace(/^﻿/, '');
const j = (f) => JSON.parse(read(f));
const write = (f, o) => fs.writeFileSync(path.join(OUT, f), JSON.stringify(o, null, 2), 'utf8');

const decoded = j('pages.json');
const bySlug = Object.fromEntries(decoded.map(p => [p.slug, p]));

function strip(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&#x2019;|&rsquo;/g, "'")
    .replace(/&#8211;/g, '-').replace(/&#038;/g, '&').replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/[ \t]+/g, ' ').split('\n').map(x => x.trim()).filter(x => x.length > 1).join('\n');
}

// ---------------------------------------------------------------- MODELS
const models = JSON.parse(fs.readFileSync(path.join(__dirname, 'models.json'), 'utf8'));
const priceMap = {
  'Yadea T5L': 305000, 'Yadea Keeness': 1400000, 'Yadea Velax': 444000,
  'Yadea M3H': 255000, 'Yadea Ruibin S': 193000, 'Yadea GT30': 194000,
  'Yadea Epoch': 355000, 'Yadea Epoc H': 355000, 'Yadea G5': 0, 'Yadea M3': 174000,
  'Ruibin L': 270000, 'GT70 Cyber': 479000, 'Yadea T5': 253500, 'Yadea Ruibin': 209000
};
const taglineMap = {
  'Yadea T5L': 'Family Rides, Miles of Smiles',
  'Yadea Velax': 'Experience the urban edge',
  'Yadea Keeness': 'Built for speed, made for control',
  'Yadea M3H': 'A smooth ride for everyday city life',
  'Yadea Ruibin S': 'Light, agile and endlessly practical',
  'Yadea GT30': 'The everyday electric workhorse',
  'Yadea Epoch': 'The game-changer in electric scooters',
  'Yadea Epoc H': 'Comfort and range for daily commutes',
  'Yadea G5': 'Smart riding for the modern city',
  'Yadea M3': 'Your first electric scooter, done right',
  'Ruibin L': 'Ride the future in style',
  'GT70 Cyber': 'The ultimate high-performance electric ride',
  'Yadea T5': 'Proven performance, everyday value',
  'Yadea Ruibin': 'Comfort meets efficiency'
};
const specTable = {
  'Yadea T5L': [['Motor', '1500W High-Torque Motor'], ['Peak Power', '2700W'], ['Top Speed', '51 km/h'], ['Range', '80-100 km'], ['Battery', '72V 30Ah LFP'], ['Charging Time', '5.5 hr'], ['Tires', '10" Tubeless'], ['Warranty', '4 Years / 50,000 km']],
  'Yadea Velax': [['Motor', '2000W High-Torque Motor'], ['Peak Power', '3200W'], ['Top Speed', '65 km/h'], ['Range', '85 km (ECO)'], ['Battery', '72V 30Ah LFP'], ['Brakes', 'Front & Rear Disc'], ['Warranty', '4 Years / 50,000 km']],
  'Yadea Keeness': [['Motor', '5500W Mid-Mounted Motor'], ['Peak Power', '11 KW'], ['Top Speed', '100 km/h'], ['Range', '129 km'], ['Battery', '72V 32Ah x2 LFP'], ['Max Torque', '300 Nm'], ['Warranty', '24 Months / 20,000 km']],
  'Yadea M3H': [['Motor', '1200W High-Torque Motor'], ['Peak Power', '2200W'], ['Top Speed', '45 km/h'], ['Range', '110 km (Eco) / 70 km (Sport)'], ['Battery', '60V 30Ah LFP'], ['Warranty', '4 Years / 50,000 km']],
  'Yadea Ruibin S': [['Motor', '1000W Rated / 2000W Peak'], ['Top Speed', '50 km/h'], ['Range', '80 km'], ['Battery', '72V 25Ah Graphene'], ['Features', 'Reverse Gear, TCS & HDC'], ['Warranty', '24 Months / 20,000 km']],
  'Yadea GT30': [['Top Speed', '45 km/h'], ['Range', '75 km'], ['Battery', '60V 20Ah'], ['Brakes', 'Front & Rear Drum'], ['Warranty', '24 Months']],
  'Yadea Epoch': [['Top Speed', '70 km/h'], ['Range', '125 km'], ['Battery', '72V 30Ah'], ['Features', 'TFT Display, Keyless Start']],
  'Yadea Epoc H': [['Top Speed', '70 km/h'], ['Range', '125 km'], ['Battery', '72V 30Ah'], ['Features', 'Keyless Start, USB Charging']],
  'Yadea G5': [['Top Speed', '50 km/h'], ['Range', '90-100 km'], ['Battery', '60V 30Ah'], ['Features', 'Smart App Connectivity']],
  'Yadea M3': [['Top Speed', '42 km/h'], ['Range', '80 km'], ['Battery', '48V 24Ah'], ['Features', 'LED Lighting']],
  'Ruibin L': [['Top Speed', '55 km/h'], ['Range', '110 km'], ['Battery', '72V 30Ah'], ['Features', 'LED Lighting, Keyless Start']],
  'GT70 Cyber': [['Motor', '2000W High-Torque Motor'], ['Peak Power', '2TTFAR Smart Drive System'], ['Battery', '72V 50Ah LFP'], ['Range', '150 km'], ['Top Speed', '70 km/h'], ['Brakes', 'Front & Rear Disc'], ['Tires', '90/90-12 Front / 100/80-12 Rear'], ['Features', 'Smart Keyless Unlocking & Anti-Theft']],
  'Yadea T5': [['Motor', '1200W'], ['Top Speed', '57 km/h'], ['Range', '75-85 km'], ['Battery', '72V 25Ah']],
  'Yadea Ruibin': [['Top Speed', '50 km/h'], ['Range', '80 km'], ['Battery', '72V 20Ah']]
};
const slugMap = {
  'Yadea T5L': 'yadea-t5l', 'Yadea Keeness': 'yadea-keeness', 'Yadea Velax': 'yadea-velax',
  'Yadea M3H': 'yadea-m3h', 'Yadea Ruibin S': 'yadea-ruibin-s', 'Yadea GT30': 'yadea-gt30',
  'Yadea Epoch': 'yadea-epoch', 'Yadea Epoc H': 'yadea-epoc-h', 'Yadea G5': 'yadea-g5',
  'Yadea M3': 'yadea-m3', 'Ruibin L': 'yadea-ruibin-l-electric-scooter-e-bike',
  'GT70 Cyber': 'yadea-gt70-cyber-electric-scooter-e-bike', 'Yadea T5': 'yadea-t5-electric-scooter-e-bike',
  'Yadea Ruibin': 'yadea-ruibin'
};
const heroMap = {
  'Yadea T5L': 'https://yadea.com.pk/wp-content/uploads/2026/05/yadea-t5l.png',
  'Yadea Keeness': 'https://yadea.com.pk/wp-content/uploads/2026/04/767x703.png',
  'Yadea Velax': 'https://yadea.com.pk/wp-content/uploads/2026/03/767x703.png',
  'Yadea M3H': 'https://yadea.com.pk/wp-content/uploads/2026/06/500x500.png',
  'Yadea Ruibin S': 'https://yadea.com.pk/wp-content/uploads/2026/06/767x703.png',
  'Yadea GT30': 'https://yadea.com.pk/wp-content/uploads/2024/12/GT30-8-removebg-preview.png',
  'Yadea Epoch': 'https://yadea.com.pk/wp-content/uploads/2024/10/Picture56.png',
  'Yadea Epoc H': 'https://yadea.com.pk/wp-content/uploads/2024/10/YadeaBlack.png',
  'Yadea G5': 'https://yadea.com.pk/wp-content/uploads/2024/02/yadea-G5.png',
  'Yadea M3': 'https://yadea.com.pk/wp-content/uploads/2026/06/500x500.png',
  'Ruibin L': 'https://yadea.com.pk/wp-content/uploads/2026/08/Ruibin-L.png',
  'GT70 Cyber': 'https://yadea.com.pk/wp-content/uploads/2026/10/GT70-左45-繁星黑-1024x640.png',
  'Yadea T5': 'https://yadea.com.pk/wp-content/uploads/2024/01/White-1.png',
  'Yadea Ruibin': 'https://yadea.com.pk/wp-content/uploads/2024/02/Yadea-Ruibin.png'
};
const outModels = [];
const usedSlug = new Set();
for (const m of models) {
  if (!priceMap.hasOwnProperty(m.name)) continue;
  const slug = slugMap[m.name] || m.slug;
  if (usedSlug.has(slug)) continue;
  usedSlug.add(slug);
  const src = bySlug[m.slug] || bySlug[slug];
  outModels.push({
    name: m.name, slug,
    tagline: taglineMap[m.name] || m.tagline || '',
    price: priceMap[m.name], old_price: 0,
    hero_image: heroMap[m.name] || m.hero,
    gallery: [...new Set([heroMap[m.name], ...(m.gallery || [])].filter(Boolean))].slice(0, 5),
    short_description: `${m.name} is a YADEA electric scooter built for Pakistani roads, delivering long range, low running cost and a comfortable daily ride.`,
    description: (src ? strip(src.content.rendered) : m.text).split('\n').slice(0, 40).join('\n'),
    featured: ['Yadea T5L', 'Ruibin L', 'GT70 Cyber', 'Yadea Velax', 'Yadea Keeness'].includes(m.name) ? 1 : 0,
    specs: specTable[m.name] || [['Top Speed', m.speed], ['Range', m.range], ['Battery', m.battery], ['Motor', m.motor]].filter(x => x[1])
  });
}
write('models.json', outModels);

// ---------------------------------------------------------------- FAQS
const faqText = strip((bySlug['faq'] || { content: { rendered: '' } }).content.rendered);
const lines = faqText.split('\n');
const faqs = [];
for (let i = 0; i < lines.length; i++) {
  const q = lines[i];
  if (q.endsWith('?') && q.length > 15 && lines[i + 1] && !lines[i + 1].endsWith('?')) {
    let a = lines[i + 1];
    let k = i + 2;
    while (k < lines.length && lines[k] && !lines[k].endsWith('?') && lines[k].length > 40 && a.length < 300) { a += ' ' + lines[k]; k++; }
    faqs.push({ question: q, answer: a.replace(/\s+/g, ' ').trim() });
  }
}
write('faqs.json', faqs.slice(0, 20));

// ---------------------------------------------------------------- NEWS POSTS
const newsHtml = (bySlug['news-events'] || { content: { rendered: '' } }).content.rendered;
const posts = [];
const articleRe = /<article class="wpr-grid-item[^"]*?category-([a-z0-9\-]+)[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
let am;
while ((am = articleRe.exec(newsHtml))) {
  const cat = am[1];
  const block = am[2];
  const link = block.match(/wpr-grid-item-title[\s\S]*?<a[^>]*href="(https:\/\/yadea\.com\.pk\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  if (!link) continue;
  const img = block.match(/<img[^>]*src="([^"]+)"/);
  const date = block.match(/wpr-grid-item-date[^>]*>([\s\S]*?)<\/div>/);
  const excerpt = block.match(/wpr-grid-item-excerpt[^>]*>([\s\S]*?)<\/div>/);
  const title = strip(link[2]);
  if (title.length < 12) continue;
  posts.push({
    slug: link[1].replace('https://yadea.com.pk/', '').replace(/\/$/, ''),
    title, url: link[1], image: img ? img[1] : '',
    category: cat, date: date ? strip(date[1]) : '',
    excerpt: excerpt ? strip(excerpt[1]).slice(0, 220) : ''
  });
}
write('posts.json', posts);

// ---------------------------------------------------------------- DEALERS
const dealers = j('dealers.json').data.map(d => ({
  name: d.name, city: d.city, address: d.address, sales_person: d.sales,
  phone1: d.phone1, phone2: d.phone2, lat: parseFloat(d.lat) || null, lng: parseFloat(d.lng) || null,
  gmaps: d.gmaps, hours: d.hours, types: (d.cats || []).join(',')
}));
write('dealers.json', dealers);

// ---------------------------------------------------------------- PAGES
const pageSlugs = ['about-us', 'service-support', 'product-support', 'become-a-dealer',
  'test-drive', 'terms-and-conditions', 'privacy-policy', 'refund_returns', 'govt-page', 'contact-us'];
const pagesOut = [];
for (const s of pageSlugs) {
  const p = bySlug[s]; if (!p) continue;
  pagesOut.push({ slug: s, title: p.title.rendered, body: strip(p.content.rendered) });
}
write('pages.json', pagesOut);

// ---------------------------------------------------------------- HOME CONTENT
const homeHtml = read('home.html');
const sloganMatch = homeHtml.match(/<h2 class="elementor-heading-title[^"]*">\s*Latest Models/);
const heroSlides = [
  { name: 'GT70 Cyber', spec: '2TTFAR Smart Drive System|2,000W High-Torque Motor|72V 50Ah LFP Battery|Front & Rear Disc Brakes|Smart Keyless Unlocking', image: 'https://yadea.com.pk/wp-content/uploads/2026/10/GT70-左45-繁星黑-1024x640.png', link: '/models/gt70-cyber' },
  { name: 'Ruibin L', spec: '70 KM/H Top Speed|150 KM Range|3.0 KW Motor|72V 38Ah Battery|LED Lighting', image: 'https://yadea.com.pk/wp-content/uploads/2026/09/RUIBIN-L-伊顿蓝-左180-scaled.png', link: '/models/ruibin-l' },
  { name: 'Yadea T5L', spec: '80 KM/H Top Speed|150 KM Range|5.0 KW Motor|72V 38Ah Battery|Disc Brakes', image: 'https://yadea.com.pk/wp-content/uploads/2026/05/2-3.png', link: '/models/yadea-t5l' },
  { name: 'Yadea Velax', spec: '65 KM/H Top Speed|85 KM Range|3200W Peak Power|2000W Motor|72V 30Ah Battery', image: 'https://yadea.com.pk/wp-content/uploads/2026/10/Right-45.png', link: '/models/yadea-velax' },
  { name: 'Yadea Keeness', spec: '100 KM/H Top Speed|129 KM Range|11 KW Mid-Mounted Motor|300 Nm Max Torque|72V 32Ah x 2 Battery', image: 'https://yadea.com.pk/wp-content/uploads/2026/05/2-3.png', link: '/models/yadea-keeness' }
];
const impact = [
  ['NO.1', 'Global No.1 for 9 consecutive years in sales volume'],
  ['376,176,329,773 km', 'Global Accumulated Riding Miles'],
  ['3,259,568,292 trees', 'Equivalent to Planting'],
  ['65,191,361,710 kg', 'Reduced CO2 Emissions'],
  ['Millions', 'Yadea Riders Worldwide']
];
const whyYadea = [
  { title: 'Quality', text: 'Built with durable construction to ensure long-lasting performance and reliability on every ride.' },
  { title: 'Warranty', text: "Enjoy stress-free claims with Yadea's comprehensive warranty, giving you complete peace of mind." },
  { title: '3S Showrooms', text: 'Our nationwide 3S showrooms provide Sales, Service and Spare Parts under one roof, backed by certified and professionally trained technicians.' }
];
const ttl = [
  { title: '3X Lifespan', text: 'LFP cells deliver three times the lifespan of conventional lead-acid packs.' },
  { title: '25% Capacity Upgrade', text: 'Higher usable capacity for a longer, more confident range.' },
  { title: '-20°C to 55°C', text: 'Wide operating temperature range for all-weather riding.' },
  { title: '86% Efficiency', text: 'Energy-retrieving controller keeps system efficiency high.' }
];
const home = {
  hero_slides: heroSlides, impact, why_yadea: whyYadea, lithium_points: ttl,
  hero_intro: "Yadea, the world's leading electric two-wheeler brand, has ranked global No.1 in annual sales for the last 9 consecutive years, with product ranges mainly covering high-performance electric motorcycles, electric mopeds, electric bicycles and electric kick scooters, and is officially distributed by Eiffel Industries Ltd."
};
write('home.json', home);

console.log('models:', outModels.length, '| faqs:', faqs.length, '| posts:', posts.length, '| dealers:', dealers.length, '| pages:', pagesOut.length);
