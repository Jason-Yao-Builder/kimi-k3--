import { renderKvCacheSolutions } from "./component.js";

export const kvCacheSolutionsPage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "kv-cache-solutions": renderKvCacheSolutions },
  slide: {
    id: "kv-cache-solutions",
    section: "KDA",
    role: "KV Cache",
    title: "四条路线，两个维度的权衡",
    layout: "kv-cache-solutions",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache" },
      { number: "2.1", label: "KDA", target: "kv-cache" },
      { number: "2.1.4", label: "KV Cache 的解法", target: "kv-cache-solutions", current: true },
    ],
    edges: [{ type: "next", target: "gated-mla" }],
    blocks: [{
      type: "kv-cache-solutions",
      id: "kv-cache-solutions-lab",
      claims: [
        "所有解法都在精确回忆与显存/带宽之间取舍，没有免费的午餐。",
        "KV 压缩（MLA）保留全局 Attention，通过降维缩小常数项；递归（KDA）把 O(n) 压到 O(1)，但有损。",
        "Kimi K3 选择混合路线：KDA 处理局部连续信息，Gated MLA 周期性补全全局精确检索。",
      ],
      source: "Kimi K3 Technical Report §2.1；DeepSeek-V2 Technical Report；Yang et al. 2024 (Delta Rule)",
    }],
  },
};
