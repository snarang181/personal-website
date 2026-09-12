export interface Role {
  start: string;
  end: string;
  title: string;
  org: string;
  logo: string;
  logoFill?: boolean;
  groups?: { heading?: string; points: string[] }[];
  tags?: string[];
}

export const experience: Role[] = [
  {
    start: 'Mar 2026',
    end: 'Present',
    title: 'Deep Learning Compiler Engineer',
    org: 'NVIDIA',
    logo: '/images/mark-nvidia.png',
    groups: [
      {
        points: [
          'Formal methods of verification for MLIR-based deep learning compilers.',
          '…and agents.',
        ],
      },
    ],
    tags: ['MLIR', 'formal verification', 'LLVM'],
  },
  {
    start: 'Jan 2024',
    end: 'Mar 2026',
    title: 'Deep Learning Compiler Engineer',
    org: 'Qualcomm',
    logo: '/images/mark-qualcomm.png',
    logoFill: true,
    groups: [
      {
        points: [
          'One of the core contributors to a new MLIR-based compiler stack for Qualcomm\'s AI inference on Hexagon NPUs — from prototyping through benchmarking of the Triton-based compilation path. Open sourced at <a class="inline-link" href="https://github.com/qualcomm/hexagon-mlir">qualcomm/hexagon-mlir</a>.',
          'Extended a sequence of MLIR passes — multi-level tiling, fusion, vectorization, multithreading — culminating in lowering to LLVM for NPU backend codegen.',
          "Worked on the tiling algorithms used by Qualcomm's proprietary Hexagon NPU compiler for on-device AI inference.",
          'Handled critical performance issues hit by customers running LLMs on Qualcomm NSPs.',
        ],
      },
    ],
    tags: ['MLIR', 'Triton', 'tiling', 'fusion', 'vectorization', 'NPU'],
  },
  {
    start: 'Jun 2023',
    end: 'Jan 2024',
    title: 'Machine Learning Engineer',
    org: 'DeGirum',
    logo: '/images/mark-degirum.png',
    logoFill: true,
    groups: [
      {
        heading: 'ML compiler backend',
        points: [
          "Built out an AI compiler for DeGirum's hardware accelerator, focused on performance and widening the set of models it could compile.",
          'Implemented SIMD parallelism, vector processing, and pipelining strategies to cut data movement and memory footprint.',
          'Extended the compiler to support LLMs, working through the details of transformer architectures.',
          'Benchmarked CPU cores on FPGA to decide what to offload during real-time model execution.',
        ],
      },
      {
        heading: 'ML deployment infrastructure',
        points: [
          'Compiled models with the DeGirum compiler and integrated them into the DeGirum ecosystem via a Flask API.',
          'Wrote the PyTest suites and CI/CD pipelines that automated deployment and testing.',
        ],
      },
    ],
    tags: ['SIMD', 'LLM support', 'FPGA', 'Flask', 'CI/CD'],
  },
  {
    start: 'May 2022',
    end: 'May 2023',
    title: 'Software Engineering Co-op',
    org: 'DeGirum',
    logo: '/images/mark-degirum.png',
    logoFill: true,
    groups: [
      {
        heading: 'Machine learning team · Aug 2022 – May 2023',
        points: [
          'Compiled PyTorch models onto company-specific compilers; handled FP32 → UInt8 quantization to widen model coverage.',
          "Ported <strong>132 models</strong> (quantized and float) from the <code>timm</code> repository into DeGirum's model zoo.",
        ],
      },
      {
        heading: 'Embedded software team · Feb 2022 – Aug 2022',
        points: [
          'Built a UART interface monitor in RISC-V assembly as a field-engineer debug tool.',
          'Wrote ROM code routines for MBIST operations and redesigned the existing MBIST tests to finish <strong>40% faster</strong>.',
          'Wrote embedded C tests for pre-silicon RTL validation and extended the Verilog test bench.',
        ],
      },
    ],
    tags: ['PyTorch', 'quantization', 'RISC-V', 'MBIST', 'Verilog'],
  },
];

export const education: Role[] = [
  {
    start: 'Aug 2024',
    end: 'Aug 2025',
    title: 'M.S. Computer Science',
    org: 'UT Austin',
    logo: '/images/mark-ut.png',
    groups: [
      {
        points: [
          'GPA 3.94. Coursework in compiler construction and implementation of programming languages, virtualization, NLP, reinforcement learning, generative AI, and optimization.',
        ],
      },
    ],
  },
  {
    start: 'Aug 2020',
    end: 'May 2023',
    title: 'B.S. Computer Science & Mathematics',
    org: 'UMass Amherst',
    logo: '/images/mark-umass.png',
    groups: [
      {
        points: [
          'GPA 3.98 — Summa Cum Laude, Dean\'s List every semester, Chancellor\'s Scholarship ($16,000/yr).',
          'Coursework in operating systems, networking, computer systems, algorithms and data structures, machine learning, and regression analysis.',
        ],
      },
    ],
  },
];
