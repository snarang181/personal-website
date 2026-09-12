---
title: "Data Structure and Iterator Kung Fu in LLVM"
description: "Zero-copy views and safe mutation loops for faster LLVM passes."
date: 2025-11-09T15:48:04-05:00
tags: ["LLVM", "Data-Structures", "Iterators", "Compilers", "Performance", "C++"]
showToc: true
draft: false
---
Practical patterns, zero-copy views, and safe mutation loops for faster
LLVM passes.

> When to use SmallVector vs std::vector, why DenseMap feels like
> cheating, how StringRef & ArrayRef avoid copies, and the iterator
> tricks that make LLVM code elegant and fast.

## Why LLVM ships its own containers

LLVM’s Abstract Data Types (ADT) exist to minimize allocations, avoid
unnecessary copies, and keep hot paths fast. They are battle-tested for
compiler workloads: small objects, pointer-heavy graphs, predictable
iteration patterns, stable string handling, and more.

## Core Value Types (which own nothing)

### StringRef

- `StringRef` is a `non-owning` reference to a string, i.e., it does not
  own the underlying data. By storing just a pointer and a length (it’s
  basically a `(char*, size_t)` pair), it is *zero-copy* by design.

- **APIs** : `front()`, `startswith()`, `contains()`, `drop_front()`,
  `consume_front("0x")`, `split()`, and many more.

- **Lifetime rule** : The referenced memory must outlive the
  `StringRef`.

### ArrayRef / MutableArrayRef

- Similar to `StringRef`, `ArrayRef<T>` is a lightweight, non-owning
  reference to a contiguous array of elements of type `T`. `ArrayRef`
  ensures efficient access but the data is not modifiable; for that, use
  `MutableArrayRef<T>`.
- **Gotcha** : Don’t create an `ArrayRef` from a temporary container, as
  the data may be destroyed immediately after.

### Twine

- `Twine` is a lightweight way to concatenate strings without creating
  intermediate copies. It represents a concatenation of strings as a
  tree structure, allowing efficient construction of complex strings
  on-the-fly.
- **Rule** : Don’t store a `Twine`, materialize with `SmallString` or
  `std::string` if you need to keep the result.

## Small-Size Optimized Containers

### SmallVector<T, N>

- **What**: `std::vector` semantics with inline storage for up to `N`
  elements.
- Choose `N`: do profiling; balance spill overhead vs. stack usage.
- In the event of exceeding `N`, it seamlessly falls back to heap
  allocation, i.e., it behaves like a regular `std::vector` beyond that
  point.
- **APIs**: `push_back`, `emplace_back`, `reserve`, `append`,
  `pop_back_val`, and more.

```cpp
SmallVector<Value*, 4> WorkList; // Inline storage for 4 pointers
WorkList.push_back(NewValue); // No heap allocation until size > 4
while (!WorkList.empty()) {
    Value *V = WorkList.pop_back_val(); // Pops the last element
    // Process V...
}
```

### SmallString

- A `SmallVector<char, N>` specialized for strings.
- Some useful string helpers: `str()`, `append()`, `push_back()`, etc.

### SmallPtrSet<T*, N>

- A set optimized for storing a small number of pointers.
  - Linear for small sizes, hash table for larger sizes.
- **Great for** tracking visited nodes in graph algorithms.

```cpp
SmallPtrSet<BasicBlock*, 8> Visited;
for (BasicBlock &BB : Function) {
    if (Visited.insert(&BB).second) {
        // First time visiting BB
    }
}
```

## “Hashy” Workhorses

### DenseMap<KeyT, ValueT> / DenseSet

- **What**: Open-addressing hash table with a compact memory layout.
  - Open addressing is a collision resolution method where all elements
    are stored within the hash table itself, avoiding the need for
    pointers to separate nodes. This leads to better cache locality and
    reduced memory overhead.
- **Shines with**: pointer keys, small keys, and frequent lookups.
- **APIs**: `try_emplace`, `insert`, `find`, `erase`, etc.
- **Perf Tips**: Reserve capacity upfront via `reserve(expectedSize)`;
  rebuild if tombstones explode (`DenseMap::shrink_and_clear()`).

```cpp
DenseMap<Value*, unsigned> rank;
for (auto &I : instructions(F)) {
    rank.try_emplace(&I, rank.size()); // Assign unique rank if not present
}
```

#### Custom Keys providing `DenseMapInfo<Key>` with:

- `getEmptyKey()` : A special key value representing an empty slot.

