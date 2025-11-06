---
title: "Tile, Fuse, Repeat: Why Layout Matters for AI Performance"
date: 2025-11-05
draft : false
description: "How data layout, tiling, and fusion shape modern ML compiler performance - from tensors to cache lines."
tags: ["MLIR", "Tiling", "Compilers", "Performance", "Triton"]
ShowToc: true
cover:
# Asset is in blog-src/assets/tile-fuse-repeat.png
  src: "/images/tile-fuse-repeat.png"
  alt: "A stylized image of data tiles being fused together."
---

> *Every time a neural network runs, there's a silent negotiation between compute and memory.*

It's naive to think ML compilers optimize just the compute - the FLOPs. In reality, they optimize *movement*. The most expensive operation in modern compute isn't your matrix multiply; it's getting data from memory to the compute units.
This post explores how **layout**, **tiling**, and **fusion** are the unsung heroes of ML compiler performance.

---

## 1. The Compiler's Hidden Battle

Deep Learning performance is a balancing act between **compute** and **memory**. You can think of layout as the *grammar* of that relationship - the way tensors are arranged, accessed, and aligned. 

Whether it's NHWC vs. NCHW, blocked vs. packed, or interleaved for a Digital Signal Processor (DSP), the layout dictates cache (scratchpad) reuse and parallelism. During my work on ML Compilers, I've seen how a well-chosen layout can make or break performance.

---

## 2. Tiling: Breaking Down the Problem

Tiling splits large tensors into smaller, cache-sized tiles. Each tile is small enough to fit into fast local memory (L1/L2 or SRAM), reducing cache misses and data movement. 

```text
[ Large Tensor ]
         |
   +-----+-----+
   |           |
[ Tile 1 ] [ Tile 2 ]

-> split into tiles that fit in cache
-> process each tile independently
-> recombine results
-> write back to main memory
```

In MLIR, this concept shows us explicitly:

```mlir
%packed = linalg.pack %input
          inner_dims_pos = [1, 2]
          inner_tiles = [8, 8]
          into %packed_type
```
The `linalg.pack` operation materializes a new layout that is more friendly for the next computation - the compiler's way of saying "I'll arrange the furniture before the guests arrive."

---

## 3. Fusion: Keeping Data Hot

Once the data is well-tiled, the next goal is to **avoid writing it back**. 

That's where fusion comes in - combining multiple operations into one loop nest or kernel so intermediate results stay "hot" in registers or cache.

For example, 

```mlir
// Unfused version
%matmul_out = linalg.matmul
    ins(%A, %B : tensor<64x64xf32>, tensor<64x64xf32>)
    outs(%tmp : tensor<64x64xf32>)

%relu = linalg.generic {
    indexing_maps = [
        affine_map<(i,j) -> (i,j)>,   // read
        affine_map<(i,j) -> (i,j)>    // write
    ],
    iterator_types = ["parallel", "parallel"]
} ins(%matmul_out : tensor<64x64xf32>)
  outs(%result : tensor<64x64xf32>) {
    ^bb0(%x: f32, %y: f32):
      %zero = arith.constant 0.0 : f32
      %max = arith.maxf %x, %zero : f32
      linalg.yield %max : f32
} -> tensor<64x64xf32>

// Fused version
%fused = linalg.generic {
    indexing_maps = [
        affine_map<(m,k,n) -> (m,k)>,   // A
        affine_map<(m,k,n) -> (k,n)>,   // B
        affine_map<(m,k,n) -> (m,n)>    // C
    ],
    iterator_types = ["parallel", "reduction", "parallel"]
} ins(%A, %B : tensor<64x64xf32>, tensor<64x64xf32>)
  outs(%result : tensor<64x64xf32>) {
    ^bb0(%a: f32, %b: f32, %c: f32):
      %prod = arith.mulf %a, %b : f32
      %sum  = arith.addf %c, %prod : f32
      %zero = arith.constant 0.0 : f32
      %relu = arith.maxf %sum, %zero : f32
      linalg.yield %relu : f32
} -> tensor<64x64xf32>
```

Fusing eliminates the need to write `matmul_out` back to memory, keeping data in fast storage and reducing latency. In the fused case, the `arith.maxf` (ReLU) happens inside the same loop nest as the accumulation, so `%sum` never leaves registers or the cache. 
No extra kernel launch, no intermediate writes - just tighter, hotter loops.

---

## 4: The Layout Tug-of-War

Layouts aren't a one-size-fits-all solution. Different hardware architectures have different optimal layouts.
For example: 

- **NHWC** favors channels-last access patterns, great for GPUs.
- **NCHW** works better for non-tensor-core accelerators.
- **Blocked** layouts (used on DSPs and NPUs) help vector units process contiguous data efficiently.

Layout propagation passes - such as hoisting or sinking `linalg.pack`/`linalg.unpack` operations - help adapt layouts through the computation graph, ensuring each operation gets data in its preferred format.

---

## 5. Case Study: A Small Change, A Big Impact

During one optimization sesion, I experimented with a softmax kernel that seemed perfectly efficient, until I changed its tile shape: 

| Tile shape | Runtime (µs) | Reuse (%) |
|------------|--------------|-----------|
| 32 × 4     | 115          | 62        |
| 8 × 16     | 68           | 89        |

The math didn't change, the memory pattern did. 
By aligning the tile shape better with the hardware's cache lines and vector units, we improved reuse and cut runtime by over 40%.

> It wasn't the math - it was the *layout*.

---

## 6. Why Compilers Care 

Compilers don't "see" neurons - they see loops and tiles. 
They use cost models to score layouts by **reuse**, **footprint**, and **schedule efficiency**.
When the score changes, so does the generated code.

In practice, cost models try to answer: 

- How many times will this tile be reused before eviction?
- Will this layout enable vectorization or warp-friendly access? 
- Can we fuse downstream ops without blowing register pressure?

Layout is the bridge between algorithm and architecture - and compilers are the translators.

---

## 7. Closing Thoughts

Tiling isn't just an optimization; it's the compiler's way of speaking to memory. 
Every layer or abstraction in the ML Stack: from TensorFlow/PyTorch to XLA/Triton to LLVM, is trying to get that layout right.

> Layout is architecture's accent.
> Every tensor speaks it; compilers just translate.

---
Stay tuned: keep your friends close and your layouts closer.