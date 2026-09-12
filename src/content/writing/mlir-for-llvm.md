---
title: "MLIR for People Who Only Know LLVM IR: A Guided Tour"
description: "A practical mental-model bridge from LLVM IR to MLIR."
date: 2026-02-22T15:48:12-05:00
tags: ["MLIR", "LLVM", "Compilers", "IR", "Optimization", "Codegen"]
showToc: true
draft: false
---
A practical mental-model bridge from LLVM IR to MLIR for people who
already think in terms of functions, basic blocks, and passes.

If you already speak **LLVM IR**, MLIR can feel like a cousin who
redesigned the house while you were out:

- Still Static-Single Assisnment (SSA).
- Still modules, functions, blocks, values.
- Still a pass pipeline.

..but suddenly there are **dialects**, **regions inside operations**,
and IR that looks like:

```mlir
#map0 = affine_map<(i) -> (i)>
module {
    func.func @foo(%arg0:tensor<4xf32>, %arg1:tensor<4xf32>, %arg2:tensor<4xf32>) {
        linalg.generic {
    indexing_maps = [#map0, #map0, #map0],
    iterator_types = ["parallel"]
    } ins(%arg0, %arg1 : tensor<4xf32>, tensor<4xf32>)
    outs(%arg2 : tensor<4xf32>) {
        ^bb0(%a : f32, %b : f32, %c : f32):
        %sum = arith.addf %a, %b : f32
        linalg.yield %sum : f32
    } -> tensor<4xf32>
    return
    }
}
```

What.

This post is a **guied tour of MLIR from an LLVM-IR mental model.** I’ll
assume:

- You are comfortable with LLVM-IR (modules, functions, basic blocks,
  passes).
- You have used `opt` and looked at IR for debugging or performance
  work.

The goal is to leave you thinking:

> “Ah, MLIR is basically SSA + nested regions + pluggable instruction
> sets, with a nicer way to stage transformations.”

------------------------------------------------------------------------

## TL;DR: The Mental Mapping

If you want the shorter version:

- **LLVM Module** ⟶ MLIR `module` op (plus other top-level ops).
- **Function** ⟶ MLIR `func.func` (or `llvm.func`, `gpu.func`, etc.).
- **Instruction** ⟶ MLIR *operation* (op).
- **Basic Block** ⟶ MLIR block (same idea, but appears *inside*
  regions).
- **SSA value** ⟶ MLIR value (same idea, but can be block arguments
  too).
- **Instruction Set (LLVM intrinsics, etc)** ⟶ **dialects**: `arith`,
  `memref`, `linalg`, `llvm`, `gpu`,…
- **Single flat CFG** ⟶ **nested regions**: ops can contain blocks,
  which contain ops, which can contain more regions, etc.

With that in mind, let’s go piece by piece.

------------------------------------------------------------------------

## Modules, functions, blocks, and values

Start with the comforting part: MLIR is still SSA, and the top-level
shape will feel familiar.

### LLVM IR Mental Model

In LLVM, you think of:

- A **Module** containing:
  - Globals
  - Functions
- A **Function** containing:
  - **Basic Blocks**
- A **Basic Block** containing:
  - **Instructions**
- **SSA Values** defined by instructions or block arguments (for `phi`
  nodes).

### MLIR Mental Model

In MLIR, the basic hierarchy is:

- A `module` operation containing:
  - Other top-level operations (e.g., `func.func`, `memref.global`,
    etc.)
- A `func.func` operation containing:
  - One or more **regions**
- A **region** containing:
  - One or more **blocks**
- A **block** containing:
  - One or more **operations (ops)**
- **SSA values** produced by:
  - Operations
  - Block arguments

So instead of “module → function → block → instruction,” you can think:

> **Operations are all you need!** A module is an op wirh regions,
> functions are ops with regions, blocks contain ops, and ops produce
> values.

### Example: hello, function

Here’s a simple LLVM IR function:

```llvm
define i32 @add(i32 %a, i32 %b) {
entry:
  %sum = add i32 %a, %b
  ret i32 %sum
}
```

