export const VERSIONS = [
  { id: "k15", label: "K1.5", year: "过滤与长上下文起点" },
  { id: "k2", label: "K2", year: "优化器与数据增广" },
  { id: "k25", label: "K2.5", year: "联合多模态预训练" },
  { id: "k3", label: "K3", year: "原生多模态合流" },
];

export const DIMENSIONS = [
  { id: "objective", label: "训练目标" },
  { id: "optimizer", label: "优化器" },
  { id: "lr", label: "LR 调度" },
  { id: "data", label: "数据" },
  { id: "context", label: "长上下文" },
  { id: "compute", label: "并行计算" },
];

const overviewRows = {
  k15: [["objective", "NTP"], ["optimizer", "未披露"], ["lr", "未披露"], ["data", "四层筛选"], ["context", "4K→131K"]],
  k2: [["objective", "NTP"], ["optimizer", "MuonClip"], ["lr", "WSD"], ["data", "+ rephrasing"], ["context", "4K→128K"], ["compute", "EP16+PP"]],
  k25: [["objective", "NTP+视觉 CE"], ["optimizer", "继承"], ["lr", "继承 WSD"], ["data", "+ 七类视觉"], ["context", "4K→262K"]],
  k3: [["objective", "NTP+MTP"], ["optimizer", "Per-Head"], ["lr", "cosine"], ["data", "+ 程序化多模态"], ["context", "8K→1M"]],
};

const lineTypes = {
  "objective-k25": "improve", "objective-k3": "improve",
  "optimizer-k2": "redesign", "optimizer-k25": "inherit", "optimizer-k3": "improve",
  "lr-k2": "redesign", "lr-k25": "inherit", "lr-k3": "redesign",
  "data-k2": "improve", "data-k25": "improve", "data-k3": "improve",
  "context-k2": "inherit", "context-k25": "improve", "context-k3": "redesign",
  "compute-k2": "redesign", "compute-k25": "improve", "compute-k3": "improve",
};

export const LABELS = VERSIONS.flatMap((version) => overviewRows[version.id].map(([dimension, text]) => ({
  id: `${dimension}-${version.id}`,
  dimension,
  version: version.id,
  text,
  lineType: lineTypes[`${dimension}-${version.id}`] || null,
})));

export const CONNECTIONS = DIMENSIONS.flatMap((dimension) => VERSIONS.slice(1).map((version, index) => ({
  from: `${dimension.id}-${VERSIONS[index].id}`,
  to: `${dimension.id}-${version.id}`,
  type: lineTypes[`${dimension.id}-${version.id}`],
})));

export const OPTIMIZER_TAB_BY_LABEL = {
  "optimizer-k15": "momentum",
  "optimizer-k2": "muonclip",
  "optimizer-k25": "muonclip",
  "optimizer-k3": "per-head",
};

export const OPTIMIZER_LABEL_BY_TAB = {
  momentum: "optimizer-k15",
  muonclip: "optimizer-k2",
  "per-head": "optimizer-k3",
};

export const OPTIMIZER_CHAPTERS = {
  momentum: {
    tab: "AdamW",
    eyebrow: "K1.5 前置 · SGD → Momentum → Adam → AdamW",
    title: "先让更新方向稳定，再让每个参数拥有自己的步长",
    lead: "梯度只告诉我们这一小批数据的下坡方向。动量把多步方向累积起来；Adam 再估计每个参数的梯度尺度。",
    sections: [
      {
        title: "单步梯度为什么不够",
        copy: "🟡 优化器基础定义：SGD 直接使用当前梯度。狭长损失谷里，横向梯度会反复变号，模型来回摆动；真正指向谷底的纵向信号反而推进缓慢。",
        formula: ["gₜ = ∇θL(θₜ)", "θₜ₊₁ = θₜ − ηgₜ"],
        visual: "sgd",
      },
      {
        title: "Momentum：记住过去的方向",
        copy: "🟡 动量优化器：把历史梯度做指数加权平均。反复变号的方向互相抵消，持续同向的信号被保留，更新轨迹因此更平滑。",
        formula: ["mₜ = βmₜ₋₁ + (1−β)gₜ", "θₜ₊₁ = θₜ − ηmₜ"],
        visual: "momentum",
      },
      {
        title: "Adam：方向之外，还要估计尺度",
        copy: "🟢 Adam 原论文：Momentum 只累积“往哪走”，Adam 还用梯度平方的历史均值估计每个参数平时的尺度。大梯度方向自动缩小步长，小梯度方向保留推进速度。",
        formula: ["Momentum：uₜ=0.9uₜ₋₁+gₜ，Δθ=−0.01uₜ", "Adam：Δθ=−η·m̂ₜ/(√v̂ₜ+ε)", "g₁=100g₂ ⇒ m̂₁/√v̂₁≈m̂₂/√v̂₂"],
        example: {
          title: "三步数值对照",
          setup: "g₁=[100,80,60] · g₂=[1,.8,.6] · η=.01",
          rows: [
            ["Momentum θ₁", "−1.00", "−1.70", "−2.13"],
            ["Momentum θ₂", "−.010", "−.017", "−.021"],
            ["Adam θ₁", "−.0100", "−.0099", "−.0096"],
            ["Adam θ₂", "−.0100", "−.0099", "−.0096"],
          ],
          note: "Momentum 两个方向始终相差 100×；Adam 用 √v̂ 抵消尺度差，让相对同样显著的梯度获得近似同样的步长。",
        },
        source: "🟢 Kingma & Ba, Adam: A Method for Stochastic Optimization, arXiv:1412.6980。",
        visual: "adam",
      },
      {
        title: "下一步问题：正则化不该被自适应步长扭曲",
        copy: "🟢 AdamW 原论文：Adam+L2 的权重衰减没有少一项，而是藏在 m̂⁽ᴸ²⁾ 中；λθ 同时参与 m 和 v，使衰减强度依赖任务梯度尺度。AdamW 让 m、v 只统计任务梯度，再直接衰减参数。",
        formulaComparison: {
          setup: "精确同号首步：m₀=v₀=0，θ=1，λ=0.1；比较 gₐ=10 与 gᵦ=0.1",
          columns: [
            {
              label: "Adam + L2 · 耦合（精确展开）",
              tone: "coupled",
              lines: [
                "g̃ₜ = gₜ + λθₜ",
                "mₜ = β₁mₜ₋₁ + (1−β₁)(gₜ+λθₜ)",
                "vₜ = β₂vₜ₋₁ + (1−β₂)(gₜ+λθₜ)²",
                "m̂ₜ = m̂ₜ⁽ᵍ⁾ + m̂ₜ⁽ᴸ²⁾",
                "Dₜ = √v̂ₜ[g+λθ] + ε",
                "θₜ₊₁ = θₜ − η·m̂ₜ⁽ᵍ⁾/Dₜ − η·m̂ₜ⁽ᴸ²⁾/Dₜ",
              ],
              values: ["A：精确衰减贡献 = 0.1/10.1 ≈ 0.0099η", "B：精确衰减贡献 = 0.1/0.2 = 0.5η", "相同 λ，首步相差约 50×", "若近似 D≈|g|，B 会得到 1η；但此处 λθ=gᵦ，该近似失效"],
            },
            {
              label: "AdamW · 解耦",
              tone: "decoupled",
              lines: [
                "gₜ = ∇θL(θₜ)",
                "mₜ、vₜ 只由 gₜ 更新",
                "θₜ₊₁ = (1−ηλ)θₜ − η·m̂ₜ/(√v̂ₜ+ε)",
              ],
              values: ["A：参数衰减 = 0.1η", "B：参数衰减 = 0.1η", "同一 λ，不再经过 √v̂"],
            },
          ],
        },
        source: "🟢 Loshchilov & Hutter, Decoupled Weight Decay Regularization, arXiv:1711.05101。",
      },
    ],
    source: "🟡 Momentum、Adam 与 AdamW 的标准定义；此 Tab 只建立后续演进所需前置概念。",
  },
  muonclip: {
    tab: "MuonClip",
    eyebrow: "K2 → K2.5 · 更高 token efficiency，稳定性随后补齐",
    title: "Muon 负责把矩阵更新拉齐，QK-Clip 负责守住 logit 边界",
    lead: "K2 先用 Muon 换取更高的 token efficiency；模型扩到 53B 后又遇到 attention logit 爆炸，于是补上与 MLA 兼容的逐 head 限幅。K2.5 直接继承这套底座。",
    sections: [
      {
        title: "AdamW 的隐患",
        layout: "adamw-risk",
        timeline: [
          { stage: "第 t 步", event: "铃声 → 食物", note: "记录规律" },
          { stage: "第 t+100 步", event: "铃声持续可靠", note: "反应定型" },
          { stage: "分布漂移", event: "铃声 → 屠刀", note: "旧统计失效" },
        ],
        mechanism: [
          { tag: "积累", formula: "vₜ = β₂vₜ₋₁ + (1−β₂)gₜ²", note: "v 记录历史梯度的平方滚动均值" },
          { tag: "缩放", formula: "步长 ∝ 1/√vₜ", note: "历史梯度大的方向，当前步长被压小" },
          { tag: "问题", formula: "gₜ = 任务信号 + 尺度噪声", note: "v 也会把数据尺度与瞬时噪声存进去", warning: true },
        ],
        caption: "火鸡把过去的规律外推到今天；AdamW 用历史梯度尺度校准当前步长。分布变化时，旧统计可能暂时不再合适。",
        source: "论文来源：Liu et al., Muon is Scalable for LLM Training。类比边界：只解释历史统计失配，不等同于 AdamW 的完整机制。",
      },
      {
        title: "Muon 的回答",
        layout: "muon-answer",
        question: "如果只看这一步的梯度方向，不看历史尺度，最优的一步是什么？",
        questionCaption: "这是一个有精确答案的局部线性问题。",
        problem: "给定梯度矩阵 G，约束更新 ΔW 对任意单位向量的拉伸不超过 ε，即 ‖ΔW‖₂≤ε；选择让一阶 loss 变化 ⟨G, ΔW⟩ 最小的更新。",
        answer: "若 G=UΣVᵀ，则 ΔW₂=−εUVᵀ。UVᵀ 是 G 的正交因子。",
        intuition: "每个非零奇异方向都走满 ε，不多不少。Muon 用 momentum 矩阵 M 代替 G，并以 Newton–Schulz 近似这个正交因子。",
        comparison: {
          setup: "例：G=diag(3,1)，令 ε=1",
          leftTitle: "Frobenius 基线",
          leftFormula: "−G/‖G‖F = diag(−0.949,−0.316)",
          rightTitle: "谱范数更新",
          rightFormula: "−UVᵀ = diag(−1,−1)",
          caption: "同样限制为“走一步”：Frobenius 预算被强方向分走；谱范数约束允许两个奇异方向都走满。",
          caveat: "边界：这里比较的是两种范数几何，不是 AdamW 完整更新公式；AdamW 还包含逐元素 m/√v 与 weight decay。",
        },
        boundary: "实验：Muon 在相同 token 数下取得更低 loss 的优势已被观察。理论边界：“谱范数一定是神经网络更自然的标尺”尚不是完备结论。",
        source: "来源：Liu et al., Muon is Scalable for LLM Training；K2 Technical Report §2.1；Chen et al., Muon Optimizes Under Spectral Norm Constraints (2025)。此块结合 AI 研究整理，仍需进一步校验。",
      },
      {
        number: "03",
        title: "问题：logit 在某些 head 上失控",
        layout: "logit-problem",
        summary: "这一节回答：为什么全局统一的补救方法无法解决少数 head 的局部爆炸。",
        heads: [24, 31, 18, 37, 148, 29, 14, 158, 33, 21, 126, 35, 27, 142, 39, 23],
        threshold: 100,
        reportLabel: "53B 规模实测 · K2 Tech Report Figure 2",
        caption: "部分 head 与普通 head 的 logit 尺度可相差 10 倍以上；它们在学习不同模式，不能一刀切处理。",
        alternatives: [
          { name: "Logit soft-cap", formula: "tanh(s/τ)·τ", detail: "logit 已经爆炸后才截断", issue: "问题：事后补救，不是预防" },
          { name: "QK-Norm", formula: "LayerNorm(q), LayerNorm(k)", detail: "MLA 推理时 key 不完整实体化", issue: "问题：无法在完整 key 不存在处做 Norm" },
        ],
        conclusion: "需要一个在参数更新时介入、逐 head 处理的方案。",
        source: "来源：K2 Technical Report Figure 2。报告记录 53B 中间规模最大 attention logit 超过 1000并伴随训练不稳定。",
      },
      {
        number: "04",
        title: "方案：QK-Clip 在更新后裁剪",
        layout: "qk-clip-detail",
        summary: "这一节回答：怎样只拉回超界 head，同时不干扰其余 head。",
        heads: [24, 31, 18, 37, 148, 29, 14, 158, 33, 21, 126, 35, 27, 142, 39, 23],
        threshold: 100,
        steps: [
          { label: "Step 1", text: "估计当前 head h 能产生的最大 logit Sₘₐₓʰ" },
          { label: "Step 2", text: "计算 γʰ=τ/Sₘₐₓʰ；若 Sₘₐₓʰ≤τ，则跳过，不做操作" },
          { label: "Step 3", text: "Wqc←√γʰWqc；Wkc←√γʰWkc", highlight: true },
          { label: "Step 4", text: "Wqr←γʰWqr；跨 head 共享的 Wkr 保持不动" },
        ],
        caption: "只动超界的 head，功能正常的 head 一律不碰。",
        reasons: [
          { title: "为什么缩 √γ 而不是 γ", formula: "(√γ·q)·(√γ·k)=γ·(q·k)", copy: "q 和 k 各缩 √γ，点积整体缩 γ，恰好把 logit 压回 τ。" },
          { title: "为什么 Wkr 不动", formula: "Wqr←γWqr　Wkr 保持不动", copy: "Wkr 跨 head 共享，缩小会影响全部 head；Wqr 逐 head 独立，承担旋转分量的缩放。" },
        ],
        source: "来源：K2 Technical Report Algorithm 1。QK-Clip 是优化步骤后的参数后处理，不改变当前 step 的前向或反向。",
      },
      {
        number: "06",
        title: "训练结果",
        layout: "training-results",
        summary: "这一节回答：QK-Clip 是否稳定工作，以及 K2 最终采用了怎样的学习率配方。",
        facts: [
          { value: "全程零 spike", note: "15.5T token 主训练未出现 loss spike" },
          { value: "约训练至 30%", note: "最大 logit 自然回落到 τ 以下，clip 停止触发" },
          { value: "Weight decay = 0.1", note: "全程固定的正则化系数" },
          { value: "Global batch = 67M token", note: "全程固定不变" },
        ],
        source: "来源：K2 Technical Report §2.1、§2.5。15.5T 主训练后另有 460B token 退火阶段，学习率从 2e−5 降至 7e−6。",
      },
      {
        number: "07",
        title: "K2.5 为什么选择继承",
        copy: "🟢 K2.5 Technical Report 与 K3 回顾：K2.5 的创新集中在融合时机、视觉编码器和 DEP。主干架构规模相当，MuonClip 已经验证 15.5T token 稳定性，因此优化器、WSD 与 weight decay 沿用 K2。冻结语言配方也让视觉消融更容易归因。",
        formula: ["K2：Muon + QK-Clip + WSD", "K2.5：语言底座不变 → 只检验视觉侧变量"],
        visual: "inherit",
      },
    ],
    source: "🟢 K2 Technical Report §2.1、Figure 2、Algorithm 1；Moonlight；K2.5 Technical Report；K3 回顾性描述。",
  },
  "per-head": {
    tab: "Per-Head",
    eyebrow: "K3 · 从整层 Muon 到逐 head Muon",
    title: "整层正交化仍会让大 head 主导，所以 K3 把尺度竞争拆开",
    lead: "Muon 已经解决坐标轴级别的失衡，但整层矩阵里不同 attention head 仍可能相差两个数量级。K3 让每个 head 单独正交化，再重新搜索训练日程与模型形状。",
    sections: [
      {
        number: "01",
        title: "Muon 的隐患：整层归一化的机械过程",
        layout: "per-head-risk",
        frames: [
          { label: "拼接", formula: "M = concat(M₁, M₂, …, Mₕ)", note: "不同 head 的动量子矩阵先组成一个大矩阵。" },
          { label: "归一化", formula: "X₀ = M / ‖M‖F", note: "‖M₁‖=100 → ≈1；‖M₂‖=1 → ≈0.01。" },
          { label: "正交化后", formula: "U = NS(X₀)", note: "接近零的小 head 输出仍接近零，参数停止学习。" },
        ],
        diagnosis: [
          "不同 head 的梯度尺度可以相差两个数量级，因为它们学习的 token 关系不同。",
          "整层归一化把这种尺度差异当成噪声滤掉：Muon 解决坐标轴竞争，却引入 head 竞争。",
        ],
        source: "来源：K3 Technical Report §2.5。",
      },
      {
        number: "02",
        title: "Per-Head Muon：先切块，再各自正交化",
        layout: "per-head-solution",
        wholeSteps: ["拼接", "整体归一化", "NS", "整体输出"],
        headSteps: ["切块", "各自归一化", "各自 NS", "拼回"],
        formulas: ["Mₙ ∈ ℝᵈʰˣᵈ，每个 head 独立", "Uₙ = NS(Mₙ / ‖Mₙ‖F)", "W_update = concat(U₁, U₂, …, Uₕ)"],
        source: "来源：K3 Technical Report §2.5。",
      },
      {
        number: "03",
        title: "副作用：优化器变了，其他超参要重搜",
        layout: "per-head-retune",
        knobs: ["Batch / LR", "TPP", "层数 / 专家数", "激活专家数"],
        result: "层数 61→93　专家数 384→896　激活 Top-8→Top-16",
        formula: "lrₜ = lrₘᵢₙ + 0.5(lrₘₐₓ−lrₘᵢₙ)(1+cos(πt/T))",
        source: "来源：K3 Technical Report §3.2、Figure 7、Table 1。",
      },
      {
        number: "04",
        title: "2.5× 到底是什么",
        layout: "efficiency-note",
        correct: "达到同等 loss，K3 所需 FLOPs 是旧配方的 1/2.5",
        incorrect: "推理速度不是旧配方的 2.5 倍",
        formula: "FLOPs_K3 · 2.5 ≈ FLOPs_旧配方（同等 loss）",
        source: "来源：K3 Technical Report §3.2。",
      },
    ],
    source: "来源：K3 Technical Report §2.5、§3.2、Figure 7、Table 1。",
  },
};

