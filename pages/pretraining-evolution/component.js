import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import {
  DATA_LABELS,
  DATA_LABEL_BY_TAB,
  DATA_LINEAGES,
  DATA_TAB_BY_LABEL,
  CONTEXT_CHAPTERS,
  CONTEXT_LABEL_BY_TAB,
  CONTEXT_TAB_BY_LABEL,
  LABELS,
  MULTIMODAL_CHAPTERS,
  MULTIMODAL_LABEL_BY_TAB,
  MULTIMODAL_TAB_BY_LABEL,
  OPTIMIZER_CHAPTERS,
  OPTIMIZER_LABEL_BY_TAB,
  OPTIMIZER_TAB_BY_LABEL,
  OVERVIEW_PIPELINES,
  TABLE_ROWS,
  VERSIONS,
  getDetail,
} from "./logic.js?build=20260805-data14";

const fadeIn = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  node.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], {
    duration: MOTION.fast,
    easing: MOTION.easing,
  });
};

const makeLegend = () => {
  const legend = element("div", "pte-legend");
  [["inherit", "顺承"], ["improve", "扩展"], ["redesign", "重设计"]].forEach(([tone, label]) => {
    const item = element("span", tone, label);
    item.prepend(element("i"));
    legend.append(item);
  });
  return legend;
};

const buildMiniVisual = (detail) => {
  const svg = svgElement("svg", { class: `pte-detail-visual ${detail.visual}`, viewBox: "0 0 440 112", role: "img", "aria-label": `${detail.title} 机制示意` });
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 4, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));

  if (detail.visual === "optimizer") {
    if (detail.version === "K3") {
      text(18, 18, "更新尺度", "caption", "start");
      [72, 46, 24, 58].forEach((height, index) => rect(26 + index * 46, 92 - height, 28, height, index === 0 ? "danger" : "muted"));
      line(225, 18, 225, 98, "divider");
      [54, 54, 54, 54].forEach((height, index) => rect(250 + index * 42, 92 - height, 26, height, "active"));
      text(108, 106, "整层尺度互相干扰");
      text(322, 106, "逐 head 独立正交");
    } else {
      [[24, 96, "Momentum M", "muted"], [171, 112, "Newton–Schulz", "active"], [334, 82, "QK-Clip", "danger"]].forEach(([x, width, label, tone], index) => {
        rect(x, 35, width, 42, tone);
        text(x + width / 2, 60, label, "node");
        if (index < 2) text(x + width + 18, 61, "→", "arrow-text");
      });
      text(220, 101, "矩阵正交更新；logit > 100 时逐 head 限幅");
    }
  } else if (detail.visual === "bars") {
    const values = [["早期 10%", 88, "active"], ["中期 20%", 72, "muted"], ["晚期 50%", 61, "danger"]];
    values.forEach(([label, value, tone], index) => {
      text(12, 26 + index * 30, label, "label", "start");
      rect(96, 12 + index * 30, 300, 18, "track");
      rect(96, 12 + index * 30, value * 3, 18, tone);
      text(408, 26 + index * 30, String(value), "value", "end");
    });
  } else if (detail.visual === "context") {
    const widths = detail.version === "K3" ? [20, 74, 164, 340] : [20, 70, 150, 235];
    widths.forEach((width, index) => {
      rect(28, 15 + index * 23, width, 13, index === widths.length - 1 ? "active" : "muted");
      text(Math.min(420, 38 + width), 26 + index * 23, ["4K", "32K", "128K", detail.version === "K3" ? "1M" : "262K"][index], "value", "start");
    });
  } else if (["funnel", "rephrase", "code-visual", "fusion", "native"].includes(detail.visual)) {
    const labels = detail.visual === "rephrase" ? ["原文", "10 种表达", "不变知识"]
      : detail.visual === "code-visual" ? ["代码", "渲染", "视觉推理"]
        : detail.visual === "funnel" ? ["规则", "分类", "去重", "LLM"] : ["文本", "联合表示", "视觉"];
    labels.forEach((label, index) => {
      rect(24 + index * 144, 35, index === 1 ? 112 : 86, 40, index === 1 ? "active" : "muted");
      text(67 + index * 144, 59, label, "node");
      if (index < labels.length - 1) {
        line(112 + index * 144, 55, 158 + index * 144, 55, "arrow");
        text(135 + index * 144, 50, "→", "arrow-text");
      }
    });
  } else {
    const labels = detail.body.slice(0, 4).map((item) => item.split(/[：，]/)[0]);
    labels.forEach((label, index) => {
      rect(20 + index * 104, 36, 82, 42, index === labels.length - 1 ? "active" : "muted");
      text(61 + index * 104, 61, label.slice(0, 8), "node");
      if (index < labels.length - 1) text(112 + index * 104, 62, "→", "arrow-text");
    });
  }
  return svg;
};

const buildOptimizerVisual = (type) => {
  const viewBox = ["sgd", "momentum"].includes(type) ? "0 0 560 168" : type === "adam" ? "0 0 560 156" : "0 0 560 116";
  const svg = svgElement("svg", { class: `pte-optimizer-visual ${type}`, viewBox, role: "img", "aria-label": `${type} 机制图解` });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  const ellipse = (cx, cy, rx, ry, transform = "") => svg.append(svgElement("ellipse", { cx, cy, rx, ry, transform, class: "contour" }));
  const boxFlow = (labels, active = labels.length - 1) => labels.forEach((label, index) => {
    const width = 118;
    const x = 22 + index * 172;
    rect(x, 31, width, 48, index === active ? "active" : "muted");
    text(x + width / 2, 59, label, "node");
    if (index < labels.length - 1) text(x + 145, 61, "→", "arrow");
  });
  const flowLabels = {
    "vision-interface": ["Image patches", "ViT + Projector", "LLM tokens"],
    freeze: ["ViT 可训练", "Projector 可训练", "LLM 冻结"],
    "co-adapt": ["视觉梯度", "共同表示", "语言梯度"],
    "multimodal-arc": ["追加式", "早期联合", "原生 NTP"],
    "append-pipeline": ["冻结对齐", "解冻联合", "视觉 30%"],
    "freeze-benefit": ["保护语言", "减少计算", "表示受限"],
    anchor: ["视觉概念", "Projector", "语言锚点"],
    cooldown: ["主预训练", "低 LR", "合成视觉"],
    "bridge-early": ["晚期冲击", "提前接入", "共同适应"],
    "text-foundation": ["15.5T 文本", "MoE + MLA", "稳定底座"],
    "foundation-handoff": ["K2 语言权重", "K2.5 加载", "接入视觉"],
    "text-to-native": ["先语言", "后视觉", "从头共训"],
    "three-stage": ["ViT ~1T", "联合 ~15T", "长上下文"],
    "caption-ce": ["图像编码", "token 预测", "逐 token 追责"],
    dep: ["ViT forward", "主干 F/B", "ViT 重算 B"],
    "bridge-native": ["K2 权重", "SigLIP 权重", "随机初始化"],
    "native-ntp": ["Random ViT", "NTP 梯度", "共同表示"],
    "code-render": ["代码", "渲染器", "视觉结果"],
    coordinates: ["绝对坐标", "同一框", "归一化坐标"],
    "native-boundary": ["真实图文", "程序化数据", "原生多模态"],
    "long-signal": ["远处证据", "跨段组合", "答案 loss"],
    "global-local": ["全局 O(n²)", "任务路由", "局部 O(nw)"],
    "cost-boundary": ["位置可外推", "Attention O(n²)", "KV O(n)"],
    "yarn-bands": ["高频保持", "中频混合", "低频缩放"],
    extrapolate: ["训练 32K", "YaRN 校准", "服务 128K"],
    "same-cost": ["位置扩展", "score n×n", "KV 条目 n"],
    "joint-midtrain": ["高质量短数据", "联合阶段", "长上下文"],
    "short-long-mix": ["短数据防遗忘", "混合训练", "长数据校准"],
    "video-cot": ["长视频", "跨帧/跨步", "Long-CoT"],
    "bridge-nope": ["YaRN", "结构成本仍在", "NoPE 架构"],
    "nope-split": ["69 层 KDA", "职责分工", "24 层 Gated MLA"],
    "kda-state": ["历史 token", "固定状态 S", "当前读取"],
    "gated-mla": ["latent cache", "门控展开", "全局 softmax"],
    "long-pipeline": ["清洗去重", "上采样", "跨段合成"],
    "effective-context": ["接口 1M", "有效利用", "检索/推理成功"],
    "mask-vs-state": ["Mask attention", "机制改变", "递归状态"],
    funnel: ["清洗去重", "质量过滤", "上采样"],
    "score-ensemble": ["规则/FastText", "嵌入去重", "LLM 评分"],
    sampling: ["原始频率", "价值权重", "Batch 概率"],
    vision: ["识别/OCR", "定位/GUI", "视觉推理"],
    rephrase: ["同一知识", "多种表达", "不变结构"],
    budget: ["unique tokens", "source 上限", "停止采样"],
    loss: ["整图对比", "caption CE", "细粒度结构"],
    "code-visual": ["代码", "渲染结果", "双向理解"],
    spans: ["证据 A/B/C", "跨段组合", "唯一答案"],
    boundary: ["已有积累", "阶段暂停", "后续重启"],
  };

  if (type === "rephrase") {
    text(18, 14, "SimpleQA accuracy / 100", "caption", "start");
    [
      ["原文 × 10", 23.76, "muted"],
      ["单版改写 × 10", 27.39, ""],
      ["10 版改写 × 1", 28.94, "active"],
    ].forEach(([label, value, tone], index) => {
      const y = 24 + index * 28;
      text(18, y + 14, label, "label", "start");
      rect(152, y, 300, 18, "track");
      rect(152, y, value * 9.7, 18, tone);
      text(470, y + 14, value.toFixed(2), "node", "start");
    });
    text(18, 109, "短事实问答正确率 · 满分 100", "caption", "start");
    text(542, 109, "+5.18 pp", "danger-label", "end");
  } else if (["sgd", "momentum"].includes(type)) {
    rect(16, 22, 366, 126, "plot");
    rect(410, 47, 134, 82, "plot zoom-plot");
    line(30, 135, 368, 135, "axis");
    line(30, 35, 30, 135, "axis");
    line(422, 116, 532, 116, "axis");
    line(422, 58, 422, 116, "axis");
    text(26, 16, "训练全程 · loss", "plot-title", "start");
    text(410, 40, "尾段放大", "plot-title", "start");
    const rawMacro = "M32 40 L52 70 L72 50 L92 84 L112 62 L132 98 L152 74 L172 108 L192 84 L212 114 L232 94 L252 119 L272 101 L292 123 L312 108 L332 126 L352 113 L368 121";
    const rawZoom = "M424 72 L438 101 L452 83 L466 108 L480 91 L494 111 L508 96 L520 108 L532 101";
    path(rawMacro, "raw");
    path(rawZoom, "raw");
    rect(292, 101, 76, 27, "zoom-window");
    line(368, 101, 410, 62, "zoom-link");
    line(368, 128, 410, 124, "zoom-link");
    if (type === "momentum") {
      path("M32 40 C68 52 91 72 112 79 S156 93 192 101 S244 111 292 116 S338 119 368 120", "smooth");
      path("M424 72 C450 86 472 96 494 101 S518 103 532 103", "smooth");
      line(190, 14, 214, 14, "legend-raw");
      text(220, 17, "SGD", "caption", "start");
      line(268, 14, 292, 14, "legend-smooth");
      text(298, 17, "Momentum", "caption", "start");
    }
    text(18, 164, type === "sgd" ? "宏观下降仍伴随高频震荡；放大后可见尾段尚未真正稳定" : "同一 loss 尺度下，Momentum 同时降低全程摆幅与尾段噪声", "caption", "start");
  } else if (type === "adam") {
    rect(16, 18, 330, 118, "plot");
    ellipse(176, 76, 132, 30, "rotate(-14 176 76)");
    ellipse(176, 76, 94, 20, "rotate(-14 176 76)");
    ellipse(176, 76, 50, 10, "rotate(-14 176 76)");
    path("M38 31 L82 113 L126 43 L169 104 L211 61 L252 90 L292 69 L326 79", "danger-curve");
    path("M38 31 C92 48 119 74 166 77 S252 74 326 76", "smooth");
    text(28, 31, "Momentum", "danger-label", "start");
    text(278, 62, "Adam", "smooth-label", "start");
    text(30, 131, "陡峭方向", "caption", "start");
    text(330, 131, "平缓方向", "caption", "end");
    rect(364, 18, 180, 118, "scale-card");
    text(376, 38, "同一相对梯度", "plot-title", "start");
    text(376, 62, "θ₁：g=100，√v≈100", "node", "start");
    text(376, 84, "θ₂：g=1，√v≈1", "node", "start");
    line(376, 96, 530, 96, "divider");
    text(376, 118, "两者更新量 ≈ 0.01", "smooth-label", "start");
    text(18, 153, "m̂ 决定方向；√v̂ 按每个参数自己的历史尺度校准步长", "caption", "start");
  } else if (type === "adamw") {
    boxFlow(["m / √v", "参数更新", "weight decay"], 1);
  } else if (type === "experts") {
    [["高频专家", 92], ["中频专家", 60], ["低频专家", 24]].forEach(([label, height], index) => {
      rect(78 + index * 155, 93 - height, 70, height, index === 2 ? "danger" : "active");
      text(113 + index * 155, 110, label);
    });
    text(525, 28, "梯度样本", "caption", "end");
  } else if (["precondition", "adamw-muon", "newton-schulz"].includes(type)) {
    const labels = type === "newton-schulz" ? ["Momentum M", "归一化 X₀", "NS × 5"] : ["逐元素缩放", "矩阵相关性", "正交更新"];
    boxFlow(labels, 2);
    text(280, 104, type === "newton-schulz" ? "奇异值被拉向同一尺度" : "坐标轴视角 → 全矩阵视角");
  } else if (["logit", "qk-clip", "gamma"].includes(type)) {
    line(28, 36, 532, 36, "threshold");
    text(530, 29, "τ = 100", "danger-label", "end");
    [62, 30, 88, 46, 104].forEach((height, index) => rect(58 + index * 96, 98 - height, 42, height, height > 70 ? "danger" : "muted"));
    text(280, 112, type === "logit" ? "逐 head 最大 attention logit" : type === "gamma" ? "q 与 k 各缩 √γ，内积缩 γ" : "越界 head 单独缩回阈值");
  } else if (["wsd", "cosine"].includes(type)) {
    line(25, 92, 535, 92, "axis");
    line(25, 18, 25, 92, "axis");
    path(type === "wsd" ? "M25 85 L52 26 L326 26 C390 28 442 54 480 72 L535 86" : "M25 86 L52 26 C180 24 360 38 535 88", "schedule");
    text(32, 108, type === "wsd" ? "warmup | stable | decay | anneal" : "1% warmup | cosine decay", "caption", "start");
  } else if (type === "inherit") {
    boxFlow(["K2 验证", "K2.5 继承", "视觉侧消融"], 1);
  } else if (["whole-head", "per-head"].includes(type)) {
    [78, 42, 20, 58].forEach((height, index) => rect(52 + index * 88, 91 - height, 54, height, type === "whole-head" && index === 0 ? "danger" : "muted"));
    text(402, 62, "→", "arrow");
    [46, 46, 46].forEach((height, index) => rect(440 + index * 34, 91 - height, 24, height, "active"));
    text(280, 110, type === "whole-head" ? "整层尺度被大 head 主导" : "切块后，各 head 独立正交");
  } else if (["scaling", "efficiency"].includes(type)) {
    boxFlow(type === "scaling" ? ["Batch / LR", "TPP", "Model shape"] : ["相同 loss", "更少 FLOPs", "≠ 推理 2.5×"], 1);
  } else if (type === "score-ensemble") {
    [[18, 10, "规则特征"], [18, 70, "FastText 分数"], [164, 10, "嵌入相似度"], [164, 70, "LLM 评分"]].forEach(([x, y, label]) => {
      rect(x, y, 120, 34, "muted");
      text(x + 60, y + 21, label, "node");
      line(x + 120, y + 17, 360, 58, "divider");
    });
    rect(360, 34, 170, 48, "active");
    text(445, 55, "组合质量分", "node");
    text(445, 71, "→ 动态采样", "caption");
  } else if (type === "fusion-bars") {
    const series = [[46, 61, 76, 54, 67, 36], [43, 56, 70, 50, 67, 34], [40, 52, 64, 48, 65, 34]];
    ["V知", "V推", "OCR", "T知", "T推", "代码"].forEach((label, index) => {
      series.forEach((values, group) => rect(34 + index * 84 + group * 18, 94 - values[index], 13, values[index], group === 0 ? "active" : group === 2 ? "danger" : "muted"));
      text(54 + index * 84, 110, label);
    });
  } else if (["dip-recover", "gradient-spike"].includes(type)) {
    line(24, 92, 536, 92, "axis");
    path(type === "dip-recover" ? "M24 34 L184 38 L216 84 C278 72 330 48 536 42" : "M24 70 L82 66 L116 20 L148 72 L212 62 L246 16 L280 68 L348 58 L380 24 L416 66 L536 55", "danger-curve");
    text(28, 110, type === "dip-recover" ? "新模态接入 → loss 跳升 → 恢复" : "SigLIP 初始化后梯度反复 spike", "caption", "start");
  } else if (type === "pixel-shuffle") {
    [[34, 28], [92, 28], [34, 70], [92, 70]].forEach(([x, y]) => rect(x, y, 38, 30, "muted"));
    text(178, 62, "→ 2×2 shuffle →", "arrow");
    rect(332, 26, 128, 70, "active");
    text(396, 62, "1 token group", "node");
  } else if (["position", "rope-base"].includes(type)) {
    path("M20 58 C52 16 84 100 116 58 S180 16 212 58 S276 100 308 58", "raw");
    path("M20 58 C92 12 164 104 236 58 S380 12 540 58", "smooth");
    text(280, 110, type === "rope-base" ? "更大频率基 → 低频旋转更慢" : "训练区间之外，相位需要校准");
  } else if (["complexity", "kv-growth", "same-cost"].includes(type)) {
    line(28, 92, 532, 92, "axis");
    line(28, 18, 28, 92, "axis");
    path("M30 90 C170 84 300 56 530 18", "danger-curve");
    path("M30 90 L530 38", "smooth");
    text(535, 22, "n²", "danger-label", "end");
    text(535, 44, "n", "caption", "end");
  } else if (type === "mix-4060") {
    rect(48, 32, 184, 42, "active"); rect(232, 32, 276, 42, "muted");
    text(140, 57, "40% 全局", "node"); text(370, 57, "60% 局部", "node");
  } else if (["course-131k", "anneal-128k", "course-262k", "course-1m"].includes(type)) {
    const labels = type === "course-131k" ? ["4K", "32K", "131K"] : type === "anneal-128k" ? ["4K·400B", "32K·60B", "128K"] : type === "course-262k" ? ["32K", "中间阶段", "262K"] : ["8K", "64K", "256K→1M"];
    boxFlow(labels, 2);
  } else {
    boxFlow(flowLabels[type] || ["问题", "设计", "结果"], 2);
  }
  return svg;
};

