// Homepage hero card: a small terminal introducing the site.
export const stages = ['whoami', 'work', 'stack', 'now'] as const;

export const filename = 'samarth.sh';
export const caption = "four commands, that's the site";

export const panes: string[] = [
  `<span class="c">$</span> <span class="o">whoami</span>

<span class="v">samarth narang</span>
deep learning compiler engineer, <span class="t">nvidia</span>
<span class="n">new york, ny</span>

<span class="c"># previously qualcomm, degirum</span>`,

  `<span class="c">$</span> <span class="o">cat</span> work.txt

<span class="t">nvidia</span>      <span class="n">2026 — now </span>  <span class="c">formal verification</span>
<span class="t">qualcomm</span>    <span class="n">2024 — 2026</span>  <span class="c">hexagon npu, tiling</span>
<span class="t">degirum</span>     <span class="n">2022 — 2024</span>  <span class="c">accelerator backend</span>

<span class="c"># the long version is below</span>`,

  `<span class="c">$</span> <span class="o">ls</span> stack/

<span class="k">daily</span>       c++  python  mlir  llvm
<span class="k">often</span>       pytorch  assembly  unix
<span class="k">sometimes</span>   java  sql  flutter`,

  `<span class="c">$</span> <span class="o">tail</span> -f now.log

<span class="n">→</span> making sure deep learning compilers
  do not break, mostly
<span class="n">→</span> writing at <span class="t">/tiled-thoughts</span>
<span class="n">→</span> eating something, or in the gym so i can
  eat something`,
];