- `getTombstoneKey()` : A special key value representing a deleted slot

  > Tombstones are special markers used in open-addressing hash tables
  > to mean “this slot was occupied by a key but has since been
  > deleted”. They help maintain the integrity of probing sequences
  > during lookups and insertions.

- `getHashValue(const Key &K)` : A hash function for the key type.

- `isEqual(const Key &LHS, const Key &RHS)` : Equality comparison

```cpp
struct MyKey {int a; int b;};
template<> struct DenseMapInfo<MyKey> {
  static MyKey getEmptyKey() { return {INT_MIN, INT_MIN}; } // Use unlikely values
  static MyKey getTombstoneKey() { return {INT_MIN + 1, INT_MIN + 1}; } 
  static unsigned getHashValue(const MyKey &K) {
    return hash_combine(K.a, K.b); // Combine fields for hash
  }
  static bool isEqual(const MyKey &LHS, const MyKey &RHS) {
    return LHS.a == RHS.a && LHS.b == RHS.b;
  }
};
```

### StringMap

- A hash table mapping strings to values, optimized for string keys.
- **Use when**: when keys are owned and stable.

```cpp
StringMap<unsigned> NameToID;
NameToID["foo"]++; // Increment count for "foo"
```

#### Erasing While Iterating

When erasing elements from `DenseMap` or `StringMap` during iteration,
use the following pattern to avoid invalidating the iterator:

```cpp
for (auto It = Map.begin(); It != Map.end(); ) {
    if (it->second == 0) it = Map.erase(It); // erase returns the next valid iterator
    else ++It; // only increment if not erasing
}
```

## Arenas, Uniquing, and more

### BumpPtrAllocator

- Fast linear allocator for short-lived objects.
- Allocate many small objects quickly; free all at once.
- Pair with `StringSaver` to own strings cheaply.

```cpp
BumpPtrAllocator arena;
StringSaver saver(arena);
StringRef name = saver.save("temporary_name"); // Owned by arena
```

### FoldingSet

- **What**: hash-cons an object based on its structural identity.

  > *Hash-consing* is a popular functional programming technique to
  > canonicalize identical immutable structures so that these structures
  > are represented by a single heap node. The usefulness stems from the
  > fact that large data structures often contain many identical
  > substructures; when we want to check for equality between two
  > structures, we can simply compare their pointers instead of
  > traversing the entire structure.

- **Pattern**: derive from `FoldingSetNode`, implement the `Profile`
  method, and use `FoldingSet` to store unique instances.

```cpp

struct Key : public FoldingSetNode {
    int a;
    StringRef b;
    void Profile(FoldingSetNodeID &ID) const {
        ID.AddInteger(a);
        ID.AddString(b);
    }
};

FoldingSet<Key> KeySet;
void insertOrGet(int a, StringRef b, BumpPtrAllocator &arena) {
    Key Temp{a, b};
    void *InsertPos;
    if (Key *Existing = KeySet.FindNodeOrInsertPos(Temp, InsertPos)) { // hash-consed
        // Use Existing
    } else {
        Key *NewKey = new (arena.Allocate<Key>()) Key{a, saver.save(b)};
        KeySet.InsertNode(NewKey, InsertPos);
    }
}
```

## Error handling the LLVM way

LLVM provides a rich set of utilities for error handling, including
`Error`, `Expected<T>`, and `handleErrors`. These abstractions allow for
expressive and type-safe error propagation without relying on
exceptions.

- **Return** `Expected<T>` on success or error.
- **Consume**: `if (!E) return E.takeError();` - By default,
  `llvm::Error` objects are move-only; `takeError()` allows transferring
  ownership of the error to the caller for handling.
- **Helpers**: `cantFail(E)`, `handleErrors(E, ...)`, `joinErrors(...)`.

```cpp
Expected<std::unique_ptr<Module>> loadModule(StringRef Path, LLVMContext &Ctx) {
    SMDiagnostic Err;
    std::unique_ptr<Module> M = parseIRFile(Path, Err, Ctx);
    if (!M) return createStringError(inconvertibleErrorCode(), "Failed to parse IR file");
    return std::move(M);
}
```

## IR-Centric Must-Knows

### Traversal Idioms

```cpp
for (Function &F : M) { // Look at all functions in Module M.
    for (BasicBlock &BB : F) { // Look at all basic blocks in Function F.
        for (Instruction &I : BB) { // Look at all instructions in BasicBlock BB.
            // Process instruction I
        }
    }
}

for (Use &U : V->uses()) { // Look at all uses of Value v.
    if (auto *I = dyn_cast<Instruction>(U.getUser())) {
        // Process instruction I that uses V
    }
}

for (Value *op : I.operands()) { // Look at all operands of Instruction I.
    // Process operand op
}
for(Use &U : I.operands()) { // Mutable access to operands
    // Mutate operand U
}
```

