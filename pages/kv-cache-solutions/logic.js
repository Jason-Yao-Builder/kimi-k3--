export const ANIM_DURATION = 250;
export const ANIM_LOOP_INTERVAL = 2400;

export const SOLUTIONS = [
  {
    id: "flash-attn", label: "IO 优化", memory: "O(n)", recall: "完整", recallPositive: true,
    tagline: "分块读写，不改 KV 总量",
    detail: [
      "KV Cache 结构完全不变，96 个头的完整 KV 都存在 HBM。",
      "FlashAttention 将 Q/K/V 分成小块，分批读进 SRAM 计算，避免整块 HBM 读写的带宽峰值。",
      "序列增长时显存和带宽压力仍线性增加，治的是速度，不是规模。",
    ], reps: ["FlashAttention 1 / 2 / 3"], k3: false,
  },
  {
    id: "kv-compress", label: "KV 压缩", memory: "O(n)，系数小", recall: "基本完整", recallPositive: true,
    tagline: "压缩 KV 维度，全局 Attention 不变",
    detail: [
      "将各头独立 KV 压缩为低维 latent vector（c_t = W_c · x_t），推理 Cache 只存 c_t。",
      "计算 Attention 时从 c_t 实时重建 K/V，全序列 softmax Attention 完整执行。",
      "压缩比约 8–16×；代价是增加上投影计算量，但显存降幅远大于计算增量。",
    ], reps: ["MQA / GQA / MLA（Kimi K3）"], k3: true,
  },
  {
    id: "sparse-attn", label: "稀疏 Attention", memory: "O(n)", recall: "有损", recallPositive: false,
    tagline: "只看局部窗口，远处结构性不可达",
    detail: [
      "每个 token 只计算与局部窗口内（如左右 512 token）和少数全局位置的 Attention。",
      "窗口外的 token 之间权重直接置零，显存随序列线性增长但计算量降为 O(n·w)。",
      "代价：跨段事实引用、长距离依赖结构性受损，精度损失与任务相关性强。",
    ], reps: ["Longformer / BigBird"], k3: false,
  },
  {
    id: "linear-recurrent", label: "递归/线性", memory: "O(1)", recall: "有损", recallPositive: false,
    tagline: "固定状态矩阵，不随序列增长",
    detail: [
      "维护固定大小状态矩阵 S（dₖ × dᵥ），每个新 token 到来时更新 S，不追加存储。",
      "查询时从 S 读出当前 token 需要的历史信息，显存对序列长度为 O(1)。",
      "代价：S 是有损压缩，无法精确寻址任意历史 token；远处低频信息可能被衰减覆盖。",
    ], reps: ["RetNet / Mamba / KDA（Kimi K3）"], k3: true,
  },
];
