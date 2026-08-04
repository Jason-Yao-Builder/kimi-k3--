export const deck = {
  meta: {
    id: "linear-attention-demo",
    title: "线性注意力：把二次计算改写成两次汇总",
    subtitle: "框架能力演示，而非完整技术报告",
  },
  filters: [
    { tag: "candidate", label: "候选方案", defaultVisible: true },
  ],
  slides: [
    {
      id: "opening",
      section: "开场",
      role: "背景",
      title: "长序列让标准注意力先撞上计算墙",
      edges: [{ type: "next", target: "problem" }],
      layout: "hero",
      blocks: [
        {
          type: "hero",
          kicker: "HTML PRESENTATION / 01",
          headline: "序列越长，注意力矩阵增长得越快",
          summary: "我们要保留信息聚合能力，同时避免显式构造 n × n 的关系矩阵。",
          metric: { value: "O(n²)", label: "标准注意力的序列复杂度" },
        },
      ],
    },
    {
      id: "prerequisite",
      section: "补充",
      role: "前置知识",
      detour: true,
      title: "结合律允许改变中间结果的形状",
      edges: [{ type: "return" }],
      layout: "split",
      blocks: [
        {
          type: "formula",
          expression: "(QKᵀ)V = Q(KᵀV)",
          note: "结果相同，中间矩阵的尺寸不同",
        },
        {
          type: "text",
          eyebrow: "逐帧理解",
          heading: "先算谁，决定内存里出现什么",
          body: "左边先产生 token × token；右边先产生 feature × value。线性注意力借用这个方向，但通常还要改变归一化方式。",
        },
        {
          type: "actions",
          actions: [{ label: "回到原位置", action: "return" }],
        },
      ],
    },
    {
      id: "interactive",
      section: "验证",
      role: "效果",
      title: "互动组件让复杂度变化变得可感知",
      edges: [{ type: "next", target: "component-proof" }],
      layout: "canvas",
      blocks: [
        {
          type: "simulation",
          id: "complexity",
          label: "拖动序列长度",
          min: 512,
          max: 8192,
          step: 512,
          value: 2048,
        },
      ],
    },
    {
      id: "component-proof",
      section: "验证",
      role: "组件",
      title: "现有材料也能作为可放大的相对路径资产",
      edges: [{ type: "next", target: "ending" }],
      layout: "split",
      blocks: [
        {
          type: "image",
          src: "./presentations/demo/assets/swiglu-note.png",
          alt: "SwiGLU 资料摘录",
          caption: "点击放大，Esc 还原；状态不会丢失",
          zoomable: true,
        },
        {
          type: "text",
          eyebrow: "组件契约",
          heading: "资产位置与页面位置分离",
          body: "页面只声明相对路径、语义和布局意图。移动整个文件夹后，引用关系仍然成立。",
          callout: "模板导入器未来也只输出这种标准组件。",
        },
      ],
    },
    {
      id: "ending",
      section: "结论",
      role: "结论",
      title: "首期骨架已经覆盖内容、状态与路径",
      edges: [],
      layout: "hero",
      blocks: [
        {
          type: "hero",
          kicker: "ENGINE CONTRACT / 07",
          headline: "页是场景，组件是内容，边是演示逻辑",
          summary: "下一步不是增加动画，而是用真实技术报告检验这套协议是否足够稳定。",
          metric: { value: "4 层", label: "Deck → Slide → Track → Block" },
        },
      ],
    },
    {
      id: "problem",
      section: "问题",
      role: "问题",
      title: "真正昂贵的是先生成每一对 token 的关系",
      edges: [{ type: "next", target: "candidates" }],
      layout: "split",
      blocks: [
        {
          type: "matrix",
          title: "标准注意力",
          rows: 8,
          caption: "长度翻倍，关系格子变为四倍",
        },
        {
          type: "text",
          eyebrow: "设计者视角",
          heading: "能不能先汇总，再查询？",
          body: "如果乘法结合顺序允许改变，我们就不必保存完整关系矩阵。这个问题自然引出线性注意力。",
          callout: "先改变计算顺序，再讨论近似代价。",
        },
      ],
    },
    {
      id: "candidates",
      section: "探索",
      role: "候选项",
      tags: ["candidate"],
      title: "三个候选方向，各自牺牲不同东西",
      edges: [{ type: "next", target: "mechanism" }],
      layout: "canvas",
      blocks: [
        {
          type: "comparison",
          items: [
            { label: "稀疏连接", value: "少算部分关系", tone: "blue" },
            { label: "低秩近似", value: "压缩关系矩阵", tone: "green" },
            { label: "核函数改写", value: "交换乘法顺序", tone: "accent" },
          ],
        },
      ],
    },
    {
      id: "mechanism",
      section: "方案",
      role: "新方案",
      title: "同一个机制，可以从三条认知路径进入",
      edges: [
        { type: "next", target: "interactive" },
        { type: "branch", target: "prerequisite" },
      ],
      layout: "canvas",
      blocks: [
        {
          type: "track",
          id: "explanations",
          label: "解释方式",
          items: [
            {
              id: "formula",
              label: "公式",
              blocks: [{ type: "formula", expression: "φ(Q) · [φ(K)ᵀV]", note: "先计算与序列长度无关的汇总项" }],
            },
            {
              id: "case",
              label: "案例",
              blocks: [{ type: "case", title: "10,000 个 token", body: "不再保存 1 亿个两两关系，而是先形成固定宽度的记忆摘要，再逐个查询。" }],
            },
            {
              id: "analogy",
              label: "类比",
              blocks: [{ type: "case", title: "从逐人访谈到先做索引", body: "原来每个人都问遍全场；现在先把全场信息归档，每个人只查索引。" }],
            },
          ],
        },
        {
          type: "actions",
          actions: [{ label: "补充：矩阵乘法顺序", action: "branch", target: "prerequisite" }],
        },
      ],
    },
  ],
};
