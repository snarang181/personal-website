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
  link: { label: string; href: string };
}

export const featured: FeaturedProject[] = [
  {
    title: 'Microtick',
    dialect: 'MLIR · LLVM · C++',
    body: 'An experimental domain-specific language for high-frequency trading strategies, built on MLIR. A custom <code>tick</code> dialect plus an end-to-end lowering pipeline that takes strategy IR down to a shared library a C++ engine can <code>dlopen</code> and run against a toy market with fills, positions, and P&amp;L.',
    ops: ['tick.on_book', 'tick.order.send', 'tick.order.cancel', 'tick.risk.*'],
    links: [{ label: '→ GitHub', href: 'https://github.com/snarang181/microtick' }],
  },
  {
    title: 'LLVM & MLIR upstream',
    dialect: 'open source',
    body: 'Ongoing contributor to the LLVM project — patches across MLIR, Clang, LLVM optimization passes, and Flang.',
    links: [
      {
        label: '→ View patches',
        href: 'https://github.com/llvm/llvm-project/commits/main?author=snarang181',
      },
    ],
  },
];

export const apps: AppProject[] = [
  {
    title: 'CaptureMyHippo',
    stack: 'Flutter · Flask · AWS Lambda · DynamoDB',
    body: 'A non-conventional social app for recording memories for family and loved ones, on a serverless AWS backend.',
    link: {
      label: 'App Store',
      href: 'https://apps.apple.com/us/app/capturemyhippo/id1631258770',
    },
  },
  {
    title: 'NoFinishLine',
    stack: 'Flutter · Flask · AWS · Boto3',
    body: 'iOS workout tracker over a searchable exercise database with levels, categories, and instructions, backed by a RESTful API.',
    link: { label: 'GitHub', href: 'https://github.com/snarang181/NoFinishLineApp' },
  },
  {
    title: 'CryptoPriceAlert',
    stack: 'Flutter · Flask · Firebase',
    body: 'Price alerts for crypto traders, wired into major exchange APIs for real-time data.',
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
