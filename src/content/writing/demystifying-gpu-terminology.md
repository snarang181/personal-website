---
title: "Demystifying GPU Terminology: A Compiler Engineer’s Field Guide"
description: "SIMD, warps, occupancy, coalescing, shared memory, spills and matrix units — mapped to real compiler decisions."
date: 2025-11-09T00:00:00-05:00
tags: ["Gpu", "Performance", "Compilers", "MLIR", "Triton", "CUDA", "ROCm"]
showToc: true
draft: false
---
SIMD, warps, occupancy, coalescing, shared memory, spills, and matrix
units—mapped to real compiler decisions.

> GPUs aren’t mysterious - just *picky*. Most performance cliffs are not
> about the math; they’re about how warps step, how memory is fetched,
> and how often the registers spill. This post decodes the jargon; and
> to be candid, it is me “spilling” my notes, trying to explain myself.

## TL;DR

- **Think in warps**, not threads.
- **Coalesce or pay**.
- **Tile for reuse** in shared memory, but watch the *register
  pressure*.
- **Matrix units** (Tensor Cores, FMAs, etc) love the *right* data types
  and tile sizes.
- **Occupancy** is a balancing act: a tool, not a goal. Just enough to
  hide latency.

------------------------------------------------------------------------

## 1. Execution Model, Decoded

### SIMT vs SIMD (why is it confusing?)

- **SIMD (CPU):** Single Instruction, Multiple Data. One instruction
  operates on a fixed-width vector (e.g., a single AVX-512 instruction
  processes 16 floats at once).
- **SIMT (GPU):** Single Instruction, Multiple Threads. Many threads
  execute the same instruction **in lockstep** as a *warp* (NVIDIA) or
  *wavefront* (AMD); each thread has its own registers/control flow.

### Warps/Wavefronts

Smallest lockstep unit:

- NVIDIA: **warp** = 32 threads
- AMD: **wavefront** = 32/64 threads (depending on architecture)

**Tip:** choose block sizes as multiples of warp size (e.g., 128, 256)
to maximize utilization.

### CTA (Cooperative Thread Array) / Workgroup

A cooperatively scheduled group of threads sharing on-chip memory and
synchronization (barriers).

**Balance:**

1.  Enough warps to hide latency.
2.  Avoid **register pressure** that causes spills.
3.  Keep **shared memory** usage in check.

### Occupancy (It’s not a religion)

Active warps per Streaming Multiprocessor (SM) / Compute Unit (CU)
relative to the maximum possible. This helps hide latency but chasing
100% occupancy can backfire due to increased register pressure and
shared memory contention.

------------------------------------------------------------------------

## 2. Memory Hierarchy (where performance is won and lost)

**Registers -> Shared Memory (L1) -> L2 Cache -> Global Memory
(HBM/DRAM)**

Latency increases and bandwidth decreases as you go down the hierarchy.

### Coalesced Access (the golden rule)

Adjacent threads access adjacent addresses -> fewer memory transactions
-> higher effective bandwidth.

**Layout Matters:** NHWC/NCHW/blocked layouts decide whether
`threadIdx.x` walks through contiguous memory.

**Quick Check:** If indexing `A[threadIdx.x]` results in strided access,
performance will suffer.

### Shared Memory (on-chip scratchpad)

On-chip, software-managed cache memory.

- Perfect for **tiling** working sets to maximize data reuse.
- Beware of **bank conflicts**: ensure threads access different memory
  banks to avoid serialization.

**Trick:** Add padding to spread accesses across banks.

### Spills (the invisible tax)

Too many live variables lead to register spills to local memory
(off-chip), causing massive slowdowns.

**Mitigation:**

- Shorten live ranges. (e.g. reorder, store intermediate results in
  shared memory)
- Fuse judiciously to reduce temporary variables.
- Split kernels if necessary.

------------------------------------------------------------------------

## 3. Math Units: Matrix Engines, Precision, and Shapes

Modern GPUs ship with specialized matrix units (Tensor Cores on NVIDIA,
Matrix Cores on AMD) that accelerate matrix multiplications and
convolutions.

- **NVIDIA:** Tensor Core
- **AMD:** Matrix Core
- **Intel:** XMX (GPU) / AMX (CPU)

They love:

- **Low precision types:** FP16, BF16, INT8, etc.
- **Right tile sizes:** which vary by architecture, but multiples
  aligning to MMA (Matrix Multiply-Accumulate) shapes are best (e.g.,
  16x16 for NVIDIA Tensor Cores).
- Proper **accumulation types** to avoid precision loss. e.g., multiply
  in FP16, accumulate in FP32.

**Compiler Move:** Choose pack/layout + tile sizes that map **exactly**
to these hardware shapes for maximum throughput. “Almost right” shapes
silently leave throughput on the table.

------------------------------------------------------------------------

## 4. Scheduling and Latency Hiding

### Warp Scheduling

SMs/CUs keep several warps ready to execute. When one warp stalls (e.g.,
waiting for memory), another can run, hiding latency. If you
under-provision warps (low occupancy), the GPU may sit idle.

### Divergence and Predication

If a branch is hot and divergent (threads in a warp take different
paths), the warp serializes execution, hurting performance. We can then
“flatten” branches with **predication** or **data-parallel**
transformations. If a branch is rare but heavy, split into separate
kernels.

------------------------------------------------------------------------

## 5. Vendor Term Crosswalk

| Concept        | NVIDIA       | AMD               | Intel              |
|----------------|--------------|-------------------|--------------------|
| Lockstep unit  | Warp (32)    | Wavefront (32/64) | Sub-group (varies) |
| SM/CU block    | SM           | CU                | Xe-core            |
| Matrix engines | Tensor Cores | MFMA/WMMA         | XMX (GPU) / AMX    |

> Use the crosswalk to translate docs without changing mental models.

------------------------------------------------------------------------

## 6. Checklists you will actually use

**Block size sweep (first pass):**

- Start at **warp-size multiples**.
- Cap registers/thread; if spills occur, reduce tile size or split
  computation.
- Keep shared memory < threshold.

**Coalescing Sanity:**

- Ensure `threadIdx.x` accesses contiguous memory.
- If strided, consider layout transformations, add a **pack** step, or
  adjust indexing.

**Shared Memory Tiling:**

- Tile only when **reuse > copy-in + copy-out cost**.
- Add **padding** to avoid bank conflicts. (even 1 element can help)

**Matrix Unit Mapping:**

- Match **dtypes** and **tile sizes** to hardware specs.
- Prefer **fp32 accumulations** when using low-precision inputs.

------------------------------------------------------------------------

## 7. Quick Reference Cheat Sheet

**Execution Stack**

Grid -> Block (CTA) -> Warp -> Thread

**Memory Stack**

Registers -> Shared Memory -> L2 Cache -> Global Memory

**Coalesced vs Non-coalesced**

*Threads*: t0, t1, t2, t3, t4, t5, t6, t7

*Coalesced*: A[0], A[1], A[2], A[3], A[4], A[5], A[6],
A[7]

*Non-coalesced*: A[0], A[8], A[16], A[24]…