export const MULTIMODAL_TAB_BY_LABEL = {
  "multimodal-k15": "appended",
  "multimodal-k2": "text-only",
  "multimodal-k25": "early-fusion",
  "multimodal-k3": "native",
};

export const MULTIMODAL_LABEL_BY_TAB = {
  foundation: null,
  appended: "multimodal-k15",
  "text-only": "multimodal-k2",
  "early-fusion": "multimodal-k25",
  native: "multimodal-k3",
};

export const MULTIMODAL_CHAPTERS = {
  foundation: {
    tab: "接入问题",
    eyebrow: "前置 · 图像怎样进入语言模型",
    title: "真正的分岔不在有没有视觉塔，而在视觉何时参与塑造表示",
    lead: "图像先被切成 patch，再由视觉编码器变成 token。此后有两个关键选择：语言主干是否先冻结，以及视觉目标何时从对比学习切换为 next-token prediction。",
    stages: ["图像 patch", "视觉编码", "投影对齐", "联合训练", "原生 NTP"],
    sections: [
      { title: "第一道接口：把二维图像变成 token", copy: "🟡 多模态模型基础：ViT 将图像分块并编码，projector 把视觉特征映射到语言嵌入维度，LLM 才能像读取文字一样读取视觉 token。", formula: ["zᵥ = Eᵥ(Ipatch)", "hᵥ = P·zᵥ，随后与文本 token 串接"], visual: "vision-interface" },
      { title: "冻结主干，意味着视觉只能迁就既有语言空间", copy: "🟡 若 LLM 已经训好并被冻结，projector 只能寻找已有概念的语言锚点。接入便宜且不伤语言能力，但纯视觉结构很难反过来重塑语言表示。", formula: ["冻结：∇θLLM L = 0", "只更新 θViT 与 θprojector"], visual: "freeze" },
      { title: "越早联合，越能共同形成跨模态表示", copy: "🟡 若视觉从训练早期参与，ViT 与 LLM 可以同时调整内部表示；代价是训练变量更多，模态比例、目标函数和并行负载必须共同稳定。", formula: ["L = Ltext + Lvision-token", "∇θViT L ≠ 0　∇θLLM L ≠ 0"], visual: "co-adapt" },
      { title: "四代路线由此展开", copy: "🔴 演进归纳：K1.5 先语言后视觉；K2 暂停视觉、先稳住语言底座；K2.5 提前融合；K3 则让视觉编码器从随机初始化起直接接受 NTP 梯度。", formula: ["接入式 → 早期联合 → 原生共同预训练"], visual: "multimodal-arc" },
    ],
    source: "🟡 多模态模型通用接口；🔴 基于 K1.5、K2、K2.5、K3 报告的演进归纳。",
  },
  appended: {
    tab: "追加式",
    eyebrow: "K1.5 · 先语言，后视觉",
    title: "追加式融合保护了语言底座，也把视觉能力锁在投影层的天花板下",
    lead: "K1.5 先训练纯语言模型，再让视觉塔适配已经固化的语言空间。这是当时稳妥且便宜的路径，也直接暴露了下一代必须解决的问题。",
    stages: ["纯语言模型", "冻结 LLM", "训练 ViT+P", "解冻联合", "视觉 30%"],
    sections: [
      { title: "两阶段接入：先对齐，再联合", copy: "🟢 K1.5 Technical Report：第一阶段冻结 LLM，只训练视觉塔与 projector，把图像特征映射到语言嵌入；第二阶段解冻联合训练，视觉 token 占比逐步提高到 30%。", formula: ["Stage 1：θLLM 固定，更新 θViT, θP", "Stage 2：联合更新；视觉:文本≈3:7"], visual: "append-pipeline" },
      { title: "为什么当时愿意冻结", copy: "🟡 2023–2024 年工程主流（LLaVA、InternVL 等类似路线）：冻结能保护已经获得的语言能力，并显著降低计算量，因为主要训练 ViT 与 projector。", formula: ["收益：语言退化风险低 + 训练成本低", "代价：跨模态表示不能从头共塑"], visual: "freeze-benefit" },
      { title: "真正的限制：视觉只能“翻译”成已有概念", copy: "🔴 演进分析：语言表示空间先固化后，视觉编码器只能迎合已有语言锚点。若纯视觉概念在语言空间中没有对应位置，投影层很难凭空创造新表示。", formula: ["视觉概念 → projector → 既有语言锚点", "无锚点概念 → 表达上限受限"], visual: "anchor" },
      { title: "数据也被限制在后期", copy: "🟢 K1.5：合成视觉数据只在 cooldown 使用，不进入主预训练。这样可控制合成分布偏差，但视觉信号无法长期参与语言底座形成。", formula: ["主预训练：真实数据为主", "cooldown：低 LR、小预算引入合成视觉"], visual: "cooldown" },
      { title: "它自然提出下一问", copy: "🔴 如果视觉越晚接入越难改变表示，那么应当更早、以更低比例加入，而不是最后突然用高比例视觉冲击模型。K2.5 随后用受控实验验证这一点。", formula: ["晚接入：表示固化 + 域偏移", "早接入：共同适应 + 梯度更平滑"], visual: "bridge-early" },
    ],
    source: "🟢 K1.5 Technical Report；🟡 2023–2024 年多模态工程范式；🔴 演进路径分析。",
  },
  "text-only": {
    tab: "纯文本",
    eyebrow: "K2 · 有意暂停多模态",
    title: "K2 没有视觉能力，但它先把下一次融合所需的语言底座练稳了",
    lead: "K2 不是多模态过渡版，而是纯文本 MoE+MLA 模型。它把变量收缩到语言建模、优化效率和大规模稳定性，为 K2.5 留下可复用的主干。",
    stages: ["纯文本 15.5T", "MuonClip", "1.04T/32B", "加载到 K2.5", "再接视觉"],
    sections: [
      { title: "先把语言问题单独解决", copy: "🟢 K2 Technical Report：1.04T 总参数、32B 激活参数，15.5T token 全部是高质量文本；模型采用纯 MoE+MLA，不含图文配对数据。", formula: ["总参数 1.04T　激活参数 32B", "视觉 token = 0"], visual: "text-foundation" },
      { title: "这次停顿换来了稳定底座", copy: "🟢 K2 在纯文本规模上验证 MuonClip 的 token efficiency 与 15.5T token 零 spike。K2.5 因此可以直接加载语言主干，只把实验变量放在视觉侧。", formula: ["K2：先验证语言主干与优化器", "K2.5：复用权重 + 接入视觉"], visual: "foundation-handoff" },
      { title: "但它仍属于“先语言后视觉”", copy: "🟢 K2.5 直接加载 K2 权重，说明视觉仍然接入一个已形成的语言空间；只是接入时机和训练比例比 K1.5 更早、更系统。K3 随后才彻底推翻这一前提。", formula: ["K2 权重 → K2.5 联合训练", "K3：ViT 随整体训练从随机初始化开始"], visual: "text-to-native" },
    ],
    source: "🟢 K2 Technical Report；K2.5 与 K3 Technical Report 的承接描述。",
  },
  "early-fusion": {
    tab: "早期融合",
    eyebrow: "K2.5 · 早期、低比例、联合训练",
    title: "视觉不必占一半；从第一步加入 10%，反而六项能力全部更好",
    lead: "K2.5 固定视觉—文本总 token 预算，只改变接入时机和比例。结果不是“视觉越多越好”，而是越早让两种模态共同适应，所需视觉比例越低。",
    stages: ["固定总预算", "早/中/晚接入", "六项评测", "三阶段训练", "DEP 解耦"],
    sections: [
      { title: "受控实验：只改变接入时机与比例", copy: "🟢 K2.5 Table 3：早期(0%) 10:90、中期(50%) 20:80、晚期(80%) 50:50。在视觉知识、视觉推理、OCR、文本知识、文本推理、代码六项上，早期低比例全部领先。", formula: ["早期：25.8 / 43.8 / 65.7 / 45.5 / 58.5 / 24.8", "中期：25.0 / 40.7 / 64.1 / 43.9 / 58.6 / 24.0", "晚期：24.2 / 39.0 / 61.5 / 43.1 / 57.8 / 24.0"], visual: "fusion-bars" },
      { title: "为什么晚期 50% 仍然输", copy: "🟢 K2.5 Appendix B.1：晚期突然加入视觉会出现 dip-and-recover，loss 先跳升再恢复，说明新模态造成域偏移冲击；早期融合让模型从一开始共同调整，梯度景观更平滑。", formula: ["晚期：L ↓ → 视觉接入 → L 突升 → 恢复", "早期：两种模态共同塑形，避免突变"], visual: "dip-recover" },
      { title: "三阶段训练把结论变成可执行管道", copy: "🟢 K2.5 §4.3：Stage 1 约 1T token 只训练 ViT；Stage 2 约 15T token 联合预训练 ViT+LLM；Stage 3 用 500B→200B token，把上下文从 32K 推到 262K。", formula: ["ViT ~1T → 联合 ~15T", "联合长上下文：500B→200B，32K→262K"], visual: "three-stage" },
      { title: "视觉塔仍从 SigLIP 初始化，但目标改成生成", copy: "🟢 MoonViT-3D 从 400M 参数的 SigLIP-SO-400M 初始化，支持把时间维也 patch 化的视频理解；训练移除对比损失，只保留 caption cross-entropy，并进行两步对齐。", formula: ["Lcaption = −∑ₖ log P(tₖ|t<ₖ,I)", "对比排名目标移除 → token 级生成目标保留"], visual: "caption-ce" },
      { title: "DEP 解决的是并行负载，而不是模型语义", copy: "🟢 Decoupled Encoder Process 将视觉编码器从 PP Stage-0 解耦，避免图片尺寸差异让某一流水段负载抖动。执行顺序为全局 batch 视觉前向 → 主干前向+反向 → 重算视觉前向+反向。", formula: ["① global batch ViT forward", "② Transformer forward/backward　③ ViT recompute/backward"], visual: "dep" },
      { title: "这一步仍没有做到“从头原生”", copy: "🟢 K2.5 的语言主干来自 K2，视觉塔来自 SigLIP。两者虽然更早联合，但都带着各自旧目标形成的表示；K3 接下来同时移除这两个历史包袱。", formula: ["K2 权重 + SigLIP 权重 → 早期联合", "下一步：随机初始化 ViT + NTP 从头塑形"], visual: "bridge-native" },
    ],
    source: "🟢 K2.5 Technical Report §4.3、§4.5、Appendix B.1、Table 3、Figure 9。",
  },
  native: {
    tab: "原生 NTP",
    eyebrow: "K3 · 视觉从第一个 token 起参与预训练",
    title: "K3 不再把视觉翻译进语言空间，而是让两种模态一起长出表示",
    lead: "MoonViT-V2 从随机初始化开始直接接受 next-token prediction 梯度。视觉不再继承对比学习偏差，也不再等待语言空间先定型。",
    stages: ["随机初始化", "NTP 梯度", "MoonViT-V2", "程序化数据", "双向映射"],
    sections: [
      { title: "为什么放弃 SigLIP 初始化", copy: "🟢 K3 §2.4：SigLIP 初始化后转入联合 NTP 时，视觉编码器梯度范数持续偏高并频繁 spike，说明预训练目标之间存在迁移冲突。", formula: ["SigLIP：图文对比目标", "K3：next-token prediction 目标"], visual: "gradient-spike" },
      { title: "从头训练同时解决稳定性和目标对齐", copy: "🟢 随机初始化的 MoonViT-V2 在 NTP 下梯度范数全程平稳；它不必先学整图检索，再迁移到 token 级生成，视觉与语言从第一步共同形成内部表示。", formula: ["θViT⁰ ~ random", "minθViT,θLLM −∑ log P(tokenₜ|token<ₜ,I)"], visual: "native-ntp" },
      { title: "MoonViT-V2 用结构控制视觉 token 成本", copy: "🟢 K3：视觉编码器约 0.4B 参数、27 层；2×2 pixel shuffle 将四个相邻 patch 合并，视觉序列长度降为原来的 1/4。", formula: ["Npatch → Npatch/4", "更短视觉序列 → attention 与上下文成本下降"], visual: "pixel-shuffle" },
      { title: "程序化数据把“识别”推进到“因果生成”", copy: "🟢 K3 §3.3：加入 SVG、3D、网页、游戏、CAD 的代码—视觉配对，训练哪段代码产生什么视觉结果，以及从结果反推代码结构。", formula: ["code → renderer → image", "image → layout/structure → code"], visual: "code-render" },
      { title: "坐标双格式兼顾精确与泛化", copy: "🟢 绝对坐标支持像素级定位，归一化坐标支持跨分辨率迁移。程序化数据天然精确、可规模化生成，并直接提供空间关系监督。", formula: ["absolute：(200,160,600,400)", "normalized：(0.2,0.2,0.6,0.5)"], visual: "coordinates" },
      { title: "“原生”的准确含义与边界", copy: "🟢 原生指视觉从第一个 token 起参与整体预训练，表示空间从一开始为双模态共同设计；它不等于完全不需要真实图文数据，程序化数据只是补强可验证的结构和空间推理。", formula: ["共同目标、共同时间起点、共同表示空间", "程序化监督 + 真实多模态分布"], visual: "native-boundary" },
    ],
    source: "🟢 K3 Technical Report §2.4、§3.3。",
  },
};

