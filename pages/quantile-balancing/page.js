import { renderQuantileBalancing } from "./component.js";

export const quantileBalancingPage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "quantile-balancing": renderQuantileBalancing },
  slide: {
    id: "quantile-balancing",
    section: "LatentMoE",
    role: "辅助详解",
    title: "Quantile Balancing：一步到达均衡",
    layout: "quantile-balancing",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache" },
      { number: "2.3", label: "LatentMoE", target: "latent-moe" },
      { number: "2.3.A", label: "Quantile Balancing", target: "quantile-balancing", current: true },
    ],
    edges: [
      { type: "return", target: "latent-moe" },
      { type: "next", target: "pretraining-evolution" },
    ],
    blocks: [{
      type: "quantile-balancing",
      id: "quantile-balancing-lab",
      claims: [
        "旧方法每步只知道专家该升还是该降，靠固定步长 γ 缓慢逼近均衡；γ 过大还会在均衡点附近振荡。",
        "QB 先计算每个 token 的入选门槛 α，再从各专家余量分布直接求精确偏置，一步到位且无需调参。",
        "QB 在每 token 选 k 个、每专家收 q 个的双重约束下最大化路由匹配分数；旧方法是同一对偶目标上的 SignSGD。",
      ],
      source: "Kimi K3 Technical Report §2.3.3、Appendix C Eq.(20–26) Algorithm 1、Appendix D",
    }],
  },
};
