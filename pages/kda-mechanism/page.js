import { renderKdaMechanism } from "./component.js";

export const kdaMechanismPage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "kda-mechanism": renderKdaMechanism },
  slide: {
    id: "kda-mechanism",
    section: "KDA",
    role: "KDA",
    title: "KDA：用固定记事本替代线性增长的 KV Cache",
    layout: "kda-mechanism",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache" },
      { number: "2.1", label: "KDA", target: "kv-cache" },
      { number: "2.1.5", label: "KDA 机制", target: "kda-mechanism", current: true },
    ],
    edges: [{ type: "next", target: "residual-connections" }],
    blocks: [{
      type: "kda-mechanism",
      id: "kda-mechanism-lab",
      claims: [
        "思想路径：RetNet 用固定衰减压缩历史，GLA 让衰减随输入和通道变化，DeltaNet 引入写前擦除，Gated DeltaNet 再加入标量衰减；KDA 最终把它扩展为逐通道衰减，并补上数值稳定与全秩门控。",
        "核心机制：KDA 用固定状态矩阵 S 递归更新，先按通道衰减、再擦除键方向冲突、最后写入新值；显存从随 token 增长的 O(n) 降为 O(1)，代价是固定状态必然有损。",
        "互补关系：KDA 擅长位置感知的局部连续状态，Gated MLA 保留可按内容精确寻址的长程 latent；K3 用 3:1 层比组合两者，以低显存承担近程建模，用周期性全局检索校正远程信息。",
      ],
      source: "Kimi K3 Technical Report §2.1.1 Eq.(1)(2)(6)；Yang et al. 2024 (Delta Rule)",
    }],
  },
};