In MLIR (`func` + `arith` dialects), this looks like:

```mlir
module {
  func.func @add(%a: i32, %b: i32) -> i32 {
    %sum = arith.addi %a, %b : i32
    return %sum : i32
  }
}
```

Same structure, but notice:

- The `module` is an op.
- `func.func` is an op in the `func` dialect.
- The `arith.addi` is an op in the `arith` dialect.

------------------------------------------------------------------------

## Dialects: Instruction Sets for Different Domains

LLVM IR has a fixed instruction set, with intrinsics to stretch it. MLIR
introduces **dialects** to provide domain-specific instruction sets.

### Dialects as namespaces

A **dialect** is basically a namespace for a set of operations and
types. For example:

- `builtin`: fundamental things like `builtin.module`.
- `arith`: scalar arithmetic ops (add, sub, mul, etc).
- `memref`: memory references, load/stores, allocations.
- `linalg`: structured ops like matmul, convolution, generic loops.
- `gpu` : GPU-specific ops and types, such as `gpu.launch`.
- `llvm`: A dialect that encodes “LLVM-like” IR within MLIR.

You see them as prefixes:

```mlir
%0 = arith.addi %a, %b : i32
%1 = memref.load %ptr[%idx] : memref<1024xf32>
%2 = linalg.matmul ins(%A, %B : memref<...>, memref<...>) outs(%C : memref<...>)
```

Mental model:

- LLVM intrinsics (like `llvm.memcpy.*`, `llvm.fmuladd.*`) are one-of
  escapes from the fixed LLVM instruction set.
- MLIR dialects are more like “packages” of operations: e.g., a whole
  DSL for structured linear algebra (`linalg`), GPU programming (`gpu`),
  or quantization (`quant`).

This matters because it lets you:

- Introduce new ops with custom semantics.
- Keep transformations local to a dialect.
- Gradually lower high-level abstractions to lower-level ones. For
  example, `linalg` ops can be lowered to `llvm` ops.

------------------------------------------------------------------------

## Operations, Regions, and Nested Control Flow

In LLVM IR, an instruction is always inside a basic block; it does not
contain blocks.

In MLIR, an **operation (op)** can contain **regions**, which in turn
contain **blocks**. This allows for nested control flow and hierarchical
structure.

### Regions in pratctice

Example: a simple `scf.for` loop from the `scf` dialect:

```mlir
scf.for %i = %c0 to %cN step %c1 {
    %val = memref.load %A[%i] : memref<...>
    %const_two = arith.constant 2.0 : f32
    %result = arith.mulf %val, %const_two : f32
    memref.store %result, %A[%i] : memref<...>
}
```

What’s happening here:

- `scf.for` is an op that contains a region.
- The region contains a block with the loop body.

If you think in LLVM IR terms,

- The `scf.for` is roughly sugar for a small Control Flow Graph (CFG) of
  basic blocks with branches.
- Instead of materializing that CFG explicitly, MLIR keeps it as a
  structured loop op with a region.

That lets transformations reason about loops at a higher level, e.g.,
loop unrolling, fusion, etc.

### Nested IR everywhere

Other examples of ops with regions:

- `func.func` contains a region for the function body.
- `linalg.generic` contains a region for the computation body.
- `gpu.launch` contains regions for kernel code.
- `scf.if` contains regions for the “then” and “else” branches.

Once you accept:

> “Ops can contain regions, which contain blocks, which contain ops…”

…the rest of MLIR starts to feel more natural.

------------------------------------------------------------------------

## Types and Attributes

MLIR types look familiar but slightly more regular.

### SSA value types

You will see:

```mlir
%0 = arith.addi %a, %b : i32
%1 = memref.load %A[%i] : memref<1024xf32>
%2 = tensor<4x4xf32>
```

Types are usually in angle brackets:

- `i32`, `f32`, `i64` for scalars.
- `memref<...>` for memory references (like pointers to arrays).
- `tensor<...>` for tensors (multi-dimensional arrays).
- `index` for index types (used in loops, sizes).
- `vector<...>` for SIMD vectors.

