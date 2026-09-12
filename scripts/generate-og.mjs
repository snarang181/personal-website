import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff9e5e" stop-opacity=".10"/>
      <stop offset="60%" stop-color="#7fa8d9" stop-opacity=".06"/>
      <stop offset="100%" stop-color="#0a0b0e" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0b0e"/>
  <rect width="1200" height="630" fill="url(#wash)"/>
  <rect x="0" y="0" width="1200" height="4" fill="#ff9e5e"/>

  <g font-family="IBM Plex Mono, ui-monospace, Menlo, monospace">
    <text x="84" y="150" fill="#767f8e" font-size="22" letter-spacing="5">SAMARTHNARANG.COM</text>
    <text x="84" y="268" fill="#e9ecf1" font-size="76" font-weight="600" letter-spacing="-3">Samarth Narang</text>
    <text x="84" y="330" fill="#ff9e5e" font-size="30" font-weight="500">Deep Learning Compiler Engineer</text>
    <text x="84" y="404" fill="#a8b0be" font-size="25">MLIR · LLVM · tiling · vectorization · GPU and NPU codegen</text>

    <text x="84" y="516" fill="#8fd0a0" font-size="23">linalg</text>
    <text x="181" y="516" fill="#2e3543" font-size="23">›</text>
    <text x="211" y="516" fill="#7fa8d9" font-size="23">scf</text>
    <text x="268" y="516" fill="#2e3543" font-size="23">›</text>
    <text x="298" y="516" fill="#b79cf0" font-size="23">vector</text>
    <text x="395" y="516" fill="#2e3543" font-size="23">›</text>
    <text x="425" y="516" fill="#e3b778" font-size="23">nvvm</text>
    <text x="508" y="516" fill="#2e3543" font-size="23">›</text>
    <text x="538" y="516" fill="#ff9e5e" font-size="23">ptx</text>
  </g>

  <g fill="#ff9e5e">
    <rect x="1010" y="452" width="106" height="11" rx="5.5"/>
    <rect x="1024" y="482" width="78"  height="11" rx="5.5" opacity=".75"/>
    <rect x="1038" y="512" width="50"  height="11" rx="5.5" opacity=".5"/>
  </g>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('✓ public/og.png');
