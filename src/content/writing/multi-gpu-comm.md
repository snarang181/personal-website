---
title: "How GPUs Talk: A Practical Guide to Multi-GPU Training and Communication"
description: "Collectives, interconnects, and the communication patterns behind efficient distributed training."
date: 2025-11-15T15:48:15-05:00
tags: ["Gpu", "Distributed-Training", "Systems"]
showToc: true
draft: false
---
An in-depth exploration of multi-GPU training techniques and the
communication patterns that enable efficient distributed machine
learning.

When people talk about scaling deep learning, they usually mean
**throwing more GPUs** at the problem. However, horizontal scaling can
only get you so far without efficient communication strategies.

Concretely, “using 8 GPUs instead of 1” will only help if GPUs can
*talk* to each other fast enough. Under the hood, multi-GPU training is
less about computation and more about **communication**.

In this post, I want to walk through how GPUs communicate during
training:

- The hardware links (PCIe, NVLink, InfiniBand),
- The core communication patterns (*all-reduce*, *all-gather*,
  *reduce-scatter*, *broadcast*),
- And how they show up in **data parallelism**, **fully sharded data
  parallelism (FSDP)**, **tensor parallelism**, and **pipeline
  parallelism**.

The goal is to provide a mental model that explains why your training
job suddenly becomes **network-bound** instead of **compute-bound** as
you scale up.

------------------------------------------------------------------------

## 1. Why Multi-GPU Training is a communication problem

On a single GPU, training looks simple:

1.  Load a batch of data
2.  Forward pass through the model
3.  Compute loss
4.  Backward pass to compute gradients
5.  Update model parameters
6.  Repeat

Scaling to multiple GPUs sounds equally simple:

- Give each GPU a different mini-batch of data
- Average gradients across GPUs,
- Update model parameters

That “averaging gradients across GPUs” step is where things get tricky.

At a small scale, communication overhead is negligible compared to
computation; say, when you are doing a Matrix Multiply. At larger scales
(32+ GPUs, or multi-node where GPUs are connected over a network),
**gradient sync and parameter updates** can dominate the training time.
Modern accelerators have extremely high compute throughput, which moves
the bottleneck to:

- GPU ↔ GPU bandwidth,
- GPU ↔ NIC bandwidth,
- Or cross-node network bandwidth.

To understand the trade-offs, we have to start from the hardware.

------------------------------------------------------------------------

## 2. How GPUs are wired: intra-node and inter-node

Inside a single server (node), GPUs are connected via high-speed links:

- **PCIe** : The standard peripheral interconnect, decent bandwidth but
  relatively high latency.
- **NVLink** : NVIDIA’s high-speed GPU-to-GPU interconnect, much higher
  bandwidth and lower latency than PCIe.
- **NVSwitch** : A high-speed switch that connects many NVLink ports,
  used in DGX systems so every GPU can talk to every other GPU at full
  NVLink speed.

Across multiple servers (nodes), GPUs communicate over a network:

- **NICs (Network Interface Cards)** (often InfiniBand or RDMA over
  Converged Ethernet - RoCE),
- Connected via high-speed switches.

The important bit: **topology matters**.

- In an 8-GPU setup with NVLink, some GPU pairs are directly connected,
  some can require multiple hops.
- In a multi-node cluster, some nodes share a switch, others have to go
  through multiple switches.

Libraries like *NCCL* (NVIDIA Collective Communications Library) probe
this topology and build communication patterns (rings, trees) that
optimize data transfer.

------------------------------------------------------------------------

## 3. Core communication patterns

Most multi-GPU training strategies rely on a few core communication
patterns, often called *collectives*:

- **Broadcast**: One GPU has a tensor, and it needs to send copies to
  all other GPUs.
- **All-gather**: Each GPU has a chunk of data, and all GPUs need to
  gather all chunks.
- **Reduce-scatter**: The opposite of all-gather; each GPU has a chunk,
  and they need to reduce (e.g., sum) the chunks and scatter the results
  back.
- **All-reduce**: Each GPU has a tensor, and they need to reduce (e.g.,
  sum) the tensors and distribute the result back to all GPUs.

Data-parallel training primarily uses **all-reduce** to average
gradients.

> For an N-GPU ring, all-reduce can be implemented in two phases:
>
> 1.  **Reduce-scatter**: Each GPU sends and receives chunks of data,
>     reducing them as they go.
> 2.  **All-gather**: Each GPU gathers the reduced chunks to form the
>     final result.

This ring algorithm is bandwidth-optimal as most GPUs are sending and
receiving data simultaneously.

------------------------------------------------------------------------

## 4. Multi-GPU training strategies

### 4.1 Distributed Data Parallel (DDP)

In classic **Distributed Data Parallel (DDP)**:

- Each GPU stores a full copy of the model.
- Split the training data across GPUs (batches).
- Each GPU computes gradients on its mini-batch.
- Use **all-reduce** to average gradients across GPUs.

### 4.2 Fully Sharded Data Parallel (FSDP)

