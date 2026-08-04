import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import { ARCH_PARAMS, QB_EXAMPLE, calcComparisonWeights, calcSituGlu, formatMillions, formatParameters } from "./logic.js";

const TABS = [
  ["routing", "① 降维路由"],
  ["stability", "② 激活稳定"],
  ["balance", "③ 负载均衡"],
];

const addSvgText = (svg, x, y, text, className = "lmoe-svg-text", anchor = "middle") => {
  const node = svgElement("text", { x, y, class: className, "text-anchor": anchor }, text);
  svg.append(node);
  return node;
};

const flowNode = (svg, x, y, width, label, tone = "") => {
  svg.append(svgElement("rect", { x, y, width, height: 24, rx: 4, class: `lmoe-flow-node ${tone}` }));
  addSvgText(svg, x + width / 2, y + 16, label, "lmoe-flow-label");
};

const flowLine = (svg, x1, y1, x2, y2, dashed = false) => {
  svg.append(svgElement("line", { x1, y1, x2, y2, class: `lmoe-flow-line${dashed ? " dashed" : ""}` }));
};

const buildRoutingFlow = () => {
  const svg = svgElement("svg", {
    class: "lmoe-routing-svg",
    viewBox: "0 0 500 300",
    role: "img",
    "aria-label": "LatentMoE 从全宽输入到低维路由专家再与共享专家汇合的流程",
  });
  svg.append(svgElement("defs", {}));
  addSvgText(svg, 170, 17, "x（d=7168）", "lmoe-flow-value");
  flowLine(svg, 170, 23, 170, 34);
  flowNode(svg, 122, 34, 96, "W↓：d→ℓ", "blue");
  addSvgText(svg, 230, 49, "共享投影", "lmoe-flow-note", "start");
  flowLine(svg, 170, 58, 170, 70);
  addSvgText(svg, 170, 82, "z（ℓ=3584）", "lmoe-flow-value");
  flowLine(svg, 170, 87, 170, 98);
  flowNode(svg, 128, 98, 84, "Router", "accent");
  flowLine(svg, 212, 110, 278, 110);
  addSvgText(svg, 286, 107, "s₁…s₈₉₆", "lmoe-score", "start");
  addSvgText(svg, 286, 120, "选 Top-16", "lmoe-flow-note", "start");
  flowLine(svg, 170, 122, 170, 136);
  flowNode(svg, 106, 136, 128, "路由专家 ×16", "accent");
  addSvgText(svg, 246, 151, "ℓ 维空间", "lmoe-flow-note", "start");
  flowLine(svg, 170, 160, 170, 174);
  addSvgText(svg, 170, 186, "u（ℓ=3584，加权聚合）", "lmoe-flow-value");
  flowLine(svg, 170, 191, 170, 202);
  flowNode(svg, 124, 202, 92, "RMSNorm", "green");
  flowLine(svg, 170, 226, 170, 238);
  flowNode(svg, 122, 238, 96, "W↑：ℓ→d", "blue");
  addSvgText(svg, 230, 253, "共享投影", "lmoe-flow-note", "start");
  flowLine(svg, 170, 262, 170, 275);

  flowLine(svg, 170, 23, 392, 23, true);
  flowLine(svg, 392, 23, 392, 70, true);
  flowNode(svg, 334, 70, 116, "共享专家 ×2", "shared");
  addSvgText(svg, 392, 107, "全宽 d=7168 空间", "lmoe-flow-note");
  flowLine(svg, 392, 94, 392, 275, true);
  flowLine(svg, 170, 275, 392, 275);
  addSvgText(svg, 281, 280, "⊕", "lmoe-plus");
  flowLine(svg, 281, 284, 281, 291);
  addSvgText(svg, 281, 299, "y（d=7168）", "lmoe-flow-value");
  return svg;
};