### Mutation Safety

- **Early-inc**: Use `make_early_inc_range` when mutating a container
  while iterating over it.

```cpp
for (Instruction &I : make_early_inc_range(BB)) { // Safe to mutate BB while iterating
    I.eraseFromParent(); // Safe to erase while iterating
}
```

### CFG Helpers

- `predecessors(BB)`, `successors(BB)`: Iterate over
  predecessor/successor basic blocks.
- `LoopBlocksTraversal` : DFS traversal of loop blocks;
  `ReversePostOrderTraversal` : RPO traversal of CFG.

```cpp
for (BasicBlock *Pred : predecessors(&BB)) {
    // Process predecessor Pred
}

for (BasicBlock *BB : ReversePostOrderTraversal(&F)) {
    // Process BB in RPO
}
```

### Range and Iterator (Halloween!) Candy

- `enumerate(range)`: `[index, element]` pairs.
- `filter(range, predicate)`: Filter elements by predicate.
- `map_range(range, func)`: Transform elements by func.
- `zip(range1, range2, ...)` : Tuple-wise iteration
- `reverse(range)`: Reverse iteration.

### Choosing the Right Data Structure (A Decision Matrix)

| Need | Pick | Why |
|----|----|----|
| ≤ N typical, latency-sensitive | `SmallVector<T,N>` | avoids heap |
| Pointer membership/visited | `SmallPtrSet<T*,N>` | inline + hash |
| Many lookups, pointer/int keys | `DenseMap/Set` | cache-friendly |
| String keys, own them | `StringMap<T>` | single alloc |
| Non-owning string/array view | `StringRef` / `ArrayRef` | zero copy |
| Thousands of short-lived nodes | `BumpPtrAllocator` | linear alloc |
| Structural dedup | `FoldingSet<T>` | profile-based hashcons |

### Common “Shooting Yourself in the Foot” Pitfalls

- **Dangling** `StringRef`: don’t reference temporaries. Instead, use
  `StringSaver`.
- **Erasing while iterating** : `early_inc_range`
- `SmallVector` **spill** : choose `N` wisely.
- `DenseMap` **tombstone bloat** : Use `reserve()`, and periodically
  `rebuild()`.

## Micro-Benchmarks

Let’s look at a simple harness comparing `DenseMap` vs
`std::unordered_map` for pointer keys.

```cpp
#include "llvm/ADT/DenseMap.h"
#include <unordered_map>
#include <chrono>
#include <random>

using namespace llvm;

int main() {
  constexpr size_t N = 100000;
  std::vector<void*> keys(N);
  for (size_t i=0;i<N;++i) keys[i] = reinterpret_cast<void*>((i+1)*16);

  DenseMap<void*, int> dm; dm.reserve(N);
  auto t0 = std::chrono::high_resolution_clock::now();
  for (size_t i=0;i<N;++i) dm.try_emplace(keys[i], (int)i);
  auto t1 = std::chrono::high_resolution_clock::now();

  std::unordered_map<void*, int> um; um.reserve(N);
  for (size_t i=0;i<N;++i) um.emplace(keys[i], (int)i);
  auto t2 = std::chrono::high_resolution_clock::now();

  auto ns1 = std::chrono::duration_cast<std::chrono::nanoseconds>(t1-t0).count();
  auto ns2 = std::chrono::duration_cast<std::chrono::nanoseconds>(t2-t1).count();

  printf("DenseMap insert: %lld ns, unordered_map insert: %lld ns\n",
         (long long)ns1, (long long)ns2);
}
```

When run, you should see `DenseMap` outperforming `std::unordered_map`
significantly for pointer keys due to its cache-friendly design and
lower overhead.

### Compile and Run

```bash
clang++ bench.cpp -O3 -I/path/to/llvm/include -o bench
./bench

DenseMap insert: 298833 ns, unordered_map insert: 50096584 ns
```

From this simple benchmark, we observe that `DenseMap` is orders of
magnitude faster than `std::unordered_map` for pointer keys,
highlighting its efficiency for compiler workloads. Do more extensive
benchmarking using `perf`!

## Conclusion

LLVM’s ADT library provides a rich set of data structures and iterator
patterns optimized for compiler workloads. By leveraging these tools
effectively, you can write passes that are both efficient and
maintainable. Understanding when and how to use these structures is key
to mastering LLVM development. Happy coding!