export const CONTEXT_TAB_BY_LABEL = {
  "context-k15": "k15",
  "context-k2": "k2",
  "context-k25": "k25",
  "context-k3": "k3",
};

export const CONTEXT_LABEL_BY_TAB = {
  foundation: null,
  k15: "context-k15",
  k2: "context-k2",
  k25: "context-k25",
  k3: "context-k3",
};

export const CONTEXT_CHAPTERS = {
  foundation: {
    tab: "三重瓶颈",
    eyebrow: "前置 · 长度增长同时撞上三个边界",
    title: "把窗口数字调大不等于获得长上下文；位置、计算、记忆必须一起过关",
    lead: "序列从 4K 增长到 1M 时，模型既要识别从未见过的位置，又要承担 attention 的平方计算和 KV Cache 的线性显存，还必须让训练损失真的依赖远处证据。",
    stages: ["位置外推", "Attention O(n²)", "KV O(n)", "长依赖数据", "有效利用"],
    sections: [
      { title: "位置：模型没有见过更远的旋转角", copy: "🟡 RoPE 把位置写进 Q/K 的旋转相位。训练只见过短序列时，直接推理到更长位置会进入未校准频率区间，因此需要改频率基、插值，或彻底移除显式位置编码。", formula: ["RoPE(q,p)=R(p)q", "训练 p≤Ltrain；推理 p≫Ltrain → 相位外推"], visual: "position" },
      { title: "计算：标准 attention 随长度平方增长", copy: "🟡 每个 query 与所有 key 做点积，token 数翻 10 倍，attention score 数量约翻 100 倍。局部窗口可降为 O(nw)，递归状态可降为 O(n)。", formula: ["softmax attention：O(n²d)", "window：O(nwd)　recurrent：O(nd²)"], visual: "complexity" },
      { title: "记忆：KV Cache 仍随 token 线性增长", copy: "🟡 即使位置外推成功，标准 attention 仍要保存每个历史 token 的 K/V。长上下文首先可能被 HBM 容量挡住，而不是被位置编码挡住。", formula: ["MKV = 2·L·n·Hkv·dkv·bytes", "n 增长 10× → KV 显存增长 10×"], visual: "kv-growth" },
      { title: "训练信号：长度本身不会迫使模型看远处", copy: "🔴 一百万 token 的日志若答案只在最后一段，模型仍可忽略前文。合格的长上下文数据必须让忽略远处证据直接增加 loss。", formula: ["长文件 ≠ 长依赖", "远处证据缺失 → 答案错误 → loss 上升"], visual: "long-signal" },
    ],
    source: "🟡 Attention、RoPE 与 KV Cache 标准机制；🔴 长度与有效训练信号的演进归纳。",
  },
  k15: {
    tab: "K1.5 · 131K",
    eyebrow: "K1.5 · RoPE 调频 + 全/局部混合",
    title: "底层仍是标准 attention，K1.5 用频率、mask 和课程把它推到 131K",
    lead: "K1.5 没有结构性压缩历史，而是让不同训练样本分别承担全局检索和局部建模，再逐阶段拉长序列。",
    stages: ["4K", "32K", "131K", "40% 全局", "60% 局部"],
    sections: [
      { title: "先让 RoPE 在远距离旋转得更慢", copy: "🟢 K1.5 Technical Report：把 RoPE 频率基从 10,000 提高到 θ=1,000,000，低频维度的旋转角变化更慢，长距离位置关系不易过早绕回。", formula: ["原：θᵢ=10000^(−2i/d)", "改：θᵢ=1000000^(−2i/d)"], visual: "rope-base" },
      { title: "全注意力负责全文关系，局部窗口负责多数常规 token", copy: "🟢 全注意力让每个 token 看见全部历史，成本 O(n²)；部分注意力用固定窗口 w，只看邻域，成本 O(nw)。合同跨章节矛盾需要前者，句法和局部事实常由后者完成。", formula: ["Aglobal = softmax(QKᵀ/√d)V", "Alocal = softmax((QKᵀ+Mwindow)/√d)V"], visual: "global-local" },
      { title: "40/60 的训练混合，不是 40/60 的网络层数", copy: "🟢 全注意力数据占 40%，来自自然长文与合成长上下文 Q&A；部分注意力数据占 60%，从 cooldown 均匀采样。它教模型在局部足够时不浪费全局容量。", formula: ["P(global data)=0.40", "P(partial data)=0.60"], visual: "mix-4060" },
      { title: "长度和数据同步长大", copy: "🟢 课程按 4K→32K→131K 递进，每阶段同时增加序列长度与真正需要远距离检索的数据；合成 Q&A 把证据散布在长文不同位置。", formula: ["Stage 1：4K → Stage 2：32K → Stage 3：131K", "证据跨段分布 → 全局层获得远距梯度"], visual: "course-131k" },
      { title: "边界仍然存在", copy: "🟢 全局部分仍是 O(n²)，KV Cache 仍随 n 线性增长。局部 mask 只减少一部分计算，并没有把历史压缩为固定状态。", formula: ["计算：O(n²) 与 O(nw) 混合", "存储：KV = O(n)"], visual: "cost-boundary" },
    ],
    source: "🟢 K1.5 Technical Report，预训练阶段 3。",
  },
  k2: {
    tab: "K2 · 128K",
    eyebrow: "K2 · YaRN 分段外推",
    title: "K2 不再混合 attention mask，而是按频率决定哪些 RoPE 维度需要插值",
    lead: "高频维度在短序列中已经看过完整周期，可以保持；低频维度周期太长，需要 NTK-aware 缩放。YaRN 把这两端和中间过渡统一起来。",
    stages: ["4K 退火", "频率分段", "32K 校准", "YaRN 外推", "128K"],
    sections: [
      { title: "YaRN 的直觉：不同频率不该同样拉伸", copy: "🟢 K2 §2.5：高频维度周期短，在训练长度内已经充分覆盖，因此保持不变；低频维度周期长，超出训练区间，采用 NTK-aware 插值；中间频段线性混合。", formula: ["高频：保持　低频：NTK-aware 缩放", "中频：按位置在线性权重间过渡"], visual: "yarn-bands" },
      { title: "两段退火分别巩固质量和校准长度", copy: "🟢 先用 400B token@4K 做质量退火，稳定语言能力；再用 60B token@32K 校准长位置。学习率从 2e−5 余弦衰减到 7e−6。", formula: ["400B @ 4K → 60B @ 32K", "lr：2e−5 cosine→7e−6"], visual: "anneal-128k" },
      { title: "128K 主要来自数学外推，不是完整看过 128K", copy: "🟢 训练退火只到 32K，最终能力靠 YaRN 外推到 128K。相比 K1.5，它不再依赖全/部分 attention 数据混合，但仍需要位置校准。", formula: ["Ltrain=32K", "Lserve=128K ≈ 4× 外推"], visual: "extrapolate" },
      { title: "位置问题缓解，计算与显存问题原封不动", copy: "🟢 架构仍是标准 softmax attention 与线性 KV Cache，因此序列越长，O(n²) 计算和 O(n) 显存依旧增长。", formula: ["Attention scores：n×n", "KV entries：n×(K,V)"], visual: "same-cost" },
    ],
    source: "🟢 K2 Technical Report §2.5。",
  },
  k25: {
    tab: "K2.5 · 262K",
    eyebrow: "K2.5 · 把外推变成真实长序列训练",
    title: "K2.5 仍用 YaRN，但把模型真正训练到 262K，显著减轻数学外推压力",
    lead: "创新不在新 attention，而在联合 mid-training：高质量短数据负责防遗忘，长文本、长视频与 Long-CoT 同时激活远距离能力。",
    stages: ["高质量短数据", "32K", "长视频/Long-CoT", "渐进扩展", "262K"],
    sections: [
      { title: "架构没有变，训练流程变了", copy: "🟢 K2.5 §4.3：继续使用标准 softmax attention 与 YaRN；新增专门 mid-training 阶段，把高质量数据提升和长上下文激活合并完成。", formula: ["模型：softmax attention + YaRN", "训练：quality mid-training + context activation"], visual: "joint-midtrain" },
      { title: "从 32K 渐进训练到 262K", copy: "🟢 序列上限分阶段扩展到 262K。K2 只在 32K 校准后外推至 128K；K2.5 让模型实际见到更长序列，因此位置与优化外推压力更小。", formula: ["K2：train 32K → serve 128K", "K2.5：train 32K → … → 262K"], visual: "course-262k" },
      { title: "短数据和长数据必须同时存在", copy: "🟢 高质量短数据持续巩固语言能力，防止模型为了适应长序列而遗忘基础能力；长文本、长视频、推理数据和 Long-CoT 则提供真实远距依赖。", formula: ["Lmix = λshortLshort + λlongLlong", "短数据防遗忘；长数据校准跨度"], visual: "short-long-mix" },
      { title: "长视频与 Long-CoT 提供不同的长依赖", copy: "🟢 长视频天然产生跨帧视觉 token，训练非文本域的远距关联；Long-CoT 的推理链本身很长，要求模型在长 context 中维持逻辑一致。", formula: ["长视频：跨帧事件与实体", "Long-CoT：跨步骤假设与结论"], visual: "video-cot" },
      { title: "边界：仍然没有改变 attention 的增长规律", copy: "🟢 实训到 262K 改善有效性，却不消除 O(n²) 计算和 O(n) KV Cache。K3 因此不再只调 RoPE，而是改写长记忆架构。", formula: ["位置外推压力 ↓", "Attention/KV 结构成本不变"], visual: "bridge-nope" },
    ],
    source: "🟢 K2.5 Technical Report §4.3、Table 3。",
  },
  k3: {
    tab: "K3 · 1M",
    eyebrow: "K3 · KDA + Gated MLA + NoPE",
    title: "K3 不再把所有历史都交给一种 attention，而是让压缩记忆与精确检索分工",
    lead: "69 层 KDA 用固定状态承载大部分历史，24 层 Gated MLA 保留全局 softmax 精确检索；两者都不依赖 RoPE/YaRN，课程从 8K 推到 1M。",
    stages: ["8K", "64K", "256K", "1M", "跨段任务"],
    sections: [
      { title: "架构断裂：不再继续调 RoPE 频率", copy: "🟢 K3 §2.1、§2.2：模型完全 NoPE。位置信息由 KDA 的 α 衰减与内容更新隐式表达，Gated MLA 则保留无显式位置编码的全局 softmax。", formula: ["KDA：Sₜ = αₜSₜ₋₁ + write(kₜ,vₜ)", "Gated MLA：softmax(qₜK≤ₜᵀ)V≤ₜ"], visual: "nope-split" },
      { title: "69 层 KDA：固定记事本，有损压缩历史", copy: "🟢 KDA 维护固定大小状态 S，随 token 递归写入与读取，计算随序列近似 O(n)，显存不再追加每个 token 的 K/V；代价是压缩有损，不能保证保存每个细节。", formula: ["S∈ℝᵈᵏˣᵈᵛ，大小与 n 无关", "history → 固定状态：精度换容量"], visual: "kda-state" },
      { title: "24 层 Gated MLA：保留需要精确定位的全局通道", copy: "🟢 Gated MLA 仍做全局 softmax，但把 KV 压成 latent，缓存约缩小 3.4×；门控决定当前 token 需要多少精确全局读取。", formula: ["cτ = Wc xτ；用时重建 kτ,vτ", "KV latent compression ≈ 3.4×"], visual: "gated-mla" },
      { title: "四阶段课程把接口推到 1M", copy: "🟢 8K→64K 在预训练阶段调好语言底座；256K→1M 在 cooldown 校准远距离参数。长序列只占较小预算，不承担全部基础学习。", formula: ["预训练：8K → 64K", "cooldown：256K → 1M"], visual: "course-1m" },
      { title: "长数据流水线决定 1M 是否有学习价值", copy: "🟢 K3 §3.4：长文档先做精确/模糊去重、视频帧感知哈希与质量过滤，再上采样；随后合成证据跨段分散的任务，让忽略远处信息直接受到 loss 惩罚。", formula: ["清洗 → 上采样 → 跨段合成", "远处证据 A+B+C → 唯一可答问题"], visual: "long-pipeline" },
      { title: "1M 是接口与训练上限，不是等效记忆保证", copy: "🟢 KDA 有损压缩不会精确保留所有细节；1M 也不表示每个位置都能被同等利用。真正指标应是跨距离检索与推理成功率，而不是输入框能塞多少 token。", formula: ["context limit ≠ effective context", "可输入 1M ≠ 可靠利用全部 1M"], visual: "effective-context" },
      { title: "与 K1.5 的本质差异", copy: "🟢 K1.5 的部分 attention 仍通过 mask 控制 token 间点积；K3 的 KDA 不再做全历史点积，而是递归更新状态。变化从调度策略升级为记忆机制本身。", formula: ["K1.5：Attention(Q,K,V)+mask", "K3 KDA：read/write(S)，无全历史 score matrix"], visual: "mask-vs-state" },
    ],
    source: "🟢 K3 Technical Report §2.1、§2.2、§3.4。",
  },
};