Compared to LLVM:

- `memref` is closer to “strongly typed pointers with shape info.”
- `tensor` is like “heap/stack allocated multi-dimensional arrays.”

### Attributes

MLIR has **attributes** (immutable metadata) baked into the syntax:

```mlir
%0 = arith.constant 4 : i32
%1 = arith.constant dense<0.0> : tensor<4xf32>
%2 = linalg.generic {
    indexing_maps = [#map0, #map0, #map0],
    iterator_types = ["parallel"]
}...
```

- Things like `iterator_types` are attributes that provide extra info to
  ops.
- `#map0` is an **affine map attribute** defined elsewhere in the
  module.

```mlir
#map0 = affine_map<(i) -> (i)>
```

Attributes are regularized and part of the op syntax, not scattered
comments or metadata.

Mental model:

- Like LLVM metadata (`!dbg`, `!tbaa`), but:
  - More central to the IR.
  - Often essential for op semantics. (e.g. `indexing_maps` in
    `linalg.generic`).

------------------------------------------------------------------------

## A side-by-side example

Let’s compare a simple vector add with the same “concept” in LLVM IR and
MLIR.

### LLVM IR

```llvm
define void @vec_add(float* %a, float* %b, float* %c, i64 %N) {
entry:
  br label %loop

loop:
  %i = phi i64 [ 0, %entry ], [ %i_next, %loop ]
  %a_i_ptr = getelementptr float, float* %a, i64 %i
  %b_i_ptr = getelementptr float, float* %b, i64 %i
  %c_i_ptr = getelementptr float, float* %c, i64 %i

  %a_i = load float, float* %a_i_ptr
  %b_i = load float, float* %b_i_ptr
  %sum = fadd float %a_i, %b_i
  store float %sum, float* %c_i_ptr

  %i_next = add i64 %i, 1
  %cmp = icmp slt i64 %i_next, %N
  br i1 %cmp, label %loop, label %exit

exit:
  ret void
}
```

### MLIR

```mlir
module {
  func.func @vec_add(
      %A : tensor<?xf32>,
      %B : tensor<?xf32>,
      %C : tensor<?xf32>,
      %N : index) {
    %c0 = arith.constant 0 : index
    %c1 = arith.constant 1 : index

    // Bounds check omitted for brevity
    %C_out = linalg.generic {
        indexing_maps = [
          affine_map<(i) -> (i)>,
          affine_map<(i) -> (i)>,
          affine_map<(i) -> (i)>
        ],
        iterator_types = ["parallel"]
      } ins(%A, %B : tensor<?xf32>, tensor<?xf32>)
        outs(%C : tensor<?xf32>) {
        ^bb0(%a : f32, %b : f32, %c_in : f32):
          %sum = arith.addf %a, %b : f32
          linalg.yield %sum : f32
      } -> tensor<?xf32>

    return
  }
}
```

### Breakdown

- The **loop(s)** over `i` in `linalg.generic` +
  `iterator_types = ["parallel"]` abstracts away the explicit CFG of
  basic blocks in LLVM.
- The indexing is handled by affine maps, not explicit pointer
  arithmetic.
- The **element-wise addition** is expressed in the region of
  `linalg.generic`, rather than as a sequence of loads, adds, and
  stores.

The compiler can later lower this to:

- Lower `linalg.generic` to explicit `scf.for` loops.
- Vectorize the loops.
- GPU offload.
- Lower to LLVM IR.

You get to **stage** your transformations at a higher level of
abstraction, rather than wrestling with low-level IR from the start.

------------------------------------------------------------------------

## Passes and pipelines

LLVM:

- You run `opt -my-pass -another-pass ...` on LLVM IR modules.
- Passes see LLVM’s single dialect (LLVM IR).

MLIR:

- You run `mlir-opt` with a pipeline like:

```bash
mlir-opt input.mlir \
  -convert-linalg-to-loops \
  -lower-affine \
  -convert-scf-to-cf \
  -convert-func-to-llvm \
  -reconcile-unrealized-casts
```

Key differences:

