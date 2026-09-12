---
title: "How Rewriting works in MLIR"
description: "How MLIR's pattern rewriting works, and why it makes optimizations composable."
date: 2025-11-08T15:48:31-05:00
tags: ["MLIR", "Rewriting", "Compilers", "Optimization"]
showToc: true
draft: false
---
An in-depth look at the rewriting mechanisms in MLIR and how they enable
powerful optimizations.

> If you only remember one thing from this post: **rewriting** in MLIR
> is “find a pattern, make a change, repeat until more changes can’t be
> made”, with two key components:
>
> 1.  **Greedy pattern application** (canonicalization and local
>     clenups), and
> 2.  **Dialect conversion** (legalize/convert regions with invariants
>     about the legal forms of ops).

## TL;DR

- **Patterns** live in a `RewritePatternSet` and are driven by either
  `applyPatternsGreedily` (for local greedy rewrites) or
  `applyPartial/FullConversion` (for dialect conversion with legality
  constraints).
- **Write patterns** by subclassing `OpRewritePattern<YourOp>` and
  overriding `matchAndRewrite` with your logic.
- **Rewrite safely** using `PatternRewriter` methods to create, replace,
  and erase ops.
- **Canonicalization** : MLIR has a single canonicalization pass which
  applies all registered patterns greedily until no more matches are
  found.
- **Conversion**: MLIR’s conversion framework allows you to define
  legality constraints and convert ops from one dialect to another while
  preserving invariants. We do this with `ConversionTarget` and
  `TypeConverter`.
- **Folding**: Take series of ops complements rewriting by simplifying
  constant expressions during pattern application.

------------------------------------------------------------------------

## Part 1: The moving pieces

### **RewritePatternSet** and **PatternRewriter**

- `RewritePatternSet` is a container for your rewrite patterns. You
  populate it with instances of your custom patterns.
- MLIR runs these patterns for you; you don’t directly loop over
  operations.
- In your pattern’s `matchAndRewrite`, you
  - Inspect the matched op.
  - Optionally create the new IR (using the rewriter’s insertion point).
  - Replace or erase the matched op.

### **Greedy vs. Conversion**

#### **Greedy (Canonicalization and Local Rewrites)**

- Think “peephole + algebraic simplification”.
- Use `applyPatternsGreedily` to apply all patterns in a
  `RewritePatternSet`.
  `applyPatternsGreedily(fop, std::move(patterns));`

#### **Conversion (Dialect Conversion)**

- Define legality constraints for ops via `ConversionTarget`.
- Use `TypeConverter` to handle type conversions.
- Use `applyPartialConversion` or `applyFullConversion` to convert ops
  while respecting legality.

------------------------------------------------------------------------

## Part 2: Your first greedy rewrite pattern.

Let’s fold away `arith.addi %x, 0: i32` into just `%x`. Yeah, it’s
trivial, and MLIR’s canonicalization already does this, but it’s a great
starting point.

### Pattern Definition

```cpp
#include "mlir/IR/PatternMatch.h"
#include "mlir/Dialect/Arith/IR/Arith.h"
#include "mlir/Pass/Pass.h"

using namespace mlir;

namespace {
struct FoldAddIWithZeroPattern : OpRewritePattern<arith::AddIOp> {
  using OpRewritePattern::OpRewritePattern;

  LogicalResult matchAndRewrite(arith::AddIOp op,
                                PatternRewriter &rewriter) const override {
    auto isZeroConst = [](Value v) {
      if (auto c = v.getDefiningOp<arith::ConstantOp>()) {
        if (auto intAttr = dyn_cast<IntegerAttr>(c.getValue()))
          return intAttr.getValue().isZero();
      }
      return false;
    };

    Value lhs = op.getLhs();
    Value rhs = op.getRhs();

    if (isZeroConst(lhs)) {
      rewriter.replaceOp(op, rhs);
      return success();
    }
    if (isZeroConst(rhs)) {
      rewriter.replaceOp(op, lhs);
      return success();
    }
    return failure();
  }
};
} // namespace

struct FoldAddIZeroPass
    : public PassWrapper<FoldAddIZeroPass, OperationPass<func::FuncOp>> {
  MLIR_DEFINE_EXPLICIT_INTERNAL_INLINE_TYPE_ID(FoldAddIZeroPass)
  StringRef getArgument() const override { return "fold-addi-zero"; }
  void runOnOperation() override {
    MLIRContext *ctx = &getContext();
    RewritePatternSet patterns(ctx);
    patterns.add<FoldAddIWithZeroPattern>(ctx);

    if (failed(applyPatternsGreedily(getOperation(), std::move(patterns))))
      signalPassFailure();
  }
};

std::unique_ptr<Pass> mlir::createFoldAddIZeroPass() {
  return std::make_unique<FoldAddIZeroPass>();
}
```

------------------------------------------------------------------------

### Part 3 : Running it: Tiny IR + Command

Given this tiny IR in `test.mlir`:

```mlir
module {
  func.func @foo(%x : i32) -> i32 {
    %c0 = arith.constant 0 : i32
    %y  = arith.addi %x, %c0 : i32
    return %y : i32
  }
}
```

### Build and run

- Register your pass via the PassRegistry.
- Run with `mlir-opt`:

```bash
mlir-opt test.mlir --pass-pipeline="builtin.module(func.func(fold-addi-zero))"
```

> Tip: Use –mlir-print-ir-after-all/–mlir-print-ir-before-all to see IR
> after each pass.

### Result

The output IR will have the addition folded away:

