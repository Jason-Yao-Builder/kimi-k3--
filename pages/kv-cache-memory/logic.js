export const phaseMeta = [
  { token: "1", note: "新 token 进入", fill: 8 },
  { token: "128K", note: "历史 K/V 开始堆积", fill: 31 },
  { token: "512K", note: "缓存持续常驻", fill: 66 },
  { token: "1M", note: "长上下文成为显存问题", fill: 94 },
  { token: "1M × 2", note: "第二个并发请求复制一条仓库", fill: 94 },
];

export const cacheFormula = "KV显存 = token数 × 全局注意力层数 × 每token缓存维度 × 精度字节 × 并发请求数";

export const restorePhase = (value) => Math.min(phaseMeta.length - 1, Math.max(0, Number(value) || 0));
