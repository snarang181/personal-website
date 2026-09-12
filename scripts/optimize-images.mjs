import sharp from 'sharp';
import fs from 'node:fs';

// Portrait: bake in EXIF rotation (a resize would otherwise drop it and ship
// the photo sideways), then cap the long edge. Astro's <Image> takes it from here.
const src = 'images/profile-photo.jpg';
const out = 'src/assets/profile-photo.jpg';
const before = fs.statSync(src).size;
await sharp(src).rotate().resize({ width: 900, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true }).toFile(out + '.tmp');
fs.renameSync(out + '.tmp', out);
const m = await sharp(out).metadata();
console.log(`portrait   ${(before/1024).toFixed(0)}KB → ${(fs.statSync(out).size/1024).toFixed(0)}KB  (${m.width}x${m.height}, orient baked)`);

// Logos render at 30x30; ship them at 2x and no larger.
for (const f of fs.readdirSync('public/images')) {
  const p = `public/images/${f}`;
  const b = fs.statSync(p).size;
  const img = sharp(p).rotate().resize({ height: 64, withoutEnlargement: true });
  const buf = f.endsWith('.png')
    ? await img.png({ compressionLevel: 9, palette: true }).toBuffer()
    : await img.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  fs.writeFileSync(p, buf);
  console.log(`${f.padEnd(24)} ${(b/1024).toFixed(0)}KB → ${(buf.length/1024).toFixed(1)}KB`);
}