- Passes can target specific dialects (e.g., `-convert-linalg-to-loops`
  only affects `linalg` ops).
- Dialect conversion is a first-class concept: you can lower from
  high-level dialects to lower-level ones in stages.
- You can build pipelines programatically in C++ or Python, not just
  command-line.

Mental model:

- LLVM passes are monolithic transformations on a single IR.
- MLIR passes are often about **dialect conversion** and **progressive
  lowering** through multiple IR levels.

------------------------------------------------------------------------

## Pattern rewrites: opt passes with a twist

In LLVM, passes:

- Walk instructions and basic blocks.
- Apply peephole optimizations or larger transformations on the flat
  CFG.

MLIR leans heavily on **pattern rewrites**:

- A pattern rewrite matches specific op patterns and rewrites them.
- Patterns can be composed into passes that apply them across the IR.

Example (in pseudocode): “fuse multiply-add” pattern in `arith` dialect
to a custom `fma` op:

```mlir
pattern FuseMulAdd {
  match: arith.addf(arith.mulf(%a, %b), %c)
  rewrite: MyCustomDialect.fma(%a, %b, %c)
}
```

Why it’s powerful:

- Patterns are composable and can be **generated** from declarative
  specifications.
- Dialects can provide their own patterns for optimization.
- You can target specific op patterns without worrying about the entire
  CFG.

------------------------------------------------------------------------

## How does this become LLVM IR?

At some point, you may want to lower MLIR down to LLVM IR for code
generation.

MLIR usually goes through the **LLVM dialect** as an intermediate step:

- The `llvm` dialect in MLIR closely resembles LLVM IR.
- It still has ops, blocks, and regions, but uses LLVM-like types and
  instructions.

For example, an MLIR function in the `llvm` dialect might look like:

```mlir
llvm.func @add(%a: i32, %b: i32) -> i32 {
  %sum = llvm.add %a, %b : i32
  llvm.return %sum : i32
}
```

From there, MLIR has a **conversion** pass that translates the `llvm`
dialect to actual LLVM IR.

- `mlir-translate` can be used to convert MLIR with `llvm` dialect to
  LLVM IR.

So, the pipeline is often:

```text
High-level dialects (linalg, tensor, scf, gpu, etc.)
          ⬇
       Affine/scf/memref/etc.
          ⬇
       LLVM dialect
          ⬇
       LLVM IR
          ⬇
       Machine code
```

------------------------------------------------------------------------

## How to start reading MLIR as an LLVM person

If you are staring at some `.mlir` dump and feeling lost, try this:

1.  Find the `module` op and the **functions**

- Ignore new dialects at first; focus on `func.func` ops.

2.  Pretend every op is an LLVM instruction.

- `arith.addi`, `memref.load`, etc. are just instructions.

3.  Notice **regions** inside ops.

- Any time you see `{ ... }` with `^bb0`, that’s like a basic block.

4.  Identify the dialect layers.
    - Is the IR still in `linalg/tensor` land? That’s high-level.
    - Is it all `scf` and `memref`? Mid-level.
    - Is it `llvm` dialect? Almost LLVM IR.
5.  Look at pass pipelines.
    - When debugging, run `mlir-opt` with `-print-ir-after-all` to see
      how the IR evolves.
    - Watch how `linalg.generic` gets lowered to loops, then to `llvm`
      ops.

With practice, you’ll start to see MLIR as a **layered extension of LLVM
IR**, rather than a completely foreign language.

------------------------------------------------------------------------

## Why MLIR?

If you are fluent in LLVM IR, MLIR does not replace it; it **wraps it in
layers of structured abstractions**:

- You can build **higher-level optimizations** on explicit loops,
  tensors, and algebraic ops.
- You get **extensible instruction sets** via dialects, rather than
  being stuck with LLVM’s fixed set.
- You can **stage lowering** from high-level abstractions down to LLVM
  IR in a controlled manner.
- You can target **multiple backends** (CPUs, GPUs, TPUs) from the same
  high-level IR.

And if all else fails, you can always lower back to LLVM IR for code
generation.