const dataRows = {
  k15: [["filter", "四层质量筛选", "inherit"], ["sampling", "动态采样", "new"], ["vision-five", "五类视觉", "new"], ["cooldown-synth", "Cooldown 合成 QA", "new"]],
  k2: [["filter-inherit", "沿用质量筛选", "inherit"], ["rephrasing", "知识 rephrasing", "new"], ["math-rephrasing", "数学学习笔记", "new"]],
  k25: [["unique", "unique tokens", "new"], ["code-weight", "代码权重上调", "improve"], ["vision-seven", "七类视觉", "improve"], ["code-visual", "代码—视觉配对", "new"]],
  k3: [["long-doc", "长文档清洗", "improve"], ["cross-span", "跨段合成任务", "new"], ["native-vision", "视觉从头 NTP", "new"], ["programmatic", "程序化多模态", "improve"]],
};

export const DATA_LABELS = VERSIONS.flatMap((version) => dataRows[version.id].map(([suffix, text, lineType]) => ({
  id: `data-${version.id}-${suffix}`,
  version: version.id,
  dimension: "data",
  text,
  lineType,
})));

export const OVERVIEW_PIPELINES = {
  k15: [
    {
      id: "dimensions",
      items: [
        { id: "objective-k15", eyebrow: "01 训练目标", text: "NTP" },
        { id: "optimizer-k15", eyebrow: "02 优化器", text: "未披露 · AdamW*" },
        { id: "lr-k15", eyebrow: "03 LR 调度", text: "未披露" },
        { id: "data-k15", eyebrow: "04 数据", text: "四层筛选 · 五类视觉" },
        { id: "context-k15", eyebrow: "05 序列课程", text: "4K → 32K → 131K" },
      ],
    },
  ],
  k2: [
    {
      id: "dimensions",
      items: [
        { id: "objective-k2", eyebrow: "01 训练目标", text: "NTP", relation: "inherit" },
        { id: "optimizer-k2", eyebrow: "02 优化器", text: "MuonClip", relation: "redesign" },
        { id: "lr-k2", eyebrow: "03 LR 调度", text: "WSD", relation: "redesign" },
        { id: "data-k2", eyebrow: "04 数据", text: "知识 / 数学 rephrasing", relation: "improve" },
        { id: "context-k2", eyebrow: "05 序列课程", text: "4K → 32K → 128K", relation: "inherit" },
      ],
    },
  ],
  k25: [
    {
      id: "dimensions",
      items: [
        { id: "objective-k25", eyebrow: "01 训练目标", text: "NTP · ViT caption CE", relation: "improve" },
        { id: "optimizer-k25", eyebrow: "02 优化器", text: "沿用 MuonClip", relation: "inherit" },
        { id: "lr-k25", eyebrow: "03 LR 调度", text: "沿用 WSD", relation: "inherit" },
        { id: "data-k25", eyebrow: "04 数据", text: "七类视觉 · unique tokens", relation: "improve" },
        { id: "context-k25", eyebrow: "05 序列课程", text: "4K → 32K → 262K", relation: "improve" },
      ],
    },
  ],
  k3: [
    {
      id: "dimensions",
      items: [
        { id: "objective-k3", eyebrow: "01 训练目标", text: "NTP + MTP", relation: "improve" },
        { id: "optimizer-k3", eyebrow: "02 优化器", text: "Per-Head Muon", relation: "improve" },
        { id: "lr-k3", eyebrow: "03 LR 调度", text: "cosine", relation: "redesign" },
        { id: "data-k3", eyebrow: "04 数据", text: "程序化多模态", relation: "improve" },
        { id: "context-k3", eyebrow: "05 序列课程", text: "8K → 64K → 256K → 1M", relation: "redesign" },
      ],
    },
  ],
};

export const DATA_LINEAGES = [
  {
    id: "quality",
    tab: "质量清洗",
    title: "先建立四层质量筛选，再把同一原则扩展到真实长文档与视频",
    lead: "K2 与 K2.5 沿用 K1.5 的质量底座；K3 面对超长内容，补上模糊去重、帧感知哈希与结构完整性检查。",
    cells: [
      { version: "K1.5", text: "四层质量筛选", labelId: "data-k15-filter", toNext: "inherit" },
      { version: "K2", text: "沿用质量筛选", labelId: "data-k2-filter-inherit", note: "多数数据处理管线沿用 K1.5。", toNext: "inherit" },
      { version: "K2.5", text: "继续沿用", note: "质量底座不变，新增预算放在视觉数据与融合方式。", toNext: "improve" },
      { version: "K3", text: "长文档清洗", labelId: "data-k3-long-doc" },
    ],
  },
  {
    id: "sampling",
    tab: "采样预算",
    title: "从文档质量权重，演化为数据源上限与稀缺长数据预算",
    lead: "原始互联网频率不等于训练价值：高质量文档提高抽样概率，小数据源设置最大 epoch，稀缺长数据则在严格清洗后上采样。",
    cells: [
      { version: "K1.5", text: "动态采样", labelId: "data-k15-sampling", toNext: "inherit" },
      { version: "K2", text: "沿用域采样", note: "多数数据处理管线沿用 K1.5，创新集中于 rephrasing。", toNext: "improve" },
      { version: "K2.5", text: "unique tokens", labelId: "data-k25-unique", toNext: "improve" },
      { version: "K3", text: "长数据上采样", note: "长文档和长视频严格清洗后提高进入 batch 的概率。" },
    ],
  },
  {
    id: "specialized",
    tab: "领域专项",
    title: "每代都为最容易被通用管线误伤或忽略的能力建立专项数据",
    lead: "K1.5 建立专项数据；K2 把数学材料改成学习笔记；K2.5 上调代码权重；K3 合成必须跨段取证的任务。",
    cells: [
      { version: "K1.5", text: "专项数据", note: "K1.5 将专项数据并入多维质量评分与采样策略。", toNext: "inherit" },
      { version: "K2", text: "数学学习笔记", labelId: "data-k2-math-rephrasing", toNext: "improve" },
      { version: "K2.5", text: "代码权重上调", labelId: "data-k25-code-weight", toNext: "improve" },
      { version: "K3", text: "跨段合成", labelId: "data-k3-cross-span" },
    ],
  },
  {
    id: "vision",
    tab: "视觉语料",
    title: "视觉数据从五类基础任务，扩展到感知、视频与智能体，再转向原生 NTP",
    lead: "K2 是纯文本中断点；K2.5 扩为七类视觉数据；K3 不再依赖 SigLIP 表示，让视觉编码器从随机参数开始接受 NTP。",
    cells: [
      { version: "K1.5", text: "五类视觉", labelId: "data-k15-vision-five", toNext: "break" },
      { version: "K2", text: "纯文本暂停", note: "K2 不训练视觉，但语言主干随后由 K2.5 加载。", toNext: "redesign" },
      { version: "K2.5", text: "七类视觉", labelId: "data-k25-vision-seven", toNext: "redesign" },
      { version: "K3", text: "视觉从头 NTP", labelId: "data-k3-native-vision" },
    ],
  },
  {
    id: "augmentation",
    tab: "合成扩增",
    title: "合成数据从 cooldown 补强，演化为主训练改写与代码—视觉双向配对",
    lead: "K1.5 只在 cooldown 使用合成 QA；K2 把 rephrasing 带入主预训练；K2.5 增加代码渲染配对；K3 将程序化多模态扩展到五类系统。",
    cells: [
      { version: "K1.5", text: "Cooldown 合成 QA", labelId: "data-k15-cooldown-synth", toNext: "improve" },
      { version: "K2", text: "知识 rephrasing", labelId: "data-k2-rephrasing", toNext: "improve" },
      { version: "K2.5", text: "代码—视觉配对", labelId: "data-k25-code-visual", toNext: "improve" },
      { version: "K3", text: "程序化多模态", labelId: "data-k3-programmatic" },
    ],
  },
];

export const DATA_TAB_BY_LABEL = Object.fromEntries(DATA_LINEAGES.flatMap((lineage) => lineage.cells.filter((cell) => cell.labelId).map((cell) => [cell.labelId, lineage.id])));
export const DATA_LABEL_BY_TAB = Object.fromEntries(DATA_LINEAGES.map((lineage) => [lineage.id, lineage.cells.find((cell) => cell.labelId)?.labelId || null]));

const detail = (title, version, oneliner, body, fold, visual = "steps", jumpTo = null) => ({ title, version, oneliner, body, fold, visual, jumpTo });

