import { renderLatentMoe } from "./component.js";

export const latentMoePage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "latent-moe": renderLatentMoe },
  slide: {
    id: "latent-moe",
    section: "LatentMoE",
    role: "2.3",
    title: "Stable LatentMoE：降维路由 + 三重稳定",
    layout: "latent-moe",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache" },
      { number: "2.3", label: "LatentMoE", target: "latent-moe" },
      { number: "2.3.1", label: "Stable LatentMoE", target: "latent-moe", current: true },
    ],
    edges: [{ type: "next", target: "quantile-balancing" }],
    blocks: [{
      type: "latent-moe",
      id: "latent-moe-lab",
      claims: [
        "MoE 把大 FFN 拆成 896 个专家，每 token 只激活 Top-16；LatentMoE 先压缩到 ℓ=3584，路由与专家计算都在低维空间完成，激活权重减少约 40%。",
        "RMSNorm 拉齐聚合结果 u 的跨 token 范数；SiTU-GLU 用 tanh 同时限制 gate 与 up 两路，阻止 BF16 精度被少数激活离群值吞噬。",
        "Quantile Balancing 从余量分布直接计算专家偏置，一步逼近均衡，同时保留高匹配分数 token。",
      ],
      source: "Kimi K3 Technical Report §2.3、§2.3.1、§2.3.2、§2.3.3；Table 1",
    }],
  },
};
