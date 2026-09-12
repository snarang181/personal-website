#!/usr/bin/env node
// Scaffold a new post:  npm run new -- "My Post Title"
import fs from 'node:fs';
import path from 'node:path';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: npm run new -- "My Post Title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[’'"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const file = path.join('src/content/writing', `${slug}.md`);
if (fs.existsSync(file)) {
  console.error(`Already exists: ${file}`);
  process.exit(1);
}

// local time with offset, matching the existing posts
const d = new Date();
const off = -d.getTimezoneOffset();
const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
const stamp =
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
  `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
  `${off >= 0 ? '+' : '-'}${pad(off / 60)}:${pad(off % 60)}`;

fs.writeFileSync(
  file,
  `---
title: ${JSON.stringify(title)}
description: "One sentence. Shown on the blog index, the homepage, RSS, and link previews."
date: ${stamp}
tags: []
showToc: true
draft: true
---

Opening paragraph.

## First heading

Prose. Tag your code fences with a language so they highlight:

\`\`\`mlir
%0 = arith.addi %a, %b : i32
\`\`\`
`,
);

console.log(`✓ ${file}`);
console.log(`  URL when published: /tiled-thoughts/posts/${slug}/`);
console.log(`  It is draft:true — flip to false to publish.`);
