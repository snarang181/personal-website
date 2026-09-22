export type PatentStatus = 'filed' | 'published' | 'granted';

export interface Patent {
  title: string;
  status: PatentStatus;
  /** Application, publication, or grant number. */
  number?: string;
  /** Filing date, ISO. Rendered as an abbreviated month. */
  filed?: string;
  assignee?: string;
  /** Same convention as publications: wrap your own name in the `you` span. */
  inventors?: string;
  /** Google Patents / USPTO link, once the application is public. */
  url?: string;
}

// Generated from the filing spreadsheet. Titles that were filed entirely in
// capitals are shown in title case; mixed-case titles are left verbatim.
export const patents: Patent[] = [
  { title: "Shadow-Semantics Canary Synthesis for Tensor Compilers",
    status: 'filed', number: '19/811,584', filed: '2026-09-18' },
  { title: "Certifying Multi-Agent Workflow Execution via Artifact Lineage Analysis",
    status: 'filed', number: '19/808,285', filed: '2026-09-15' },
  { title: "Witness-Carrying Tensor Index Lowering for GPU Tensor Compilers",
    status: 'filed', number: '19/802,330', filed: '2026-09-09' },
  { title: "Agentic Negotiation of Paired Hardware-Software Accelerator Design Points",
    status: 'filed', number: '19/801,656', filed: '2026-09-09' },
  { title: "Asynchronous Proof-Carrying Compilation for Tensor Compiler Transformations",
    status: 'filed', number: '19/801,826', filed: '2026-09-09' },
  { title: "Secure Hash-Chained Compiler Pass Pipelines for Compiler Transformations",
    status: 'filed', number: '19/780,444', filed: '2026-08-19' },
  { title: "Proof-Checking Processor for Verified Execution of Kernels",
    status: 'filed', number: '19/780,382', filed: '2026-08-19' },
  { title: "Correctness- and Coverage-Guided Auto-Sharding for Distributed Tensor Compilers",
    status: 'filed', number: '19/733,249', filed: '2026-07-07' },
  { title: "Retrieval-Augmented Verification and Triage for Compiler and Kernel Transformations",
    status: 'filed', number: '19/723,891', filed: '2026-06-29' },
  { title: "Agent-Operable Hardware and Compiler Capability Descriptors for Accelerator Optimization",
    status: 'filed', number: '19/723,856', filed: '2026-06-29' },
  { title: "Accelerator-Aware Differential Validation for Tensor Compiler Transformations",
    status: 'filed', number: '19/678,738', filed: '2026-05-15' },
  { title: "Numerical Correctness Contracts for Tensor Compilers",
    status: 'filed', number: '19/676,407', filed: '2026-05-13' },
];