export const DETAILS = {
  "objective-k15": detail("Next-token prediction", "K1.5", "以因果语言建模建立通用语言、代码与图文续写能力。", ["随机参数开始预测下一个 token", "视觉在语言底座之后分阶段接入", "合成 QA 只在 cooldown 补强"], ["Lₙₜₚ = −∑ₜ log P(xₜ | x₍<t₎)"], "steps"),
  "objective-k2": detail("NTP 与 token utility", "K2", "目标函数不变，创新转向让每个 token 提供更高学习信号。", ["Muon 提高同等 token 下的收敛效率", "rephrasing 提高同一知识的表达多样性", "K2 保持纯文本 NTP"], ["目标不变；优化器与数据改变"], "steps"),
  "objective-k25": detail("NTP + ViT caption CE", "K2.5", "视觉从训练早期参与 NTP，ViT 单独训练时只保留 caption CE。", ["去掉 CLIP 对比损失", "ViT 约 1T token 单独训练", "联合阶段 ViT 与 LLM 同时更新"], ["Lcaption = −∑ log P(tₖ | t₍<k₎, I)"], "loss"),
  "objective-k3": detail("NTP + MTP", "K3", "主干继续使用 NTP，并增加 MTP 层预测多个未来 token。", ["视觉编码器从随机参数接受 NTP", "MTP 提供更密集的未来 token 监督", "训练目标从第一步统一"], ["L = Lₙₜₚ + λLₘₜₚ"], "native"),
  "lr-k15": detail("LR 调度未披露", "K1.5", "报告没有公开学习率日程，不能把 WSD 或 cosine 写成事实。", ["优化器同样未明确披露", "长上下文阶段只公开序列课程", "保留证据边界"], ["公开信息不足"], "boundary"),
  "lr-k2": detail("WSD", "K2", "先长时间保持稳定学习率，再做 cosine 衰减与末段退火。", ["10T token 恒定 2e−4", "5.5T token cosine 衰减至 2e−5", "末段退火至 7e−6"], ["warmup → stable → decay → anneal"], "wsd"),
  "lr-k25": detail("继承 WSD", "K2.5", "语言底座沿用 K2 的稳定训练配方，把变量集中到多模态融合。", ["沿用 MuonClip", "沿用 WSD 与 weight decay", "视觉侧单独做融合消融"], ["K2 配方 → K2.5 继承"], "inherit"),
  "lr-k3": detail("独立调优后的 cosine", "K3", "分别搜索 WSD 与 cosine 的最优超参后，cosine 获得更低最终 loss。", ["两种 schedule 分别搜索 peak LR", "分别搜索 batch size", "最终采用 1% warmup + cosine"], ["公平比较必须各自调优"], "cosine"),
  "compute-k15": detail("并行策略未披露", "K1.5", "报告没有给出完整集群、并行或显存优化配方。", ["不能从后续版本反推 K1.5", "只保留已公开训练阶段", "计算实现标记为未知"], ["公开信息不足"], "boundary"),
  "compute-k2": detail("分布式训练与显存优化", "K2", "EP16、PP 与 ZeRO-1 支撑 1T 参数训练，三项激活优化释放显存。", ["选择性重计算", "FP8-E4M3 存储不敏感激活", "剩余激活 CPU offload"], ["EP16 + interleaved 1F1B PP + ZeRO-1"], "steps"),
  "compute-k25": detail("继承分布式底座 + DEP", "K2.5", "把视觉编码器从 PP Stage-0 解耦，避免可变图像尺寸拖慢整条流水线。", ["视觉编码器先独立前向", "主干完成前向与反向", "重算视觉前向并回传梯度"], ["vision F → trunk F/B → vision recompute B"], "steps"),
  "compute-k3": detail("MoonEP 与重新拟合配方", "K3", "继承大规模并行经验，并为新模型形状重新搜索 batch、LR、TPP 与结构。", ["MoonEP 支撑更大专家规模", "896 专家、Top-16", "四个缩放变量联合重搜"], ["同等 loss 所需 FLOPs 约降至旧配方的 1/2.5"], "efficiency"),
  "optimizer-k15": detail("AdamW（推测）", "K1.5", "官方未披露优化器；按同期工程惯例，最可能采用 AdamW。", ["逐元素维护一阶与二阶动量", "MoE 低频专家的动量估计容易偏", "没有公开 LR schedule 可供核实"], ["θₜ₊₁ = θₜ − η(m̂ₜ / √v̂ₜ + λθₜ)", "🔴 此项是基于同期方案的推断，不是报告明示。"], "optimizer"),
  "optimizer-k2": detail("MuonClip", "K2", "矩阵级正交更新提升 token efficiency，QK-Clip 再压住 attention logit 爆炸。", ["Momentum 矩阵经 Newton–Schulz 正交化", "最大 logit 超过 100 时逐 head 缩放 Q/K", "15.5T token 训练全程零 spike"], ["X₀=M/‖M‖F；Xₖ₊₁=Xₖ(aI+bXᵀX+c(XᵀX)²)", "Sₘₐₓʰ>τ：γ=τ/Sₘₐₓʰ，Q/K 非共享分量按 √γ 缩放", "WSD：500 step warmup → 10T stable → 5.5T cosine → anneal"], "optimizer"),
  "optimizer-k25": detail("MuonClip（继承）", "K2.5", "语言主干与优化器冻结，创新预算集中到视觉融合和并行训练。", ["复用 K2 的 Muon + QK-Clip", "继续沿用 WSD 与 weight decay=0.1", "已验证稳定性，无需重复设计"], ["K2.5 报告没有披露优化器改动；K3 的回顾也将变化点放在视觉侧。"], "inherit"),
  "optimizer-k3": detail("Per-Head Muon", "K3", "把整层正交化拆成逐 head 独立执行，避免大尺度 head 吞掉小 head 的更新。", ["各 head 按自身尺度获得等幅更新", "LR schedule 从 WSD 改为独立调优后的 cosine", "模型扩到 93 层、896 专家、Top-16"], ["M∈ℝᵈˣᵈ → M₁…Mₕ，各自执行 Newton–Schulz", "cosine：lrₜ=lrₘᵢₙ+½(lrₘₐₓ−lrₘᵢₙ)(1+cos(πt/T))", "2.5× scaling efficiency 指达到同等 loss 所需 FLOPs 更少。"], "optimizer"),
  "multimodal-k15": detail("追加式融合", "K1.5", "先把语言模型训好，再让视觉编码器适配已经固化的语言空间。", ["先冻结 LLM，只训练 ViT 与 projector", "再解冻联合训练，视觉 token 提至 30%", "合成视觉数据只在 cooldown 使用"], ["好处：保护语言能力、训练便宜。", "代价：语言主干无法为纯视觉概念重塑表示。"], "fusion"),
  "multimodal-k2": detail("纯文本", "K2", "K2 只解决语言建模和大规模稳定性，多模态能力留给 K2.5。", ["1.04T 总参数，32B 激活参数", "15.5T token 全部来自文本语料", "MuonClip 的稳定训练成为后续底座"], ["K2.5 直接加载 K2 语言主干，再接入视觉编码器。"], "text"),
  "multimodal-k25": detail("早期低比例融合", "K2.5", "从 step 1 引入 10% 视觉 token，六项能力全部胜过晚期 50% 融合。", ["早期 10:90：视觉推理 43.8，OCR 65.7", "晚期 50:50：视觉推理 39.0，OCR 61.5", "三阶段：ViT → 联合预训练 → 联合长上下文"], ["晚期突然引入视觉会出现 dip-and-recover；早期融合让梯度景观更平滑。", "DEP 将视觉编码器从 PP Stage-0 解耦，削弱不同图片尺寸带来的负载波动。"], "bars"),
  "multimodal-k3": detail("原生多模态", "K3", "MoonViT-V2 从随机初始化开始接受 NTP 梯度，视觉与语言从第一个 token 共塑表示。", ["摆脱 SigLIP 初始化带来的梯度 spike", "0.4B 参数、27 层、2×2 pixel shuffle", "程序化数据连接代码结构与视觉结果"], ["Pixel shuffle 将视觉序列缩短为 1/4。", "程序化数据天然精确、可规模化生成，并直接训练空间推理。"], "native"),
  "context-k15": detail("4K→131K", "K1.5", "不改标准 attention，用 RoPE 频率调整、全/局部混合与渐进课程推长上下文。", ["RoPE base 提高到 1,000,000", "全注意力 40%，局部窗口 60%", "课程长度：4K → 32K → 131K"], ["全注意力仍是 O(n²)，KV cache 仍随 n 线性增长。", "局部注意力只削减一部分计算，没有结构性压缩历史。"], "context"),
  "context-k2": detail("4K→128K", "K2", "YaRN 分段处理 RoPE 频率，用较短训练长度校准到 128K。", ["高频保持，低频做 NTK-aware 插值", "退火：400B token@4K + 60B token@32K", "标准 softmax 与线性 KV cache 不变"], ["低频维度周期很长，最需要缩放；高频维度已见过完整周期，不必插值。"], "context"),
  "context-k25": detail("32K→262K", "K2.5", "把高质量 mid-training 与长上下文激活并成一个阶段，实际训练推到 262K。", ["YaRN 从 32K 渐进扩到 262K", "长文本、长视频与 Long-CoT 同时混入", "短数据防遗忘，长数据校准远距能力"], ["相比 K2 主要靠数学外推，K2.5 让模型真实看过更长序列。"], "context"),
  "context-k3": detail("8K→1M NoPE", "K3", "KDA 负责线性递归记忆，Gated MLA 保留全局精确检索，彻底摆脱 RoPE/YaRN。", ["69 层 KDA：固定状态，有损压缩历史", "24 层 Gated MLA：latent KV，全局 softmax", "课程：8K → 64K → 256K → 1M"], ["1M 是接口与训练上限，不等于每个 token 都能被同等有效利用。", "跨段合成任务负责让损失真正惩罚忽略远处证据。"], "context"),
  "data-k15-filter": detail("四类质量评分", "K1.5", "组合规则、FastText、嵌入相似度与 LLM 评分，减少单一判断器的偏差。", ["规则：乱码、广告与重复模板", "FastText：判断语言质量与语义连贯性", "嵌入相似度：识别语义近重复", "LLM：评估连贯性、信息量与教育价值"], ["四类方法提供互补信号，最终组合为连续质量分。"], "score-ensemble"),
  "data-k15-sampling": detail("上下采样", "K1.5", "质量分不做硬切割，而是转成每篇文档被抽中的概率。", ["高分文档重复抽取，低分文档随机跳过", "60 篇×2 + 40 篇×0.5 = 140 次抽样", "高质量样本贡献占比由 60% 提升到 86%"], ["软删除保留小语种与垂直领域覆盖度。", "采样率 0.3 可理解为长期梯度权重约为原始的 0.3×。"], "sampling"),
  "data-k15-vision-five": detail("五类视觉", "K1.5", "用五种任务覆盖识别、图文对应、读字、知识提取和视觉问答。", ["caption / 图文交织 / OCR", "知识型图表 / 通用 QA", "图文交织额外按渲染位置重排"], ["合成数据仅在 cooldown 使用。", "视觉仍在语言主干训练完成后追加。"], "vision"),
  "data-k15-cooldown-synth": detail("Cooldown 合成 QA", "K1.5", "在低学习率阶段加入验证后的数学、知识与代码 QA，集中巩固能力。", ["专有 LM 生成 QA 对", "拒绝采样过滤低质量生成", "全面验证后才进入 cooldown"], ["合成数据不进入主预训练"], "steps"),
  "data-k2-filter-inherit": detail("沿用质量评分", "K2", "K2 沿用 K1.5 的数据处理管线，把新增实验集中在 rephrasing。", ["继续使用多维质量信号筛选文本", "不重复设计已经验证的数据底座", "以相同底座比较重复训练与多版本改写"], ["数据处理方法沿用 K1.5；K2 的新增数据策略是知识与数学 rephrasing。"], "inherit"),
  "data-k2-rephrasing": detail("rephrasing", "K2", "同一知识改写 10 个表面版本各看 1 次，胜过同一原文重复 10 次。", ["问答、因果、对比、推导等多风格提示", "长文档分块自回归改写再拼接", "语义忠实度验证过滤失真版本"], ["SimpleQA：原文×10ep 23.76；10版×1ep 28.94。", "关键不是制造更多字，而是迫使模型提取跨表达不变的事实结构。"], "rephrase"),
  "data-k2-math-rephrasing": detail("数学学习笔记", "K2", "把高质量数学文档改写为学习笔记，并翻译其他语言材料扩充英文数学数据。", ["遵循 SwallowMath 风格", "保持推导结构与结论", "仅用于数学域"], ["推广到其他域仍有幻觉与毒性风险"], "steps"),
  "data-k25-code-weight": detail("代码权重上调", "K2.5", "在联合预训练配方中增加代码相关内容权重，并用 source epoch 上限防止过拟合。", ["提高代码相关采样概率", "配合 unique token 预算", "延续已有去重与语言识别"], ["调权发生在 K2.5 联合预训练配方"], "sampling"),
  "data-k25-vision-seven": detail("七类视觉", "K2.5", "在 Caption、交织、OCR、知识基础上加入感知、视频与智能体数据。", ["感知：框、点级引用与轮廓分割", "视频：长视频与人工轨迹", "智能体：桌面、移动端与 Web GUI"], ["七类覆盖识别、定位、时序与操作"], "vision"),
  "data-k25-unique": detail("unique tokens", "K2.5", "按每个数据源去重后的 token 总量设置最大 epoch，阻止小源被重复几十遍。", ["大源和小源不再共享同一 epoch 数", "source budget 到上限后停止采样", "与 rephrasing 解决的是两类不同重复"], ["rephrasing 管文档表面形式；unique tokens 管数据源整体预算。"], "budget"),
  "data-k25-vit-ce": detail("ViT 去对比损失", "K2.5", "只保留 caption cross-entropy，让每个输出 token 都能追责视觉细节丢失。", ["移除 CLIP 风格整图—整句对比", "用 NTP 目标直接训练视觉编码", "更契合表格单元格、OCR 与局部结构"], ["Lcaption = −∑ log P(tₖ | t₍<k₎, I)", "🔴 可能牺牲零样本检索，但 K2.5 的目标是生成而非检索。"], "loss"),
  "data-k25-code-visual": detail("代码—视觉配对", "K2.5", "把 HTML、React、SVG 等代码与渲染截图配对，连接结构与布局结果。", ["代码 → 页面截图", "截图 → 布局结构", "为后续程序化多模态奠基"], ["K3 将其扩展到 3D、游戏与 CAD"], "code-visual"),
  "data-k3-native-vision": detail("视觉从头 NTP", "K3", "MoonViT-V2 从随机参数开始，与语言主干共同接受 NTP 监督。", ["不使用 SigLIP 初始化", "不使用对比损失", "梯度范数全程更平稳"], ["27 层、约 0.4B 参数、2×2 pixel shuffle"], "native"),
  "data-k3-programmatic": detail("程序化多模态", "K3", "把代码与渲染结果配成天然精确的数据，学习“代码结构 ↔ 视觉后果”。", ["SVG / 3D / HTML+CSS / 游戏 / CAD", "支持看图反推布局，也支持看代码预判结果", "绝对坐标与归一化坐标双格式"], ["例：display:flex + justify-content:center ↔ 按钮水平居中。", "区别于 Grounding：它不只标出物体，而是解释物体如何被创造。"], "code-visual"),
  "data-k3-long-doc": detail("长文档上采样", "K3", "真实长依赖天然稀缺，先严格清洗，再提高其进入训练 batch 的概率。", ["精确 / 模糊去重与视频感知哈希", "启发式、分类器与结构完整性过滤", "学术全文、法律文书、技术手册上采样"], ["上采样会放大残余噪声，因此清洗质量比倍率更重要。"], "funnel"),
  "data-k3-cross-span": detail("跨段合成任务", "K3", "把答案所需证据分散到 1M 上下文多个位置，逼迫模型真正跨段读取。", ["第1段身份 + 第300段例外 + 第900段问题", "从单针检索升级为多针组合推理", "证据可跨文本、图表与代码输出"], ["合格标准不是文件够长，而是忽略远处证据会让 loss 变差。"], "spans"),
};