const buildAdamExample = (example) => {
  const wrap = element("section", "pte-adam-example");
  const heading = element("header", "pte-adam-example-heading");
  heading.append(element("strong", "", example.title), element("span", "", example.setup));
  const table = element("div", "pte-adam-example-table");
  table.setAttribute("role", "table");
  ["更新量", "Step 1", "Step 2", "Step 3"].forEach((label) => table.append(element("strong", "", label)));
  example.rows.forEach(([label, ...values]) => {
    table.append(element("strong", "", label));
    values.forEach((value) => table.append(element("span", "", value)));
  });
  wrap.append(heading, table, element("p", "pte-adam-example-note", example.note));
  return wrap;
};

const buildFormulaComparison = (comparison) => {
  const wrap = element("section", "pte-formula-comparison");
  wrap.append(element("p", "pte-formula-comparison-setup", comparison.setup));
  const columns = element("div", "pte-formula-comparison-columns");
  comparison.columns.forEach((column) => {
    const card = element("article", `pte-formula-card ${column.tone}`);
    card.append(element("h4", "", column.label));
    const formulas = element("div", "pte-formula-card-lines");
    column.lines.forEach((formula) => formulas.append(element("p", "", formula)));
    const values = element("ul", "pte-formula-card-values");
    column.values.forEach((value) => values.append(element("li", "", value)));
    card.append(formulas, values);
    columns.append(card);
  });
  wrap.append(columns);
  return wrap;
};

const buildEmptyDetail = () => {
  const side = element("aside", "pte-detail pte-detail-empty");
  side.append(element("span", "pte-kicker", "四代预训练路线"), element("h2", "", "每次改造，都在修复上一代暴露的瓶颈。"));
  const chain = element("div", "pte-empty-chain");
  ["过滤与长文", "稳定与增广", "早期融合", "原生多模态"].forEach((label, index) => {
    chain.append(element("span", index === 3 ? "active" : "", label));
    if (index < 3) chain.append(element("b", "", "→"));
  });
  side.append(chain, element("p", "", "选择左侧任一节点，查看它为什么出现、解决了什么，以及下一代如何继续推进。"), makeLegend());
  return side;
};

