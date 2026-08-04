import { renderKvCacheCost } from "./component.js";

export const kvCacheCostPage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "kv-cache-cost": renderKvCacheCost },
  slide: {
    id: "kv-cache-cost",
    section: "KDA",
    role: "KV Cache",
    title: "KV Cache 的代价——序列越长，每步解码越慢",
    layout: "kv-cache-cost",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache" },
      { number: "2.1", label: "KDA", target: "kv-cache" },
      { number: "2.1.3", label: "KV Cache 的代价", target: "kv-cache-cost", current: true },
    ],
    edges: [{ type: "next", target: "kv-cache-solutions" }],
    blocks: [{
      type: "kv-cache-cost",
      id: "kv-cache-cost-lab",
      claims: [
        "KV Cache 让单步计算从 O(n²) 降到 O(n)，但存储和带宽仍随序列线性增长。",
        "Kimi K3 的目标上下文是 1M token；93 层 × 96 头下，全量 KV Cache 约 4,571 GB。",
        "H100 HBM 带宽约 3.35 TB/s：1M token 时，每解码步骤仅在等待数据就需要约 1,365 ms。",
      ],
      source: "Kimi K3 Technical Report §2.1、§5.1；NVIDIA H100 Architecture Whitepaper（HBM 带宽 3.35 TB/s）",
    }],
  },
};
