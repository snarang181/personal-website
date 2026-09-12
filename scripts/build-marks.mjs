import sharp from 'sharp';
const SP = process.env.SP || '.';
const OUT = 'public/images';

// Crop each brand asset down to its MARK, dropping the wordmark text that makes
// the lockups too wide for a square tile (the company name sits beside it anyway).
//   fill:true  → the asset carries its own background; let it cover the tile
//   fill:false → transparent/white-ground mark, centred on the light plate
const MARKS = {
  nvidia:   { src: 'nvidia-logo.png',        crop: { left: 365, top: 123, width: 462, height: 306 }, fill: false },
  qualcomm: { src: 'qualcomm-logo.png',      crop: null,                                            fill: true  },
  degirum:  { src: 'degirum-logo.jpeg',      crop: { left: 37,  top: 52,  width: 60,  height: 60  }, fill: true  },
  umass:    { src: 'umass-amherst-logo.png', crop: { left: 0,   top: 0,   width: 123, height: 141 }, fill: false },
  ut:       { src: 'ut-austin-logo.png',     crop: null,                                            fill: false },
};

const SIZE = 72; // 2.4x the 30px tile, for crisp rendering

for (const [name, cfg] of Object.entries(MARKS)) {
  let img = sharp(`images/${cfg.src}`).rotate();
  if (cfg.crop) img = img.extract(cfg.crop);

  let buf = await img.png().toBuffer();
  // trim uniform surroundings so every mark fills its box optically
  try { buf = await sharp(buf).trim({ threshold: 12 }).png().toBuffer(); } catch {}

  const inner = cfg.fill ? SIZE : Math.round(SIZE * 0.78); // padding for plated marks
  const fitted = await sharp(buf)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const pad = Math.round((SIZE - inner) / 2);
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
    .composite([{ input: fitted, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/mark-${name}.png`);
  console.log(`✓ mark-${name}.png  fill=${cfg.fill}`);
}

// verification sheet: real 30px tiles, shown at 4x, on the actual card surface
const order = ['nvidia','qualcomm','degirum','degirum','ut','umass'];
const TILE = 120, GAP = 34;
const comps = []; let x = GAP;
for (const n of order) {
  const plate = n === 'qualcomm' || n === 'degirum' ? null : '#f2f4f7';
  const logo = await sharp(`${OUT}/mark-${n}.png`).resize(TILE, TILE).toBuffer();
  const tile = await sharp({ create: { width: TILE, height: TILE, channels: 4,
      background: plate ? plate : { r:0,g:0,b:0,alpha:0 } } })
    .composite([{ input: logo }]).png().toBuffer();
  comps.push({ input: tile, top: GAP, left: x });
  x += TILE + GAP;
}
await sharp({ create: { width: x, height: TILE + GAP*2, channels: 4, background: '#12151b' } })
  .composite(comps).png().toFile(`${SP}/sheet-marks.png`);
console.log('\nsheet →', `${SP}/sheet-marks.png`);