const story = (why, how, evidence, deepDive, source) => ({ why, how, evidence, deepDive, source });

const compactStories = {
  "objective-k15": story(
    ["预训练要先把语言、事实、代码和图文关系压入参数，后训练才负责稳定调用这些能力。"],
    ["从随机参数开始做 next-token prediction；先建立语言底座，再分阶段接入视觉与长上下文。"],
    ["K1.5 形成语言训练 → 视觉语言联合 → cooldown → 长上下文激活的基础管线。"],
    ["Lₙₜₚ = −∑ₜ log P(xₜ | x₍<t₎)"],
    "🟢 K1.5 Technical Report Appendix B",
  ),
  "objective-k2": story(
    ["高质量 token 有限，继续重复原文会过拟合；K2 要提高每个 token 的学习信号。"],
    ["保持纯文本 NTP，把创新放在 MuonClip 与知识 / 数学 rephrasing。"],
    ["15.5T token 主训练仍使用 NTP；SimpleQA 消融验证表面多样性优于机械重复。"],
    ["目标不变：Lₙₜₚ；改变的是优化路径与数据表达"],
    "🟢 K2 Technical Report §2.1–§2.2",
  ),
  "objective-k25": story(
    ["SigLIP 的整图对比目标偏全局语义，而 NTP 需要 OCR、表格与布局的细粒度线索。"],
    ["ViT 独立训练只用 caption CE；联合阶段从早期让视觉 token 与文本共同参与 NTP。"],
    ["早期 10% 视觉比例在视觉与文本能力上全面优于晚期 50% 融合。"],
    ["Lcaption = −∑ₖ log P(tₖ | t₍<k₎, I)"],
    "🟢 K2.5 Technical Report §4.2–§4.3、Appendix B",
  ),
  "objective-k3": story(
    ["K2.5 的视觉初始化与语言目标仍不一致；K3 需要从第一步统一监督。"],
    ["MoonViT-V2 从随机参数接受 NTP；主干增加 MTP 层，为多个未来 token 提供更密集监督。"],
    ["从头训练的视觉编码器梯度更平稳，不再出现 SigLIP 初始化版本的频繁 spike。"],
    ["L = Lₙₜₚ + λLₘₜₚ"],
    "🟢 K3 Technical Report §2.4、§3.3",
  ),
  "lr-k15": story(
    ["K1.5 报告未披露预训练优化器与学习率日程。"],
    ["页面只呈现已公开的训练阶段，不从后续版本倒推 WSD 或 cosine。"],
    ["任何具体 schedule 都只能标为推测，因此本节点保留“未披露”。"],
    ["公开信息不足"],
    "🔴 K1.5 报告披露边界",
  ),
  "lr-k2": story(
    ["大规模训练既要长时间稳定吸收数据，也要在末段降低步长收敛到更优解。"],
    ["500 step warmup → 10T stable@2e−4 → 5.5T cosine 到 2e−5 → anneal 到 7e−6。"],
    ["15.5T token 全程 loss 平滑、没有 spike。"],
    ["warmup → stable → decay → anneal"],
    "🟢 K2 Technical Report §2.1、§2.5",
  ),
  "lr-k25": story(
    ["K2.5 的关键变量是视觉接入时机，不需要同时更换已验证的语言训练日程。"],
    ["沿用 K2 的 MuonClip、WSD 与 weight decay，把消融集中在视觉侧。"],
    ["稳定底座让早期 / 中期 / 晚期融合实验可以归因。"],
    ["K2 WSD → K2.5 继承"],
    "🟢 K2.5 Technical Report；K3 回顾性描述",
  ),
  "lr-k3": story(
    ["模型形状与优化器改变后，K2 的 WSD 超参数不再保证最优。"],
    ["为 WSD 与 cosine 分别搜索 peak LR 和 batch size，再比较各自最优结果。"],
    ["公平调优后 cosine 的最终 loss 持续更低，因此采用 1% warmup + cosine decay。"],
    ["lrₜ = lrₘᵢₙ + ½(lrₘₐₓ−lrₘᵢₙ)(1+cos(πt/T))"],
    "🟢 K3 Technical Report §3.2、Figure 7",
  ),
  "compute-k15": story(
    ["K1.5 报告没有公开完整集群、并行或激活显存方案。"],
    ["保留未知状态，不把 K2 的工程配方反向套用到 K1.5。"],
    ["页面只将三阶段训练作为已公开事实。"],
    ["公开信息不足"],
    "🔴 K1.5 报告披露边界",
  ),
  "compute-k2": story(
    ["1T 参数模型无法只靠单一并行方式容纳权重、专家与激活。"],
    ["EP16 分专家，interleaved 1F1B PP 分层，ZeRO-1 分优化器状态；再叠加重计算、FP8 与 CPU offload。"],
    ["系统支持任意 32 倍数节点，三项显存优化在小规模实验中未见可测 loss 增加。"],
    ["EP16 + PP + ZeRO-1；recompute + FP8-E4M3 + CPU offload"],
    "🟢 K2 Technical Report §2.4",
  ),
  "compute-k25": story(
    ["可变分辨率图像让 PP Stage-0 负载剧烈波动，整条流水线被视觉编码器拖慢。"],
    ["DEP 将视觉编码器解耦：全局视觉前向 → 主干前反向 → 重算视觉前向并回传。"],
    ["主干因此可以继续使用任意高效并行配置，不必为视觉尺寸定制 PP。"],
    ["vision F → trunk F/B → vision recompute B"],
    "🟢 K2.5 Technical Report §4.5",
  ),
  "compute-k3": story(
    ["K3 同时改变层数、专家数、注意力机制与激活函数，K2 的计算最优点已经失效。"],
    ["用 MoonEP 支撑更大专家规模，并联合搜索 batch size、LR、TPP 与 model shape。"],
    ["896 专家、Top-16；整体 scaling efficiency 约提升 2.5×，但报告未做单组件归因。"],
    ["TPP = 训练 token 总数 ÷ 参数总数"],
    "🟢 K3 Technical Report §3.2、Figure 7",
  ),
};

Object.entries(compactStories).forEach(([id, content]) => Object.assign(DETAILS[id], content));

Object.assign(DETAILS["optimizer-k15"], story(
  [
    "K1.5 Technical Report 没有明确说明预训练优化器选型，因此不能把 AdamW 当成已披露事实。",
    "同期主流大模型普遍使用 AdamW；把它作为默认选择属于行业惯例推测，而非报告结论。",
  ],
  [
    "AdamW 为每个参数维护一阶动量 m 与二阶动量 v，更新方向由 m/√v 给出。",
    "Weight decay 直接作用于参数，而不是混入梯度；这让正则化与自适应步长解耦。",
    "在 MoE 中，各专家激活频率不同，低频专家的动量估计可能有偏；K1.5 规模下尚未成为公开瓶颈。",
  ],
  [
    "官方没有公开 LR schedule，无法确认 K1.5 使用 WSD、cosine 或其他退火方案。",
    "🔴 结论边界：优化器与训练日程均为基于时代背景的推断。",
  ],
  [
    "θₜ₊₁ = θₜ − η·(m̂ₜ/√v̂ₜ + λθₜ)",
    "m̂ₜ = mₜ/(1−β₁ᵗ)，v̂ₜ = vₜ/(1−β₂ᵗ)",
    "AdamW 是逐元素缩放，即对角预条件；后续 Muon 是矩阵级正交化，即全矩阵预条件。",
  ],
  "🔴 K1.5 报告披露有限；🟡 同期大模型工程惯例",
));

Object.assign(DETAILS["optimizer-k2"], story(
  [
    "Moonlight 实验显示：同等 token 数下，Muon 的 loss 低于 AdamW，因此 K2 选择它提升 token efficiency。",
    "模型扩到 53B 后，最大 attention logit 超过 1000，数值溢出成为训练稳定性的直接瓶颈。",
    "Logit soft-cap 在 dot product 爆炸后才截断，已经太晚；QK-Norm 又因 MLA 推理时 Key 不实体化而无法直接使用。",
  ],
  [
    "Muon 对 momentum 矩阵 M 做 Newton–Schulz 迭代正交化，得到 U 作为更新方向，让各方向等幅推进。",
    "QK-Clip 每个 step 后检查每个 head 的最大 logit Sₘₐₓʰ；超过 τ=100 时缩小 Q/K 投影权重。",
    "QK-Clip 逐 head 独立处理，只作用于非共享分量以兼容 MLA；它是 step 后处理，不改变当前 step 的梯度。",
  ],
  [
    "Logit 到 100 后，约 30% 的 steps 会自然衰减回安全范围；15.5T token 全程零 spike。",
    "WSD：500 step warmup → 10T token 恒定 2e−4 → 5.5T cosine 衰减至 2e−5 → 退火至 7e−6。",
    "Weight decay=0.1；global batch size=67M token，全程固定。",
  ],
  [
    "X₀=M/‖M‖F；Xₖ₊₁=Xₖ·(aI+bXᵀX+c(XᵀX)²)，5 次迭代收敛到正交矩阵。",
    "若 Sₘₐₓʰ>τ：γ=τ/Sₘₐₓʰ；Wqc、Wkc 乘 √γ，Wqr 乘 γ，Wkr 不动。",
    "因为 logit=q·k，q 与 k 各缩 √γ，内积整体缩 γ；Wkr 多头共享，无法按 head 独立缩放。",
  ],
  "🟢 K2 Technical Report §2.1、Figure 2、Algorithm 1；Moonlight",
));

Object.assign(DETAILS["optimizer-k25"], story(
  [
    "K2.5 的创新预算集中在融合时机、视觉编码器与 DEP 并行策略，语言主干没有重新设计。",
    "K2 的 MuonClip 已在 15.5T token 上证明稳定；规模相当且架构主干不变时，重新换优化器收益有限、风险更高。",
  ],
  [
    "优化器继续使用 Muon + QK-Clip，并保留它对 MLA 的兼容处理。",
    "LR schedule、weight decay 等语言侧超参数沿用 K2。",
  ],
  [
    "K2.5 报告没有披露优化器改动；K3 的回顾性描述也把 K2.5 的贡献放在视觉侧。",
    "因此这里的“继承”不是缺少工作，而是冻结已验证的训练底座，把变量控制在视觉侧。",
  ],
  [
    "语言主干配方冻结后，K2.5 的消融才能更清楚地归因到早期融合、ViT 目标与 DEP。",
  ],
  "🟢 K2.5 Technical Report；K3 Technical Report 回顾性描述",
));

Object.assign(DETAILS["optimizer-k3"], story(
  [
    "整层 Newton–Schulz 会被尺度最大的 head 主导：若两个 head 的 momentum 尺度是 100 与 1，小 head 的更新接近消失。",
    "这会形成“死头”：参数存在，但长期得不到足够训练信号。",
  ],
  [
    "沿 head 维度切分 momentum，各子矩阵独立做 Newton–Schulz，每个 head 按自身尺度获得等幅更新。",
    "LR schedule 改为 1% linear warmup → cosine decay；weight decay 仍为 0.1。",
    "同时重新搜索 batch size、LR、TPP、model shape 四个缩放旋钮。",
  ],
  [
    "在各自最优超参数下，cosine 的 final loss 持续低于 WSD。",
    "Model shape：61→93 层，384→896 专家，Top-8→Top-16。",
    "2.5× scaling efficiency 指达到同等 loss 所需 FLOPs 更少，不代表推理速度提升 2.5×。",
  ],
  [
    "M∈ℝᵈˣᵈ → 按 head 切为 M₁…Mₕ∈ℝᵈʰˣᵈʰ，各自独立执行 NS 迭代。",
    "TPP = 训练 token 总数 ÷ 参数总数，表示每个参数平均吃到多少数据。",
    "lrₜ=lrₘᵢₙ+0.5(lrₘₐₓ−lrₘᵢₙ)(1+cos(πt/T))",
  ],
  "🟢 K3 Technical Report §2.5、§3.2、Figure 7、Table 1",
));

