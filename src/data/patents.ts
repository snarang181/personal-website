export type PatentStatus = 'filed' | 'published' | 'granted';

export interface Patent {
  title: string;
  status: PatentStatus;
  /** Application, publication, or grant number. */
  number?: string;
  /** Filing or publication date, e.g. 'March 2026'. */
  date?: string;
  assignee?: string;
  /** Same convention as publications: wrap your own name in the `you` span. */
  inventors?: string;
  /** Google Patents / USPTO link, once the application is public. */
  url?: string;
}

// Titles normalised to title case; several were supplied in all caps.
export const patents: Patent[] = [
  { title: 'Shadow-Semantics Canary Synthesis for Tensor Compilers',                          status: 'filed', number: '19/811,584' },
  { title: 'Certifying Multi-Agent Workflow Execution via Artifact Lineage Analysis',         status: 'filed', number: '19/808,285' },
  { title: 'Witness-Carrying Tensor Index Lowering for GPU Tensor Compilers',                 status: 'filed', number: '19/802,330' },
  { title: 'Agentic Negotiation of Paired Hardware-Software Accelerator Design Points',       status: 'filed', number: '19/801,656' },
  { title: 'Asynchronous Proof-Carrying Compilation for Tensor Compiler Transformations',     status: 'filed', number: '19/801,826' },
  { title: 'Secure Hash-Chained Compiler Pass Pipelines for Compiler Transformations',        status: 'filed', number: '19/780,444' },
  { title: 'Proof-Checking Processor for Verified Execution of Kernels',                      status: 'filed', number: '19/780,382' },
  { title: 'Correctness- and Coverage-Guided Auto-Sharding for Distributed Tensor Compilers', status: 'filed', number: '19/733,249' },
  { title: 'Retrieval-Augmented Verification and Triage for Compiler and Kernel Transformations', status: 'filed', number: '19/723,891' },
  { title: 'Agent-Operable Hardware and Compiler Capability Descriptors for Accelerator Optimization', status: 'filed', number: '19/723,856' },
  { title: 'Accelerator-Aware Differential Validation for Tensor Compiler Transformations',   status: 'filed', number: '19/678,738' },
  { title: 'Numerical Correctness Contracts for Tensor Compilers',                            status: 'filed', number: '19/676,407' },
];