```mlir
// -----// IR Dump Before FoldAddIZeroPass (fold-addi-zero) //----- //
func.func @foo(%arg0: i32) -> i32 {
  %c0_i32 = arith.constant 0 : i32
  %0 = arith.addi %arg0, %c0_i32 : i32
  return %0 : i32
}

module {
  func.func @foo(%arg0: i32) -> i32 {
    return %arg0 : i32
  }
}
```

------------------------------------------------------------------------

## Part 4: Dialect Conversion in a nutshell

Greedy rewrites are great for local simplifications, but what if you
want to convert ops from one dialect to another while ensuring certain
invariants?

### Core ingredients

- **ConversionTarget**: Define which ops are legal/illegal.
- **TypeConverter**: Handle type conversions.
- **Patterns**: Similar to greedy patterns but used in the conversion
  context.

### Example: Convert `toy.addi` to `arith.addi`

```cpp

struct ToyAddLowering : public OpConversionPattern<Toy::AddIOp> {
  using OpConversionPattern<toy::TransposeOp>::OpConversionPattern;

  LogicalResult
  matchAndRewrite(Toy::AddIOp op, OpAdaptor adaptor,
                  ConversionPatternRewriter &rewriter) const override {
    // adaptor carries already-converted operands/types if a TypeConverter is
    // used
    auto resTy = adaptor.getLhs().getType(); // i32 (post-conversion if any)
    auto sum = rewriter.create<arith::AddIOp>(
        op.getLoc(), resTy, adaptor.getLhs(), adaptor.getRhs());
    rewriter.replaceOp(op, sum.getResult());
    return success();
  }
};

struct LowerToyPass
    : public PassWrapper<LowerToyPass, OperationPass<ModuleOp>> {
  void runOnOperation() final {
    MLIRContext *ctx = &getContext();

    // 1) What is legal?
    ConversionTarget target(*ctx);
    target.addLegalDialect<arith::ArithDialect>();
    target.addIllegalDialect<Toy::ToyDialect>();

    // 2) (Optional) TypeConverter, if you need to rewrite types.
    TypeConverter typeConverter; // no-op here

    // 3) Patterns
    RewritePatternSet patterns(ctx);
    patterns.add<ToyAddLowering>(typeConverter, ctx);

    // 4) Apply
    if (failed(applyPartialConversion(getOperation(), target,
                                      std::move(patterns))))
      signalPassFailure();
  }
};
```

### Key differences from greedy patterns:

- You declare *legality* of ops. MLIR rewrites until the target legality
  is met.
- The rewriter is a `ConversionPatternRewriter`, which works with
  converted types/operands.
- You can use a `TypeConverter` to handle type changes during
  conversion.

------------------------------------------------------------------------

## Part 5 : Folding vs. Patterns

- **Folding** lives on the op (`Op::fold` method) and should handle
  trivial constant simplifications.
- **Patterns** are more powerful and can express complex rewrites
  involving multiple ops or structural changes.
- The greedy driver runs **both** : it first tries to fold ops, then
  applies patterns until no more changes occur.

------------------------------------------------------------------------

## Part 6: Match helpers, benefits, and ordering

- Use helpers like `matchPattern` and constant readers; but it’s okay to
  directly query ops too.
- Patterns can be prioritized via the `benefit` parameter in the
  constructor. Higher benefit patterns are tried first.
- Keep patterns **local** and **type-correct**; prefer creating new ops
  over mutating existing ones.

------------------------------------------------------------------------

## Part 7: Debugging and guardrails

- **IR Printing**: Use `--mlir-print-ir-after-all` to see IR after each
  pass.
- **Generic Form** : Use `--mlir-print-op-generic` to see full op
  details.
- **Determinism**: `--mlir-disable-threading` can help with
  non-deterministic issues during debugging.
- **No use-after-erase**: Never touch an operation after `eraseOp` has
  been called.
- **Dominance/Insertion Point**: Insert new ops at the correct insertion
  point, i.e., where all uses are dominated.
- **Testing**: Use `FileCheck` to write tests for your patterns and
  passes.

------------------------------------------------------------------------

## Part 8: Mini LIT Test Example

```mlir
// RUN: mlir-opt %s --pass-pipeline="builtin.module(func.func(fold-addi-zero))" | FileCheck %s
module {
  func.func @foo(%x : i32) -> i32 {
    %c0 = arith.constant 0 : i32
    %y  = arith.addi %x, %c0 : i32
    return %y : i32
  }
}

// CHECK-LABEL: func @foo(
// CHECK-NOT: arith.addi
// CHECK: return [[X:%.*]] : i32
// CHECK: }
```

> This test ensures that after running the `fold-addi-zero` pass, there
> are no `arith.addi` operations left in the function.

------------------------------------------------------------------------

## Conclusion

- Rewriting in MLIR is a powerful mechanism that enables both local
  optimizations and complex dialect conversions.
- Reach for dialect conversion when you need to enforce legality
  constraints across a set of ops.
- Printing and testing are your friends when developing and debugging
  patterns.
- Happy rewriting!

------------------------------------------------------------------------

## Further Reading

- [Pattern Rewriter](https://mlir.llvm.org/docs/PatternRewriter/#pattern-rewriter)
- [Dialect Conversion](https://mlir.llvm.org/docs/DialectConversion/)
- [Canonicalization](https://mlir.llvm.org/docs/Canonicalization/)
- [MLIR Passes](https://mlir.llvm.org/docs/Passes/)
- [MLIR Tutorials](https://mlir.llvm.org/docs/Tutorials/)

<!-- -->