const buildWeightBars = () => {
  const { denseModel, fullWidthMoe, latentMoe } = calcComparisonWeights();
  const wrap = element("div", "lmoe-weight-bars");
  wrap.append(element("p", "lmoe-weight-title", "完整模型 · 单 token 激活参数（线长同比例）"));
  const rows = [
    ["dense", "等容量 Dense（无 MoE）", `~${formatParameters(denseModel.total)}`, "100%"],
    ["full", "全宽 MoE（Top-16）", `~${formatParameters(fullWidthMoe.modelTotal)}`, `${fullWidthMoe.modelTotal / denseModel.total * 100}%`],
    ["latent", "K3 Stable LatentMoE", `${formatParameters(latentMoe.modelTotal)} · 官方`, `${latentMoe.modelTotal / denseModel.total * 100}%`],
  ];
  rows.forEach(([tone, label, value, width]) => {
    const row = element("div", `lmoe-weight-row ${tone}`);
    const bar = element("i");
    bar.style.width = width;
    row.append(element("span", "", label), element("strong", "", value), bar);
    wrap.append(row);
  });
  return wrap;
};

const buildRoutingPane = () => {
  const pane = element("section", "lmoe-routing-pane");
  pane.append(buildRoutingFlow());
  return pane;
};

const vectorRow = (label, inputWidth, outputWidth, tone = "") => {
  const row = element("div", `lmoe-vector-row ${tone}`);
  const input = element("i", "lmoe-vector-input");
  const output = element("i", "lmoe-vector-output");
  input.style.width = inputWidth;
  output.style.width = outputWidth;
  row.append(element("span", "", label), input, element("b", "", "W↑"), output);
  return row;
};

const buildRmsPanel = () => {
  const panel = element("section", "lmoe-stability-card rms");
  panel.append(element("h3", "", "RMSNorm：消除跨 token 范数差异"));
  const before = element("div", "lmoe-vector-demo");
  before.append(
    element("small", "", "修复前"),
    vectorRow("A · ‖u‖≈1", "22%", "20%"),
    vectorRow("B · ‖u‖≈4.5", "78%", "74%", "danger"),
    element("p", "danger", "B 梯度放大 4.5×；A 几乎消失"),
  );
  const after = element("div", "lmoe-vector-demo fixed");
  after.append(
    element("small", "", "经 RMSNorm"),
    vectorRow("A", "48%", "46%"),
    vectorRow("B", "48%", "46%"),
    element("p", "success", "梯度量级一致"),
  );
  panel.append(
    before,
    after,
    element("code", "lmoe-stability-formula", "RMSNorm(u) = u / √mean(u²) · γ"),
    element("p", "lmoe-stability-note", "位置：u 聚合后、W↑ 前；解决跨 token 输入分布方差，不解决矩阵内部溢出。"),
  );
  return panel;
};

const branch = (label, expression, limit, tone = "") => {
  const item = element("div", `lmoe-glu-branch ${tone}`);
  item.append(element("strong", "", label), element("code", "", expression), element("small", "", limit));
  return item;
};

const buildSituPanel = () => {
  const panel = element("section", "lmoe-stability-card situ");
  panel.append(element("h3", "", "SiTU-GLU：给专家内部乘法加硬上限"));
  const before = element("div", "lmoe-glu-before");
  before.append(
    branch("gate 路", "a = 20", "无上界", "danger"),
    element("b", "lmoe-times", "⊙"),
    branch("up 路", "b = 100", "无上界", "danger"),
    element("strong", "lmoe-outlier", "= 2000"),
  );
  const bounded = element("div", "lmoe-glu-bounded");
  bounded.append(
    element("span", "", "z"),
    branch("Wgate", "β₁ tanh(a/β₁) σ(a)", "≤ β₁ = 4"),
    element("b", "lmoe-times", "⊙"),
    branch("Wup", "β₂ tanh(b/β₂)", "≤ β₂ = 25"),
    element("b", "lmoe-times", "→ Wdown"),
  );
  panel.append(
    before,
    element("p", "lmoe-bf16-warning", "BF16 精度集中在离群坐标，其余坐标有效下溢为 0"),
    bounded,
    element("strong", "lmoe-hard-limit", "|输出坐标| ≤ β₁ × β₂ = 100"),
    element("p", "lmoe-stability-note", "SwiGLU 无上界，可达 2000+；SiTU-GLU 在异常区硬顶 100。"),
  );
  return panel;
};

