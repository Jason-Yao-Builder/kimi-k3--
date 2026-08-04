export const CLAIMS = [
  "四代模型共享同一核心问题：如何在更长上下文、更大规模下保持高效信息流动，架构创新都是对此的结构性回应。",
  "注意力是最大变量：MHA → MLA → KDA + MLA 混合，每一步都主动压缩 KV cache。",
  "MoE 从缺席到 384 专家再到 896 专家，稀疏度成为降低推理成本、同时扩大容量的核心杠杆。",
  "多模态从视觉追加式对齐走向原生联合训练；K3 视觉编码器从头接受 NTP，共同塑造表示空间。",
];

export const LEFT_VIEWS = [
  ["attention", "注意力维度"],
  ["scale", "规模维度"],
  ["multimodal", "多模态维度"],
];

export const VERSIONS = [
  {
    id: "k1.5", label: "k1.5", date: "2025.01",
    attention: { title: "MHA / MQA", detail: "KV cache O(n) · 全量 softmax", badge: "131K ctx" },
    scale: { title: "未公开", detail: "无 MoE · 激活参数未公开", badge: "Dense" },
    multimodal: { title: "视觉追加式", detail: "SigLIP 初始化 Vision Tower，语言主干先固化", badge: "追加" },
  },
  {
    id: "k2", label: "K2", date: "2025.07",
    attention: { title: "MLA", detail: "压缩 KV → 潜向量 cₜ · O(n) 但系数更小", badge: "128K ctx" },
    scale: { title: "1.04T", detail: "激活 32.6B · 384 专家", badge: "Top-8" },
    multimodal: { title: "纯文本", detail: "无视觉，专注语言与 MoE 架构", badge: "暂停" },
  },
  {
    id: "k2.5", label: "K2.5", date: "2026.02",
    attention: { title: "MLA（继承）", detail: "与 K2 相同，主干架构不变", badge: "262K ctx" },
    scale: { title: "1.04T", detail: "激活 32.6B · 384 专家（继承 K2）", badge: "Top-8" },
    multimodal: { title: "原生联合训练", detail: "MoonViT-3D · 早期低比例融合 · 图像视频共享参数", badge: "联合" },
  },
  {
    id: "k3", label: "K3", date: "2026.07",
    attention: { title: "KDA × 69 + Gated MLA × 24", detail: "3:1 混合 · O(1) 状态 + 精确全局检索", badge: "1M ctx" },
    scale: { title: "2.78T", detail: "激活 104.2B · 896 专家", badge: "Top-16" },
    multimodal: { title: "视觉从头 NTP", detail: "MoonViT-V2 随机初始化 · 去对比损失 · 与语言同目标", badge: "消除域偏移" },
  },
];

export const TRANSITIONS = {
  attention: ["引入潜向量压缩", "主干沿用", "75% 层替换为线性注意力"],
  scale: ["首次引入 384 专家", "规模继承", "+167% 参数 · +133% 专家"],
  multimodal: ["视觉暂离", "早期联合训练", "SigLIP 初始化 → 从头 NTP"],
};

export const K3_DIMENSIONS = [
  ["sequence", "序列维度"],
  ["depth", "深度维度"],
  ["width", "宽度维度"],
];

export const K15_ATTENTION = [
  ["mha", "MHA · 独立 K/V"],
  ["mqa", "MQA · 共享 K/V"],
];

export const K15_DETAILS = {
  mha: {
    title: "MHA = Multi-Head Attention：每个头各自保存 K/V",
    note: "多头注意力把不同关系分给不同头处理；代价是每生成一个 token，要为每个头追加独立的 K 和 V，因此 KV cache 的系数随头数 H 增长。",
    footer: "来源：Kimi K1.5 Technical Report Appendix B.3；术语：Attention Is All You Need（2017）",
  },
  mqa: {
    title: "MQA = Multi-Query Attention：多个 Q 头共享一组 K/V",
    note: "多查询注意力保留多个 Query 头，但让它们读取同一组 K/V。这样 KV cache 的头数系数从 H 变为 1；它仍随序列长度线性增长。",
    footer: "来源：Kimi K1.5 Technical Report Appendix B.3；术语：Fast Transformer Decoding: One Write-Head is All You Need（2019）",
  },
};

