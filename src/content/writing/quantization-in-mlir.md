---
title: "Quantization in MLIR: Types, Scales, and Where to Put the q"
description: "Everyone agrees it matters; the details stay fuzzy. Here are the details."
date: 2025-11-18T15:48:26-05:00
tags: ["MLIR", "Quantization", "Compilers", "ML"]
showToc: true
draft: false
---
Quantization is one of those things where everyone unanimously agrees
“it’s important”, but the details are often fuzzy; I mean, no one really
wants to think about it in their compiler’s IR, right?

In most stacks, quantization lives in an (awkward?) place:

- High-level frameworks (like PyTorch) expose “quantized layers” or
  post-training quantization APIs.
- Backends (like TensorRT, ONNX Runtime) and kernels *really* care about
  bit-widths, scales, zero points, and data layouts.
- The glue in between is often a mishmash of ad-hoc passes, custom
  operators, and brittle assumptions.

MLIR is actually a sweet spot to make quantization less cursed:

> **You can make quantization a first-class citizen of your IR: visible
> in types, explicit in ops, and modular in passes.**

In this post, I want to walk through:

1.  What “quantization” means in this context,
2.  How you can represent quantized tensors in MLIR types,
3.  Where to insert `quantize` and `dequantize` ops in your IR,
4.  How this plays with dialects like Linalg.
5.  Some design considerations worth arguing about.

------------------------------------------------------------------------

## 1. Quick mental model: What are we even quantizing?

Most ML inference quantization schemes boil down to this:

- Store values in **low-precision integers** (e.g., int8, int4) to save
  memory and bandwidth.
- Interpret them using a **scale** (and sometimes a **zero point**) to
  map back to real numbers.

The classic affine mapping is:

```text
real_value = scale * (quantized_value - zero_point)
```

- Here, `quantized_value` is the low-precision integer stored in memory.
- `scale` is a floating-point number that determines the “step size”
  between quantized levels.
- `zero_point` is an integer offset that allows representing zero
  exactly.

So if you want this integrated in the IR, we need to answer:

- Where do we store `scale` and `zero_point`?
- Are they attached to types, attributes, or explicit ops?
- Where in the IR do we cross between quantized and real-valued
  representations?

------------------------------------------------------------------------

## 2. Quantized types: putting scale and zero point in the type system

MLIR’s type system is rich enough that quantization metadata does not
have to float around in comments or attributes. You can make it part of
the *type*.

A conceptual example:

```mlir
// An 8-bit signed quantized element type
!qint = !quant.uniform<i8:f32, scale=0.02, zero_point=-5>

// A quantized tensor type
!qtensor = tensor<128x128x64x!qint>
```

Here, `!quant.uniform<i8:f32, scale=0.02, zero_point=-5>` defines a
quantized integer type with:

- `i8` as the storage type (8-bit integer) in hardware,
- `f32` as the real-valued type it maps to (logical real domain),
- `scale` and `zero_point` as parameters.

And, we get some nice properties:

- Passes can easily query quantized vs real types.
- Implement patterns that operate on quantized data whose semantics are
  clear. For example, “Fuse two operations that both use the same
  quantization parameters.”
- Lowering to backend-specific Instruction Set Architectures (ISAs) can
  directly leverage this type information.

We can also define different quantization schemes (e.g., symmetric,
asymmetric, per-channel) by extending the type system further.

E.g. for per-channel quantization

```mlir
// Per-channel quantization along the C dimension
!qconv_weight = tensor<64x3x3x3x!quant.uniform<i8:f32,
                                               scales = [0.01, 0.02, ...],
                                               zero_points = [0, 0, ...],
                                               axis = 0>>
```

> Per-channel quantization allows each output channel to have its own
> scale and zero point, which is common in convolutional weights.

------------------------------------------------------------------------

## 3. `quantize` and `dequantize` ops: where do we switch domains?

At some point, we need to convert between real-valued tensors and
quantized tensors. This is where `quantize` and `dequantize` ops come
in.

```mlir
%f = ... : tensor<...xf32>

// Float to quantized
%q = "quant.quantize" %f : tensor<...xf32> to tensor<...x!qint>

// Quantized to float
%f2 = "quant.dequantize" %q : tensor<...x!qint> to tensor<...xf32>
```

The big question is: *Where* do we place these ops in the IR?

Two common patterns:

1.  **Early quantization, late dequantization**:

- Insert `quantize` ops right after the model is loaded or after a
  preprocessing/calibration phase.
- Keep the rest of the model in quantized form as long as possible.
- Insert `dequantize` ops only at the very end, before outputting
  results, or when a non-quantized op is needed.

*Pros*:

- Maximum performance gain from quantization.
- Lets you propagate quantized types through most of the graph.

*Cons*:

- More complex handling of quantized ops, i.e. IR transformations need
  to be quantization-aware.
- Some transformations need variant handling for quantized ops.
- Potentially more numerical error accumulation.

2.  **Late quantization (backend-specific)**:

- Keep the model in floating-point form (`f32`/ `f16`) through most of
  the IR.
- Let the backend do a late “quantized lowering” where it introduces
  quantized types and `quantize`/`dequantize` ops as needed.

*Pros*:

- Simpler IR transformations, as most ops remain in floating-point.
- Quantization logic can be centralized in backend lowering.

*Cons*:

- Harder to do global optimizations that are quantization-aware. (e.g.
  fusing quantized ops, layout transformations driven by int8 kernels)
- We are effectively doing quantization “too late” to fully exploit its
  benefits.

In practice, a hybrid approach could be used:

