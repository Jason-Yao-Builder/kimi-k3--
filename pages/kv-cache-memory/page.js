import { renderKvCacheProblem } from "./component.js";

export const kvCacheMemoryPage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "kv-cache-problem": renderKvCacheProblem },
  slide: {
    id: "kv-cache-problem",
    section: "KDA",
    role: "PPT 02",
    title: "KV Cache 省下了重算，却开始吞噬显存",
    layout: "kv-cache-problem",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache-problem" },
      { number: "2.1", label: "KDA", target: "kv-cache-problem" },
      { number: "2.1.1", label: "问题起点", target: "kv-cache-problem", current: true },
    ],
    edges: [{ type: "next", target: "kv-cache" }],
    blocks: [{
      type: "kv-cache-problem",
      id: "kv-cache-problem-lab",
      claims: [
        "生成新 token 时，当前 Query 要读取全部历史 Key，并加权汇总历史 Value；KV Cache 保存已经算过的 K/V，避免每一步重算前文。",
        "单请求 KV 容量随上下文长度 n 线性增长；服务多个请求时，还会继续乘上并发数。",
        "KV Cache 是一笔交换：用越来越多的显存，换取更少的重复计算。",
      ],
      source: "Attention Is All You Need；PagedAttention，SOSP 2023；Kimi K3 Technical Report §2.1",
    }],
  },
};
