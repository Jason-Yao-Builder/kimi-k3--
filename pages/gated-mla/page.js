import { renderGatedMla } from "./component.js?build=20260804-nope-spacing-4";

export const gatedMlaPage = {
  style: new URL("./styles.css?build=20260804-nope-spacing-4", import.meta.url).href,
  renderers: { "gated-mla": renderGatedMla },
  slide: {
    id: "gated-mla",
    section: "Gated MLA",
    role: "2.2",
    title: "Gated MLA：从 KV 爆炸到全局精确检索",
    layout: "gated-mla",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache" },
      { number: "2.2", label: "Gated MLA", target: "gated-mla" },
      { number: "2.2.1", label: "Gated MLA 机制", target: "gated-mla", current: true },
    ],
    edges: [{ type: "next", target: "kda-mechanism" }],
    blocks: [{
      type: "gated-mla",
      id: "gated-mla-lab",
      claims: [
        "KV cache 随序列线性爆炸：1M token 下单层约 49 GB，93 层不可行；MLA 压缩每个 token 的表示，而不是减少头数。",
        "MLA 只缓存低维 latent vector cₜ，计算时实时重建 K/V；全局 softmax attention 完整保留。",
        "K3 的 MLA 使用 NoPE 与全秩输出门控：KDA 承担位置感知，门控按当前 token 角色逐通道过滤全局读出。",
      ],
    }],
  },
};