const buildTurkeyTimeline = (section) => {
  const svg = svgElement("svg", { class: "pte-turkey-timeline", viewBox: "0 0 660 210", role: "img", "aria-label": "火鸡科学家用历史规律预测未来的三帧时间线" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  const ellipse = (cx, cy, rx, ry, tone = "") => svg.append(svgElement("ellipse", { cx, cy, rx, ry, class: tone }));
  const circle = (cx, cy, r, tone = "") => svg.append(svgElement("circle", { cx, cy, r, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));

  section.timeline.forEach((frame, index) => {
    const x = 8 + index * 218;
    text(x + 100, 19, frame.stage, index === 2 ? "danger-label" : "stage-label");
    if (index < 2) text(x + 209, 22, "→", "timeline-arrow");
    rect(x, 31, 200, 166, index === 2 ? "frame danger" : "frame");
    path(`M${x + 27} 67 Q${x + 38} 49 ${x + 49} 67 L${x + 53} 81 L${x + 23} 81 Z`, "bell");
    circle(x + 38, 84, 3, "bell-clapper");
    text(x + 38, 101, "铃声", "label");
    [0, 1, 2].forEach((offset) => ellipse(x + 91 + offset * 12, 112, 18, 31, "turkey-tail"));
    ellipse(x + 103, 122, 22, 29, "turkey-body");
    circle(x + 103, 91, 11, "turkey-body");
    circle(x + 107, 88, 1.8, "turkey-eye");
    line(x + 96, 150, x + 93, 159, "turkey-leg");
    line(x + 110, 150, x + 114, 159, "turkey-leg");
    if (index === 2) {
      path(`M${x + 144} 77 L${x + 181} 63 L${x + 158} 106 Z`, "blade");
      line(x + 165, 68, x + 181, 55, "blade-handle");
    } else {
      rect(x + 145, 92, 34, 18, "food");
      ellipse(x + 162, 92, 17, 5, "food-top");
    }
    text(x + 100, 174, frame.event, index === 2 ? "danger-label" : "event-label");
    text(x + 100, 190, frame.note, "note-label");
  });
  return svg;
};

const buildMuonNormComparison = (comparison) => {
  const svg = svgElement("svg", { class: "pte-muon-norm-visual", viewBox: "0 0 520 200", role: "img", "aria-label": "Frobenius 范数与谱范数更新对照" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));

  [[8, comparison.leftTitle, "baseline"], [268, comparison.rightTitle, "spectral"]].forEach(([x, title, tone]) => {
    rect(x, 8, 244, 184, `norm-card ${tone}`);
    text(x + 122, 30, title, "card-title");
    rect(x + 54, 44, 136, 112, `norm-square ${tone}`);
    const cx = x + 122;
    const cy = 112;
    line(cx, cy, cx + (tone === "baseline" ? 58 : 58), cy, `${tone} axis-vector`);
    line(cx, cy, cx, cy - (tone === "baseline" ? 19 : 58), `${tone} axis-vector`);
    text(cx + 62, cy + 4, tone === "baseline" ? "0.949" : "1", "axis-value", "start");
    text(cx - 4, cy - (tone === "baseline" ? 25 : 64), tone === "baseline" ? "0.316" : "1", "axis-value", "end");
    text(x + 122, 178, tone === "baseline" ? "强方向分走更多预算" : "两个方向都走满", "card-note");
  });
  return svg;
};

const buildHeadLogitChart = (section, clipped = false) => {
  const svg = svgElement("svg", { class: `pte-head-logit-chart ${clipped ? "clipped" : "raw"}`, viewBox: "0 0 620 250", role: "img", "aria-label": clipped ? "QK-Clip 逐 head 裁剪结果" : "16 个 attention head 的最大 logit 分布" });
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 1, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const bottom = 202;
  const plotHeight = 158;
  const maxValue = 170;
  const thresholdY = bottom - section.threshold / maxValue * plotHeight;

  line(54, 34, 54, bottom, "axis");
  line(54, bottom, 602, bottom, "axis");
  line(54, thresholdY, 602, thresholdY, "threshold");
  text(598, thresholdY - 7, "τ=100", "threshold-label", "end");
  if (!clipped) {
    text(598, 20, section.reportLabel, "report-label", "end");
    text(575, thresholdY - 19, "⚠", "warning-label");
  }
  section.heads.forEach((value, index) => {
    const x = 65 + index * 33;
    const originalY = bottom - value / maxValue * plotHeight;
    const over = value > section.threshold;
    if (clipped && over) {
      rect(x, thresholdY, 19, bottom - thresholdY, "bar-fixed");
      rect(x, originalY, 19, thresholdY - originalY, "bar-before");
      line(x + 9.5, originalY - 7, x + 9.5, thresholdY - 9, "clip-arrow");
      path(`M${x + 4.5} ${thresholdY - 13} L${x + 14.5} ${thresholdY - 13} L${x + 9.5} ${thresholdY - 5} Z`, "clip-arrow-head");
    } else {
      rect(x, originalY, 19, bottom - originalY, over ? "bar-danger" : "bar-neutral");
    }
    text(x + 9.5, 220, String(index + 1), "head-label");
  });
  text(328, 242, "各 head", "axis-label");
  svg.append(svgElement("text", { x: 16, y: 120, class: "axis-label", "text-anchor": "middle", transform: "rotate(-90 16 120)" }, "最大 attention logit"));
  return svg;
};

const buildLearningRateChart = () => {
  const svg = svgElement("svg", { class: "pte-learning-rate-chart", viewBox: "0 0 620 240", role: "img", "aria-label": "K2 学习率分段曲线" });
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));

  line(52, 28, 52, 194, "axis");
  line(52, 194, 604, 194, "axis");
  path("M52 188 L91 54", "lr-warmup");
  path("M91 54 L373 54", "lr-stable");
  path("M373 54 C430 58 500 105 550 160", "lr-decay");
  path("M550 160 L600 184", "lr-anneal");
  line(550, 34, 550, 194, "anneal-divider");
  text(73, 42, "warmup", "warmup-label");
  text(232, 43, "stable @2e−4", "stable-label");
  text(458, 88, "cosine decay", "decay-label");
  text(579, 147, "anneal", "anneal-label");
  text(52, 214, "0", "tick-label");
  text(373, 214, "10T", "tick-label");
  text(550, 214, "15.5T", "tick-label");
  text(600, 214, "+460B", "tick-label", "end");
  text(330, 235, "主训练 token（0→15.5T）｜后续退火", "axis-label");
  svg.append(svgElement("text", { x: 16, y: 112, class: "axis-label", "text-anchor": "middle", transform: "rotate(-90 16 112)" }, "学习率"));
  return svg;
};

const buildWholeHeadProcess = (section) => {
  const svg = svgElement("svg", { class: "pte-whole-head-process", viewBox: "0 0 660 430", role: "img", "aria-label": "整层 Muon 拼接、归一化与正交化过程" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 2, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "start") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  const states = [
    { y: 18, widths: [92, 44, 36, 54], opacity: [1, 0.54, 0.42, 0.58] },
    { y: 158, widths: [76, 42, 34, 48], opacity: [0.68, 0.16, 0.1, 0.2] },
    { y: 298, widths: [68, 40, 34, 44], opacity: [0.56, 0.08, 0.04, 0.12] },
  ];
  states.forEach((state, index) => {
    const frame = section.frames[index];
    text(18, state.y + 16, `帧 ${index + 1} · ${frame.label}`, "frame-title");
    text(18, state.y + 38, frame.formula, "formula-label");
    let x = 326;
    state.widths.forEach((width, blockIndex) => {
      rect(x, state.y + 13, width, 54, blockIndex === 0 ? "head-strong" : "head-weak");
      svg.lastChild.style.opacity = String(state.opacity[blockIndex]);
      text(x + width / 2, state.y + 87, `h${blockIndex + 1}`, "head-label", "middle");
      x += width + 12;
    });
    text(18, state.y + 112, frame.note, index === 2 ? "warning-copy" : "note-copy");
    if (index < states.length - 1) {
      line(305, state.y + 118, 305, state.y + 133, "frame-arrow");
      path(`M299 ${state.y + 128} L311 ${state.y + 128} L305 ${state.y + 136} Z`, "frame-arrow-head");
    }
  });
  return svg;
};

const buildPerHeadResult = () => {
  const svg = svgElement("svg", { class: "pte-per-head-result", viewBox: "0 0 560 260", role: "img", "aria-label": "整层 Muon 与 Per-Head Muon 更新幅度对比" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const text = (x, y, value, tone = "", anchor = "start") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  text(20, 26, "整层 Muon 结果", "row-title");
  [0.9, 0.55, 0.28, 0.12, 0.06].forEach((opacity, index) => {
    rect(24 + index * 100, 42, 72, 58, "whole-block");
    svg.lastChild.style.opacity = String(opacity);
  });
  text(20, 124, "小 head 更新被压制", "row-caption");
  line(280, 132, 280, 156, "change-arrow");
  text(294, 149, "Per-Head Muon", "change-label");
  text(20, 182, "Per-Head Muon 结果", "row-title solution");
  [0, 1, 2, 3, 4].forEach((index) => rect(24 + index * 100, 196, 72, 46, "head-block"));
  text(540, 254, "每个 head 等权更新", "row-caption solution", "end");
  return svg;
};

const buildRetuneScheduleChart = () => {
  const svg = svgElement("svg", { class: "pte-retune-schedule-chart", viewBox: "0 0 620 270", role: "img", "aria-label": "WSD 与 cosine 学习率日程对比" });
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  line(54, 24, 54, 216, "axis");
  line(54, 216, 600, 216, "axis");
  path("M54 208 L76 48 L404 48 L456 70 L506 118 L552 174 L596 205", "wsd-line");
  path("M54 208 L76 48 C208 50 416 92 596 207", "cosine-line");
  line(424, 88, 424, 124, "loss-gap");
  path("M419 94 L429 94 L424 87 Z M419 118 L429 118 L424 125 Z", "loss-gap-head");
  text(436, 108, "cosine final loss 更低 ★", "gap-label", "start");
  text(590, 62, "WSD", "wsd-label", "end");
  text(590, 196, "cosine", "cosine-label", "end");
  text(78, 238, "1% warmup", "axis-label", "start");
  text(596, 238, "训练进度 100%", "axis-label", "end");
  svg.append(svgElement("text", { x: 18, y: 122, class: "axis-label", "text-anchor": "middle", transform: "rotate(-90 18 122)" }, "学习率"));
  return svg;
};

const buildWsdComparisonChart = () => {
  const svg = svgElement("svg", { class: "pte-wsd-comparison-chart", viewBox: "0 0 700 300", role: "img", "aria-label": "cosine 与 WSD 学习率日程叠加对比" });
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  line(56, 28, 56, 236, "axis");
  line(56, 236, 672, 236, "axis");
  path("M56 228 L68 50 C200 52 390 90 672 228", "cosine-line");
  path("M56 228 L68 50 L456 50 C520 55 574 104 632 192 L672 226", "wsd-base");
  path("M56 228 L68 50", "warmup");
  path("M68 50 L456 50", "stable");
  path("M456 50 C520 55 574 104 632 192", "decay");
  path("M632 192 L672 226", "anneal");
  line(456, 50, 456, 236, "comparison-marker");
  text(450, 268, "65%", "tick-label");
  text(468, 114, "cosine 此时已明显衰减", "warning-label", "start");
  text(80, 40, "warmup", "warmup-label");
  text(258, 40, "stable", "stable-label");
  text(548, 100, "decay", "decay-label");
  text(650, 184, "anneal", "anneal-label");
  text(672, 268, "训练进度 100%", "axis-label", "end");
  svg.append(svgElement("text", { x: 18, y: 134, class: "axis-label", "text-anchor": "middle", transform: "rotate(-90 18 134)" }, "学习率"));
  return svg;
};

const buildScheduleShapeChart = () => {
  const svg = svgElement("svg", { class: "pte-schedule-shape-chart", viewBox: "0 0 700 310", role: "img", "aria-label": "WSD 与 cosine 学习率日程形状对比" });
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  line(56, 28, 56, 238, "axis");
  line(56, 238, 672, 238, "axis");
  [68, 456, 610].forEach((x) => line(x, 38, x, 238, "phase-divider"));
  path("M56 230 L68 52", "wsd-warmup");
  path("M68 52 L456 52", "wsd-stable");
  path("M456 52 C516 56 566 102 610 184", "wsd-decay");
  path("M610 184 L672 228", "wsd-anneal");
  path("M56 230 L62 52 C212 54 430 94 672 230", "cosine-line");
  text(72, 42, "warmup", "wsd-label", "start");
  text(258, 42, "stable", "wsd-label");
  text(536, 98, "decay", "wsd-label");
  text(646, 178, "anneal", "wsd-label");
  text(84, 74, "1% warmup", "cosine-label", "start");
  text(420, 146, "cosine decay", "cosine-label");
  text(56, 264, "0%", "tick-label");
  text(672, 264, "100%", "tick-label");
  text(364, 294, "训练进度", "axis-label");
  svg.append(svgElement("text", { x: 18, y: 136, class: "axis-label", "text-anchor": "middle", transform: "rotate(-90 18 136)" }, "学习率"));
  return svg;
};

const buildCheckpointReuse = () => {
  const svg = svgElement("svg", { class: "pte-checkpoint-reuse", viewBox: "0 0 620 220", role: "img", "aria-label": "WSD stable 检查点复用示意" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  line(62, 62, 558, 62, "stable-line");
  text(62, 30, "stable", "stable-label", "start");
  [[150, "ckpt@6T"], [310, "ckpt@8T"], [470, "ckpt@10T"]].forEach(([x, label]) => {
    line(x, 50, x, 78, "checkpoint-tick");
    text(x, 94, label, "checkpoint-label");
    line(x, 78, x, 146, "branch-line");
    rect(x - 48, 146, 96, 40, "decay-box");
    text(x, 171, "Decay", "decay-label");
  });
  text(310, 210, "任意 stable 检查点都能接一段独立衰减", "caption");
  return svg;
};

const buildScalingLawChart = () => {
  const svg = svgElement("svg", { class: "pte-scaling-law-chart", viewBox: "0 0 700 340", role: "img", "aria-label": "WSD 与 cosine 独立调优后的 scaling law 曲线" });
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const circle = (cx, cy, tone = "") => svg.append(svgElement("circle", { cx, cy, r: 5, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  line(66, 34, 66, 272, "axis");
  line(66, 272, 664, 272, "axis");
  path("M92 80 C230 112 420 158 626 220", "wsd-line");
  path("M92 106 C230 138 420 184 626 246", "cosine-line");
  [[92, 80], [220, 110], [352, 143], [490, 181], [626, 220]].forEach(([x, y]) => circle(x, y, "wsd-dot"));
  [[92, 106], [220, 136], [352, 169], [490, 207], [626, 246]].forEach(([x, y]) => circle(x, y, "cosine-dot"));
  line(378, 158, 378, 184, "loss-gap");
  path("M373 164 L383 164 L378 157 Z M373 178 L383 178 L378 185 Z", "loss-gap-head");
  text(390, 174, "Δ ≈ 5–8%", "gap-label", "start");
  text(632, 211, "WSD（独立调优）", "wsd-label", "end");
  text(632, 260, "cosine（独立调优）", "cosine-label", "end");
  text(66, 300, "10²⁰", "tick-label");
  text(664, 300, "10²¹", "tick-label");
  text(365, 328, "训练 FLOPs（log）", "axis-label");
  svg.append(svgElement("text", { x: 20, y: 154, class: "axis-label", "text-anchor": "middle", transform: "rotate(-90 20 154)" }, "Validation Loss（log，向下更低）"));
  return svg;
};

const buildFeatureSpaceMismatch = () => {
  const svg = svgElement("svg", { class: "pte-feature-space-chart", viewBox: "0 0 920 250", role: "img", "aria-label": "SigLIP 与 NTP 所需特征空间不匹配" });
  const circle = (cx, cy, r, tone = "") => svg.append(svgElement("circle", { cx, cy, r, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  text(200, 30, "SigLIP 特征空间", "column-title");
  text(460, 30, "初始化时的状态", "column-title");
  text(720, 30, "NTP 需要的特征空间", "column-title");
  circle(200, 126, 64, "siglip-space");
  circle(720, 126, 64, "ntp-space");
  text(200, 121, "整图语义", "space-label");
  text(200, 143, "向量", "space-label");
  text(720, 121, "局部细节", "space-label");
  text(720, 143, "向量", "space-label");
  line(268, 126, 652, 126, "gap-arrow");
  path("M268 126 L282 117 L282 135 Z M652 126 L638 117 L638 135 Z", "gap-arrow-head");
  text(460, 108, "特征空间偏差", "warning-label");
  text(200, 222, "对比学习：猫 / 狗 / 室内 / 室外", "caption");
  text(720, 222, "token 预测：OCR / 表格 / 坐标 / 颜色", "caption");
  return svg;
};

const buildK25VisionTimeline = () => {
  const svg = svgElement("svg", { class: "pte-k25-vision-timeline", viewBox: "0 0 420 740", role: "img", "aria-label": "K2.5 视觉预训练三阶段流程" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const circle = (cx, cy, r, tone = "") => svg.append(svgElement("circle", { cx, cy, r, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  const stages = [
    { y: 20, height: 140, tone: "siglip", title: "阶段 0 · SigLIP 预训练", lines: ["整图对比学习", "特征空间：整图语义"] },
    { y: 220, height: 170, tone: "caption", title: "阶段 1 · ViT 单独训练", lines: ["caption CE · 约 1T token", "[v₁…v₁₆] → 一只橘猫坐在窗台上", "局部细节逐渐进入特征"] },
    { y: 580, height: 140, tone: "joint", title: "阶段 2 · 联合训练", lines: ["从第 1 step 起参与 NTP", "早期视觉 10% > 晚期 50%", "预测每个文字 token"] },
  ];
  stages.forEach((stage) => {
    rect(30, stage.y, 360, stage.height, stage.tone);
    text(210, stage.y + 38, stage.title, "stage-title");
    stage.lines.forEach((value, index) => text(210, stage.y + 78 + index * 30, value, "stage-copy"));
  });
  line(210, 160, 210, 216, "handoff");
  path("M200 204 L210 216 L220 204 Z", "handoff-head");
  text(228, 194, "继承权重", "handoff-label", "start");
  line(60, 536, 360, 536, "gradient-axis");
  path("M60 536 L84 412 L112 530 L142 438 L176 532 L214 466 L254 520 L296 510 L332 516 L360 514", "spike-line");
  [[84, 412], [142, 438], [214, 466]].forEach(([cx, cy]) => circle(cx, cy, 6, "spike-dot"));
  [[296, 510], [332, 516], [360, 514]].forEach(([cx, cy]) => circle(cx, cy, 5, "stable-dot"));
  text(92, 404, "梯度尖峰", "warning-label", "start");
  text(360, 496, "逐渐平稳", "stable-label", "end");
  text(210, 548, "阶段 1：caption CE 训练过程", "caption");
  line(210, 552, 210, 576, "handoff");
  path("M200 564 L210 576 L220 564 Z", "handoff-head");
  text(228, 574, "权重移交", "handoff-label", "start");
  return svg;
};

const buildK3VisionTimeline = () => {
  const svg = svgElement("svg", { class: "pte-k3-vision-timeline", viewBox: "0 0 900 250", role: "img", "aria-label": "K3 视觉编码器随机初始化并直接联合训练" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  rect(28, 24, 224, 202, "random");
  text(140, 60, "阶段 0", "stage-title");
  text(140, 94, "随机初始化", "stage-title");
  text(140, 132, "MoonViT-V2", "stage-copy");
  text(140, 164, "无预训练权重", "stage-copy");
  text(140, 196, "特征空间：空白", "stage-copy");
  line(264, 128, 330, 128, "handoff");
  path("M318 118 L330 128 L318 138 Z", "handoff-head");
  text(297, 104, "第 1 step", "handoff-label");
  rect(342, 24, 530, 202, "joint");
  text(607, 66, "阶段 1 · 联合训练 NTP + MTP", "stage-title");
  text(607, 112, "NTP：预测下一个 token", "stage-copy");
  text(607, 150, "MTP：同时预测接下来多个 token", "stage-copy");
  text(607, 194, "[表格图] 第二行第三列 → 42 . 7 ， 单 位", "example-copy");
  return svg;
};

const buildMtpSupervision = () => {
  const svg = svgElement("svg", { class: "pte-mtp-supervision", viewBox: "0 0 620 260", role: "img", "aria-label": "NTP 单目标与 MTP 多目标监督对比" });
  const rect = (x, y, width, height, tone = "") => svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: tone }));
  const line = (x1, y1, x2, y2, tone = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: tone }));
  const path = (d, tone = "") => svg.append(svgElement("path", { d, class: tone }));
  const text = (x, y, value, tone = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: tone, "text-anchor": anchor }, value));
  const tokens = ["42", ".", "7", "，", "单", "位"];
  const drawTokenRow = (y, activeAll) => tokens.forEach((token, index) => {
    rect(104 + index * 72, y, 54, 44, activeAll || index === 0 ? "next-token" : "future-token");
    text(131 + index * 72, y + 28, token, "token-label");
  });
  text(18, 78, "NTP", "row-title", "start");
  drawTokenRow(56, false);
  line(131, 52, 131, 28, "ntp-arrow");
  path("M123 38 L131 26 L139 38 Z", "ntp-arrow-head");
  text(596, 34, "1 个目标", "ntp-label", "end");
  text(18, 188, "MTP", "row-title solution", "start");
  drawTokenRow(166, true);
  tokens.forEach((_, index) => {
    const x = 131 + index * 72;
    line(x, 242, x, 214, "mtp-arrow");
    path(`M${x - 8} 224 L${x} 212 L${x + 8} 224 Z`, "mtp-arrow-head");
  });
  text(596, 244, "N 个目标", "mtp-label", "end");
  return svg;
};

const buildVisionGradientImage = () => {
  const image = element("img", "pte-gradient-comparison-image");
  image.src = new URL("./assets/k3-figure6-gradient-chart.png", import.meta.url).href;
  image.alt = "SigLIP 初始化与随机初始化的视觉编码器梯度范数对比";
  return image;
};

const buildMuonSpecialSection = (section, index, selected) => {
  const item = element("section", `pte-optimizer-section pte-muon-special ${section.layout} ${selected ? "selected" : ""}`);
  const heading = element("header", "pte-optimizer-section-heading");
  heading.append(element("span", "", section.number || String(index + 1).padStart(2, "0")), element("h3", "", section.title));
  item.append(heading);

  if (section.layout === "adamw-risk") {
    const columns = element("div", "pte-adamw-risk-grid");
    const story = element("article", "pte-turkey-panel");
    story.append(element("h4", "", "火鸡科学家"), buildTurkeyTimeline(section), element("p", "pte-turkey-caption", section.caption));
    const mechanism = element("article", "pte-adamw-mechanism");
    mechanism.append(element("h4", "", "AdamW 在做什么"));
    section.mechanism.forEach((row) => {
      const line = element("section", `pte-mechanism-row ${row.warning ? "warning" : ""}`);
      line.append(element("span", "pte-mechanism-tag", row.tag));
      const content = element("div", "pte-mechanism-content");
      content.append(element("code", "", row.formula), element("p", "", row.note));
      line.append(content);
      mechanism.append(line);
    });
    columns.append(story, mechanism);
    item.append(columns);
  } else if (section.layout === "muon-answer") {
    const question = element("header", "pte-muon-question");
    question.append(element("p", "", section.question), element("span", "", section.questionCaption));
    const columns = element("div", "pte-muon-answer-grid");
    const derivation = element("article", "pte-muon-derivation");
    derivation.append(element("h4", "", "谱范数约束下的最速下降"), element("p", "", section.problem));
    const answer = element("div", "pte-muon-answer-formula");
    answer.append(element("strong", "", "答案"), element("code", "", section.answer));
    derivation.append(answer, element("p", "pte-muon-intuition", section.intuition));
    const example = element("article", "pte-muon-example");
    example.append(element("h4", "", "2×2 具体例子"), element("p", "pte-muon-example-setup", section.comparison.setup), buildMuonNormComparison(section.comparison));
    const formulas = element("div", "pte-muon-example-formulas");
    formulas.append(element("code", "", section.comparison.leftFormula), element("code", "", section.comparison.rightFormula));
    example.append(formulas, element("p", "pte-muon-comparison-caption", section.comparison.caption), element("p", "pte-muon-caveat", section.comparison.caveat));
    columns.append(derivation, example);
    const boundary = element("footer", "pte-muon-boundary");
    boundary.append(element("strong", "", "诚实的边界"), element("span", "", section.boundary));
    item.append(question, columns, boundary);
  } else if (section.layout === "logit-problem") {
    item.append(element("p", "pte-muon-section-summary", section.summary));
    const columns = element("div", "pte-logit-problem-grid");
    const figure = element("figure", "pte-head-chart-panel");
    figure.append(buildHeadLogitChart(section), element("figcaption", "", section.caption));
    const alternatives = element("article", "pte-logit-alternatives");
    alternatives.append(element("h4", "", "两个现有方案都有缺陷"));
    section.alternatives.forEach((option) => {
      const row = element("section", "pte-alternative-row");
      row.append(element("strong", "", option.name), element("code", "", option.formula), element("p", "", option.detail), element("b", "", option.issue));
      alternatives.append(row);
    });
    alternatives.append(element("p", "pte-logit-conclusion", section.conclusion));
    columns.append(figure, alternatives);
    item.append(columns);
  } else if (section.layout === "qk-clip-detail") {
    item.append(element("p", "pte-muon-section-summary", section.summary));
    const columns = element("div", "pte-qk-clip-grid");
    const steps = element("article", "pte-qk-steps");
    steps.append(element("h4", "", "每个优化步骤结束后执行一次"));
    section.steps.forEach((step) => {
      const row = element("section", `pte-qk-step ${step.highlight ? "highlight" : ""}`);
      row.append(element("strong", "", step.label), element("p", "", step.text));
      steps.append(row);
    });
    const figure = element("figure", "pte-head-chart-panel");
    figure.append(element("h4", "", "超界 head 被单独拉回，其余不受影响"), buildHeadLogitChart(section, true), element("figcaption", "", section.caption));
    columns.append(steps, figure);
    const reasons = element("section", "pte-qk-reasons");
    reasons.append(element("h4", "", "设计背后的两条理由"));
    const reasonGrid = element("div", "pte-qk-reason-grid");
    section.reasons.forEach((reason) => {
      const card = element("article", "pte-qk-reason-card");
      card.append(element("strong", "", reason.title), element("code", "", reason.formula), element("p", "", reason.copy));
      reasonGrid.append(card);
    });
    reasons.append(reasonGrid);
    item.append(columns, reasons);
  } else if (section.layout === "training-results") {
    item.append(element("p", "pte-muon-section-summary", section.summary));
    const columns = element("div", "pte-training-results-grid");
    const figure = element("figure", "pte-lr-panel");
    figure.append(element("h4", "", "K2 学习率配方"), buildLearningRateChart());
    const facts = element("article", "pte-training-facts");
    facts.append(element("h4", "", "关键数字"));
    section.facts.forEach((fact) => {
      const row = element("section", "pte-training-fact");
      row.append(element("strong", "", fact.value), element("p", "", fact.note));
      facts.append(row);
    });
    columns.append(figure, facts);
    item.append(columns);
  } else if (section.layout === "per-head-risk") {
    const columns = element("div", "pte-per-head-risk-grid");
    const process = element("figure", "pte-per-head-process-panel");
    process.append(element("h4", "", "整层正交化在做什么"), buildWholeHeadProcess(section));
    const diagnosis = element("article", "pte-per-head-diagnosis");
    diagnosis.append(element("h4", "", "这不是 bug，是归一化的必然结果"), element("p", "", section.diagnosis[0]), element("p", "warning", section.diagnosis[1]));
    columns.append(process, diagnosis);
    item.append(columns);
  } else if (section.layout === "per-head-solution") {
    const columns = element("div", "pte-per-head-solution-grid");
    const methods = element("article", "pte-per-head-methods");
    methods.append(element("h4", "", "一个操作顺序的改变"));
    const methodColumns = element("div", "pte-method-columns");
    [["整层 Muon", section.wholeSteps, "whole"], ["Per-Head Muon", section.headSteps, "head"]].forEach(([title, steps, tone]) => {
      const method = element("section", `pte-method ${tone}`);
      method.append(element("strong", "", title), element("p", "", steps.join(" → ")), element("small", "", tone === "whole" ? "小 head 信号消失" : "每个 head 满幅归一化"));
      methodColumns.append(method);
    });
    methods.append(methodColumns);
    const result = element("figure", "pte-per-head-result-panel");
    result.append(element("h4", "", "切开后，每个 head 都能满幅更新"), buildPerHeadResult());
    const formulas = element("div", "pte-per-head-formulas");
    section.formulas.forEach((formula) => formulas.append(element("code", "", formula)));
    result.append(formulas);
    columns.append(methods, result);
    item.append(columns);
  } else if (section.layout === "per-head-retune") {
    const columns = element("div", "pte-per-head-retune-grid");
    const schedule = element("figure", "pte-retune-schedule-panel");
    schedule.append(element("h4", "", "换了优化器，学习率日程也不再最优"), buildRetuneScheduleChart(), element("figcaption", "", "K3 Figure 7：分别独立调优后，cosine final loss 持续低于 WSD。"), element("code", "pte-retune-formula", section.formula));
    const knobs = element("article", "pte-retune-knobs");
    knobs.append(element("h4", "", "四个旋钮必须同时重搜"));
    const grid = element("div", "pte-knob-grid");
    section.knobs.forEach((knob, index) => grid.append(element("span", index === 1 ? "active" : "", knob)));
    knobs.append(grid, element("p", "pte-tpp-note", "TPP = 训练 token 总数 / 参数总数，衡量每个参数平均消化多少数据。"), element("p", "pte-retune-result", section.result));
    columns.append(schedule, knobs);
    item.append(columns);
  } else if (section.layout === "efficiency-note") {
    const card = element("article", "pte-efficiency-note");
    const copy = element("div", "pte-efficiency-copy");
    copy.append(element("h4", "", "2.5× scaling efficiency 的准确含义"), element("p", "correct", `✓　${section.correct}`), element("p", "incorrect", `✗　${section.incorrect}`), element("small", "", "训练效率 ≠ 推理速度，不要混用。"));
    card.append(copy, element("code", "", section.formula));
    item.append(card);
  }

  item.append(element("p", "pte-section-source", section.source));
  return item;
};

const buildSequenceDetail = ({ chapters, stateKey, labelByTab, scrollToSelected = false }, state, persist, rerender) => {
  const activeTab = state[stateKey];
  const chapter = chapters[activeTab];
  const side = element("aside", `pte-optimizer-detail ${stateKey}`);
  const tablist = element("div", "pte-optimizer-tabs");
  tablist.setAttribute("role", "tablist");
  tablist.style.setProperty("--pte-tab-count", String(Object.keys(chapters).length));
  Object.entries(chapters).forEach(([id, item]) => {
    const button = element("button", activeTab === id ? "active" : "", item.tab);
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(activeTab === id));
    button.addEventListener("click", () => {
      state[stateKey] = id;
      state.selectedLabel = labelByTab[id];
      persist();
      rerender();
    });
    tablist.append(button);
  });

  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const arc = element("div", `pte-optimizer-arc ${activeTab === "momentum" ? "adamw-path" : ""}`);
  const stages = chapter.stages || ["SGD", "Momentum", "Adam", "AdamW", "MuonClip", "Per-Head Muon"];
  const activeUntil = chapter.highlightStages === false
    ? -1
    : chapter.stages ? chapter.stages.length - 1 : { momentum: 3, muonclip: 4, "per-head": 5 }[activeTab];
  stages.forEach((label, index) => {
    arc.append(element("span", index === activeUntil ? "current" : index < activeUntil ? "passed" : "", label));
    if (index < stages.length - 1) arc.append(element("b", index < activeUntil ? "passed" : "", "→"));
  });

  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", chapter.eyebrow), element("h2", "", chapter.title), element("p", "", chapter.lead), arc);
  if (!chapter.hideHeader) scroll.append(header);
  chapter.sections.forEach((section, index) => {
    if (section.layout) {
      scroll.append(buildMuonSpecialSection(section, index, section.labelId === state.selectedLabel));
      return;
    }
    const item = element("section", `pte-optimizer-section ${section.labelId === state.selectedLabel ? "selected" : ""}`);
    if (section.labelId) item.dataset.label = section.labelId;
    const heading = element("header", "pte-optimizer-section-heading");
    heading.append(element("span", "", section.number || String(index + 1).padStart(2, "0")), element("h3", "", section.title));
    item.append(heading, element("p", "pte-optimizer-copy", section.copy));
    const explainerClass = ["sgd", "momentum"].includes(section.visual) ? "curve-comparison" : section.example ? "adam-comparison" : section.formulaComparison ? "formula-comparison-only" : "";
    const explainer = element("div", `pte-optimizer-explainer ${explainerClass}`);
    if (section.visual) explainer.append(buildOptimizerVisual(section.visual));
    if (section.example) explainer.append(buildAdamExample(section.example));
    if (section.formulaComparison) explainer.append(buildFormulaComparison(section.formulaComparison));
    if (section.formula?.length) {
      const formulas = element("div", "pte-optimizer-formulas");
      section.formula.forEach((formula) => formulas.append(element("p", "", formula)));
      explainer.append(formulas);
    }
    if (explainer.childElementCount) item.append(explainer);
    if (section.points?.length) {
      const points = element("ul", "pte-sequence-points");
      section.points.forEach((point) => points.append(element("li", "", point)));
      item.append(points);
    }
    if (section.source) item.append(element("p", "pte-section-source", section.source));
    if (section.jumpTo && stateKey === "dataTab") {
      const jump = element("button", "pte-sequence-jump", "查看知识 rephrasing →");
      jump.type = "button";
      jump.addEventListener("click", () => {
        state.selectedLabel = section.jumpTo;
        state.dataTab = DATA_TAB_BY_LABEL[section.jumpTo];
        persist();
        rerender();
      });
      item.append(jump);
    }
    scroll.append(item);
  });
  scroll.append(element("p", "pte-optimizer-source", chapter.source));
  side.append(tablist, scroll);
  if (scrollToSelected && state.selectedLabel) requestAnimationFrame(() => {
    const target = scroll.querySelector(`[data-label="${state.selectedLabel}"]`);
    const targetIndex = chapter.sections.findIndex((section) => section.labelId === state.selectedLabel);
    if (target) scroll.scrollTop = targetIndex <= 0 ? 0 : Math.max(0, target.offsetTop - scroll.offsetTop - 6);
  });
  return side;
};

const buildDataTabs = (state, persist, rerender) => {
  const tablist = element("div", "pte-optimizer-tabs");
  tablist.setAttribute("role", "tablist");
  tablist.style.setProperty("--pte-tab-count", String(DATA_LINEAGES.length));
  DATA_LINEAGES.forEach((lineage) => {
    const button = element("button", state.dataTab === lineage.id ? "active" : "", lineage.tab);
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(state.dataTab === lineage.id));
    button.addEventListener("click", () => {
      state.dataTab = lineage.id;
      state.selectedLabel = DATA_LABEL_BY_TAB[lineage.id];
      persist();
      rerender();
    });
    tablist.append(button);
  });
  return tablist;
};

const buildSamplingChart = () => {
  const svg = svgElement("svg", { class: "pte-k15-sampling-chart", viewBox: "0 0 760 250", role: "img", "aria-label": "质量分连续映射为采样率" });
  const line = (x1, y1, x2, y2, cls = "") => svg.append(svgElement("line", { x1, y1, x2, y2, class: cls }));
  const path = (d, cls = "") => svg.append(svgElement("path", { d, class: cls }));
  const circle = (cx, cy, r, cls = "") => svg.append(svgElement("circle", { cx, cy, r, class: cls }));
  const text = (x, y, value, cls = "", anchor = "middle") => svg.append(svgElement("text", { x, y, class: cls, "text-anchor": anchor }, value));
  line(76, 210, 700, 210, "axis");
  line(76, 28, 76, 210, "axis");
  line(76, 108, 700, 108, "reference");
  path("M76 194 C190 190 260 170 342 146 S492 86 560 54 S646 36 700 32", "curve");
  circle(264, 175, 5, "sample-point");
  line(264, 175, 264, 210, "guide");
  text(264, 232, "质量分 0.3", "tick");
  text(264, 163, "采样率 = 0.3 → 约 30% 进 batch", "point-label", "start");
  text(92, 202, "低质量：低频贡献梯度，保留覆盖", "low-label", "start");
  text(692, 48, "高质量：重复采样，增强权重 (>1)", "high-label", "end");
  text(66, 112, "1.0", "tick", "end");
  text(66, 204, "0", "tick", "end");
  text(388, 248, "质量分（0 → 1）", "axis-label");
  svg.append(svgElement("text", { x: 18, y: 122, class: "axis-label", "text-anchor": "middle", transform: "rotate(-90 18 122)" }, "采样率"));
  return svg;
};

const buildSamplingStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 采样方式"), element("h2", "", "K1.5 上下采样：质量分连续映射为采样概率"), element("p", "", "不做硬切割，让高价值数据高频出现，让低质量数据低频但不消失。"));
  const why = element("section", "pte-k15-sampling-why");
  why.append(element("h3", "", "不是“保留 or 丢弃”，是“高频 or 低频”"));
  const compare = element("div", "pte-k15-sampling-compare");
  const hard = element("article", "hard");
  hard.append(element("h4", "", "硬切割的问题"), element("p", "", "设定阈值，低于阈值直接丢弃"), element("p", "", "稀有语种、稀有领域文档被误杀"), element("p", "", "覆盖度下降"));
  const soft = element("article", "soft");
  soft.append(element("h4", "", "连续映射的做法"), element("p", "", "质量分 → 采样概率（连续函数）"), element("p", "", "高质量：概率 > 1，同一文档多次抽到"), element("p", "", "低质量：概率 < 1，低频但不清零"), element("p", "", "低质量数据仍保留覆盖度"));
  compare.append(hard, soft);
  why.append(compare);
  const plot = element("figure", "pte-k15-sampling-plot");
  plot.append(element("h3", "", "连续映射：采样率随质量分平滑变化"), buildSamplingChart());
  const example = element("div", "pte-k15-sampling-example");
  ["60 篇高质量 × 2.0 = 120 次", "40 篇低质量 × 0.5 = 20 次", "合计 batch 贡献：140 次", "高质量贡献占比从 60% 提升到约 86%"].forEach((value, index) => example.append(element("span", index > 1 ? "emphasis" : "", value)));
  plot.append(example);
  const lower = element("section", "pte-k15-sampling-lower");
  const code = element("article", "pte-k15-code");
  code.append(element("h3", "", "代码额外按语言稀缺度加权"), element("p", "", "32 种编程语言在互联网上分布极不均匀。Python / JS 天然高频，Haskell / Cobol 天然稀缺。"));
  const rows = element("div", "pte-k15-language-rows");
  [["常见语言", "Python、JS", "采样率低（已足够）", "common"], ["稀有语言", "Haskell、Cobol", "采样率高（补偿稀缺）", "rare"]].forEach(([kind, names, note, tone]) => {
    const row = element("div", `language-row ${tone}`);
    row.append(element("strong", "", kind), element("span", "", names), element("span", "", note));
    rows.append(row);
  });
  code.append(rows, element("p", "pte-k15-small-note", "与 K3 长文档上采样机制相同：目标能力所需数据天然稀缺，不能服从原始频率。"));
  const notes = element("div", "pte-k15-sampling-notes");
  const benefit = element("article", "note-card blue");
  benefit.append(element("h3", "", "连续采样的好处"), element("p", "", "不依赖脆弱的通过/拒绝硬阈值。高于 1 时重复抽取，低于 1 时按概率跳过；低质量数据不丢失，以更低频率贡献。"));
  const meaning = element("article", "note-card");
  meaning.append(element("h3", "", "采样率的含义"), element("p", "", "采样率 = 该 epoch 进入 batch 的概率。0.3 → 长期梯度权重约为原始的 0.3×；>1.0 → 等效于多个 epoch 的重复训练。"));
  notes.append(benefit, meaning);
  lower.append(code, notes);
  scroll.append(header, why, plot, lower, element("p", "pte-optimizer-source", "🟢 K1.5 Technical Report；BigCode 数据方法"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildUniqueTokensStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom pte-unique-custom");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 采样方式"), element("h2", "", "K2.5 采样预算：unique tokens"), element("p", "", "用去重信息量控制每个 source 的采样上限，让训练量与有效信息量成比例。"));

  const problem = element("section", "pte-unique-problem");
  problem.append(element("h3", "", "代码库 10T，专业文档 50B——按体量采样会发生什么？"));
  const problemGrid = element("div", "pte-unique-problem-grid");
  const volume = element("article", "pte-unique-volume");
  volume.append(element("div", "source-block large", "代码库\n10T token"), element("div", "source-block small", "专业文档\n50B token"));
  const repeats = element("article", "pte-unique-repeats");
  repeats.append(element("h4", "", "按原始体量采样"), element("p", "", "代码库：被看 ≈ 1 遍"), element("p", "danger", "专业文档：被看 ≈ 200 遍"));
  problemGrid.append(volume, repeats);
  problem.append(problemGrid, element("p", "pte-unique-warning", "看第 200 遍相同文档 ≠ 学到 200 倍新知识。重复内容提供的是重复梯度，不是新信息。"));

  const middle = element("section", "pte-unique-middle");
  const mechanism = element("article", "pte-unique-mechanism");
  mechanism.append(element("h3", "", "用去重信息量设置采样上限"));
  [
    ["Step 1", "统计 unique tokens", "对每个 source 去重后统计 token 总量：代码库约 8T，专业文档约 45B。"],
    ["Step 2", "设定采样上限", "上限 = epoch × source_size；每个 source 独立累计已采样 token。"],
    ["Step 3", "达到上限即停止", "该 source 已充分覆盖，再采只会制造重复梯度；同时提高相关代码内容的配方权重。"],
  ].forEach(([label, title, copy]) => {
    const step = element("div", "pte-unique-step");
    step.append(element("span", "step-label", label), element("h4", "", title), element("p", "", copy));
    mechanism.append(step);
  });
  const examples = element("div", "pte-unique-examples");
  examples.append(element("p", "", "专业文档 50B unique tokens → 最多采 1–2 遍，不无限循环"), element("p", "", "代码库 8T unique tokens → 上限相应更高，按信息量分配"));
  mechanism.append(examples);

  const division = element("article", "pte-unique-division");
  division.append(element("h3", "", "两个机制解决两个维度的重复"));
  [
    ["rephrasing", "同一文档，内容不变，表面形式改变。", "解决：同一文档重复出现", "blue"],
    ["unique tokens", "跨 source 控制采样量，小 source 不无限循环。", "解决：同一数据源重复", "green"],
    ["叠加效果", "形式多样性 ↑；来源重复 ↓。", "既扩展表达，又阻止来源循环", "neutral"],
  ].forEach(([title, copy, result, tone]) => {
    const card = element("div", `pte-unique-card ${tone}`);
    card.append(element("h4", "", title), element("p", "", copy), element("strong", "", result));
    division.append(card);
  });
  middle.append(mechanism, division);

  const summary = element("section", "pte-unique-summary");
  summary.append(element("strong", "", "每个 source 的训练量和它包含的去重信息量成比例。"), element("p", "", "信息密度高的小 source 得到保护，不被稀释；体量大的 source 按真实信息量，而非原始体量，分配训练步。"));

  const dilution = element("section", "pte-data-story-section");
  dilution.append(element("h3", "", "大量视觉 token 进来后，代码在 batch 里的占比自然下降"));
  const batches = element("div", "pte-batch-compare");
  [["K2 · 纯文本 batch", [["code", "代码 30%", 30], ["text", "文字 / 数学 / 其他 70%", 70]]], ["K2.5 · 联合预训练 batch", [["vision", "视觉 35%", 35], ["code", "代码 20%", 20], ["text", "其他 45%", 45]]]].forEach(([title, segments]) => {
    const card = element("article", "pte-batch-card");
    card.append(element("h4", "", title));
    const bar = element("div", "pte-batch-bar");
    segments.forEach(([tone, label, width]) => {
      const segment = element("span", tone, label);
      segment.style.width = `${width}%`;
      bar.append(segment);
    });
    card.append(bar);
    batches.append(card);
  });
  dilution.append(batches, element("p", "pte-data-warning", "视觉 token 体量增大 → 代码相对占比下降 → 代码逻辑信号变弱。代码比例下降不是代码数据变少，而是训练分母变大，因此需要 unique tokens + rephrasing 扩展有效权重：前者控制来源预算，后者增加同一知识的表达覆盖。"));
  scroll.append(header, problem, middle, summary, dilution, element("p", "pte-optimizer-source", "🟢 K2.5 Technical Report；🔴 计数实现细节与示例数字、batch 占比为工程推断"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildMathNotesStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom pte-data-story");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 领域专项"), element("h2", "", "K2 数学学习笔记：把压缩推导展开成可追溯过程"), element("p", "", "数学原文常省略条件、中间步骤与直觉；learning-note style 把这些隐含结构重新写出来。"));

  const top = element("section", "pte-data-story-section");
  top.append(element("h3", "", "数学原文跳步骤——模型学到的是结论，不是推导路径"));
  const contrast = element("div", "pte-data-contrast math");
  const original = element("article", "muted");
  original.append(element("h4", "", "原始数学文本"), element("blockquote", "", "“由 Cauchy-Schwarz 不等式得 ‖Ax‖ ≤ ‖A‖·‖x‖”"));
  ["× 为什么可以使用 Cauchy-Schwarz？条件是什么？", "× ‖A‖ 是算子范数还是 Frobenius 范数？", "× 这一步的直觉是什么？"].forEach((text) => original.append(element("p", "danger", text)));
  original.append(element("strong", "", "模型见过结论，却未必能在新问题中重建推导。"));
  const notes = element("article", "blue");
  notes.append(element("h4", "", "学习笔记风格展开"), element("blockquote", "", "“我们想上界 ‖Ax‖。先确认 ‖A‖ 取诱导算子范数，再把 Ax 的每个分量写成行向量与 x 的内积；对每个内积使用 Cauchy-Schwarz，最后合并各分量……”"));
  ["✓ 每步包含条件检查", "✓ 直觉说明显式写出", "✓ 推导路径可以追溯"].forEach((text) => notes.append(element("p", "success", text)));
  contrast.append(original, notes);
  top.append(contrast);

  const middle = element("section", "pte-data-story-middle");
  const flow = element("article", "pte-data-flow");
  flow.append(element("h3", "", "按 SwallowMath 方法改写为 learning-note style"));
  [
    ["Step 1", "识别隐含跳步", "定位省略的条件检查、中间变量与直觉说明。"],
    ["Step 2", "展开并验证", "补齐学生推导时会写下的过程；保留原结论，并验证改写与原文等价。"],
    ["Step 3", "扩展来源", "把其他语言的高质量数学材料翻译成英文，增加来源与表达多样性。"],
  ].forEach(([label, title, copy]) => {
    const step = element("div", "pte-data-flow-step");
    step.append(element("span", "", label), element("h4", "", title), element("p", "", copy));
    flow.append(step);
  });
  flow.append(element("p", "pte-data-range", "使用范围：K2 只在知识域和数学域使用 rephrasing；每个语料库最多改写两次。"));
  const cards = element("article", "pte-data-card-stack");
  cards.append(element("h3", "", "为什么不是普通改写"));
  [
    ["数学比普通文本更敏感", "普通文本换表达通常不伤核心信息；数学推导少一个步骤，整条逻辑就可能断掉。", "blue"],
    ["学习笔记 vs 教材原文", "教材面向已知读者而大量省略；学习笔记面向正在学习的人，让模型学习展开推导而非只记结论。", "neutral"],
    ["与 unique tokens 的分工", "rephrasing 增加推导表达多样性；unique tokens 控制 source 上限，避免小源无限循环。", "green"],
  ].forEach(([title, copy, tone]) => {
    const card = element("div", `pte-data-card ${tone}`);
    card.append(element("h4", "", title), element("p", "", copy));
    cards.append(card);
  });
  middle.append(flow, cards);
  scroll.append(header, top, middle, element("p", "pte-optimizer-source", "🟢 K2 Technical Report §2.2（SwallowMath、learning-note style rephrasing）"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildVisionSevenStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom pte-data-story pte-vision-seven");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 视觉语料"), element("h2", "", "K2.5 七类视觉：从看懂内容到定位、时序与操作"), element("p", "", "K1.5 的基础视觉任务主要回答“图中有什么”；K2.5 用感知、视频、智能体数据补齐三个盲区。"));

  const blind = element("section", "pte-data-story-section");
  blind.append(element("h3", "", "五类视觉能回答“是什么”，但不能回答“在哪里、怎么变、怎么操作”"));
  const blindGrid = element("div", "pte-blind-grid");
  [["盲区 1 · 像素级定位", "能识别“图中有一只猫”，却不能给出边界框、点级引用或轮廓 mask。"], ["盲区 2 · 时序理解", "能理解单张图片，却没有帧间关系与长视频时序推理。"], ["盲区 3 · GUI 操作", "能描述界面截图，却不能定位控件并生成点击、输入、滚动轨迹。"]].forEach(([title, copy]) => {
    const card = element("article", "pte-blind-card");
    card.append(element("span", "", "×"), element("h4", "", title), element("p", "", copy));
    blindGrid.append(card);
  });
  blind.append(blindGrid);

  const additions = element("section", "pte-data-story-section");
  additions.append(element("h3", "", "三类新数据，各填一个盲区"));
  const additionGrid = element("div", "pte-addition-grid");
  [
    ["感知数据", "像素级定位", "边界框、点级引用、轮廓分割 mask", "从“图中有猫”到“猫在 [120,80,340,260]”"],
    ["视频数据", "时序理解", "视频帧序列、帧间关系、长视频片段", "从单帧理解到多帧时序推理"],
    ["智能体数据", "GUI 操作", "桌面、移动端、Web 操作轨迹", "从看懂界面到生成点击、输入、滚动、拖拽步骤"],
  ].forEach(([title, ability, data, effect]) => {
    const card = element("article", "pte-addition-card");
    card.append(element("h4", "", title), element("strong", "", `填补：${ability}`), element("p", "", `数据：${data}`), element("p", "effect", `效果：${effect}`));
    additionGrid.append(card);
  });
  additions.append(additionGrid);

  const lower = element("section", "pte-vision-seven-lower");
  const overview = element("article", "pte-vision-table-wrap");
  overview.append(element("h3", "", "七类视觉数据的完整能力覆盖"));
  const table = element("div", "pte-vision-seven-table");
  [["Caption / 图文交织", "图文对应、顺序理解、互相指代"], ["OCR", "表格、手写、图中文字识别"], ["知识 / 通用 QA", "结构化知识提取、视觉问答"], ["感知（新增）", "像素定位、点级引用、轮廓分割"], ["视频（新增）", "帧间时序、长视频理解"], ["智能体（新增）", "GUI 操作轨迹、跨平台操作"]].forEach(([kind, ability]) => {
    table.append(element("strong", "", kind), element("span", "", ability));
  });
  overview.append(table, element("p", "pte-data-range", "能力从“图中有什么”扩展到“物体在哪里、时间如何变化、界面怎样操作”。"));
  const cards = element("article", "pte-data-card-stack");
  cards.append(element("h3", "", "实现层面的三项补充"));
  [["MoonViT-3D 统一图像与视频", "原生分辨率 patch packing；图像视为单帧视频，多帧按时序拼接，避免维护两套系统。", "blue"], ["感知标注从粗到细", "边界框定位区域，点级引用指定元素，轮廓 mask 提供像素级边界。", "neutral"], ["智能体覆盖三端", "桌面侧重窗口与菜单，移动端侧重触控与手势，Web 侧重 DOM 与动态内容。", "green"]].forEach(([title, copy, tone]) => {
    const card = element("div", `pte-data-card ${tone}`);
    card.append(element("h4", "", title), element("p", "", copy));
    cards.append(card);
  });
  lower.append(overview, cards);
  scroll.append(header, blind, additions, lower, element("p", "pte-optimizer-source", "🟢 K2.5 Technical Report §4.2–§4.3（七类视觉数据、感知 / 视频 / 智能体新增）"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildPerceptualHashVisual = () => {
  const svg = svgElement("svg", { class: "pte-longdoc-hash-visual", viewBox: "0 0 420 88", role: "img", "aria-label": "DCT pHash 指纹与汉明距离对比" });
  const rows = [
    ["帧 A（原始）", [1, 0, 1, 1, 0, 1, 0, 1], ""],
    ["帧 A′（重编码）", [1, 0, 1, 1, 0, 1, 0, 1], "d = 0  判重 ✓", "match"],
    ["帧 B（不同）", [0, 1, 0, 0, 1, 0, 1, 0], "d = 31  不同 ×", "different"],
  ];
  rows.forEach(([label, bits, result, tone], rowIndex) => {
    const y = 8 + rowIndex * 26;
    svg.append(svgElement("text", { x: 4, y: y + 11, class: "row-label" }, label));
    bits.forEach((bit, bitIndex) => {
      const x = 100 + bitIndex * 16;
      const changed = rowIndex === 2 && bit !== rows[0][1][bitIndex];
      svg.append(svgElement("rect", { x, y, width: 13, height: 15, rx: 1, class: `bit ${bit ? "on" : "off"} ${changed ? "changed" : ""}` }));
      svg.append(svgElement("text", { x: x + 6.5, y: y + 11, class: `bit-label ${bit || changed ? "on" : "off"}`, "text-anchor": "middle" }, String(bit)));
    });
    svg.append(svgElement("text", { x: 232, y: y + 11, class: "ellipsis" }, "…"));
    if (result) svg.append(svgElement("text", { x: 252, y: y + 11, class: `result ${tone}` }, result));
  });
  return svg;
};

const buildHashMethodCard = (number, title, goal, steps, fit, tone) => {
  const card = element("article", `pte-hash-method ${tone}`);
  const heading = element("header", "");
  heading.append(element("span", "", number), element("h3", "", title));
  card.append(heading, element("p", "goal", `设计目标：${goal}`));
  const process = element("ol", "");
  steps.forEach((step) => process.append(element("li", "", step)));
  card.append(process, element("p", "fit", `适合检测：${fit}`));
  return card;
};

const buildLongDocStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom pte-hash-page");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "K3 · 长文档训练 · 数据去重"), element("h2", "", "为什么三种 hash，不是一种？"), element("p", "", "K3 长上下文训练同时包含文本和视频：文本的“相同”藏在字符里，视频的“相同”藏在像素里。"));

  const methods = element("section", "pte-hash-section");
  methods.append(element("h3", "", "三种 hash，各自解决一种“相同”"));
  const methodList = element("div", "pte-hash-method-list");
  methodList.append(
    buildHashMethodCard("01", "精确 hash（SHA-256）", "雪崩效应，输入改变一个字节，输出面目全非。", ["读取文件全部字节 → SHA-256 → 256 位摘要。", "摘要相同，才判定为同一文件。"], "完全相同的副本。", "exact"),
    buildHashMethodCard("02", "MinHash", "估计集合的 Jaccard 相似度，容忍少量字符改动。", ["文档切成字符 n-gram，形成集合。", "用 k 个随机哈希函数，各自保留集合中的最小值。", "拼成长度 k 的签名向量。", "相同位置值相等的比例 ≈ Jaccard；超过阈值即判为近重复。"], "改了少量文字的近重复文本。", "minhash"),
    buildHashMethodCard("03", "DCT 帧感知哈希（pHash）", "与精确 hash 相反，输入小幅变化，输出也只小幅变化。", ["取一帧 → 缩放 8×8 → 转灰度。", "对矩阵做 DCT，取左上角低频系数，保留整体明暗布局。", "系数与均值比较：大于均值记 1，否则记 0，得到 64 位指纹。", "两帧汉明距离 d ≤ 阈值，即判为同一内容。"], "重编码后画面相同的视频帧。", "phash"),
  );
  methods.append(methodList, element("p", "pte-hash-emphasis", "精确 hash 和 MinHash 比的是存储形式，DCT pHash 比的是语义结构。"));

  const routes = element("section", "pte-hash-section");
  routes.append(element("h3", "", "同一个问题：“这段内容，数据集里出现过吗？”"));
  const routeGrid = element("div", "pte-hash-routes");
  const textRoute = element("article", "text-route");
  textRoute.append(element("h4", "", "路径 A · 文本"), element("p", "", "论文被转载 50 次，文件字节完全相同。"), element("strong", "success", "→ 精确 hash 摘要相同，命中 ✓"), element("p", "", "摘要改了三个字后重新上传。"), element("strong", "danger", "→ 精确 hash 面目全非，漏过 ×"), element("strong", "success", "→ MinHash 发现 n-gram 大部分重叠，命中 ✓"), element("small", "", "文本用精确 hash + MinHash 两层覆盖。"));
  const videoRoute = element("article", "video-route");
  videoRoute.append(element("h4", "", "路径 B · 视频"), element("p", "", "H.264 视频经 ffmpeg 转为 H.265，画面一帧没变。"), element("strong", "danger", "→ 精确 hash：字节流全变，误判为新文件 ×"), element("strong", "danger", "→ MinHash：字节 n-gram 几乎无交集，同样漏过 ×"), element("strong", "success", "→ DCT pHash：低频指纹近似，d = 0，判重 ✓"), element("small", "", "重编码改变每一个字节，却没有改变任何一个像素的含义。"));
  routeGrid.append(textRoute, videoRoute);
  routes.append(routeGrid);

  const comparison = element("section", "pte-hash-section");
  comparison.append(element("h3", "", "三种 hash 的核心对比"));
  const table = element("div", "pte-hash-table");
  [["", "SHA-256", "MinHash", "DCT pHash"], ["设计目标", "严格判同", "估计集合相似", "保留感知相似"], ["输入微变", "面目全非", "平滑变化", "几乎不变"], ["本质", "加密摘要", "集合相似度估计器", "感知特征指纹"], ["视频重编码", "×", "×", "✓"]].flat().forEach((value, index) => table.append(element(index < 4 || index % 4 === 0 ? "strong" : "span", index === 19 ? "success" : "", value)));
  comparison.append(table);

  const phash = element("section", "pte-hash-section pte-phash-section");
  phash.append(element("h3", "", "DCT pHash：先消除干扰，再比较指纹"));
  const pipeline = element("div", "pte-phash-flow");
  [["原始帧", "读取画面"], ["缩放 8×8", "抹掉高频细节"], ["灰度", "移除颜色差异"], ["DCT 低频", "保留整体布局"], ["均值比较", "转为相对明暗"], ["64 位指纹", "稳定内容签名"]].forEach(([title, copy], index, steps) => {
    const step = element("div", "pte-phash-step");
    step.append(element("strong", "", title), element("small", "", copy));
    pipeline.append(step);
    if (index < steps.length - 1) pipeline.append(element("span", "", "→"));
  });
  phash.append(pipeline, buildPerceptualHashVisual(), element("p", "pte-hash-emphasis", "重编码改变了每一个字节，但没有改变任何一个像素的含义。"));

  scroll.append(header, methods, routes, comparison, phash, element("p", "pte-optimizer-source", "🟢 K3 Technical Report §3.1–§3.3；🔴 算法机械过程与示例为工程解释"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildCrossSpanStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom pte-data-story");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 领域专项"), element("h2", "", "K3 跨段合成：让远处证据无法被忽略"), element("p", "", "长上下文的关键不是长度本身，而是让答案必须依赖分散在远处的多处证据。"));

  const top = element("section", "pte-data-story-section");
  top.append(element("h3", "", "证据太近，模型就会学会只看最后几段"));
  const contrast = element("div", "pte-data-contrast");
  const shortcut = element("article", "muted");
  shortcut.append(element("h4", "", "普通长文档训练"), element("p", "", "机械拼成 1M 上下文，只增加长度。"), element("p", "", "答案证据集中在来源段落附近，模型只看最近内容也能答对。"), element("strong", "danger", "后果：忽略前 99% 仍不增加 loss，长上下文训练失败。"));
  const forced = element("article", "blue");
  forced.append(element("h4", "", "跨段合成的强制约束"), element("p", "", "第 1 / 80 / 300 / 900 段各放一处必要证据。"), element("p", "", "任何一处缺失，答案都不成立。"), element("strong", "success", "捷径失效：必须真正跨段读取并整合。"));
  contrast.append(shortcut, forced);
  top.append(contrast);

  const middle = element("section", "pte-data-story-middle");
  const flow = element("article", "pte-data-flow");
  flow.append(element("h3", "", "把证据随机散布到不可忽略的位置"));
  [["Step 1", "选择 N 篇文档", "从不同来源选取文本、图表、代码输出等材料。"], ["Step 2", "提取相互依赖的事实", "每篇提取 1–2 个关键事实，任一缺失都无法完成判断。"], ["Step 3", "设计组合问题", "答案必须同时依赖 N 处证据，而不是复述其中一段。"], ["Step 4", "随机散布证据", "不把证据集中在末尾；距离越远，局部阅读捷径越难奏效。"]].forEach(([label, title, copy]) => {
    const step = element("div", "pte-data-flow-step");
    step.append(element("span", "", label), element("h4", "", title), element("p", "", copy));
    flow.append(step);
  });
  const example = element("div", "pte-data-code");
  example.append(element("strong", "", "问题：这个角色在第三幕的行为符合他在第一幕的性格吗？"), element("p", "", "第 1 段：人物身份与性格"), element("p", "", "第 80 段：时间线与背景事件"), element("p", "", "第 300 段：外部条件变化"), element("p", "", "第 900 段：第三幕具体行为"), element("span", "", "缺任何一处 → 无法作出有依据的判断"));
  flow.append(example);
  const cards = element("article", "pte-data-card-stack");
  cards.append(element("h3", "", "训练信号如何升级"));
  [["与 NIAH 的区别", "NIAH 是单针检索，测“能不能找到”；跨段合成是多针 + 组合推理，测“能不能整合”。", "blue"], ["多模态跨段", "证据可以同时来自人物文本、时间线图表和系统代码输出；单一模态不足以作答。", "neutral"], ["配方必须动态更新", "简单任务饱和后，需要更远距离、更多跨段的任务；采样率应由小模型消融动态决定。", "green"]].forEach(([title, copy, tone]) => {
    const card = element("div", `pte-data-card ${tone}`);
    card.append(element("h4", "", title), element("p", "", copy));
    cards.append(card);
  });
  middle.append(flow, cards);
  const standard = element("section", "pte-data-standard");
  standard.append(element("strong", "", "核心验收标准：漏掉任一远处关键段落，答案就会错。"), element("p", "", "只有这样，忽略远处证据才会直接增加 loss，迫使模型放弃局部阅读捷径。"));
  scroll.append(header, top, middle, standard, element("p", "pte-optimizer-source", "🟢 K3 Technical Report §3.4（跨段合成任务）；🔴 合成流程为工程推断"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildNativeVisionCurves = () => {
  const svg = svgElement("svg", { class: "pte-native-curves", viewBox: "0 0 520 150", role: "img", "aria-label": "SigLIP 初始化与随机初始化的梯度稳定性示意" });
  svg.append(svgElement("line", { x1: 54, y1: 124, x2: 500, y2: 124, class: "axis" }), svgElement("line", { x1: 54, y1: 20, x2: 54, y2: 124, class: "axis" }));
  svg.append(svgElement("path", { d: "M54 108 C92 100 112 94 142 88 L157 38 L170 90 C205 82 225 78 250 72 L268 28 L282 76 C322 68 342 64 370 60 L386 34 L399 62 C440 56 470 52 500 49", class: "spiky" }));
  svg.append(svgElement("path", { d: "M54 116 C120 108 170 98 226 88 S338 69 500 48", class: "smooth" }));
  svg.append(svgElement("text", { x: 496, y: 35, class: "spiky-label", "text-anchor": "end" }, "SigLIP 初始化：频繁 spike"), svgElement("text", { x: 496, y: 74, class: "smooth-label", "text-anchor": "end" }, "随机初始化：梯度平稳"), svgElement("text", { x: 278, y: 145, class: "axis-label", "text-anchor": "middle" }, "训练 step"));
  return svg;
};

const buildNativeVisionStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom pte-data-story");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 视觉语料"), element("h2", "", "K3 视觉从头 NTP：从第一步统一目标"), element("p", "", "MoonViT-V2 从随机参数与语言主干联合训练，只接受 NTP 监督，不经历覆盖旧视觉目标的过渡期。"));

  const top = element("section", "pte-data-story-section");
  top.append(element("h3", "", "对比学习的表示和 NTP 需要的表示不是同一件事"));
  const contrast = element("div", "pte-data-contrast native");
  const siglip = element("article", "muted");
  siglip.append(element("h4", "", "SigLIP 初始化"), element("p", "", "旧目标：判断整张图与一段文本是否匹配。"), element("p", "", "学到的是整图级相似度，容易忽略局部 patch 与 token 的细粒度对应。"), element("p", "danger", "切到 NTP 后梯度方向改变，编码器必须“忘掉”旧表示，过渡期频繁 spike。"));
  const random = element("article", "blue");
  random.append(element("h4", "", "随机初始化"), element("p", "", "从第一步起只有 NTP：根据视觉信息预测下一个语言 token。"), element("p", "", "视觉表示从零开始为局部 token 对齐服务，没有旧目标需要覆盖。"), element("p", "success", "梯度方向从一开始一致，训练曲线更平稳。"));
  contrast.append(siglip, random);
  top.append(contrast, element("p", "pte-data-warning", "SigLIP 初始化版本频繁 spike；从头训练版本的视觉编码器梯度范数全程更平稳。"));

  const middle = element("section", "pte-data-story-middle");
  const design = element("article", "pte-native-design");
  design.append(element("h3", "", "MoonViT-V2：共享参数、压缩 token、只收 NTP 梯度"));
  [["图像与视频共享参数", "图像视为长度为 1 的视频；视频多帧按时序拼接，由同一编码器处理。"], ["2×2 pixel shuffle", "每 2×2 patch 合并为 1 个 token，视觉 token 数降为 1/4，为语言推理保留上下文空间。"], ["训练监督", "不使用对比学习目标；视觉编码器的梯度完全来自语言主干的 next-token prediction 误差。"]].forEach(([title, copy]) => {
    const item = element("div", "pte-native-item");
    item.append(element("h4", "", title), element("p", "", copy));
    design.append(item);
  });
  design.append(buildNativeVisionCurves());
  const cards = element("article", "pte-data-card-stack");
  cards.append(element("h3", "", "为什么这个取舍成立"));
  [["全局目标 ≠ 局部目标", "对比学习优化整图—文本相似度；NTP 需要局部视觉 patch 对齐下一个 token，优化粒度不同。", "blue"], ["压缩视觉 token", "原始分辨率产生大量视觉 token；2×2 合并后数量 ÷4，把有限上下文窗口留给语言推理。", "neutral"], ["代价与收益", "代价是随机参数需要更多训练步、无法借用 SigLIP 视觉知识；收益是目标统一、训练稳定、无需忘掉旧目标。", "green"]].forEach(([title, copy, tone]) => {
    const card = element("div", `pte-data-card ${tone}`);
    card.append(element("h4", "", title), element("p", "", copy));
    cards.append(card);
  });
  middle.append(design, cards);
  const summary = element("section", "pte-data-summary");
  summary.append(element("strong", "", "预训练视觉编码器不一定是更好的起点，也可能是一套需要被覆盖的旧目标。"), element("p", "", "从随机参数开始，视觉编码器和语言主干从第一步就为同一个 NTP 目标服务。"));
  scroll.append(header, top, middle, summary, element("p", "pte-optimizer-source", "🟢 K3 Technical Report §3.3、Figure 6（MoonViT-V2、随机初始化 vs SigLIP、pixel shuffle）"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildProgrammaticStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom pte-data-story pte-programmatic");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 合成扩增"), element("h2", "", "K3 程序化多模态：代码与渲染结果天然配对"), element("p", "", "代码直接决定视觉结果，因此同一批数据可以训练代码→画面与画面→代码两个方向。"));

  const top = element("section", "pte-data-story-section");
  top.append(element("h3", "", "Caption 描述内容，程序化数据描述因果"));
  const triad = element("div", "pte-programmatic-triad");
  const caption = element("article", "muted");
  caption.append(element("h4", "", "Caption / OCR 的能力边界"), element("p", "", "能回答：“图中有一个居中的红色圆形”。"), element("p", "danger", "不能回答：哪行代码生成它？改成蓝色要改什么？这段 CSS 会渲染成什么？"), element("strong", "", "本质：描述已有内容，不理解生成机制。"));
  const causal = element("article", "blue");
  causal.append(element("h4", "", "程序化数据的因果结构"), element("pre", "pte-program-code", '<circle cx="50" cy="50" r="40" fill="red"/>'), element("span", "pte-causal-arrow", "↓ 渲染"), element("strong", "", "[ 红色圆形渲染图 ]"), element("p", "success", "代码完全决定结果；代码执行就是精确标注。"));
  const ability = element("article", "green");
  ability.append(element("h4", "", "由此带来的能力"), element("p", "", "Code review：看代码预判视觉结果，无需运行。"), element("p", "", "界面生成：给截图反推代码结构。"), element("p", "", "调试：由 bug 截图定位问题代码行。"));
  triad.append(caption, causal, ability);
  top.append(triad);

  const middle = element("section", "pte-data-story-middle");
  const directions = element("article", "pte-data-flow");
  directions.append(element("h3", "", "同一批数据，训练两个方向的映射"));
  [["方向 1 · 代码 → 画面", "输入：display:flex; justify-content:center", "输出：按钮水平居中截图", "训练信号：预测视觉结果与真实渲染是否一致", "应用：Code review 无需运行程序，直接预判布局"], ["方向 2 · 画面 → 代码", "输入：[截图：水平居中的按钮]", "输出：display:flex; justify-content:center", "训练信号：预测代码与真实代码是否等价", "应用：给界面截图生成对应代码结构"]].forEach(([title, input, output, signal, usage]) => {
    const direction = element("div", "pte-direction-card");
    direction.append(element("h4", "", title), element("p", "", input), element("span", "pte-causal-arrow", "→"), element("p", "", output), element("small", "", signal), element("strong", "", usage));
    directions.append(direction);
  });
  const coordinate = element("div", "pte-coordinate-note");
  coordinate.append(element("h4", "", "坐标归一化：跨分辨率通用"), element("p", "", "绝对坐标（200,160,600,400）只在 800×600 下有效。"), element("p", "", "将每个坐标除以对应维度：归一化为（0.2, 0.2, 0.6, 0.5），换分辨率仍表达同一布局。"));
  directions.append(coordinate);
  const coverage = element("article", "pte-data-card-stack");
  coverage.append(element("h3", "", "六类程序化数据：从 UI 到 3D"));
  [["◆", "3D 资产", "空间几何，三维坐标"], ["◇", "HTML + CSS", "网页布局，DOM 结构"], ["★", "游戏场景", "实体位置，物理规则"], ["▣", "CAD 图纸", "工程图与精确尺寸"], ["↗", "代码执行输出", "程序运行结果截图"]].forEach(([icon, name, copy]) => {
    const row = element("div", "pte-programmatic-row");
    row.append(element("span", "", icon), element("strong", "", name), element("p", "", copy));
    coverage.append(row);
  });
  const grounding = element("div", "pte-data-card green");
  grounding.append(element("h4", "", "Grounding 能力的升级"), element("p", "", "K2.5 Grounding：标出图里有什么物体（识别）。"), element("p", "", "K3 程序化多模态：解释哪段代码如何创造物体（因果）。"), element("strong", "", "从“识别存在”升级到“理解生成机制”。"));
  coverage.append(grounding);
  middle.append(directions, coverage);

  scroll.append(header, top, middle, element("p", "pte-optimizer-source", "🟢 K3 Technical Report §3.1（程序化多模态、双向映射、坐标归一化）"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildVisionFiveStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 视觉语料"), element("h2", "", "K1.5 五类视觉任务：从“认识图”到“推理图”"), element("p", "", "单一 caption 覆盖不了视觉理解的全部维度，五类互补任务补齐从感知到推理的能力链。视觉仍在语言主干之后追加。"));
  const ladder = element("section", "pte-k15-vision-ladder");
  ladder.append(element("h3", "", "五类任务的能力阶梯"));
  [["①", "感知层", "Caption / 图文交织", "图文顺序、互相指代、文档理解", "模型先要知道图在哪、对应哪段文字"], ["②", "识别层", "OCR", "表格、手写、带文字的图片；从图提取结构化知识", "图里的文字不能靠语言模型猜，必须显式识别"], ["③", "定位层", "通用 QA / GUI", "识别目标区域并推进到视觉回答", "从“看到”到“定位目标区域”"], ["④", "推理层", "视觉推理", "复杂视觉问答", "前三层是基础，最终目标是可解释地回答"], ["⑤", "补充层", "合成数据（仅 cooldown）", "精确控制最后落点", "主训练用真实分布，合成数据不进入主预训练"]].forEach(([num, level, task, trains, why]) => {
    const row = element("article", "pte-k15-vision-step");
    row.append(element("span", "step-number", num));
    const copy = element("div", "");
    copy.append(element("h4", "", `${level}：${task}`), element("p", "", `训练什么：${trains}`), element("p", "why", `为什么需要：${why}`));
    row.append(copy);
    ladder.append(row);
  });
  const details = element("section", "pte-k15-vision-details");
  details.append(element("h3", "", "两个实现边界"), element("p", "", "图文交织额外执行 data reordering：按浏览器实际渲染位置排列图文，而非 DOM 顺序，确保图文对应正确。"), element("p", "", "合成数据限于 cooldown：合成分布有偏，主训练阶段保持真实分布，最后再用小预算控制收敛落点。"));
  scroll.append(header, ladder, details, element("p", "pte-optimizer-source", "🟢 K1.5 Technical Report；🔴 cooldown 动机为演进路径推断"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildCooldownStory = (state, persist, rerender) => {
  const side = element("aside", "pte-optimizer-detail dataTab pte-k15-custom");
  const scroll = element("div", "pte-optimizer-scroll");
  scroll.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  const header = element("header", "pte-optimizer-heading");
  header.append(element("span", "pte-optimizer-eyebrow", "数据谱系 · 合成扩增"), element("h2", "", "K1.5 Cooldown 合成 QA：用高质量数据精确收敛最后能力"), element("p", "", "主训练先建立广覆盖；低学习率 cooldown 是补偿稀缺高价值信号的最后窗口。"));
  const why = element("section", "pte-k15-cooldown-why");
  why.append(element("h3", "", "为什么需要 cooldown 合成 QA"), element("p", "", "真实数据中的高质量数学、知识、代码信号天然稀缺，而主训练数据量巨大，这些信号容易被稀释。Cooldown 阶段数据量小、学习率低，适合集中补偿；合成 QA 让最后几步梯度落在明确目标上。"));
  const decisions = element("section", "pte-k15-decision-grid");
  [["决策 1", "为什么用 LM 生成，而不用真实数据", "真实高质量数学 / 代码 QA 稀缺且采集成本高。LM 可以按需定向生成目标领域样本。", "blue"], ["决策 2", "为什么要拒绝采样过滤", "LM 生成质量不均，直接使用会引入噪声。先全面生成，再验证质量，只保留通过样本：用计算换数据质量。", "amber"], ["决策 3", "为什么不进入主预训练", "合成分布由生成策略决定，不代表真实世界分布。主训练大量使用会偏离真实分布；只在 cooldown 用，数据量小、偏差可控、目标明确。", "green"]].forEach(([label, title, copy, tone]) => {
    const card = element("article", `pte-k15-decision ${tone}`);
    card.append(element("span", "decision-label", label), element("h3", "", title), element("p", "", copy));
    decisions.append(card);
  });
  const result = element("section", "pte-k15-cooldown-result");
  result.append(element("strong", "", "效果"), element("p", "", "合成 QA 集中巩固数学推理、知识任务和代码生成能力。"));
  scroll.append(header, why, decisions, result, element("p", "pte-optimizer-source", "🟢 K1.5 Technical Report Appendix B.3"));
  side.append(buildDataTabs(state, persist, rerender), scroll);
  return side;
};

const buildDataDetail = (state, persist, rerender) => {
  if (state.selectedLabel === "data-k15-sampling") return buildSamplingStory(state, persist, rerender);
  if (state.selectedLabel === "data-k25-unique") return buildUniqueTokensStory(state, persist, rerender);
  if (state.selectedLabel === "data-k2-math-rephrasing") return buildMathNotesStory(state, persist, rerender);
  if (state.selectedLabel === "data-k25-vision-seven") return buildVisionSevenStory(state, persist, rerender);
  if (state.selectedLabel === "data-k3-long-doc") return buildLongDocStory(state, persist, rerender);
  if (state.selectedLabel === "data-k3-cross-span") return buildCrossSpanStory(state, persist, rerender);
  if (state.selectedLabel === "data-k3-native-vision") return buildNativeVisionStory(state, persist, rerender);
  if (state.selectedLabel === "data-k3-programmatic") return buildProgrammaticStory(state, persist, rerender);
  if (state.selectedLabel === "data-k15-vision-five") return buildVisionFiveStory(state, persist, rerender);
  if (state.selectedLabel === "data-k15-cooldown-synth") return buildCooldownStory(state, persist, rerender);
  const chapters = Object.fromEntries(DATA_LINEAGES.map((lineage) => {
    const cells = lineage.id === "quality"
      ? lineage.cells.filter((cell) => cell.labelId)
      : lineage.id === "augmentation" && state.selectedLabel === "data-k2-rephrasing"
        ? lineage.cells.filter((cell) => ["data-k2-rephrasing", "data-k25-code-visual"].includes(cell.labelId))
        : lineage.cells;
    return [lineage.id, {
    tab: lineage.tab,
    eyebrow: `数据谱系 · ${lineage.tab}`,
    title: lineage.title,
    lead: lineage.lead,
    hideHeader: lineage.id === "augmentation" && state.selectedLabel === "data-k2-rephrasing",
    stages: cells.map((cell) => cell.text),
    highlightStages: false,
    sections: cells.map((cell) => {
      if (!cell.labelId) return {
        title: `${cell.version} · ${cell.text}`,
        copy: `🟢 ${cell.note}`,
        formula: [cell.toNext === "inherit"
          ? "沿用上一代数据底座；本代只验证新增改动"
          : cell.toNext === "break"
            ? "K2 本代只训练文本；K2.5 再以 K2 语言底座接入视觉"
            : "当前报告未披露独立改动；沿用该谱系的总体原则"],
        visual: cell.toNext === "break" ? "boundary" : "inherit",
      };
      const detail = getDetail(cell.labelId);
      return {
        labelId: cell.labelId,
        title: `${cell.version} · ${detail.title}`,
        copy: `${detail.oneliner} ${detail.why.join(" ")}`,
        formula: detail.visual === "rephrase" ? [] : detail.deepDive,
        visual: detail.visual,
        points: [...detail.how, ...detail.evidence],
        source: detail.source,
        jumpTo: detail.jumpTo,
      };
    }),
    source: "每个节点的事实与边界沿用对应技术报告标注；占位节点只表达继承或中断。",
  }];
  }));
  return buildSequenceDetail({ chapters, stateKey: "dataTab", labelByTab: DATA_LABEL_BY_TAB, scrollToSelected: true }, state, persist, rerender);
};

const buildWsdDetail = (inherited = false) => {
  const side = element("aside", `pte-detail pte-wsd-onepage ${inherited ? "inherited" : ""}`);
  const header = element("header", "pte-lr-story-heading");
  header.append(
    element("span", "pte-version-badge", inherited ? "K2.5" : "K2"),
    element("h2", "", inherited ? "继承 K2 WSD" : "WSD：稳定吸收，再精细收敛"),
    element("p", "", inherited ? "语言底座沿用 K2 的稳定训练配方，把变量集中到多模态融合。" : "一个学习率日程同时回答：何时持续学习，何时降低步长收敛。"),
  );
  const top = element("section", "pte-wsd-top");
  const figure = element("figure", "pte-wsd-chart-panel");
  figure.append(element("h3", "", "问题：cosine 在数据还没吃完时就开始衰减"), buildWsdComparisonChart(), element("figcaption", "", "WSD 把高学习率维持到约 65% 训练进度；cosine 在此处已明显衰减。"));
  const config = element("article", "pte-wsd-config");
  config.append(element("h3", "", "K2 的具体参数"));
  [["Warmup", "500 steps", "学习率升至 2e−4", "warmup"], ["Stable", "10T token", "维持 2e−4", "stable"], ["Decay", "5.5T token", "cosine 降至 2e−5", "decay"], ["Anneal", "末段", "急降至 7e−6", "anneal"]].forEach(([name, value, note, tone]) => {
    const row = element("section", `pte-wsd-config-row ${tone}`);
    row.append(element("i"), element("strong", "", name), element("code", "", value), element("span", "", note));
    config.append(row);
  });
  config.append(element("p", "pte-wsd-thesis", "大规模训练既要长时间稳定吸收数据，也要在末段降低步长精细收敛。WSD 把两件事拆开。"));
  top.append(figure, config);
  const bottom = element("section", "pte-wsd-bottom");
  const reuse = element("figure", "pte-wsd-reuse-panel");
  reuse.append(element("h3", "", "工程附加值：检查点可以复用"), buildCheckpointReuse(), element("figcaption", "", "从任意 stable 检查点重跑 Decay，就能低成本得到不同数据量的完整模型。"));
  const k3 = element("article", "pte-wsd-k3-note");
  k3.append(element("h3", "", "K3 为何换回 cosine"), element("p", "", "Per-Head Muon 改变训练动态，旧的最优超参不再保证最优。K3 Figure 7 显示，分别调优后 cosine 的最终 loss 更低。"), element("small", "", "这不是 WSD 本身失效，而是换了优化器后最优日程随之改变。"), element("code", "", "lrₜ = lrₘᵢₙ + 0.5(lrₘₐₓ−lrₘᵢₙ)(1+cos(πt/T))　｜　warmup 1%"));
  bottom.append(reuse, k3);
  if (inherited) side.append(header, element("p", "pte-wsd-inherit-banner", "调度方案不重设计：K2.5 直接复用 K2 的 warmup → stable → decay → anneal。"));
  else side.append(header);
  side.append(top, bottom, element("p", "pte-lr-story-source", "来源：K2 Technical Report §2.1、§2.5；K2.5 Technical Report；K3 Technical Report §3.1–§3.4。"));
  return side;
};

const buildCosineDetail = () => {
  const side = element("aside", "pte-detail pte-lr-story cosine-story");
  const scroll = element("div", "pte-lr-story-scroll");
  const header = element("header", "pte-lr-story-heading");
  header.append(element("span", "pte-version-badge", "K3"), element("h2", "", "独立调优后的 cosine"), element("p", "", "先比较日程形状，再让两者各自寻找最优超参，最后比较 final loss。"));
  const top = element("section", "pte-cosine-top-grid");
  const shape = element("figure", "pte-schedule-shape-panel");
  shape.append(element("h3", "", "WSD 与 cosine 的形状差异"), buildScheduleShapeChart(), element("figcaption", "", "WSD 在大部分训练时间维持峰值学习率；cosine 从训练早期开始持续衰减。两者的最优 peak LR 和 batch size 因此显著不同。"));
  const search = element("article", "pte-schedule-search");
  search.append(element("h3", "", "K3 为每种日程独立搜索的超参"));
  [["Peak LR", "WSD 与 cosine 的最优值差异显著"], ["Batch size", "两种日程对 batch size 的敏感度不同"], ["Warmup 比例", "cosine 采用 1%；WSD 的 warmup 极短"]].forEach(([name, note]) => {
    const row = element("section", "pte-search-row");
    const swatches = element("span", "pte-schedule-swatches");
    swatches.append(element("i", "wsd"), element("i", "cosine"));
    row.append(swatches, element("strong", "", name), element("p", "", note));
    search.append(row);
  });
  search.append(element("p", "pte-search-warning", "共用一套超参，只能说明超参更适合谁。K3 为每种日程分别跑 scaling-law 搜索，各自找到最优解后再比较 final loss。"));
  top.append(shape, search);
  const bottom = element("section", "pte-cosine-bottom-grid");
  const figure = element("figure", "pte-scaling-law-panel");
  figure.append(element("h3", "", "各自最优超参下，cosine 持续胜出"), buildScalingLawChart(), element("figcaption", "", "K3 Figure 7：相同 FLOPs 下，cosine final loss 持续低于 WSD。"));
  const stack = element("div", "pte-cosine-stack");
  const formula = element("article", "pte-cosine-card formula");
  formula.append(element("h3", "", "cosine 公式"), element("code", "", "lrₜ = lrₘᵢₙ + 0.5(lrₘₐₓ−lrₘᵢₙ)(1+cos(πt/T))"), element("p", "", "t=0：lr=lrₘₐₓ　｜　t=T：lr=lrₘᵢₙ"), element("p", "", "K3：1% warmup，weight decay=0.1。"));
  const relation = element("article", "pte-cosine-card relation");
  relation.append(element("h3", "", "结论"), element("p", "", "WSD 在 K2 + AdamW 配置下是最优选择。Per-Head Muon 改变训练动态后，超参重搜得到 cosine 更优；换优化器必须重搜日程。"));
  stack.append(formula, relation);
  bottom.append(figure, stack);
  scroll.append(header, top, bottom, element("p", "pte-lr-story-source", "来源：K3 Technical Report §3.2、Figure 7。"));
  side.append(scroll);
  return side;
};

const buildK25ObjectiveDetail = () => {
  const side = element("aside", "pte-detail pte-objective-story k25-objective");
  const scroll = element("div", "pte-objective-scroll");
  const header = element("header", "pte-objective-heading");
  header.append(
    element("span", "pte-version-badge", "K2.5"),
    element("h2", "", "视觉预训练：先矫正，再联合"),
    element("p", "", "SigLIP 初始化的特征空间和 NTP 目标不匹配，caption CE 先完成一次过渡。"),
  );
  const mismatch = element("figure", "pte-objective-problem");
  mismatch.append(
    element("h3", "", "SigLIP 初始化的特征空间和 NTP 目标不匹配"),
    buildFeatureSpaceMismatch(),
    element("figcaption", "", "SigLIP 只优化整图与整句匹配，不要求模型保留局部细节。切换到 NTP 时，初期 loss 高且梯度尖峰频繁。"),
  );
  const lower = element("section", "pte-objective-lower");
  const timeline = element("figure", "pte-objective-timeline-panel");
  timeline.append(
    element("h3", "", "两阶段对齐：先 caption CE，再联合 NTP"),
    buildK25VisionTimeline(),
    element("figcaption", "", "早期以 10% 视觉比例参与联合训练，在视觉与文本能力上优于晚期 50% 融合。"),
  );
  const notes = element("div", "pte-objective-notes");
  const why = element("article", "pte-objective-note warning");
  why.append(element("h3", "", "为什么需要第一步"), element("p", "", "SigLIP 权重的特征偏差过大，直接联合训练会持续出现梯度 spike。caption CE 先把 ViT 拉向 token 级目标。"));
  const signal = element("article", "pte-objective-note signal");
  const signalFormula = element("div", "pte-signal-formula");
  ["图片 → ViT", "↓", "[v₁…v₁₆] → 逐 token 预测描述"].forEach((copy) => signalFormula.append(element("code", "", copy)));
  signal.append(element("h3", "", "Caption CE 的训练信号"), signalFormula, element("p", "", "每个文字位置计算交叉熵，误差反传到 ViT。"));
  const result = element("article", "pte-objective-note result");
  result.append(element("h3", "", "实验结论"), element("strong", "", "早期 10% 视觉比例 > 晚期 50% 融合"), element("p", "", "先缩小目标空间偏差，再让视觉 token 从联合训练早期参与 NTP。"));
  notes.append(why, signal, result);
  lower.append(timeline, notes);
  scroll.append(header, mismatch, lower, element("p", "pte-objective-source", "🟢 来源：K2.5 Technical Report §4.2–§4.3。"));
  side.append(scroll);
  return side;
};

const buildK3ObjectiveDetail = () => {
  const side = element("aside", "pte-detail pte-objective-story k3-objective");
  const scroll = element("div", "pte-objective-scroll");
  const header = element("header", "pte-objective-heading");
  header.append(
    element("span", "pte-version-badge", "K3"),
    element("h2", "", "视觉预训练：一阶段从零对齐"),
    element("p", "", "随机初始化消除特征空间偏差，MTP 加密监督信号。"),
  );
  const decision = element("section", "pte-k3-decision");
  decision.append(element("h3", "", "K2.5 解决了目标粒度，但没解决初始化偏差"));
  const columns = element("div", "pte-k3-decision-columns");
  const legacy = element("article", "legacy");
  legacy.append(element("strong", "", "K2.5 的残留问题"));
  ["ViT 从 SigLIP 权重出发，特征空间已有偏向", "两阶段训练是补救，不是根治", "联合训练初期仍有梯度尖峰"].forEach((copy) => legacy.append(element("p", "", `- ${copy}`)));
  const answer = element("article", "answer");
  answer.append(element("strong", "", "K3 的回答"));
  ["偏差来自 SigLIP 初始化", "因此不用 SigLIP 权重", "从随机参数直接接受 NTP 目标"].forEach((copy) => answer.append(element("p", "", `- ${copy}`)));
  columns.append(legacy, answer);
  decision.append(columns);
  const lower = element("section", "pte-objective-lower");
  const timeline = element("figure", "pte-objective-timeline-panel");
  timeline.append(
    element("h3", "", "随机初始化 → 联合训练，从第一步就是同一个目标"),
    element("p", "pte-objective-timeline-comparison", "K2.5：3步（SigLIP → CE → 联合）｜K3：1步（随机 → 联合）"),
    buildK3VisionTimeline(),
    element("h4", "", "训练中 ViT 梯度范数"),
    buildVisionGradientImage(),
    element("figcaption", "", "SigLIP 初始化出现更高、更频繁的尖峰；随机初始化的梯度整体更平稳。"),
  );
  const notes = element("div", "pte-objective-notes");
  const why = element("article", "pte-objective-note solution");
  why.append(element("h3", "", "为什么一阶段可行"), element("p", "", "随机初始化的特征空间是空白。NTP 梯度从第一步起就在塑造需要的视觉特征，不必先纠正旧目标留下的偏差。"));
  const mtp = element("article", "pte-objective-note supervision");
  mtp.append(element("h3", "", "MTP 的额外价值"), buildMtpSupervision(), element("p", "", "同一步预测多个未来 token，迫使 ViT 特征保留更多可用信息。"));
  const result = element("article", "pte-objective-note result");
  result.append(element("h3", "", "实验结论"), element("strong", "", "从头训练的视觉编码器梯度更平稳"), element("p", "", "不再出现 SigLIP 初始化版本的频繁 spike。"));
  notes.append(why, mtp, result);
  lower.append(timeline, notes);
  scroll.append(header, decision, lower, element("p", "pte-objective-source", "🟢 来源：K3 Technical Report §2.4、§3.3。"));
  side.append(scroll);
  return side;
};

const buildDetail = (id, state, persist, rerender, navigate) => {
  if (state.optimizerTab) return buildSequenceDetail({ chapters: OPTIMIZER_CHAPTERS, stateKey: "optimizerTab", labelByTab: OPTIMIZER_LABEL_BY_TAB }, state, persist, rerender);
  if (state.multimodalTab) return buildSequenceDetail({ chapters: MULTIMODAL_CHAPTERS, stateKey: "multimodalTab", labelByTab: MULTIMODAL_LABEL_BY_TAB }, state, persist, rerender);
  if (state.contextTab) return buildSequenceDetail({ chapters: CONTEXT_CHAPTERS, stateKey: "contextTab", labelByTab: CONTEXT_LABEL_BY_TAB }, state, persist, rerender);
  if (state.dataTab) return buildDataDetail(state, persist, rerender);
  if (id === "lr-k2") return buildWsdDetail();
  if (id === "lr-k25") return buildWsdDetail(true);
  if (id === "lr-k3") return buildCosineDetail();
  if (id === "objective-k25") return buildK25ObjectiveDetail();
  if (id === "objective-k3") return buildK3ObjectiveDetail();
  const detail = getDetail(id);
  if (!detail) return buildEmptyDetail();
  const side = element("aside", "pte-detail");
  const heading = element("header", "pte-detail-heading");
  heading.append(element("span", "pte-version-badge", detail.version), element("h2", "", detail.title));
  const tabs = element("div", "segment-control pte-detail-tabs");
  [["why", "① 为什么改"], ["how", "② 如何改"], ["evidence", "③ 证据与边界"]].forEach(([id, label]) => {
    const button = element("button", state.detailTab === id ? "active" : "", label);
    button.type = "button";
    button.addEventListener("click", () => {
      state.detailTab = id;
      state.foldOpen = false;
      persist();
      rerender();
    });
    tabs.append(button);
  });
  const page = element("section", `pte-detail-page ${state.detailTab}`);
  const points = (items, className = "pte-detail-points") => {
    const list = element("ol", className);
    items.forEach((item) => list.append(element("li", "", item)));
    return list;
  };
  if (state.detailTab === "why") {
    page.append(
      element("span", "pte-story-label", "问题起点"),
      points(detail.why),
      element("p", "pte-story-bridge", `所以这一代的核心动作是：${detail.oneliner}`),
    );
  } else if (state.detailTab === "how") {
    page.append(element("span", "pte-story-label", "设计动作"), buildMiniVisual(detail), points(detail.how));
  } else {
    const foldButton = element("button", "pte-fold-button", state.foldOpen ? "⊖ 返回实验与结果" : "⊕ 展开公式与工程细节");
    foldButton.type = "button";
    foldButton.setAttribute("aria-expanded", String(state.foldOpen));
    foldButton.addEventListener("click", () => {
      state.foldOpen = !state.foldOpen;
      persist();
      rerender();
    });
    page.append(
      element("span", "pte-story-label", state.foldOpen ? "公式、边界与实现细节" : "实验、结果与限制"),
      points(state.foldOpen ? detail.deepDive : detail.evidence, state.foldOpen ? "pte-detail-points technical" : "pte-detail-points"),
      foldButton,
      element("p", "pte-detail-source", detail.source),
    );
  }
  side.append(heading, element("p", "pte-oneliner", detail.oneliner), tabs, page);
  if (detail.jumpTo) {
    const jump = element("button", "pte-jump-button", "深入了解 →");
    jump.type = "button";
    jump.addEventListener("click", () => navigate(detail.jumpTo));
    side.append(jump);
  }
  return side;
};

const makePipelineItem = (item, state, select) => {
  const className = `pte-pipeline-item ${item.relation ? `relation-${item.relation}` : ""}`;
  const node = element(item.id ? "button" : "span", className);
  node.append(
    element("span", "pte-pipeline-eyebrow", item.eyebrow),
    element("strong", "", item.text),
  );
  if (!item.id) return node;
  node.type = "button";
  node.dataset.label = item.id;
  node.classList.toggle("selected", state.selectedLabel === item.id);
  node.setAttribute("aria-pressed", String(state.selectedLabel === item.id));
  node.addEventListener("click", () => select(item.id));
  return node;
};

const buildOverview = (state, select) => {
  const wrap = element("section", "pte-map pte-overview-map");
  VERSIONS.forEach((version) => {
    const row = element("section", `pte-pipeline-row ${version.id}`);
    const versionLabel = element("header", "pte-pipeline-version");
    versionLabel.append(element("strong", "", version.label), element("small", "", version.year));
    row.append(versionLabel);
    OVERVIEW_PIPELINES[version.id].forEach((group) => {
      const section = element("section", `pte-strategy-group ${group.id}`);
      const items = element("div", "pte-strategy-items");
      group.items.forEach((item) => items.append(makePipelineItem(item, state, select)));
      if (group.label) {
        const heading = element("header", "pte-strategy-heading");
        heading.append(element("strong", "", group.label), element("small", "", group.summary));
        section.append(heading);
      }
      section.append(items);
      row.append(section);
    });
    wrap.append(row);
  });
  wrap.append(makeLegend());
  return wrap;
};

const buildDataView = (state, select, selectTab, returnToOverview) => {
  const wrap = element("section", "pte-map pte-data-map");
  const columns = element("div", "pte-lineage-columns");
  columns.append(element("span", "", "谱系"));
  VERSIONS.forEach((version) => columns.append(element("span", "", version.label)));
  wrap.append(columns);
  DATA_LINEAGES.forEach((lineage) => {
    const row = element("section", `pte-lineage-row ${state.dataTab === lineage.id ? "active" : ""}`);
    const title = element("button", "pte-lineage-title", lineage.tab);
    title.type = "button";
    title.addEventListener("click", () => selectTab(lineage.id));
    row.append(title);
    lineage.cells.forEach((cell, index) => {
      const slot = element("div", `pte-lineage-cell ${cell.toNext ? `link-${cell.toNext}` : ""}`);
      if (cell.labelId) {
        const node = element("button", `pte-lineage-node ${state.selectedLabel === cell.labelId ? "selected" : ""}`, cell.text);
        node.type = "button";
        node.dataset.label = cell.labelId;
        node.setAttribute("aria-pressed", String(state.selectedLabel === cell.labelId));
        node.addEventListener("click", () => select(cell.labelId));
        slot.append(node);
      } else if (cell.jumpTo) {
        const placeholder = element("button", "pte-lineage-node placeholder jumpable", cell.text);
        placeholder.type = "button";
        placeholder.dataset.jumpTo = cell.jumpTo;
        placeholder.title = cell.note || "";
        placeholder.addEventListener("click", () => select(cell.jumpTo));
        slot.append(placeholder);
      } else {
        const placeholder = element("span", `pte-lineage-node placeholder ${cell.toNext === "break" ? "break" : ""}`, cell.text);
        placeholder.title = cell.note || "";
        slot.append(placeholder);
      }
      if (index < lineage.cells.length - 1) slot.setAttribute("aria-label", `${cell.version} ${cell.text}，${cell.toNext === "inherit" ? "顺承至下一代" : cell.toNext === "break" ? "下一代中断" : "扩展至下一代"}`);
      row.append(slot);
    });
    wrap.append(row);
  });
  const footer = element("div", "pte-lineage-footer");
  const relationLegend = element("div", "pte-lineage-legend");
  [["inherit", "继承"], ["improve", "扩展"], ["redesign", "重启"], ["break", "中断"]].forEach(([tone, label]) => relationLegend.append(element("span", tone, label)));
  const back = element("button", "pte-back-link", "← 返回全维度总览");
  back.type = "button";
  back.addEventListener("click", returnToOverview);
  footer.append(relationLegend, back);
  wrap.append(footer);
  return wrap;
};

const buildViewSegments = (state, selectView) => {
  const segments = element("div", "segment-control pte-segments");
  [["overview", "四代管线"], ["data", "数据工程"], ["table", "参数对照"]].forEach(([id, label]) => {
    const button = element("button", state.leftView === id ? "active" : "", label);
    button.type = "button";
    button.addEventListener("click", () => selectView(id));
    segments.append(button);
  });
  return segments;
};

const DATA_ENTRY_BY_OVERVIEW = {
  "data-k15": "data-k15-filter",
  "data-k2": "data-k2-rephrasing",
  "data-k25": "data-k25-vision-seven",
  "data-k3": "data-k3-programmatic",
};

const buildTableView = (segments) => {
  const view = element("section", "pte-table-view");
  const header = element("header", "pte-table-heading");
  header.append(segments, element("h2", "", "六维预训练参数对照"), element("p", "", "目标、优化、LR、数据、序列与计算必须分别比较，不能互相替代。"));
  const table = element("div", "pte-comparison-table");
  ["维度", "K1.5", "K2", "K2.5", "K3"].forEach((item, index) => table.append(element("strong", index === 4 ? "featured" : "", item)));
  TABLE_ROWS.forEach((row) => row.forEach((item, index) => table.append(element(index === 0 ? "strong" : "span", index === 4 ? "featured" : "", item))));
  view.append(header, table, element("p", "pte-table-note", "* K1.5 优化器与部分训练参数未公开；AdamW 为推测项。"));
  return view;
};

export const renderPretrainingEvolution = (block, context) => {
  const stored = context.getValue(block.id, {});
  const storedOptimizerTab = stored.optimizerTab === "adamw" ? "momentum" : stored.optimizerTab;
  const validLabels = new Set([...LABELS, ...DATA_LABELS].map((label) => label.id));
  const selectedLabel = validLabels.has(stored.selectedLabel) ? stored.selectedLabel : null;
  const state = {
    leftView: stored.leftView === "data" || stored.leftView === "table" || stored.view === "table" ? (stored.leftView === "data" ? "data" : "table") : "overview",
    selectedLabel,
    foldOpen: Boolean(stored.foldOpen),
    detailTab: ["why", "how", "evidence"].includes(stored.detailTab) ? stored.detailTab : "why",
    optimizerTab: OPTIMIZER_TAB_BY_LABEL[selectedLabel] || (!selectedLabel && OPTIMIZER_CHAPTERS[storedOptimizerTab] ? storedOptimizerTab : null),
    multimodalTab: MULTIMODAL_TAB_BY_LABEL[selectedLabel] || (!selectedLabel && MULTIMODAL_CHAPTERS[stored.multimodalTab] ? stored.multimodalTab : null),
    contextTab: CONTEXT_TAB_BY_LABEL[selectedLabel] || (!selectedLabel && CONTEXT_CHAPTERS[stored.contextTab] ? stored.contextTab : null),
    dataTab: DATA_TAB_BY_LABEL[selectedLabel] || (stored.leftView === "data" && DATA_LINEAGES.some((lineage) => lineage.id === stored.dataTab) ? stored.dataTab : stored.leftView === "data" ? "quality" : null),
  };
  const clearSequenceTabs = () => {
    state.optimizerTab = null;
    state.multimodalTab = null;
    state.contextTab = null;
    state.dataTab = null;
  };
  const root = element("article", "block pretraining-evolution");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "pte-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const viewport = element("div", "pte-viewport");
  const persist = () => {
    context.setValue(block.id, { ...state });
    context.persist();
  };
  const navigate = (target) => context.action({ action: "branch", target });
  const selectView = (id) => {
    state.leftView = id;
    state.selectedLabel = null;
    state.foldOpen = false;
    state.detailTab = "why";
    clearSequenceTabs();
    if (id === "data") state.dataTab = "quality";
    persist();
    render();
  };

  const render = () => {
    if (state.leftView === "table") {
      viewport.replaceChildren(buildTableView(buildViewSegments(state, selectView)));
      return;
    }
    const main = element("section", "pte-main");
    const left = element("section", "pte-left");
    const toolbar = element("div", "pte-left-toolbar");
    toolbar.append(buildViewSegments(state, selectView));
    const select = (id) => {
      const overviewDataNode = LABELS.some((label) => label.id === id && label.dimension === "data");
      if (overviewDataNode) {
        state.leftView = "data";
        state.selectedLabel = DATA_ENTRY_BY_OVERVIEW[id];
        clearSequenceTabs();
        state.dataTab = DATA_TAB_BY_LABEL[state.selectedLabel];
      } else {
        state.selectedLabel = id;
        clearSequenceTabs();
        state.optimizerTab = OPTIMIZER_TAB_BY_LABEL[id] || null;
        state.multimodalTab = MULTIMODAL_TAB_BY_LABEL[id] || null;
        state.contextTab = CONTEXT_TAB_BY_LABEL[id] || null;
        state.dataTab = DATA_TAB_BY_LABEL[id] || null;
      }
      state.foldOpen = false;
      state.detailTab = "why";
      persist();
      render();
    };
    const selectDataTab = (id) => {
      state.selectedLabel = DATA_LABEL_BY_TAB[id];
      clearSequenceTabs();
      state.dataTab = id;
      persist();
      render();
    };
    const map = state.leftView === "overview" ? buildOverview(state, select) : buildDataView(state, select, selectDataTab, () => {
      state.leftView = "overview";
      state.selectedLabel = null;
      clearSequenceTabs();
      persist();
      render();
    });
    left.append(toolbar, map);
    const detail = buildDetail(state.selectedLabel, state, persist, render, navigate);
    main.append(left, detail);
    viewport.replaceChildren(main);
    fadeIn(map);
    fadeIn(detail);
  };

  root.trackNavigate = (direction) => {
    if (state.leftView === "table") return false;
    const candidates = state.leftView === "overview"
      ? VERSIONS.flatMap((version) => OVERVIEW_PIPELINES[version.id].flatMap((group) => group.items.filter((item) => item.id)))
      : DATA_LABELS;
    const index = state.selectedLabel ? candidates.findIndex((item) => item.id === state.selectedLabel) : -1;
    const next = index + direction;
    if (next < 0 || next >= candidates.length) return false;
    state.selectedLabel = candidates[next].id;
    if (DATA_ENTRY_BY_OVERVIEW[state.selectedLabel]) {
      state.leftView = "data";
      state.selectedLabel = DATA_ENTRY_BY_OVERVIEW[state.selectedLabel];
    }
    clearSequenceTabs();
    state.optimizerTab = OPTIMIZER_TAB_BY_LABEL[state.selectedLabel] || null;
    state.multimodalTab = MULTIMODAL_TAB_BY_LABEL[state.selectedLabel] || null;
    state.contextTab = CONTEXT_TAB_BY_LABEL[state.selectedLabel] || null;
    state.dataTab = DATA_TAB_BY_LABEL[state.selectedLabel] || null;
    state.foldOpen = false;
    state.detailTab = "why";
    persist();
    render();
    root.focus({ preventScroll: true });
    return true;
  };

  render();
  root.append(claims, viewport, element("p", "pte-source", `来源：${block.source}`));
  return root;
};
