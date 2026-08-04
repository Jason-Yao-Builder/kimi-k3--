export const PIPELINES = [
  { id: "k15", label: "K1.5", subtitle: "指令基础 → 长链冷启动 → RL 校准", stages: [
    { label: "SFT", weight: 0.82, groups: [
      { id: "k15-sft", label: "通用指令", cards: [["sft-k15", "数据与上下文课程"]] },
    ] },
    { label: "Long-CoT SFT", weight: 0.92, groups: [
      { id: "k15-longcot", label: "长链冷启动", cards: [["longcot-k15", "四种认知模式"]] },
    ] },
    { label: "RL", weight: 2.7, groups: [
      { id: "k15-policy", label: "损失函数", cards: [["rl-k15", "Mirror Descent"], ["rl-k15-value", "整链归因"]] },
      { id: "k15-sampling", label: "采样规则", cards: [["sampling-k15", "Curriculum / Priority"]] },
      { id: "k15-reward", label: "评价机制", cards: [["domain-k15", "规则验证"], ["reward-k15", "CoT RM"]] },
      { id: "k15-length", label: "长度控制", cards: [["length-k15", "相对长度惩罚"], ["rl-k15-l2s", "Long2Short"]] },
      { id: "k15-infra", label: "RL 系统", cards: [["infra-k15", "Rollout / Sandbox"]] },
    ] },
  ] },
  { id: "k2", label: "K2", subtitle: "工具 SFT → 开放任务 RL", stages: [
    { label: "SFT", weight: 1.08, groups: [
      { id: "k2-data", label: "工具数据合成", cards: [["domain-k2", "Tool / Agent / Trajectory"]] },
    ] },
    { label: "RL", weight: 2.45, groups: [
      { id: "k2-recipe", label: "采样规则", cards: [["rl-k2-ptx", "PTX Loss"]] },
      { id: "k2-reward", label: "评价机制", cards: [["reward-k2", "Self-Critique"], ["faithfulness-k2", "逐句忠实度"]] },
      { id: "k2-length", label: "长度控制", cards: [["length-k2", "Budget Control"]] },
      { id: "k2-infra", label: "RL 系统", cards: [["infra-k2", "Rollout / Checkpoint"]] },
    ] },
  ] },
  { id: "k25", label: "K2.5", subtitle: "视觉冷启动 → 联合多模态 RL", stages: [
    { label: "Zero-Vision SFT", weight: 1.15, groups: [
      { id: "k25-cold", label: "视觉冷启动", cards: [["sft-k25", "纯文本学视觉工具"]] },
    ] },
    { label: "Joint RL", weight: 2.8, groups: [
      { id: "k25-domain", label: "联合四域", cards: [["domain-k25", "文本 + 视觉"]] },
      { id: "k25-policy", label: "损失函数", cards: [["rl-k25", "Per-token Clip"]] },
      { id: "k25-reward", label: "评价机制", cards: [["reward-k25", "GRM + 专用验证"]] },
      { id: "k25-length", label: "长度控制", cards: [["length-k25", "Toggle"]] },
    ] },
  ] },
  { id: "k3", label: "K3", subtitle: "九专家分化 → 蒸馏合一 → 解码加速", stages: [
    { label: "SFT", weight: 0.9, groups: [
      { id: "k3-sft", label: "冷启动", cards: [["sft-k3", "QAT + XTML"]] },
    ] },
    { label: "9 Experts RL", weight: 3.2, groups: [
      { id: "k3-policy", label: "损失函数", cards: [["rl-k3", "继承 K2.5"]] },
      { id: "k3-reward", label: "评价机制", cards: [["reward-k3", "Agentic GRM"]] },
      { id: "k3-length", label: "长度控制", cards: [["length-k3", "Reasoning Effort"]] },
      { id: "k3-domain", label: "蒸馏结构", cards: [["domain-k3", "三域 × 三强度 + MOPD"]] },
      { id: "k3-env", label: "任务设置", cards: [["env-k3", "任务环境"]] },
    ] },
    { label: "Draft FT", weight: 0.9, groups: [
      { id: "k3-deploy", label: "推测解码", cards: [["rl-k3-eagle", "EAGLE-3"]] },
    ] },
  ] },
];

export const PIPELINE_GROUPS = PIPELINES.flatMap((pipeline) => pipeline.stages.flatMap((stage) => stage.groups || []));
export const PIPELINE_CARD_IDS = PIPELINE_GROUPS.flatMap((group) => group.cards.map(([id]) => id));
export const getPipelineGroup = (cardId) => PIPELINE_GROUPS.find((group) => group.cards.some(([id]) => id === cardId)) || null;

export const TABLE_ROWS = [
  ["训练阶段", "SFT → Long-CoT SFT → RL", "SFT → RL", "Zero-Vision SFT → Joint RL", "SFT → 9 专家 RL → MOPD → Draft FT"],
  ["RL 算法", "Online Mirror Descent", "+ PTX", "Per-token Clipping", "继承 K2.5"],
  ["任务域", "数学 / 代码", "+ 工具使用", "四能力域 + 视觉", "三域 × 三强度"],
  ["Reward", "CoT RM", "Self-Critique Rubric", "GRM 跨模态", "Agentic GRM 四步"],
  ["长度", "Length Penalty", "Budget Control", "Toggle", "τ 退火"],
  ["蒸馏 / 加速", "Long2Short", "—", "—", "MOPD + QAT + EAGLE-3"],
];

export const CARDS = {};

export const registerCards = (cards) => Object.assign(CARDS, cards);

export const getCard = (id) => CARDS[id] || null;
