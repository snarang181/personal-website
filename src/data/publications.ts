export interface Publication {
  venue: string;
  title: string;
  authors: string;
  url: string;
}

// Links restored from the previous site — the mockup dropped all three.
// Normalised to arXiv /abs/ landing pages rather than direct /pdf/.
export const publications: Publication[] = [
  {
    venue: 'MLBench @ ASPLOS 2026',
    title: 'Analyzing Latency Hiding and Parallelism in an MLIR-based AI Kernel Compiler',
    authors: 'Javed Absar, <span class="you">Samarth Narang</span>, Muthu Baskaran',
    url: 'https://arxiv.org/abs/2602.20204',
  },
  {
    venue: 'arXiv preprint · 2026',
    title: "Hexagon-MLIR: Qualcomm's NPU AI MLIR Compiler",
    authors: 'Qualcomm AI Compiler Team',
    url: 'https://arxiv.org/abs/2602.19762',
  },
  {
    venue: 'C4ML @ CGO 2025',
    title: 'Tensor Evolution: A Framework for Fast Evaluation of Tensor Computations using Recurrences',
    authors: 'Javed Absar, <span class="you">Samarth Narang</span>, Muthu Baskaran',
    url: 'https://arxiv.org/abs/2502.03402',
  },
];