- A **high-level quantization pass** which decides which tensors/ops
  should be quantized and inserts `quantize`/`dequantize` ops
  accordingly.
- **Later lowerings** that replace generic quantized ops with
  backend-specific implementations. (e.g. `linalg.matmul` on quantized
  types lowering to int8 GEMM kernels)

------------------------------------------------------------------------

## 4. Quantization and `linalg`: generic ops, concrete kernels

MLIR’s `linalg` dialect is a great fit for quantization because it
provides high-level, generic operations that can be specialized for
quantized types.

For example,

```mlir
//linalg.matmul on quantized types
linalg.matmul ins (%A_q, %B_q : tensor<MxKx!qint>, tensor<KxNx!qint>) 
               outs (%C_q : tensor<MxNx!qint>)
```

But what does this mean semantically?

- Are we interpreting it as an integer matrix multiplication followed by
  scaling?
- Are we expecting hardware-specific instructions (e.g. INT8 GEMM)?
- Are scales/zero points baked into the type or explicitly passed as
  rescale ops before/after the matmul?

A reasonable pattern is

1.  Keep `linalg` ops **element-type-generic**: they operate on whatever
    types are given (quantized or real).

2.  Add passes that:

    - Lower quantized `linalg` ops into **int kernels + explicit
      rescaling**.

    ```
    // Pseudocode lowering
    %acc "linalg.matmul" ins(%A_int8, %B_int8) : tensor<MxKxi8>, tensor<KxNxi8> -> tensor<MxNxi32>
    %out = "quant.rescale" (acc) 
    {scale = ..., zero_point = ...} : tensor<MxNxi32> to tensor<MxNxi8>
    ```

    - Or directly lower to **backend-specific quantized kernels** that
      understand the quantization parameters.

3.  Let backend-specific passes choose instructions based on the
    quantization parameters encoded in types.

The key idea:

> `linalg` gives you structured loops; quantization adds semantic
> constraints.

The compiler’s job is to bridge the two: ensuring that quantized
semantics are respected while still leveraging the high-level structure
of `linalg` ops.

------------------------------------------------------------------------

## 5. Quantization-friendly fusion and vectorization

Quantization graphs are full of patterns like:

- `quantize -> conv -> relu -> dequantize`
- `quantize -> matmul -> add_bias -> activation -> dequantize`

To make these fast, you want to

- **Fuse** quantized ops together while staying in the quantized domain.
- Avoid spurious `dequantize`/`quantize` hops when ops can be fused.
- **Vectorize** int8/uint8 arithmetic to leverage SIMD instructions.

In MLIR terms, this means:

- Rewrite patterns like

```mlir
%q = quant.quantize %f : tensor<...xf32> to tensor<...x!qint>
%y = "mydialect.conv"(%q, %w) : tensor<...x!qint>, tensor<...x!qint> -> tensor<...x!qint>
%z = "mydialect.relu"(%y) : tensor<...x!qint> -> tensor<...x!qint>
%out = quant.dequantize %z : tensor<...x!qint> to tensor<...xf32>
```

into a single fused op that stays in the quantized domain:

```mlir
%out = "mydialect.fused_conv_relu"(%f, %w) :
    tensor<...xf32>, tensor<...x!qint> -> tensor<...xf32>
```

- Teach `vector` lowering and target-specific backends to handle
  quantized types efficiently.

```mlir
%vA = vector.transfer_read %A_q ... : tensor<...x!qint> to vector<...xi8>
%vB = vector.transfer_read %B_q ... : tensor<...x!qint> to vector<...xi8>
%VAcc = "vector.dot_qi8"(%vA, %vB) : vector<...xi8>, vector<...xi8> -> vector<...xi32>
```

Again, whether you use actual `quant.*` dialect types or domain-specific
ones, the pattern is

- Make quantization explicit in types and ops.
- Enable fusion and vectorization passes to recognize and optimize
  quantized patterns.
- Only dequantize when absolutely necessary.

------------------------------------------------------------------------

## 6. Where to put the “q”: design considerations

Zooming out, a plausible high-level storyline for an MLIR-based
quantization pipeline could be:

1.  **Model Import**: Load a floating-point model (e.g., from ONNX,
    TensorFlow).
2.  **Quantization Pass**: Analyze the model, decide which tensors/ops
    to quantize, attach parameters to types, insert
    `quantize`/`dequantize` ops.
3.  **Quantized Optimization Passes**: Fuse quantized ops, fold
    unnecessary conversions, vectorize quantized computations.
4.  **Structured Lowering**: Lower `linalg` and other high-level ops to
    quantized kernels, respecting quantization semantics.
5.  **Backend Lowering**:Final mapping to LLVM or target-specific
    codegen, leveraging quantized instructions.

------------------------------------------------------------------------

## 7. Design questions to ponder

None of this is set in stone, quantization is a moving target with many
open questions:

- **How much should the type system know?**

<!-- -->

- Do you always carry scales and zero points in types, or if that is too
  heavyweight, can you use attributes or side tables?

<!-- -->

- **Static vs Dynamic Quantization Parameters**

<!-- -->

- Some schemes use fixed scales/zero points, others compute them
  on-the-fly (e.g., per-batch). How to represent this in types/ops?

<!-- -->

- **Interplay with mixed precision**

<!-- -->

- Where do `fp16/bfloat16` mixed precision and quantization interact?

<!-- -->

- **Verification and correctness** How to ensure that quantized
  computations respect numerical properties (e.g., range, overflow)?

These are exciting questions for compiler and MLIR designers to explore.

