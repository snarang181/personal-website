export interface FeaturedProject {
  title: string;
  dialect: string;
  body: string;
  ops?: string[];
  links: { label: string; href: string }[];
}

export interface AppProject {
  title: string;
  stack: string;
  body: string;
  link?: { label: string; href: string };
}

export const featured: FeaturedProject[] = [
  {
    title: 'LLVM & MLIR upstream',
    dialect: 'open source',
    body: 'Ongoing contributor to the LLVM project. Patches across MLIR, Clang, LLVM optimization passes and Flang.',
    links: [
      {
        label: '→ View patches',
        href: 'https://github.com/llvm/llvm-project/commits/main?author=snarang181',
      },
    ],
  },
  {
    title: 'zkDuel',
    dialect: 'Triton · CUDA · Python',
    body: 'Artifact for the <a class="inline-link" href="https://doi.org/10.1145/3857307.3857312">HASP 2026 paper</a>. Matched Triton and CUDA implementations of the same SumCheck prover kernels over prime fields, plus the drivers that time and check them.',
    links: [{ label: '→ GitHub', href: 'https://github.com/snarang181/zk-duel' }],
  },
  {
    title: 'YARROW',
    dialect: 'Verilog · Python',
    body: 'An RTL debugging loop on top of <a class="inline-link" href="https://github.com/ucb-bar/chia">CHIA</a> that verifies a patch independently, then checks the agent\'s diagnosis against a simulation-derived first-divergence label. Artifact for <em>Right Fix, Wrong Reason: Repair and Diagnosis in a CHIA RTL Debugging Loop</em>, accepted at the A³ Workshop CHIA hackathon, MICRO 2026.',
    links: [{ label: '→ GitHub', href: 'https://github.com/snarang181/yarrow' }],
  },
  {
    title: 'Microtick',
    dialect: 'MLIR · LLVM · C++',
    body: 'An experimental MLIR dialect for high-frequency trading strategies, lowered end to end into a shared library a C++ engine runs against a toy market.',
    ops: ['tick.on_book', 'tick.order.send', 'tick.order.cancel', 'tick.risk.*'],
    links: [{ label: '→ GitHub', href: 'https://github.com/snarang181/microtick' }],
  },
];

export const apps: AppProject[] = [
  {
    title: 'CaptureMyHippo',
    stack: 'Flutter · Flask · AWS Lambda · DynamoDB',
    body: 'A social app for recording memories for family, on a serverless AWS backend.',
  },
  {
    title: 'CryptoPriceAlert',
    stack: 'Flutter · Flask · Firebase',
    body: 'Price alerts for crypto traders, wired into exchange APIs for real-time data.',
    link: {
      label: 'App Store',
      href: 'https://apps.apple.com/us/app/crypto-price-alerts-widgets/id1614911718',
    },
  },
];

export const skills = {
  proficient: ['C', 'C++', 'Python', 'MLIR', 'LLVM', 'PyTorch', 'Assembly', 'Git', 'Unix', 'Flutter'],
  familiar: ['Java', 'RISC-V ISA', 'SQL', 'TensorFlow'],
};