export const DETAIL_COPY = {
  "k1.5": {
    title: "k1.5 注意力：标准 MHA，KV cache 随序列线性增长",
    note: "每生成一个新 token，缓存增长一行 K 和一行 V。",
    footer: "131K 上下文 → 约 49 GB KV cache（以 K3 规格估算）",
  },
  k2: {
    title: "K2 引入 MLA：KV 压缩为潜向量，缓存减少但精度保全",
    note: "K2 只缓存 cᴷⱽₜ=512 与位置键 kᴿₜ=64：576 个数/token。对照逐头 K/V 缓存 64 × (128+64+128)=20,480 个数/token，直接得到 35.6× 的 cache 压缩；报告未披露端到端推理加速倍数。",
    footer: "来源：K2 Technical Report §2.3、Table 2；K2 官方 config.json（KV rank / head dims）",
  },
  "k2.5": {
    title: "K2.5：主干架构不变，视觉编码器首次原生接入",
    note: "早期 10% 视觉融合优于晚期 50% 融合，关键不是视觉 token 更多，而是更早共同塑造表示。",
    footer: "262K token · ViT 独立 → 联合 → 长上下文",
  },
  k3: {
    title: "K3：三维度架构，让信息沿序列、深度与宽度高效流动",
    note: "KDA、AttnRes 与 Stable LatentMoE 分别改写三条信息通道。",
    footer: "93 层 · KDA:MLA = 3:1 · 896 路由专家 · 1M 上下文",
  },
};

export const FORMULAS = {
  mha: [
    "Q = xWq    K = xWk    V = xWv",
    "Attention(Q,K,V) = softmax(QKᵀ / √d) · V",
    "缓存元素/token = H · (dₖ + dᵥ)",
    "存储 O(n)；使用 KV cache 后单步计算 O(n)",
  ],
  mqa: [
    "Q₁…Qᴴ = xWq₁…Wqᴴ    ← 多个 Query 头",
    "K = xWk    V = xWv    ← 全部 Query 共享",
    "缓存元素/token = 1 · (dₖ + dᵥ)",
    "存储仍是 O(n)，但 KV cache 系数从 H 降为 1",
  ],
  k2: [
    "cₜ = xₜWc    ← 只缓存潜向量",
    "Kₜ = cₜWuk    Vₜ = cₜWuv",
    "Oₜ = Attention(qₜ, [K₁…Kₜ], [V₁…Vₜ])",
    "64 × (128+64+128) / (512+64) = 35.6× cache 压缩",
  ],
  "k2.5": [
    "v_tokens = MoonViT-3D(image)",
    "v_proj = MLP(v_tokens)",
    "L = L_caption；联合 next-token prediction",
    "SigLIP 全局对比目标 ≠ NTP 局部 token 目标 → 梯度冲突",
  ],
  sequence: [
    "Sₜ = (I−βₜkₜkₜᵀ) · Diag(αₜ)Sₜ₋₁ + βₜkₜvₜᵀ",
    "õₜ = Sₜᵀqₜ；S ∈ ℝ^(dₖ×dᵥ) ← 固定大小",
    "yₜ = Wₒ[Sigmoid(Wg xₜ) ⊙ RMSNorm(õₜ)]",
  ],
  depth: [
    "标准残差：xₗ = xₗ₋₁ + f(xₗ₋₁)",
    "αᵢ = softmax(wᵢ · [h₀,h₁,…,hB])",
    "xₗ = xₗ₋₁ + f(xₗ₋₁) + ∑ᵢαᵢhᵢ",
  ],
  width: [
    "z_latent = xW_down；r = Router(z_latent)",
    "top-16(r) → 从 896 个专家中选出 16 个",
    "y = ∑ᵢ∈top16 rᵢ · expertᵢ(x) + shared_expert(x)",
  ],
};

export const SOURCE = "Kimi K1.5 Technical Report Appendix B.3；K2 Technical Report §2.3、Table 2；K2 官方 config.json；K2.5 Technical Report §4.2；K3 Technical Report §2、Table 1";