As model get larger, storing full copies on each GPU becomes infeasible.
**Fully Sharded Data Parallel (FSDP)** addresses this by:

- **Sharding model parameters** across GPUs.

Roughy, for each FSDP-wrapped layer:

1.  Before the forward pass,
    - GPUs run an **all-gather** to get the full parameters needed for
      that layer.
2.  Forward pass is computed.
3.  After the backward pass,
    - Gradients are **reduced-scattered** back to the GPUs holding the
      parameter shards.
4.  Finally, each GPU updates its local parameter shards.

The key difference is that FSDP repeatedly **gathers** and **scatters**
parameters and gradients, rather than keeping full copies.

### 4.3 Tensor Parallelism

Data-parallel methods replicate the model and shard the data. **Tensor
Parallelism** shards the model itself across GPUs:

For a big linear layer, i.e. `Y = X @ W`:

- Split the weight matrix across GPUs (e.g., by columns).
- Each GPU holds a slice of the weights, `W_i`.
- Input `X` is broadcast to all GPUs.
- Each GPU computes its partial output `Y_i = X @ W_i`.
- Finally, an **all-gather** combines the partial outputs `Y_i` into the
  full output `Y`.

In practice, tensor parallelism is often combined with data parallelism
to balance memory and computation. For example, in a multi-node setup,
each node can run data parallelism, while within each node, tensor
parallelism shards the model across GPUs. This is reasonable considering
the high intra-node bandwidth (NVLink) compared to inter-node bandwidth
(InfiniBand).

### 4.4 Pipeline Parallelism

There is a generic type of tensor parallelism called **Model
Parallelism**, where different layers of the model are placed on
different GPUs. For example, we have 4 GPUs and a model with 32 layers:

- GPU 0: Layers 1-8
- GPU 1: Layers 9-16
- GPU 2: Layers 17-24
- GPU 3: Layers 25-32

This is suboptimal because GPUs sit idle waiting for data from the
previous GPU.

However, we can **pipeline** the execution:

1.  Split the input batch into micro-batches.
2.  While GPU 0 is processing micro-batch 2, GPU 1 can process
    micro-batch 1, and GPU 2 can process micro-batch 0.

For the same 4-GPU, 32-layer model, take the global batch and split it
into 4 micro-batches:

| Time Step | GPU 0      | GPU 1       | GPU 2        | GPU 3        |
|-----------|------------|-------------|--------------|--------------|
| 1         | MB 0: L1-8 |             |              |              |
| 2         | MB 1: L1-8 | MB 0: L9-16 |              |              |
| 3         | MB 2: L1-8 | MB 1: L9-16 | MB 0: L17-24 |              |
| 4         | MB 3: L1-8 | MB 2: L9-16 | MB 1: L17-24 | MB 0: L25-32 |
| …         | …          | …           | …            | …            |

Communication happens between GPUs to pass activations forward and
gradients backward. The key is to keep all GPUs busy by overlapping
computation and communication.

------------------------------------------------------------------------

## 5. Topology-aware communication: rings, trees, and NVLink

On a real box setup, not all GPUs are equally connected:

- Some GPUs are directly connected via NVLink,
- Others have to go through PCIe or multiple NVLink hops (via NVSwitch).

NCCL and similar libraries:

- Probe the topology,
- Build logical rings or trees that optimize for the fastest paths.
- Choose communication patterns that minimize hops and maximize
  bandwidth.

For example:

- On 8 GPUs in a DGX system, a ring all-reduce can be constructed so
  that each GPU communicates primarily over NVLink, avoiding PCIe
  bottlenecks.
- For small messages, tree-based algorithms can reduce latency by
  minimizing the number of hops.
- For large messages, ring-based algorithms maximize bandwidth by
  keeping all links busy.

> We prefer ring-based all-reduce for large tensors because it fully
> utilizes the available bandwidth. For small tensors, tree-based
> approaches can be faster due to lower latency. For a tree-based
> algorithm, we are bound by the depth of the tree (log N) rather than
> the number of GPUs (N).

------------------------------------------------------------------------

## 6. Hiding communication latency

To maximize GPU utilization, we want to **hide communication latency**
behind computation. Some strategies include:

- **Overlapping communication and computation**:
  - Kick off an `all-reduce` for gradients of layer L while computing
    the backward pass for layer L-1.
- **Gradient bucketing**:
  - Group many small tensors into bigger buckets before all-reduce to
    avoid per-call overhead.
- **Mixed precision & compression**:
  - Gradients often travel in FP16/BF16.
  - Some systems apply quantization or sparsification to reduce message
    sizes further.

------------------------------------------------------------------------

## 7. Conclusion

When looking from afar, multi-GPU training is about two operations:
compute and communicate. As models and datasets grow, communication
increasingly becomes the bottleneck. Understanding the hardware
topology, core communication patterns, and training strategies is
crucial to designing efficient distributed training systems.

Starting to treat communication as a first-class citizen in your
training architecture will pay dividends as you scale to larger models
and datasets.