Object.assign(DETAILS["multimodal-k15"], story(
  [
    "语言模型在视觉接入前已经训练完成，表示空间先被文本固化。",
    "视觉编码器只能把图像“翻译”到已有语言概念；若纯视觉概念没有语言锚点，投影层很难补出来。",
    "这也是 2023–2024 年 LLaVA、InternVL 等方案常见的追加式路径。",
  ],
  [
    "阶段 1：冻结语言模型，只训练视觉塔与 projector，把图像特征映射到语言嵌入空间。",
    "阶段 2：解冻后联合训练，视觉 token 占比逐步提升到 30%。",
    "合成视觉数据只在 cooldown 使用，不进入主预训练。",
  ],
  [
    "冻结的收益：保护语言能力不退化，并显著降低训练成本。",
    "冻结的代价：LLM 无法为视觉信号调整内部表示，视觉理解上限受 projector 表达能力约束。",
    "30% 视觉 token 表示每 10 个 token 约 3 个来自图像 patch、7 个来自文本。",
  ],
  [
    "这一局限直接产生 K2.5 的早期融合动机，并最终在 K3 演化为从零开始的原生多模态。",
  ],
  "🟡 2023–2024 行业范式；🟢 K1.5 Technical Report 与演进路径",
));

Object.assign(DETAILS["multimodal-k2"], story(
  [
    "K2 主动把问题收窄为纯语言建模：先验证超大 MoE+MLA 的训练效率与稳定性，再引入视觉。",
    "这避免了同时调试语言扩展、优化器和视觉融合三个变量。",
  ],
  [
    "架构为 1.04T 总参数、32B 激活参数的纯文本 MoE+MLA。",
    "15.5T 训练 token 全部来自高质量文本语料，不含图文配对。",
    "MuonClip 的大规模稳定性先在 K2 完成验证。",
  ],
  [
    "K2.5 直接加载 K2 的语言主干权重，再接入视觉编码器。",
    "因此 K2 是多模态演进中的语言底座，而不是一代遗漏视觉能力的模型。",
  ],
  [
    "这条“先语言、后视觉”的路线在 K3 被反转：MoonViT-V2 与语言主干从第一个 token 起共同训练。",
  ],
  "🟢 K2 Technical Report",
));

Object.assign(DETAILS["multimodal-k25"], story(
  [
    "直觉常认为视觉越多、引入越晚越稳，但晚期突然加入新模态会造成域偏移冲击，loss 出现 dip-and-recover。",
    "K2.5 固定视觉—文本总 token 预算，只改变融合时机与比例，直接检验这一直觉。",
  ],
  [
    "Stage 1：约 1T token，只训练 MoonViT-3D；Stage 2：约 15T，ViT+LLM 联合预训练。",
    "Stage 3：联合长上下文，约 500B→200B token，序列从 32K 扩到 262K。",
    "MoonViT-3D 从 SigLIP-SO-400M 初始化，去掉对比损失，只保留 caption CE，并执行两步对齐。",
    "DEP 将视觉编码器从 PP Stage-0 解耦，避免不同图片尺寸导致流水线负载波动。",
  ],
  [
    "早期 0% / 10:90：视觉知识25.8、视觉推理43.8、OCR65.7、文本知识45.5、文本推理58.5、代码24.8。",
    "中期 50% / 20:80：25.0、40.7、64.1、43.9、58.6、24.0。",
    "晚期 80% / 50:50：24.2、39.0、61.5、43.1、57.8、24.0。",
    "早期低比例在六项指标全部领先，文本能力也没有因视觉提前加入而下降。",
  ],
  [
    "DEP：全局 batch 视觉前向 → 主干 transformer 前向+反向 → 重算视觉前向+反向。",
    "SigLIP-SO-400M 是 shape-optimized SigLIP 变体，约 400M 参数。",
    "MoonViT-3D 将时间维也 patch 化，因此支持视频理解。",
    "六指标柱状图中，早期组全面略高，视觉推理与 OCR 差异最明显。",
  ],
  "🟢 K2.5 Technical Report §4.3、§4.5、Table 3、Figure 9、Appendix B.1",
));

Object.assign(DETAILS["multimodal-k3"], story(
  [
    "K2.5 的 SigLIP 初始化优化的是图文对比目标，切换到联合 NTP 后梯度范数持续偏高并频繁 spike。",
    "根因不是视觉编码器不够大，而是预训练目标与最终生成目标不一致。",
  ],
  [
    "MoonViT-V2 从随机初始化开始，直接用 next-token prediction 与语言主干共同训练。",
    "规格约 0.4B 参数、27 层；2×2 pixel shuffle 将视觉 token 数缩短为 1/4。",
    "加入 SVG、3D、网页、游戏、CAD 的代码—视觉配对，训练视觉结果与生成代码的双向映射。",
    "坐标同时使用绝对格式 (200,160,600,400) 与归一化格式 (0.2,0.2,0.6,0.5)。",
  ],
  [
    "从头训练的梯度范数全程平稳，无 SigLIP 初始化后的频繁 spike。",
    "视觉表示直接由 NTP 塑造，不再承担从对比学习目标迁移到生成目标的成本。",
    "程序化数据天然精确、几乎无标注噪声，可规模化生成，并直接训练空间推理。",
  ],
  [
    "“原生”指视觉从第一个 token 起参与预训练，内部表示空间一开始就为文本与视觉共同塑形。",
    "Pixel shuffle 2×2：相邻 4 个 patch 合并，长图视觉序列长度降至 1/4。",
    "K2.5 仍依赖 SigLIP 初始化；K3 完全摆脱对比学习偏置。",
  ],
  "🟢 K3 Technical Report §3.3、§2.4",
));

Object.assign(DETAILS["context-k15"], story(
  [
    "K1.5 没有改变标准 softmax attention：每个 query 仍与所有 key 做点积，因此长序列的 O(n²) 计算与线性 KV cache 都还存在。",
    "目标是在不重做架构的前提下，让已有注意力系统能稳定看见 10 万级上下文。",
  ],
  [
    "RoPE frequency base 提高到 θ=1,000,000，使旋转角随距离变化更慢，长距离位置编码不易退化。",
    "全注意力层让每个 token 看全文，适合在 10 万字合同中寻找矛盾条款；局部层只看固定窗口 w。",
    "训练数据按全注意力 40% 与部分注意力 60% 混合；前者含自然长文和合成长上下文 Q&A。",
    "课程从 4K → 32K → 131K，序列长度与长数据比例同步增加。",
  ],
  [
    "全注意力复杂度 O(n²)；部分注意力复杂度 O(n·w)。",
    "60% 局部数据让模型学会：局部足够时，不必浪费全局容量。",
    "但 KV cache 仍随序列线性增长，没有发生结构性压缩。",
  ],
  [
    "合成长 Q&A 把证据散布在文档不同位置，强迫全注意力层学习远距离检索。",
    "RoPE 频率：θᵢ=10000^(−2i/d) 改为 1000000^(−2i/d)，低频维度旋转角变小。",
  ],
  "🟢 K1.5 Technical Report，预训练阶段 3",
));

Object.assign(DETAILS["context-k2"], story(
  [
    "K2 仍使用标准 softmax attention 与线性 KV cache，问题不在注意力结构，而在 RoPE 如何跨越训练长度。",
    "K1.5 直接调大 frequency base 的方法较粗，K2 需要更精细地对待不同频段。",
  ],
  [
    "YaRN 对 RoPE 频率分段：低频使用 NTK-aware 插值，高频保持不变，中间频段线性混合。",
    "退火分为 400B token@4K 与 60B token@32K 两段。",
    "学习率从 2e−5 余弦衰减到 7e−6。",
  ],
  [
    "K2 不再依赖全/部分注意力混合，而是利用 YaRN 的数学外推性质达到 128K。",
    "400B@4K 负责质量退火、巩固语言能力；60B@32K 负责长度退火、校准位置编码。",
    "代价仍未改变：O(n²) 计算与线性 KV cache。",
  ],
  [
    "高频维度周期短，训练中已见过完整周期，不必插值；低频维度周期长、会超出训练窗口，最需要 NTK-aware 缩放。",
  ],
  "🟢 K2 Technical Report §2.5",
));

Object.assign(DETAILS["context-k25"], story(
  [
    "K2 的实际长度训练只到 32K，128K 主要依靠 YaRN 外推；长度越远，外推压力越大。",
    "单独做长上下文训练又容易遗忘高质量短文本能力。",
  ],
  [
    "K2.5 设计联合 mid-training，同时完成高质量数据提升与长上下文激活。",
    "YaRN 从 32K 渐进扩展到 262K，模型真实看过更长序列。",
    "长文本、长视频、推理数据与 Long-CoT 一起进入训练。",
  ],
  [
    "高质量短数据防止长训练遗忘；长数据同时校准远距离能力，两类目标可以在一个阶段完成。",
    "长视频天然产生长 token 序列，补充非文本域长依赖信号。",
    "Long-CoT 让模型在很长的推理链中保持逻辑一致。",
  ],
  [
    "与 K2 相比：K2 实训到 32K 后外推到 128K；K2.5 实训逐步推到 262K，外推压力显著降低。",
    "底层仍是标准 softmax attention + YaRN，架构本身没有改变。",
  ],
  "🟢 K2.5 Technical Report §4.3、Table 3",
));

Object.assign(DETAILS["context-k3"], story(
  [
    "继续调 RoPE/YaRN 只能延长标准 attention，无法消除 O(n²) 计算和 KV cache 随 n 增长的问题。",
    "K3 因此不再用单一注意力机制承担全部记忆：局部语义过程与全局精确检索被拆开。",
  ],
  [
    "69 层 KDA 用固定大小状态 S 递归写入历史，O(n)，并用 α 衰减隐式编码位置，无需 RoPE。",
    "24 层 Gated MLA 保留全局 softmax，把 KV 压缩成 latent，约 3.4×，并完全使用 NoPE。",
    "课程为 8K→64K（预训练）→256K→1M（cooldown），不需要重调频率基或 YaRN。",
    "长数据流水线：精确/模糊去重与帧感知哈希 → 质量过滤 → 上采样 → 跨段合成任务。",
  ],
  [
    "KDA 有损压缩，不保证精确保留每个细节；Gated MLA 负责补回全局逐 token 检索。",
    "1M 是接口与课程上限，不代表模型对每个位置都有相同有效利用率。",
    "长序列只占较小训练预算，用于校准记忆跨度，而不承担全部基础语言学习。",
  ],
  [
    "短阶段 8K→64K 调好语言底座 θₗ；长阶段 256K→1M 校准远距离参数 θₛ。",
    "长度≠训练信号：1M 日志若无跨段依赖，模型仍可忽略远处；合成跨段任务才让 loss 惩罚这种忽略。",
    "K1.5 的局部 mask 仍在做 token 间 attention；K3 KDA 是递归写状态，不做全历史点积。",
  ],
  "🟢 K3 Technical Report §3.4、§2.1、§2.2",
));

Object.assign(DETAILS["data-k15-filter"], story(
  [
    "单一过滤器只看得到质量的一部分：规则擅长抓格式与垃圾模式，FastText、嵌入和 LLM 分别补充语言质量、近重复与语义价值判断。",
    "K1.5 因此组合四类评分信号，而不是让某一种过滤器独自决定文档去留。",
  ],
  [
    "规则信号：重复模式、机器翻译痕迹、乱码、垃圾 URL 与广告模板。",
    "FastText 信号：用语言特征与语义连贯性判断文本质量。",
    "嵌入相似度信号：识别语义近重复，保留有信息增量的变体，删除纯冗余。",
    "LLM 信号：按连贯性、信息量、教育价值三维精细评分。",
  ],
  [
    "四类分数最终合成为连续质量分，而不是简单的通过/拒绝二值标签。",
    "采样率通过下游任务实证选择阈值组合，寻找质量与覆盖度的帕累托最优点。",
    "示例判断：Cosine>0.95 但表达有信息增量时，论文与科普改写都可保留；仅调换段落顺序的副本删除一个。",
  ],
  [
    "规则 / FastText / 嵌入 / LLM → 连续质量分",
  ],
  "🟢 K1.5 Technical Report Appendix B.1；🔴 Cosine 阈值为机制示例",
));

Object.assign(DETAILS["data-k15-sampling"], story(
  [
    "质量分是连续量，硬删除会误伤小语种、稀有表达和垂直领域专业文档。",
    "但让低质量文档与高质量文档等概率进入 batch，又会稀释有效梯度。",
  ],
  [
    "连续质量分直接映射为采样率，不依赖脆弱的通过/拒绝硬阈值：高于 1 时重复抽取，低于 1 时按概率随机跳过。",
    "低质量数据不是消失，而是以更低频率贡献梯度，因此仍保留覆盖度。",
    "代码域额外沿用 BigCode 方法：32 种编程语言上采样，HTML/CSS/XML 等标记语言下采样。",
  ],
  [
    "例：60 篇高质×2.0 + 40 篇低质×0.5 = 120+20=140 次；高质贡献由 60% 提升到约 86%。",
    "采样率 0.3 表示每 epoch 约 30% 概率进入 batch，长期梯度权重约降到原始的 0.3×。",
  ],
  [
    "标记语言含大量重复标签，单位 token 信息密度通常低于 Python 等程序逻辑。",
    "32 种编程语言在互联网中天然稀缺，却对代码能力关键。",
    "与 K3 长文档上采样动机相同：目标能力所需数据天然稀缺，不能服从原始频率。",
  ],
  "🟢 K1.5 Technical Report；BigCode 数据方法",
));

