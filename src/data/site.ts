export const site = {
  name: 'Samarth Narang',
  role: 'Deep Learning Compiler Engineer',
  blurb:
    'I work on the part of the stack between a tensor op and the instruction that actually runs it — MLIR, LLVM, and the passes in between.',
  location: 'NVIDIA · New York, NY',
  email: 'samarth.colleges@gmail.com',
  github: 'https://github.com/snarang181',
  blog: '/tiled-thoughts/',
  url: 'https://samarthnarang.com',

  // Flagged during review: this was published on the old site and in the mockup.
  // Hidden by default — flip to true to render it in the contact fineprint.
  showPhone: false,
  phone: '+1 (413) 512-3313',

  seo: {
    title: 'Samarth Narang — ML Compiler Engineer',
    description:
      'Deep learning compiler engineer at NVIDIA. MLIR, LLVM, tiling, vectorization, NPU and GPU codegen.',
  },
} as const;

export const nav = [
  { id: 'about', label: 'about', stage: '· who' },
  { id: 'experience', label: 'experience', stage: '· 4 yrs' },
  { id: 'education', label: 'education', stage: '· 2' },
  { id: 'publications', label: 'publications', stage: '· 3' },
  { id: 'projects', label: 'projects', stage: '· 5' },
  { id: 'writing', label: 'writing', stage: '· blog' },
  { id: 'skills', label: 'skills', stage: '· stack' },
  { id: 'contact', label: 'contact', stage: '· hi' },
] as const;
