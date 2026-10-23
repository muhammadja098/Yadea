'use strict';
// Downloads all referenced images from yadea.com.pk into public/img and rewrites db/data/*.json to local paths.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'db', 'data');
const IMG = path.join(__dirname, '..', 'public', 'img');
fs.mkdirSync(IMG, { recursive: true });

const files = fs.readdirSync(DATA).filter(f => f.endsWith('.json'));
const data = {};
for (const f of files) data[f] = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8').replace(/^\uFEFF/, ''));

const urls = new Set();
const add = (u) => { if (u && /^https?:\/\/yadea\.com\.pk\//.test(u)) urls.add(u); };
for (const m of data['models.json']) { add(m.hero_image); (m.gallery || []).forEach(add); }
for (const p of data['posts.json']) add(p.image);
for (const s of data['home.json'].hero_slides) add(s.image);
['https://yadea.com.pk/wp-content/uploads/2023/12/logo2.046575da.svg',
 'https://yadea.com.pk/wp-content/uploads/2023/12/cropped-favicon.png',
 'https://yadea.com.pk/wp-content/uploads/2026/06/web.jpg',
 'https://yadea.com.pk/wp-content/uploads/2026/05/2-3.png'].forEach(add);

const map = {};
const ext = (u) => { const m = u.split('?')[0].match(/\.(png|jpe?g|webp|svg|gif)$/i); return m ? m[1].toLowerCase() : 'png'; };

async function download(u) {
  const name = crypto.createHash('md5').update(u).digest('hex').slice(0, 12) + '.' + ext(u);
  const dest = path.join(IMG, name);
  map[u] = '/img/' + name;
  if (fs.existsSync(dest)) return;
  try {
    const href = encodeURI(u);
    const res = await fetch(href, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) throw new Error('too small');
    fs.writeFileSync(dest, buf);
    process.stdout.write('.');
  } catch (e) {
    delete map[u];
    console.error('\nFAIL', u.slice(-60), e.message);
  }
}

(async () => {
  const list = [...urls];
  for (let i = 0; i < list.length; i += 6) {
    await Promise.all(list.slice(i, i + 6).map(download));
  }
  const remap = (u) => map[u] || u;
  for (const m of data['models.json']) {
    m.hero_image = remap(m.hero_image);
    m.gallery = (m.gallery || []).map(remap);
  }
  for (const p of data['posts.json']) p.image = remap(p.image);
  for (const s of data['home.json'].hero_slides) s.image = remap(s.image);
  data['home.json'].logo = map['https://yadea.com.pk/wp-content/uploads/2023/12/logo2.046575da.svg'] || '/img/logo.svg';
  data['home.json'].og_image = map['https://yadea.com.pk/wp-content/uploads/2026/06/web.jpg'] || '';
  fs.writeFileSync(path.join(DATA, 'home.json'), JSON.stringify(data['home.json'], null, 2));
  for (const f of files) if (f !== 'home.json') fs.writeFileSync(path.join(DATA, f), JSON.stringify(data[f], null, 2));
  console.log('\nDownloaded', Object.keys(map).length, 'of', urls.size, 'images into public/img');
})();