const buildStabilityPane = () => {
  const pane = element("section", "lmoe-stability-pane");
  const panels = element("div", "lmoe-stability-panels");
  panels.append(buildRmsPanel(), buildSituPanel());
  const comparison = element("div", "lmoe-input-comparison");
  const normalSitu = calcSituGlu(3, 20);
  [
    ["", "SwiGLU", "SiTU-GLU"],
    ["正常输入 a=3, b=20", "≈55.7", `≈${(Math.floor(normalSitu * 10) / 10).toFixed(1)}`],
    ["异常输入 a=20, b=100", "≈2000", "≤100"],
  ].forEach((row, rowIndex) => row.forEach((value) => comparison.append(element(rowIndex ? "span" : "strong", "", value))));
  comparison.append(element("p", "", "正常区行为相近；异常区 SiTU-GLU 封顶。"));
  pane.append(panels, comparison);
  return pane;
};

const buildScoreMatrix = (balanced = false) => {
  const matrix = element("div", `lmoe-score-matrix${balanced ? " balanced" : ""}`);
  ["", "E₁", "E₂", "E₃", "E₄"].forEach((label) => matrix.append(element("strong", "", label)));
  QB_EXAMPLE.scores.forEach((row, tokenIndex) => {
    matrix.append(element("strong", "", `t${tokenIndex + 1}`));
    row.forEach((score, expertIndex) => {
      const cell = element("i");
      const selected = balanced ? expertIndex === (tokenIndex + 2) % 4 || expertIndex === tokenIndex % 4 : expertIndex < 2;
      cell.style.opacity = String(0.16 + score * 0.84);
      cell.classList.toggle("selected", selected);
      cell.title = score.toFixed(2);
      matrix.append(cell);
    });
  });
  return matrix;
};

const buildLoadBars = (values, balanced = false) => {
  const wrap = element("div", `lmoe-load-bars${balanced ? " balanced" : ""}`);
  values.forEach((value, index) => {
    const column = element("div", "lmoe-load-column");
    const bar = element("i");
    bar.style.height = `${Math.max(4, value * 19)}%`;
    column.append(element("b", "", String(value)), bar, element("span", "", `E${index + 1}`));
    wrap.append(column);
  });
  return wrap;
};

const buildBalanceCard = (stage, state) => {
  const card = element("section", `lmoe-balance-card stage-${stage}${state.animStage >= stage ? " active" : ""}`);
  card.append(element("span", "lmoe-stage-number", `0${stage}`));
  if (stage === 1) {
    card.append(
      element("h3", "", "Router 朴素 Top-1：头部专家过载"),
      buildScoreMatrix(),
      buildLoadBars(QB_EXAMPLE.before),
    );
  } else if (stage === 2) {
    card.append(element("h3", "", "QB：读分位数，算精确偏置"));
    const biases = element("div", "lmoe-bias-grid");
    QB_EXAMPLE.biases.forEach((bias, index) => {
      const positive = bias > 0;
      const item = element("div", positive ? "positive" : "negative");
      item.append(element("strong", "", `E${index + 1}`), element("b", "", `${positive ? "↑ +" : "↓ "}${bias.toFixed(2)}`));
      biases.append(item);
    });
    card.append(biases, element("p", "", "根据余量分位数计算偏置，不是固定步长。"));
  } else {
    card.append(
      element("h3", "", "均衡后：负载平，匹配质量最大"),
      buildScoreMatrix(true),
      buildLoadBars(QB_EXAMPLE.after, true),
      element("p", "success", "优先保留每位专家余量最大的 token"),
    );
  }
  return card;
};

