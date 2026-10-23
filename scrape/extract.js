const fs = require('fs');
const path = require('path');

const T = process.env.TEMPDIR || 'C:\\Users\\ok\\AppData\\Local\\Temp\\opencode';

function read(f) { return fs.readFileSync(path.join(T, f), 'utf8').replace(/^﻿/, ''); }

function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#8360;|&#8377;/g, 'Rs').replace(/&#8211;/g, '-').replace(/&#8217;/g, "'")
    .replace(/&#038;/g, '&').replace(/&ldquo;|&rdquo;/g, '"').replace(/&#x2019;/g, "'")
    .replace(/&hellip;/g, '...').replace(/&#039;/g, "'").replace(/&eacute;/g, 'e')
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-fA-F]+);/g, (m, d) => String.fromCharCode(parseInt(d, 16)));
}

function strip(html) {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n');
  return decode(s).split('\n').map(x => x.trim()).filter(x => x.length > 1).join('\n');
}

function imgs(html) {
  const out = [];
  const re = /(?:src|data-src)="([^"]+\.(?:png|jpg|jpeg|webp|svg|gif)[^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!m[1].includes('-') && !m[1].includes('icon')) continue;
    out.push(decode(m[1]));
  }
  return [...new Set(out)].filter(u => !/(150x150|50x50|100x100|32x32|favicon|logo)/i.test(u)).slice(0, 12);
}

const pages = JSON.parse(read('pages.json'));
const bySlug = Object.fromEntries(pages.map(p => [p.slug, p]));

const out = { models: [], pages: [], nav: [], home: {}, dealers: [], faqs: [] };

// ---- Model landing pages (scooter models) ----
const modelSlugs = ['yadea-t5l', 'yadea-keeness', 'yadea-velax', 'yadea-m3h', 'yadea-ruibin-s',
  'yadea-gt30', 'yadea-epoch-top-electric-scooter-in-pakistan-for-daily-commutes',
  'yadea-epoc-h', 'yadea-g5', 'yadea-m3', 'ruibin-l', 'gt-70', 'yadea-ruibin-l', 'yadea-gt70-cyber',
  'yadea-t5l-electric-scooter-e-bike', 'yadea-t5-electric-scooter-e-bike'];

for (const slug of modelSlugs) {
  const p = bySlug[slug];
  if (!p) continue;
  const html = p.content.rendered;
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map(m => strip(m[1])).filter(Boolean).slice(0, 14);
  out.models.push({
    slug, title: decode(p.title.rendered),
    headings, images: imgs(html),
    text: strip(html).split('\n').slice(0, 60).join('\n')
  });
}

// ---- generic pages ----
const pageSlugs = ['about-us', 'faq', 'find-a-dealer', 'become-a-dealer', 'test-drive',
  'service-support', 'product-support', 'contact-us', 'news-events', 'refund_returns',
  'terms-and-conditions', 'privacy-policy', 'govt-page', 'products'];
for (const slug of pageSlugs) {
  const p = bySlug[slug];
  if (!p) continue;
  out.pages.push({ slug, title: decode(p.title.rendered), text: strip(p.content.rendered).split('\n').slice(0, 400).join('\n') });
}

// ---- home page ----
const home = read('home.html');
out.home = {
  nav: [...home.matchAll(/<a[^>]+href="(https:\/\/yadea\.com\.pk[^"]*|\/[^"]*)"[^>]*>\s*([^<]{2,60})\s*</g)]
    .map(m => ({ href: m[1], text: decode(m[2]).trim() }))
    .filter(x => x.text && !/^(read more|view cart|checkout|menu|search)$/i.test(x.text))
    .slice(0, 120),
  headings: [...home.matchAll(/<h[1-3][^>]*class="[^"]*elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map(m => strip(m[1])).filter(Boolean),
  text: strip(home).split('\n').slice(0, 400).join('\n'),
  images: imgs(home)
};

// ---- dealers ----
const dh = read('dealers.html');
out.dealerRaw = strip(dh).split('\n').slice(0, 500).join('\n');
out.dealerImages = imgs(dh);

// ---- faqs ----
const fh = read('faq.html');
out.faqRaw = strip(fh).split('\n').slice(0, 600).join('\n');

fs.writeFileSync(path.join(__dirname, 'extracted.json'), JSON.stringify(out, null, 2), 'utf8');
console.log('models:', out.models.length, 'pages:', out.pages.length, 'home headings:', out.home.headings.length, 'nav:', out.home.nav.length);
