export const calcMhaCache = (length) => length * 96 * 128 * 2 * 93 * 2 / 1e9;

export const calcMlaCache = (length, compressionRatio = 6.9) => (
  length * 3584 * 93 * 2 / 1e9 / compressionRatio
);

export const calcKdaStateSize = () => 128 * 128 * 2 / 1024;

export const GATE_PROFILE = {
  brace: [0.90, 0.85, 0.15, 0.12, 0.55, 0.48, 0.88, 0.20],
  print: [0.30, 0.25, 0.20, 0.15, 0.88, 0.82, 0.30, 0.70],
};

export const PRIOR_SCHEMES = [
  { id: "mha", label: "MHA", cache: "H × dₖ", cost: "无", adoption: "所有基础模型" },
  { id: "mqa", label: "MQA", cache: "1 × dₖ", cost: "大（检索退化）", adoption: "早期推理优化" },
  { id: "gqa", label: "GQA", cache: "G × dₖ", cost: "中（可接受）", adoption: "Llama 3 / Mistral" },
  { id: "mla", label: "MLA", cache: "d_latent", cost: "极小", adoption: "DeepSeek / Kimi", featured: true },
];

export const CHANNEL_LABELS = ["结构闭合", "作用域", "数值计算", "循环变量", "类型/调用", "注释/输出", "缩进", "运算符"];