const playBalanceAnimation = (state, host, persist) => {
  state.animRun += 1;
  const run = state.animRun;
  state.animStage = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = performance.now();
  const tick = (now) => {
    if (!host.isConnected || run !== state.animRun) return;
    const stage = reduced ? 3 : Math.min(3, Math.floor((now - start) / 220) + 1);
    if (stage !== state.animStage) {
      state.animStage = stage;
      host.querySelectorAll(".lmoe-balance-card").forEach((card, index) => card.classList.toggle("active", index < stage));
      persist();
    }
    if (stage < 3) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const buildBalancePane = (state, persist, navigateToQb) => {
  const pane = element("section", "lmoe-balance-pane");
  const toolbar = element("div", "lmoe-balance-toolbar");
  toolbar.append(element("p", "", "旧方法需多轮试探；QB 从整列余量分布直接求偏置，一步逼近。"));
  const replay = element("button", "lmoe-replay", "↻ 重播");
  replay.type = "button";
  toolbar.append(replay);
  const cards = element("div", "lmoe-balance-cards");
  [1, 2, 3].forEach((stage) => cards.append(buildBalanceCard(stage, state)));
  const deepLink = element("button", "lmoe-qb-link", "→ 深入了解 QB 推导过程");
  deepLink.type = "button";
  deepLink.addEventListener("click", navigateToQb);
  pane.append(toolbar, cards, deepLink);
  replay.addEventListener("click", () => playBalanceAnimation(state, cards, persist));
  playBalanceAnimation(state, cards, persist);
  return pane;
};

const buildRoutingSide = (state, persist) => {
  const { d, l, N, K, sharedExperts, layers } = ARCH_PARAMS;
  const { denseModel, fullWidthMoe, latentMoe, fixedActivated } = calcComparisonWeights();
  const pages = [
    {
      tabLabel: "01 Dense",
      eyebrow: "01 · 等容量 Dense（反事实）",
      title: "没有 MoE：每 token 支付全部 2.78T",
      params: [["比较口径", "完整模型"], ["参数容量", formatParameters(denseModel.total)], ["条件路由", "无"]],
      modelRows: [
        ["保留同等模型能力容量", formatParameters(denseModel.total)],
        ["本 token 跳过参数", "0"],
        ["本 token 激活比例", "100%"],
        ["激活参数量 / K3", `${(denseModel.total / latentMoe.modelTotal).toFixed(1)}×`],
      ],
      total: denseModel.total,
      note: "假设移除条件计算但保留同等容量；26.7× 是参数量比，不是端到端速度比。",
    },
    {
      tabLabel: "02 全宽 MoE",
      eyebrow: "02 · 全宽 MoE（受控推导）",
      title: "有 MoE：只激活 Top-16，但专家仍在 d 维",
      params: [["MoE 层数", layers], ["激活专家 K", K], ["专家宽度", `d=${d}`], ["共享专家", `${sharedExperts} / 层`]],
      layerRows: [
        [`路由专家 K×3dm`, formatMillions(fullWidthMoe.routedExperts)],
        [`共享专家 ${sharedExperts}×3dm`, formatMillions(fullWidthMoe.shared)],
      ],
      layerTotal: fullWidthMoe.total,
      modelRows: [
        [`${layers} 层 × ${formatMillions(fullWidthMoe.total)}`, formatParameters(fullWidthMoe.allLayers)],
        ["其他固定激活参数", formatParameters(fixedActivated)],
      ],
      total: fullWidthMoe.modelTotal,
      note: "仅把 routed path 从 ℓ 改回 d；attention、embedding 等固定部分保持 K3 不变。",
    },
    {
      tabLabel: "03 LatentMoE",
      eyebrow: "03 · K3 Stable LatentMoE（官方）",
      title: "MoE + 降维：模型级激活降到 104.2B",
      params: [["MoE 层数", layers], ["专家池 N / K", `${N} / ${K}`], ["模型宽度 d", d], ["路由宽度 ℓ", `${l} · d/2`]],
      layerRows: [
        ["W↓ d×ℓ", formatMillions(latentMoe.wDown)],
        ["路由专家 K×3ℓm", formatMillions(latentMoe.routedExperts)],
        ["W↑ ℓ×d", formatMillions(latentMoe.wUp)],
        [`共享专家 ${sharedExperts}×3dm`, formatMillions(latentMoe.shared)],
      ],
      layerTotal: latentMoe.total,
      modelRows: [
        [`${layers} 层 × ${formatMillions(latentMoe.total)}`, formatParameters(latentMoe.allLayers)],
        ["其他固定激活参数", formatParameters(fixedActivated)],
      ],
      total: latentMoe.modelTotal,
      note: "104.2B 是 Table 1 的模型级 activated parameters；不是单层权重或 FLOPs。",
    },
  ];
  const side = element("aside", "lmoe-side lmoe-routing-side");
  const header = element("header", "lmoe-side-pager");
  header.append(element("p", "lmoe-side-kicker", "ACTIVATED PARAMETER DERIVATION"));
  const controls = element("div", "segment-control lmoe-calc-tabs");
  const pageHost = element("div", "lmoe-calc-page-host");
  const buttons = pages.map((page, index) => {
    const button = element("button", "", page.tabLabel);
    button.type = "button";
    button.addEventListener("click", () => {
      if (state.calcPage === index) return;
      state.calcPage = index;
      renderPage();
    });
    controls.append(button);
    return button;
  });
  header.append(controls);
  const renderPage = () => {
    const page = pages[state.calcPage];
    const body = element("section", "lmoe-calc-page");
    body.append(element("p", "lmoe-calc-eyebrow", page.eyebrow), element("h3", "", page.title));
    const params = element("div", "lmoe-param-grid");
    page.params.forEach(([label, value]) => params.append(element("span", "", label), element("strong", "", String(value))));
    body.append(params);
    if (page.layerRows) {
      const layerSummary = element("div", "lmoe-path-summary lmoe-layer-summary");
      page.layerRows.forEach(([label, value]) => layerSummary.append(element("span", "", label), element("b", "", value)));
      layerSummary.append(element("strong", "", "单层合计"), element("strong", "", `≈ ${formatMillions(page.layerTotal)}`));
      body.append(element("p", "lmoe-side-divider", "单个 MoE 层"), layerSummary);
    }
    const modelSummary = element("div", "lmoe-path-summary lmoe-model-summary");
    page.modelRows.forEach(([label, value]) => modelSummary.append(element("span", "", label), element("b", "", value)));
    modelSummary.append(element("strong", "", "模型级合计"), element("strong", "", `≈ ${formatParameters(page.total)}`));
    body.append(element("p", "lmoe-side-divider", "一个 token 跑完整模型"), modelSummary, element("p", "lmoe-calc-note", page.note));
    pageHost.replaceChildren(body);
    buttons.forEach((button, index) => {
      const active = index === state.calcPage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    persist();
    animateIn(body);
  };
  side.append(header, pageHost, buildWeightBars());
  renderPage();
  return side;
};

const buildStabilitySide = () => {
  const side = element("aside", "lmoe-side lmoe-stability-side");
  side.append(element("p", "lmoe-side-kicker", "两道护栏，各管一段"));
  const flow = element("div", "lmoe-mini-flow");
  flow.append(
    element("span", "", "z"), element("i", "", "↓"),
    element("strong", "situ", "路由专家 FFN"),
    element("p", "situ", "SiTU-GLU：限制 gate × up 的单坐标离群"),
    element("i", "", "↓"), element("span", "", "u"), element("i", "", "↓"),
    element("strong", "rms", "RMSNorm"),
    element("p", "rms", "拉齐跨 token 范数，稳定 W↑ 梯度"),
    element("i", "", "↓"), element("span", "", "W↑"),
  );
  const division = element("div", "lmoe-tool-division");
  division.append(
    element("strong", "rms", "RMSNorm"), element("p", "", "跨 token 范数差异 → W↑ 梯度失衡"),
    element("strong", "situ", "SiTU-GLU"), element("p", "", "gate×up 无界相乘 → 单坐标离群值"),
  );
  side.append(flow, division);
  return side;
};

const buildBalanceSide = () => {
  const side = element("aside", "lmoe-side lmoe-balance-side");
  side.append(element("p", "lmoe-side-kicker", "BIAS UPDATE COMPARISON"));
  const table = element("div", "lmoe-qb-table");
  ["", "旧方法", "QB", "偏置更新量", "±γ（固定）", "精确余量分位数", "收敛轮数", "多轮迭代", "一步逼近", "超参数", "需调 γ", "无", "路由质量", "不考虑", "保留高余量 token"]
    .forEach((value, index) => table.append(element(index < 3 ? "strong" : "span", "", value)));
  side.append(table, element("p", "lmoe-qb-principle", "QB 本质是在均衡约束下最大化路由匹配分数。"));
  return side;
};

const buildFormulaView = (onBack) => {
  const view = element("section", "lmoe-formula-view");
  const back = element("button", "lmoe-formula-back", "← 返回动画");
  back.type = "button";
  back.addEventListener("click", onBack);
  view.append(back);
  const formulas = [
    ["01", "LatentMoE 完整输出", "y = Σⱼ Eⱼˢʰᵃʳᵉᵈ(x) + W↑ · RMSNorm(u)", "z = W↓ · x\nu = Σᵢ₌₁¹⁶ pᵢ · Eᵢʳᵒᵘᵗᵉᵈ(z)\npᵢ = Sigmoid(sᵢ)，s = Router(z) 的 Top-16 分数"],
    ["02", "SiTU-GLU 专家 FFN", "[β₁·tanh(a/β₁)·Sigmoid(a)] ⊙ [β₂·tanh(b/β₂)]", "a = Wgate · z，b = Wup · z，输出 → Wdown → ℓ 维\nβ₁=4，β₂=25，|输出坐标| ≤ 100"],
    ["03", "QB 偏置更新 · 一步", "marginᵢⱼ = sᵢⱼ − αᵢ", "αᵢ = token i 的 Top-(k+1) 分数\nb̂ⱼ = −专家 j 余量的第 (1−k/n) 分位数\nbⱼ = b̂ⱼ − mean(b̂)\n路由 Top-k(s+b)，输出权重仍使用原始 s"],
  ];
  formulas.forEach(([number, title, formula, detail]) => {
    const section = element("section", "lmoe-formula-section");
    section.append(element("span", "", number), element("h3", "", title), element("code", "", formula), element("p", "", detail));
    view.append(section);
  });
  return view;
};

const animateIn = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  node.style.opacity = "0";
  const start = performance.now();
  const tick = (now) => {
    if (!node.isConnected) return;
    const progress = Math.min(1, (now - start) / MOTION.fast);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.style.opacity = String(eased);
    node.style.transform = `translateX(${(1 - eased) * 8}px)`;
    if (progress < 1) requestAnimationFrame(tick);
    else node.style.transform = "";
  };
  requestAnimationFrame(tick);
};

export const renderLatentMoe = (block, context) => {
  const stored = context.getValue(block.id, {});
  const validTabs = new Set(TABS.map(([id]) => id));
  const state = {
    activeTab: validTabs.has(stored.activeTab) ? stored.activeTab : "routing",
    calcPage: Math.min(2, Math.max(0, Number(stored.calcPage) || 0)),
    animStage: 0,
    animRun: 0,
    view: stored.view === "formula" ? "formula" : "main",
  };
  const root = element("article", "block latent-moe");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "lmoe-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const viewport = element("div", "lmoe-viewport");
  const persist = () => {
    context.setValue(block.id, { activeTab: state.activeTab, calcPage: state.calcPage, animStage: state.animStage, view: state.view });
    context.persist();
  };
  const navigateToQb = () => context.action({ action: "branch", target: "quantile-balancing" });

  const renderMain = () => {
    const main = element("section", "lmoe-main");
    const left = element("section", "lmoe-left");
    const tabs = element("div", "segment-control lmoe-tabs");
    const panelHost = element("div", "lmoe-panel-host");
    const sideHost = element("div", "lmoe-side-host");
    const renderTab = () => {
      state.animRun += 1;
      state.animStage = 0;
      const pane = state.activeTab === "routing" ? buildRoutingPane()
        : state.activeTab === "stability" ? buildStabilityPane()
          : buildBalancePane(state, persist, navigateToQb);
      const side = state.activeTab === "routing" ? buildRoutingSide(state, persist)
        : state.activeTab === "stability" ? buildStabilitySide() : buildBalanceSide();
      panelHost.replaceChildren(pane);
      sideHost.replaceChildren(side);
      tabs.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.activeTab));
      persist();
      animateIn(pane);
      animateIn(side);
    };
    TABS.forEach(([id, label]) => {
      const button = element("button", state.activeTab === id ? "active" : "", label);
      button.type = "button";
      button.dataset.tab = id;
      button.addEventListener("click", () => {
        if (state.activeTab === id) return;
        state.activeTab = id;
        renderTab();
      });
      tabs.append(button);
    });
    left.append(tabs, panelHost);
    main.append(left, sideHost);
    viewport.replaceChildren(main);
    renderTab();
  };

  const renderView = () => {
    if (state.view === "formula") {
      viewport.replaceChildren(buildFormulaView(() => {
        state.view = "main";
        persist();
        renderView();
      }));
      return;
    }
    renderMain();
  };

  root.trackNavigate = (direction) => {
    if (direction > 0 && state.view === "main") state.view = "formula";
    else if (direction < 0 && state.view === "formula") state.view = "main";
    else return false;
    persist();
    renderView();
    root.focus({ preventScroll: true });
    return true;
  };

  const footer = element("footer", "lmoe-footer");
  const deepButton = element("button", "lmoe-deep-button", "深入了解 Quantile Balancing 推导过程 →");
  deepButton.type = "button";
  deepButton.addEventListener("click", navigateToQb);
  footer.append(deepButton, element("p", "lmoe-source", `来源：${block.source}`));
  renderView();
  root.append(claims, viewport, footer);
  return root;
};