Object.assign(DETAILS["data-k15-vision-five"], story(
  [
    "单一 caption 只能训练“图中有什么”，无法同时覆盖图文顺序、图中文字、知识抽取与视觉推理。",
    "因此 K1.5 将视觉数据拆成五类互补任务，但仍只在语言主干之后追加。",
  ],
  [
    "Caption 训练看图描述；图文交织训练顺序、互相指代与文档理解。",
    "OCR 训练表格、手写与截图文字识别；知识类数据训练从图表提取结构化知识。",
    "通用 QA 把识别推进到视觉推理与回答；图文交织额外按渲染位置执行 data reordering。",
  ],
  [
    "合成数据只在 cooldown 使用，不进入主预训练。",
    "五类能力链：识别“有什么” → 对应“如何配合” → 识字 → 理解“传达什么” → 推理回答。",
  ],
  [
    "HTML 中 DOM 顺序可能因 CSS 浮动或延迟加载不同于渲染位置；按 DOM 拼接会打乱图文对应，必须按视觉位置重排。",
    "🔴 合成数据限于 cooldown 的原因推测：合成分布有偏，低 LR、小预算阶段更容易控制偏差。",
  ],
  "🟢 K1.5 Technical Report；🔴 cooldown 动机为演进路径推断",
));

Object.assign(DETAILS["data-k15-cooldown-synth"], story(
  [
    "主训练建立广覆盖能力，但高价值数学、知识和代码信号仍需要在低学习率阶段集中巩固。",
  ],
  [
    "专有 LM 为数学、知识与代码语料生成 QA 对。",
    "拒绝采样先过滤低质量生成，全面验证后才进入 cooldown。",
  ],
  [
    "合成 QA 显著提升数学推理、知识任务和代码生成，但不进入主预训练。",
  ],
  [
    "真实高质量数据 → 生成 QA → 拒绝采样 → cooldown",
  ],
  "🟢 K1.5 Technical Report Appendix B.3",
));

Object.assign(DETAILS["data-k2-rephrasing"], story(
  [
    "高质量文本总量有限；同一原文训练 10 个 epoch，模型容易记住措辞而非知识结构。",
    "真正需要增加的不是重复次数，而是同一事实的表面变化。",
  ],
  [
    "对同一事实生成语义等价但表达不同的版本，覆盖问答、因果、对比与推导视角；每版只训练 1 次。",
    "长文档分块自回归改写后再拼接，并用语义忠实度检查过滤失真版本。",
  ],
  [
    "相同 10 次数据曝光下，10 版×1 epoch 得分 28.94，比原文×10 epoch 的 23.76 高 5.18 个百分点。",
    "SimpleQA 满分 100，考查单一明确答案的短事实问答；28.94 表示约 28.94% 的题目被判为正确。回答还会被区分为错误或未作答。",
  ],
  [
    "SimpleQA：原文×10=23.76；单版改写×10=27.39；10 版改写×1=28.94",
    "Accuracy = correct ÷ all questions × 100；满分 100",
  ],
  "🟢 K2 Technical Report §2.2、Table 1；OpenAI《Introducing SimpleQA》",
));

Object.assign(DETAILS["data-k2-math-rephrasing"], story(
  [
    "数学材料的推导结构比普通知识文本更敏感，直接套用通用改写容易破坏逻辑链。",
  ],
  [
    "按 SwallowMath 方法改写为 learning-note style。",
    "把其他语言的高质量数学材料翻译成英文，扩大表达与来源多样性。",
  ],
  [
    "K2 只在知识和数学两域使用 rephrasing；每个语料库最多改写两次。",
  ],
  [
    "数学原文 → 学习笔记式重写 → 忠实度验证",
  ],
  "🟢 K2 Technical Report §2.2",
));

Object.assign(DETAILS["data-k2-filter-inherit"], story(
  [
    "K1.5 已建立规则、FastText、嵌入与 LLM 组合评分，K2 不需要重新发明同一套入口。",
    "保持数据底座一致，才能把 SimpleQA 的变化主要归因于 rephrasing，而不是清洗策略同时变化。",
  ],
  [
    "继续沿用 K1.5 的主要数据处理方法。",
    "把 K2 的新增数据实验集中在知识与数学 rephrasing。",
  ],
  [
    "K2 报告明确说明多数数据处理管线沿用 K1.5。",
  ],
  [
    "K1.5 多维质量评分 → K2 沿用底座 → 单独检验 rephrasing",
  ],
  "🟢 K2 Technical Report §2.2『Pre-training Data Overall』",
));

Object.assign(DETAILS["data-k25-code-weight"], story(
  [
    "联合多模态预训练加入大量视觉 token 后，代码逻辑信号容易被进一步稀释。",
  ],
  [
    "在 K2 数据底座上增加代码相关内容的配方权重。",
    "同时按 source unique tokens 设置最大 epoch，避免小代码源无限循环。",
  ],
  [
    "代码调权与 unique-token 上限必须一起使用：前者保能力密度，后者控过拟合。",
  ],
  [
    "P(source)↑；epoch(source) ≤ budget(unique tokens)",
  ],
  "🟢 K2.5 Technical Report §4.3",
));

Object.assign(DETAILS["data-k25-vision-seven"], story(
  [
    "K1.5 的五类视觉数据覆盖识别与问答，但像素级定位、长视频时序和 GUI 操作仍然不足。",
  ],
  [
    "七类数据为 Caption、图文交织、OCR、知识、感知、视频与智能体数据。",
    "感知数据加入边界框、点级引用和轮廓分割；智能体数据覆盖桌面、移动端与 Web 操作轨迹。",
    "MoonViT-3D 用原生分辨率 patch packing 统一处理图像与视频。",
  ],
  [
    "新增三类把能力从“图中有什么”扩到“物体在哪里、时间如何变化、界面怎样操作”。",
  ],
  [
    "四类基础（Caption、交织、OCR、知识）+ 感知 + 视频 + 智能体 = 七类视觉数据",
  ],
  "🟢 K2.5 Technical Report §4.2–§4.3",
));

Object.assign(DETAILS["data-k25-unique"], story(
  [
    "数据源体量差异极大：代码库可达 10T token，专业领域可能只有 50B。",
    "若所有源跑相同 epoch，小源会重复几十遍，而大源才刚看完一遍。",
  ],
  [
    "统计每个 source 去重后的 unique token 总量，据此设定该源最大 epoch。",
    "源达到预算后停止采样，并同时提高代码相关内容的配方权重。",
    "它与 rephrasing 正交：前者管理 source 预算，后者改变同一文档的表面形式。",
  ],
  [
    "Rephrasing 解决“同一文档重复”；unique tokens 解决“同一数据源重复”。",
    "两者叠加后，既能扩展表达多样性，又不让小源无限循环。",
  ],
  [
    "🔴 推测实现：为每个 source 维护已见 token 计数，epoch×source_size 达上限后停止该源采样。",
  ],
  "🟢 K2.5 Technical Report；🔴 计数实现细节为工程推断",
));

Object.assign(DETAILS["data-k25-code-visual"], story(
  [
    "Caption 和 OCR 能描述页面内容，却不能直接建立代码结构与最终布局之间的对应关系。",
  ],
  [
    "把 HTML、React、SVG 等代码与真实渲染截图配对。",
    "同时训练代码到画面与画面到结构的双向联系。",
  ],
  [
    "这一步把视觉数据从内容识别推进到界面生成，并成为 K3 程序化多模态的起点。",
  ],
  [
    "HTML / React / SVG ↔ rendered screenshot",
  ],
  "🟢 K2.5 Technical Report §4.3",
));

Object.assign(DETAILS["data-k25-vit-ce"], story(
  [
    "CLIP 对比损失把整图与整句压成全局向量，关心 batch 内匹配排名，不关心图内某个单元格的位置。",
    "NTP 却必须回答“表格第三行第二列是什么”，需要视觉编码保留细粒度结构。",
  ],
  [
    "K2.5 去掉 CLIP 风格对比损失，只使用 caption cross-entropy。",
    "每个输出 token 都依赖图像编码，细节丢失会被 token 级预测误差直接追责。",
    "这一选择与 Kimi-VL 不同：Kimi-VL 保留对比损失，K2.5 有意删除。",
  ],
  [
    "对比损失优化全局语义排名；caption CE 对 OCR、表格和局部结构更直接。",
    "🔴 代价推断：可能牺牲零样本检索，但 K2.5 定位是生成模型而非检索模型。",
  ],
  [
    "Lcontrast=−log[exp(sim(I,T)/τ) / ∑ⱼexp(sim(I,Tⱼ)/τ)]",
    "Lcaption=−∑ₖlog P(tₖ|t₁…tₖ₋₁,I)",
  ],
  "🟢 K2.5 Technical Report §4.3；🔴 检索代价为目标函数推断",
));

Object.assign(DETAILS["data-k3-native-vision"], story(
  [
    "SigLIP 初始化优化整图相似度，与语言主干的细粒度 NTP 目标不一致，联合训练时梯度持续偏高。",
  ],
  [
    "MoonViT-V2 从随机参数开始，只接受 NTP 监督。",
    "图像与视频共享参数，并用 2×2 pixel shuffle 将视觉 token 降为 1/4。",
  ],
  [
    "从头训练版本梯度范数全程平稳；SigLIP 初始化版本频繁 spike。",
  ],
  [
    "random ViT + LLM → shared NTP from step 1",
  ],
  "🟢 K3 Technical Report §3.3、Figure 6",
));

Object.assign(DETAILS["data-k3-programmatic"], story(
  [
    "K2.5 的 caption、OCR、interleaving 主要回答“图中有什么”，属于识别性理解。",
    "要生成或调试界面，模型还必须理解“哪段代码会造成什么视觉结果”。",
  ],
  [
    "把 SVG、3D 资产、HTML+CSS、游戏场景、CAD 图纸的代码与渲染结果成对加入训练。",
    "训练双向映射：看代码想象画面，也能从截图反推布局错误并生成可运行界面。",
    "坐标采用绝对格式 (200,160,600,400) 与归一化格式 (0.2,0.2,0.6,0.5)。",
  ],
  [
    "例：display:flex; justify-content:center ↔ 按钮水平居中截图。",
    "绝对坐标提供像素精度；归一化坐标提供跨分辨率泛化。",
    "程序化配对由执行结果自动产生，标注精确且可大规模生成。",
  ],
  [
    "<circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/> ↔ 红色圆形渲染图。",
    "Grounding 只标出已有物体；程序化多模态解释代码如何创造物体。",
    "Code review 可以不运行程序，先预判视觉后果。",
  ],
  "🟢 K3 Technical Report §3.1",
));

Object.assign(DETAILS["data-k3-long-doc"], story(
  [
    "高质量学术全文、法律文书、技术手册与长视频在自然分布中远少于短内容。",
    "若按原始频率混合，长序列训练会被短样本淹没；但直接上采样又会放大残余噪声。",
  ],
  [
    "先做精确去重(hash)与模糊去重(MinHash/SimHash)。",
    "视频使用帧感知哈希；再做长度/重复段落启发式过滤、分类器过滤与章节/引用链完整性检查。",
    "清洗后提高真实长文档与长视频进入 batch 的概率。",
  ],
  [
    "合格标准不是文件够长，而是训练 loss 是否惩罚忽略远处内容。",
    "上采样倍率不是越高越好：残余噪声也会被同步放大。",
    "Rephrasing 制造同知识多版本；长文档上采样保证真实长依赖信号充足。",
  ],
  [
    "感知哈希：帧缩放 → 灰度 → DCT 低频 → 二值指纹 → 汉明距离判重。",
    "🔴 上采样倍率推断：应由小模型消融动态调整，而非预设固定倍数。",
  ],
  "🟢 K3 Technical Report §3.4；🔴 倍率选择为工程推断",
));

Object.assign(DETAILS["data-k3-cross-span"], story(
  [
    "把许多短文档机械拼成 1M，只增加了长度；若答案就在最后一段，模型仍可忽略前面 99%。",
    "真正的长上下文训练信号必须让忽略远处证据直接增加 loss。",
  ],
  [
    "排列并拼接多模态文档与子任务，把回答所需证据散布到整段上下文。",
    "例：第1段人物身份、第80段时间线、第300段例外条件、第900段问题；三处证据缺一不可。",
    "证据可跨文本、图表与代码输出，使长距离推理同时覆盖多模态。",
  ],
  [
    "NIAH 是单针检索；跨段合成是多针+组合推理，从“找到”升级到“整合”。",
    "不存在一次性完美的数据配方，采样率需要通过小模型消融决定。",
    "核心验收标准：忽略任意远处关键段落，答案就会错。",
  ],
  [
    "🔴 推测生成流程：选 N 篇文档 → 各抽关键事实 → 设计必须组合 N 个事实的问题 → 打散到随机位置。",
    "多模态例：第50页图表 + 第200页代码输出共同构成答案。",
  ],
  "🟢 K3 Technical Report §3.4；🔴 合成实现流程为工程推断",
));

export const TABLE_ROWS = [
  ["训练目标", "NTP", "NTP", "NTP + ViT caption CE", "NTP + MTP"],
  ["优化器", "AdamW*", "MuonClip", "继承 K2", "Per-Head Muon"],
  ["LR", "未披露", "WSD", "继承 K2", "cosine"],
  ["数据", "四层筛选 · 五类视觉", "知识 / 数学 rephrasing", "七类视觉 · unique tokens", "程序化多模态"],
  ["序列课程", "4K→32K→131K", "4K→32K→128K", "4K→32K→262K", "8K→64K→256K→1M"],
  ["并行 / 计算", "未披露", "EP16 + PP + ZeRO-1", "继承 + DEP", "MoonEP + 重拟配方"],
  ["总 / 激活参数", "未披露", "1.04T / 32B", "继承 K2", "2.8T / 104B"],
  ["路由专家", "—", "384 · Top-8", "继承 K2", "896 · Top-16"],
  ["训练 token", "未披露", "15.5T", "约15T", "未完整披露"],
];

export const getDetail = (id) => DETAILS[id] || null;
