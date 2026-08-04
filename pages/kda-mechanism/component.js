import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import {
  TOKEN_ALPHA_PROFILES,
  buildStepCells,
  calcEffectiveWindow,
  calcRetention,
} from "./logic.js";
import { KDA_CONNECTIONS } from "./connections.js";

const STEP_NAMES = ["朴素写入", "问题暴露", "Delta 修复", "查询", "输出门控"];
const WRITE_STEPS = [
  {
    title: "投影出五个信号",
    formulas: [
      ["qₜ, kₜ = L₂Norm(Swish(ShortConv(Wq/k·xₜ)))", "blue"],
      ["vₜ = Swish(ShortConv(Wv·xₜ))", "green"],
      ["βₜ = Sigmoid(Wβ·xₜ) ∈ (0,1)", "accent"],
      ["gₜ = gmin·Sigmoid(eᴬ·zₜ),  αₜ = exp(gₜ) ∈ (e⁻⁵,1)", "blue"],
      ["gateₜ = Sigmoid(Wg·xₜ)", "purple"],
    ],
    intuition: "xₜ 分裂成五种角色，各司其职。",
    why: "没有这步，状态矩阵没有读写地址，也没有遗忘控制。",
  },
  {
    title: "问题暴露：朴素累加",
    formulas: [
      ["朴素写入：Sₜ = Sₜ₋₁ + kₜvₜᵀ", "accent"],
      ["若 k₂ ≈ k₁  →  Sₜᵀq 同时含 v₁、v₂", "accent"],
    ],
    intuition: "相似的 key 会互相干扰，召回时无法区分。",
    why: "看见这个失败，才有 Delta Rule 写前擦除的动机。",
  },
  {
    title: "Delta 修复：衰减 + 擦除 + 写入",
    formulas: [
      ["Sₜ = (I−βₜkₜkₜᵀ)·Diag(αₜ)·Sₜ₋₁ + βₜkₜvₜᵀ", "master"],
      ["① Diag(αₜ)·Sₜ₋₁    衰减：旧信息按通道衰减", "blue"],
      ["② (I−βₜkₜkₜᵀ)·[①]    擦除：清除 kₜ 方向残留", "accent"],
      ["③ + βₜkₜvₜᵀ    写入：当前 token 写入状态", "green"],
    ],
    intuition: "先腾出位置，再写入新内容。",
    why: "没有擦除，同方向 key 的历史内容会和新内容叠加混淆。",
  },
  {
    title: "状态查询",
    formulas: [["õₜ = Sₜᵀ·qₜ", "green"]],
    intuition: "用关键词 qₜ 从状态数据库里召回相关历史。",
    why: "像搜索引擎关键词匹配，读出是历史内容的加权混合。",
  },
  {
    title: "输出门控",
    formulas: [
      ["yₜ = Wₒ[Sigmoid(Wg·xₜ) ⊙ RMSNorm(õₜ)]", "purple"],
      ["Wg ∈ ℝᵈˣᵈ：全秩感知 xₜ 的完整维度", "master"],
    ],
    intuition: "召回的内容不全有用，门控按当前输入筛选。",
    why: "像搜索结果召回后再筛一道；低秩门控会丢失部分输入信息。",
  },
];
const TABS = [
  ["evolution", "① 演进路径"],
  ["write", "② 计算过程"],
  ["decay", "③ 衰减机制"],
  ["hybrid", "④ 混合架构"],
];

const EVOLUTION_MODELS = [
  { id: "retnet", index: "01", title: "RetNet", formula: "Sₜ = γSₜ₋₁ + kₜvₜᵀ", summary: "固定衰减：稳定，但所有内容同速遗忘" },
  { id: "gla", index: "02", title: "GLA / Mamba", formula: "Sₜ = Diag(αₜ)Sₜ₋₁ + kₜvₜᵀ", summary: "动态衰减：内容与通道可拥有不同寿命" },
  { id: "deltanet", index: "03", title: "Gated DeltaNet", formula: "Sₜ = (I−βₜkₜkₜᵀ) · αₜSₜ₋₁ + βₜkₜvₜᵀ", summary: "标量 α 全局遗忘，Delta Rule 定向擦除后写入" },
  { id: "kda", index: "04", title: "KDA", formula: "Sₜ = (I−βₜkₜkₜᵀ) · Diag(αₜ)Sₜ₋₁ + βₜkₜvₜᵀ", summary: "把标量 α 扩展为逐通道衰减，并补齐稳定与全秩门控" },
];

const animateIn = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / MOTION.fast);
    node.style.opacity = String(progress);
    node.style.transform = `translateX(${(1 - progress) * 10}px)`;
    if (progress < 1) requestAnimationFrame(tick);
    else node.style.transform = "";
  };
  requestAnimationFrame(tick);
};

const pulse = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / MOTION.step);
    node.style.opacity = String(0.6 + 0.4 * progress);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const addSvgText = (svg, x, y, value, className = "kdam-svg-label") => {
  const node = svgElement("text", { x, y, class: className }, value);
  svg.append(node);
  return node;
};

const architectureNode = (svg, { x, y, width, height, label, id, tone = "" }, activeIds) => {
  const group = svgElement("g", { class: `kdam-arch-node ${activeIds.has(id) ? "active" : ""}`, "data-node": id });
  group.append(
    svgElement("rect", { x, y, width, height, rx: "3", class: tone }),
    svgElement("text", { x: x + width / 2, y: y + height / 2 + 3, "text-anchor": "middle" }, label),
  );
  svg.append(group);
};

const buildArchitectureSvg = (step) => {
  const svg = svgElement("svg", { class: "kdam-architecture", viewBox: "0 0 520 330", role: "img", "aria-label": "Kimi Delta Attention 架构" });
  const active = new Set(step === 1 ? ["v", "update"]
    : step === 2 ? ["update"]
      : step === 3 ? ["alpha", "beta", "update"]
        : step === 4 ? ["kq", "read"] : ["read", "norm", "gate", "out"]);
  const line = (x1, y1, x2, y2, ids) => svg.append(svgElement("line", {
    x1, y1, x2, y2, class: ids.some((id) => active.has(id)) ? "kdam-arch-line active" : "kdam-arch-line",
  }));
  addSvgText(svg, 260, 322, "输入 xₜ", "kdam-arch-input");
  line(260, 305, 260, 294, ["kq", "v", "alpha", "beta", "gate"]);
  line(58, 294, 462, 294, ["kq", "v", "alpha", "beta", "gate"]);
  const branches = [
    { x: 18, label: "q / k", id: "kq" }, { x: 116, label: "v", id: "v" },
    { x: 214, label: "α", id: "alpha" }, { x: 312, label: "β", id: "beta" },
    { x: 410, label: "gate", id: "gate" },
  ];
  branches.forEach(({ x, label, id }) => {
    line(x + 40, 294, x + 40, 273, [id]);
    architectureNode(svg, { x, y: 246, width: 80, height: 27, label: "Linear", id }, active);
    line(x + 40, 246, x + 40, 231, [id]);
    architectureNode(svg, { x, y: 204, width: 80, height: 27, label: id === "kq" ? "Conv + L₂" : id === "alpha" ? "gmin·σ(eᴬz)" : id === "beta" || id === "gate" ? "Sigmoid" : label, id }, active);
    addSvgText(svg, x + 40, 197, id === "alpha" ? "α=exp(g)" : label, "kdam-branch-label");
  });
  svg.append(svgElement("rect", { x: "44", y: "83", width: "334", height: "88", rx: "5", class: "kdam-core" }));
  addSvgText(svg, 211, 101, "Kimi Delta Attention", "kdam-core-title");
  architectureNode(svg, { x: 67, y: 118, width: 130, height: 34, label: "状态更新 Sₜ", id: "update", tone: "update" }, active);
  architectureNode(svg, { x: 225, y: 118, width: 130, height: 34, label: "读取 Sₜᵀqₜ", id: "read", tone: "read" }, active);
  [[58, "kq"], [156, "v"], [254, "alpha"], [352, "beta"]].forEach(([x, id]) => line(x, 204, id === "kq" && step === 4 ? 290 : 132, 171, [id, id === "kq" && step === 4 ? "read" : "update"]));
  line(290, 118, 290, 68, ["read"]);
  architectureNode(svg, { x: 250, y: 40, width: 80, height: 28, label: "RMSNorm", id: "norm" }, active);
  line(290, 40, 290, 25, ["norm"]);
  line(450, 204, 450, 54, ["gate"]);
  line(450, 54, 342, 54, ["gate"]);
  addSvgText(svg, 354, 47, "⊙", "kdam-gate-symbol");
  architectureNode(svg, { x: 185, y: 3, width: 150, height: 24, label: "Linear → yₜ", id: "out" }, active);
  line(290, 25, 290, 27, ["out"]);
  if (step === 2) addSvgText(svg, 108, 112, "⚠ 键冲突", "kdam-conflict-text");
  return svg;
};

const buildWriteFlowSvg = (step) => {
  const svg = svgElement("svg", {
    class: "kdam-write-flow", viewBox: "0 0 700 550", role: "img",
    "aria-label": `KDA 记事本写入 Step ${step} 数据流`, "data-step": String(step),
  });
  const defs = svgElement("defs");
  const marker = svgElement("marker", { id: "kdam-flow-arrow", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "5", markerHeight: "5", orient: "auto-start-reverse" });
  marker.append(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z" }));
  defs.append(marker);
  svg.append(defs);
  const stateClass = (steps, base) => `${base} ${steps.includes(step) ? "active" : "muted"}`;
  const path = (d, steps, extra = "") => {
    const attrs = { d, class: stateClass(steps, `kdam-flow-line ${extra}`) };
    if (steps.includes(step)) attrs["marker-end"] = "url(#kdam-flow-arrow)";
    svg.append(svgElement("path", attrs));
  };
  const node = (x, y, width, height, title, subtitle, steps, extra = "") => {
    const group = svgElement("g", { class: stateClass(steps, `kdam-flow-node ${extra}`) });
    const subtitleLines = Array.isArray(subtitle) ? subtitle : subtitle ? [subtitle] : [];
    group.append(
      svgElement("rect", { x, y, width, height, rx: "4" }),
      svgElement("text", { x: x + width / 2, y: y + (subtitleLines.length > 1 ? height / 2 - 12 : subtitleLines.length ? height / 2 - 4 : height / 2 + 4), "text-anchor": "middle", class: "title" }, title),
    );
    subtitleLines.forEach((line, index) => group.append(svgElement("text", {
      x: x + width / 2, y: y + height / 2 + 8 + index * 14, "text-anchor": "middle", class: "subtitle",
    }, line)));
    svg.append(group);
    return group;
  };

  node(280, 505, 140, 34, "输入 xₜ ∈ ℝᵈ", "", [1, 5], "input");
  path("M350 505 V490 H70 V475", [1]);
  path("M350 490 H208 V475", [1]);
  path("M350 490 V475", [1]);
  path("M350 490 H492 V475", [1]);
  path("M350 490 H630 V475", [1]);

  node(3, 405, 134, 70, "qₜ / kₜ", ["Linear · ShortConv", "Swish · L₂Norm"], [1, 3, 4], "projection qk");
  node(141, 405, 134, 70, "vₜ", ["Linear · ShortConv", "Swish"], [1, 3], "projection value");
  node(283, 405, 134, 70, "αₜ = exp(gₜ)", ["低秩投影 + bias", "gmin·σ(eᴬz)"], [1, 3], "projection alpha");
  node(425, 405, 134, 70, "βₜ", ["Linear", "Sigmoid"], [1, 3], "projection beta");
  node(563, 405, 134, 70, "gateₜ", ["Linear", "Sigmoid"], [1, 5], "projection gate");

  path("M70 405 V392 H270 V380", [2, 3], "to-update");
  path("M208 405 V388 H330 V380", [2, 3], "to-update");
  path("M350 405 V384 H390 V380", [3], "to-update");
  path("M492 405 V388 H450 V380", [3], "to-update");
  node(18, 303, 118, 42, "旧状态 Sₜ₋₁", "", [3], "state-small");
  path("M136 324 H185", [3], "to-update");
  const updateNode = node(185, 265, 330, 115, "状态更新", "", [2, 3], "state-update");
  updateNode.querySelector(".title").setAttribute("y", "284");
  node(560, 303, 118, 42, "新状态 Sₜ", "", [3, 4], "state-small");
  path("M515 324 H560", [3], "from-update");

  if (step === 2) {
    addSvgText(svg, 350, 305, "朴素累加：Sₜ = Sₜ₋₁ + kₜvₜᵀ", "kdam-update-line conflict");
    addSvgText(svg, 350, 336, "k₂ ≈ k₁  →  查询同时混入 v₁、v₂", "kdam-update-line conflict strong");
    addSvgText(svg, 350, 360, "没有擦除：同方向内容持续叠加", "kdam-update-line conflict");
  } else {
    addSvgText(svg, 350, 300, "① Diag(αₜ)·Sₜ₋₁    ← 衰减旧状态", `kdam-update-line decay ${step === 3 ? "active" : "muted"}`);
    addSvgText(svg, 350, 329, "② (I−βₜkₜkₜᵀ)·[①]    ← 擦除冲突", `kdam-update-line erase ${step === 3 ? "active" : "muted"}`);
    addSvgText(svg, 350, 358, "③ + βₜkₜvₜᵀ    ← 写入新内容", `kdam-update-line write ${step === 3 ? "active" : "muted"}`);
  }

  path("M70 405 V215 H250", [4], "to-read");
  path("M619 303 V215 H450", [4], "to-read");
  node(250, 188, 200, 54, "Sₜᵀ·qₜ → õₜ", "状态读取", [4], "read");

  path("M350 188 V170 H190 V150", [5], "to-output");
  path("M630 405 V127 H600", [5], "to-output gate-route");
  node(100, 105, 180, 45, "RMSNorm(õₜ)", "", [5], "output-stage");
  node(420, 105, 180, 45, "Sigmoid(Wg·xₜ)", "gate", [5], "output-stage");
  addSvgText(svg, 350, 133, "⊙", `kdam-flow-product ${step === 5 ? "active" : "muted"}`);
  path("M280 127 H335", [5], "to-output");
  path("M420 127 H365", [5], "to-output");
  path("M350 115 V94", [5], "to-output");
  node(280, 60, 140, 34, "Wₒ[gate ⊙ õₜ]", "", [5], "output-stage");
  path("M350 60 V49", [5], "to-output");
  node(280, 15, 140, 34, "输出 yₜ ∈ ℝᵈ", "", [5], "output");
  return svg;
};

const drawMiniMatrix = (svg, x, y, tone, dirty = false) => {
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      svg.append(svgElement("rect", {
        x: x + col * 11, y: y + row * 11, width: "9", height: "9",
        class: row === 0 ? `kdam-mini-cell ${dirty ? "dirty" : tone}` : "kdam-mini-cell",
      }));
    }
  }
};

const buildInterferenceSvg = () => {
  const svg = svgElement("svg", { class: "kdam-interference", viewBox: "0 0 620 118", role: "img", "aria-label": "相近键连续写入导致查询混合" });
  const columns = [20, 220, 420];
  ["t₁ 写入 k₁", "t₂ 写入 k₂ ≈ k₁", "查询 q ≈ k₁"].forEach((label, index) => addSvgText(svg, columns[index] + 66, 15, label, "kdam-interference-title"));
  drawMiniMatrix(svg, 65, 28, "blue");
  drawMiniMatrix(svg, 265, 28, "blue", true);
  drawMiniMatrix(svg, 465, 28, "blue", true);
  addSvgText(svg, 87, 86, "S₁ = k₁v₁ᵀ", "kdam-interference-note");
  addSvgText(svg, 251, 86, "S₂ = Diag(α)S₁ + k₂v₂ᵀ", "kdam-interference-note");
  addSvgText(svg, 491, 58, "→ õ", "kdam-query-arrow");
  addSvgText(svg, 493, 76, "= αv₁ + v₂", "kdam-interference-note");
  addSvgText(svg, 254, 105, "k₁ 方向残留未清除", "kdam-interference-danger");
  addSvgText(svg, 448, 105, "查询失真：混合 v₁ / v₂ ✗", "kdam-interference-danger");
  [180, 380].forEach((x) => {
    svg.append(svgElement("line", { x1: x, y1: "52", x2: x + 28, y2: "52", class: "kdam-interference-arrow" }));
    addSvgText(svg, x + 2, 43, "+1 token", "kdam-interference-note");
  });
  return svg;
};

const buildEvolutionPane = (state, onChange) => {
  const pane = element("section", "kdam-evolution-pane");
  const cards = [
    ["retnet", "RetNet", "Sₜ = γ · Sₜ₋₁ + kₜvₜᵀ", "γ 固定，所有 token 衰减速度相同"],
    ["gla", "GLA / Mamba", "Sₜ = Diag(αₜ) · Sₜ₋₁ + kₜvₜᵀ", "α 由输入决定，每通道独立衰减"],
    ["deltanet", "Gated DeltaNet", "Sₜ = (I−βₜkₜkₜᵀ) · αₜSₜ₋₁ + βₜkₜvₜᵀ", "在 DeltaNet 写前擦除上加入标量衰减 αₜ"],
    ["kda", "KDA K3", "下界 + 全秩门控 + 混合架构", "三处修复让 Delta Rule 可稳定扩展"],
  ];
  cards.forEach(([id, title, formula, summary], index) => {
    const card = element("section", `kdam-evolution-card ${id === "kda" ? "featured" : ""}`);
    const button = element("button", "kdam-evolution-trigger");
    button.type = "button";
    button.append(
      element("span", "kdam-evolution-index", String(index + 1).padStart(2, "0")),
      element("strong", "", title),
      element("code", "", formula),
      element("span", "", summary),
      element("b", "", state.evolutionExpanded === id ? "−" : "+"),
    );
    const detail = element("div", "kdam-evolution-detail");
    detail.hidden = state.evolutionExpanded !== id;
    if (id === "retnet") detail.append(element("p", "danger", "逗号和变量定义以相同速度消失 → 无法按重要性保留"));
    if (id === "gla") detail.append(
      element("small", "", "Sₜ∈ℝᵈˣᵈ，kₜ,vₜ∈ℝᵈˣ¹；kₜvₜᵀ 为 d×d 外积；õₜ=Sₜᵀqₜ∈ℝᵈˣ¹"),
      buildInterferenceSvg(),
    );
    if (id === "deltanet") ["α→0：BF16 连乘下溢，通道塌缩", "小 α 通道跑不满 Tensor Core tile", "低秩 Wg 门控丢失 xₜ 高维信息"].forEach((text) => detail.append(element("p", "danger", text)));
    if (id === "kda") {
      const fixes = element("div", "kdam-fix-grid");
      [["BF16 下溢", "α ≥ e⁻⁵"], ["tile 利用率", "全 tile 衰减"], ["门控信息损失", "全秩 Wg"], ["远距有损", "3:1 全局补全"]].forEach(([problem, fix]) => fixes.append(element("span", "", problem), element("b", "", `→ ${fix}`)));
      detail.append(fixes);
    }
    button.addEventListener("click", () => {
      state.evolutionExpanded = state.evolutionExpanded === id ? "" : id;
      detail.hidden = state.evolutionExpanded !== id;
      button.querySelector("b").textContent = detail.hidden ? "+" : "−";
      onChange();
    });
    card.append(button, detail);
    pane.append(card);
  });
  return pane;
};

const buildEvolutionExperience = (state, onChange) => {
  const pane = element("section", "kdam-evolution-pane kdam-evolution-experience");
  const chooser = element("div", "kdam-evolution-chooser");
  const select = element("select", "kdam-evolution-select");
  select.setAttribute("aria-label", "选择演进方案");
  EVOLUTION_MODELS.forEach((model) => {
    const option = element("option", "", `${model.index}  ${model.title}`);
    option.value = model.id;
    option.selected = model.id === state.evolutionModel;
    select.append(option);
  });
  const current = element("section", "kdam-evolution-current");
  chooser.append(select, current);
  const viz = element("section", "kdam-memory-viz");
  const vizHeader = element("div", "kdam-viz-header");
  const matrix = element("div", "kdam-evolution-matrix");
  const cells = Array.from({ length: 64 }, (_, index) => {
    const cell = element("i", "");
    cell.dataset.row = String(Math.floor(index / 8));
    matrix.append(cell);
    return cell;
  });
  const legend = element("div", "kdam-memory-legend");
  [["var(--blue)", "定义通道"], ["var(--green)", "语义通道"], ["var(--accent)", "结构通道"]].forEach(([color, label]) => {
    const item = element("span", "", label);
    item.style.setProperty("--legend-color", color);
    legend.append(item);
  });
  const controls = element("div", "kdam-evolution-controls");
  const makeControl = (label, min, max, step, value, onInput) => {
    const control = element("label", "kdam-evolution-control");
    const readout = element("span");
    const input = element("input");
    Object.assign(input, { type: "range", min: String(min), max: String(max), step: String(step), value: String(value) });
    input.addEventListener("input", () => onInput(Number(input.value)));
    control.append(readout, input);
    controls.append(control);
    return { control, readout, label };
  };
  let paint;
  const distance = makeControl("Token 距离", 0, 500, 10, state.evolutionDistance, (value) => {
    state.evolutionDistance = value; paint(); onChange();
  });
  const alpha = makeControl("衰减率", 0.9, 0.999, 0.001, state.evolutionAlpha, (value) => {
    state.evolutionAlpha = value; paint(); onChange();
  });
  const alphaDefinition = makeControl("定义通道", 0.9, 0.999, 0.001, state.evolutionAlphaDefinition, (value) => {
    state.evolutionAlphaDefinition = value; paint(); onChange();
  });
  const alphaSemantic = makeControl("语义通道", 0.9, 0.999, 0.001, state.evolutionAlphaSemantic, (value) => {
    state.evolutionAlphaSemantic = value; paint(); onChange();
  });
  const alphaStructure = makeControl("结构通道", 0.9, 0.999, 0.001, state.evolutionAlphaStructure, (value) => {
    state.evolutionAlphaStructure = value; paint(); onChange();
  });
  const beta = makeControl("擦除率 β", 0, 1, 0.05, state.evolutionBeta, (value) => {
    state.evolutionBeta = value; paint(); onChange();
  });
  viz.append(vizHeader, matrix, legend, controls);
  pane.append(chooser, viz);
  paint = () => {
    const model = EVOLUTION_MODELS.find(({ id }) => id === state.evolutionModel) || EVOLUTION_MODELS[0];
    current.replaceChildren(element("strong", "", model.formula), element("p", "", model.summary));
    vizHeader.replaceChildren(
      element("strong", "", `${model.title} · 固定状态 S`),
      element("span", "", `跨越 ${state.evolutionDistance} token 后`),
    );
    const channelWise = ["gla", "kda"].includes(model.id);
    alpha.control.hidden = channelWise;
    alphaDefinition.control.hidden = !channelWise;
    alphaSemantic.control.hidden = !channelWise;
    alphaStructure.control.hidden = !channelWise;
    beta.control.hidden = !["deltanet", "kda"].includes(model.id);
    distance.readout.textContent = `${distance.label}  ${state.evolutionDistance}`;
    alpha.readout.textContent = `${model.id === "retnet" ? "γ" : "α"} = ${state.evolutionAlpha.toFixed(3)}`;
    alphaDefinition.readout.textContent = `α₁ ${alphaDefinition.label} = ${state.evolutionAlphaDefinition.toFixed(3)}`;
    alphaSemantic.readout.textContent = `α₂ ${alphaSemantic.label} = ${state.evolutionAlphaSemantic.toFixed(3)}`;
    alphaStructure.readout.textContent = `α₃ ${alphaStructure.label} = ${state.evolutionAlphaStructure.toFixed(3)}`;
    beta.readout.textContent = `${beta.label} = ${state.evolutionBeta.toFixed(2)}`;
    cells.forEach((cell, index) => {
      const row = Math.floor(index / 8);
      const base = row < 3 ? "var(--blue)" : row < 6 ? "var(--green)" : "var(--accent)";
      const channelAlpha = row < 3 ? state.evolutionAlphaDefinition
        : row < 6 ? state.evolutionAlphaSemantic : state.evolutionAlphaStructure;
      const decayAlpha = channelWise ? channelAlpha : state.evolutionAlpha;
      const retention = decayAlpha ** state.evolutionDistance;
      const conflict = index % 8 < 3 && ["deltanet", "kda"].includes(model.id);
      cell.style.background = conflict ? `color-mix(in srgb, ${base} ${(1 - state.evolutionBeta) * 100}%, var(--accent))` : base;
      cell.style.opacity = String(Math.max(0.08, Math.min(1, retention + (row >= 6 ? 0.28 : 0))));
      cell.classList.toggle("erased", conflict && state.evolutionBeta > 0.65);
    });
  };
  select.addEventListener("change", () => {
    state.evolutionModel = select.value;
    paint(); pulse(viz); onChange();
  });
  paint();
  return pane;
};

const buildEvolutionSide = () => {
  const side = element("aside", "kdam-side kdam-evolution-side");
  side.append(element("strong", "kdam-side-title", "四步演进总览"));
  const table = element("div", "kdam-evolution-table");
  ["方案", "衰减", "擦除", "稳定性", "门控"].forEach((text) => table.append(element("strong", "", text)));
  [["RetNet", "固定", "无", "稳定", "无"], ["GLA", "动态", "无", "下溢", "低秩"], ["Gated DeltaNet", "动态标量", "有", "下溢", "低秩"], ["KDA", "有下界", "有", "稳定", "全秩"]].forEach((row) => row.forEach((text) => table.append(element("span", row[0] === "KDA" ? "featured" : "", text))));
  side.append(table, element("p", "kdam-evolution-conclusion", "每一项新机制，都对应上一代暴露出的一个具体问题。"));
  return side;
};

const buildWritePane = (state, onChange) => {
  const pane = element("section", "kdam-write-pane");
  const flow = element("div", "kdam-data-flow");
  ["x", "[k q v β α]", "S 更新", "Sᵀq", "门控", "y"].forEach((label, index) => {
    const node = element("span", "", label);
    flow.append(node);
    if (index < 5) flow.append(element("i", "", "→"));
  });
  const canvas = element("section", "kdam-write-canvas");
  const tokens = element("div", "kdam-token-row");
  const tokenNodes = Array.from({ length: 6 }, (_, index) => {
    const token = element("span", "kdam-token", `t${index + 1}`);
    tokens.append(token);
    return token;
  });
  const matrixLabel = element("p", "kdam-matrix-label", "状态 S（dₖ × dᵥ）");
  const matrix = element("div", "kdam-state-matrix");
  const cellNodes = Array.from({ length: 36 }, () => {
    const cell = element("i", "kdam-cell");
    matrix.append(cell);
    return cell;
  });
  const writeArc = svgElement("svg", { class: "kdam-write-arc", viewBox: "0 0 360 150", "aria-hidden": "true" });
  writeArc.append(svgElement("path", { d: "M180 10 C180 58 120 55 130 132", class: "kdam-write-path" }));
  const bubble = element("p", "kdam-step-formula");
  const status = element("span", "kdam-write-status");
  const query = element("span", "kdam-query", "q");
  const outputFlow = element("div", "kdam-output-flow");
  ["õ", "Sigmoid(Wg x)", "⊙", "Wₒ", "+ x → FFN"].forEach((text, index) => {
    outputFlow.append(element(index === 2 ? "b" : "span", "", text));
    if (index < 4) outputFlow.append(element("i", "", "→"));
  });
  const betaControl = element("label", "kdam-beta-control");
  const betaLabel = element("span", "", `β = ${state.beta.toFixed(1)}`);
  const beta = element("input");
  beta.type = "range";
  beta.min = "0.1";
  beta.max = "1";
  beta.step = "0.1";
  beta.value = String(state.beta);
  betaControl.append(betaLabel, beta);
  canvas.append(matrixLabel, tokens, writeArc, matrix, bubble, status, query, outputFlow, betaControl);
  const rail = element("div", "kdam-step-rail");
  const stepLabels = element("div", "kdam-step-labels");
  STEP_NAMES.forEach((label, index) => stepLabels.append(element("span", state.step === index + 1 ? "active" : "", `Step ${index + 1} · ${label}`)));
  const slider = element("input", "kdam-step-slider");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.value = String(state.sliderPct);
  rail.append(stepLabels, slider);
  pane.append(flow, canvas, rail);
  const formulas = [
    "S ← S + kvᵀ",
    "相近 k 连续叠加 → 键方向冲突 × 3",
    "S ← (I−βkkᵀ)Diag(α)S + βkvᵀ",
    "õ = Sᵀq → 召回：猫（主语）/ 追（动词）",
    "y = Wₒ[Sigmoid(Wg x) ⊙ RMSNorm(õ)]",
  ];
  let tokenPhase = 0;
  const paintTokens = () => {
    const pool = state.step === 1 ? [0, 1, 2] : state.step === 2 ? [3, 4, 5] : [];
    tokenNodes.forEach((node) => node.classList.remove("active"));
    if (pool.length) tokenNodes[pool[tokenPhase % pool.length]].classList.add("active");
    tokenPhase += 1;
  };
  const paint = (animate = false) => {
    state.cellColors = buildStepCells(state.step, state.beta);
    state.cellColors.forEach((cell, index) => {
      cellNodes[index].style.background = cell.color;
      cellNodes[index].style.opacity = String(cell.opacity);
    });
    stepLabels.querySelectorAll("span").forEach((node, index) => node.classList.toggle("active", index + 1 === state.step));
    const activeFlow = [2, 2, 2, 3, 4][state.step - 1];
    flow.querySelectorAll("span").forEach((node, index) => node.classList.toggle("active", index === activeFlow));
    bubble.textContent = formulas[state.step - 1];
    status.textContent = state.step === 2 ? "键冲突：查询失真 ✗" : state.step === 3 ? "写入隔离 ✓" : "";
    status.dataset.tone = state.step === 2 ? "danger" : "success";
    betaControl.hidden = state.step !== 3;
    betaLabel.textContent = `β = ${state.beta.toFixed(1)}`;
    query.hidden = state.step !== 4;
    outputFlow.hidden = state.step !== 5;
    writeArc.hidden = state.step > 3;
    canvas.dataset.step = String(state.step);
    paintTokens();
    if (animate) pulse(state.step === 5 ? outputFlow : matrix);
  };
  slider.addEventListener("input", () => {
    state.sliderPct = Number(slider.value);
    const next = Math.min(5, Math.max(1, Math.round(state.sliderPct / 25) + 1));
    if (next !== state.step) {
      state.step = next;
      tokenPhase = 0;
      paint(true);
      onChange();
    }
  });
  slider.addEventListener("change", () => {
    state.sliderPct = (state.step - 1) * 25;
    slider.value = String(state.sliderPct);
    onChange();
  });
  beta.addEventListener("input", () => {
    state.beta = Number(beta.value);
    paint(true);
    onChange();
  });
  const timer = window.setInterval(() => {
    if (!pane.isConnected) return window.clearInterval(timer);
    paintTokens();
  }, 300);
  paint(false);
  return pane;
};

const buildWriteExperience = (state, onChange) => {
  const pane = element("section", "kdam-write-pane kdam-write-experience");
  const module = element("section", "kdam-kda-module");
  const heading = element("div", "kdam-module-heading");
  const stepName = element("span", "", `Step ${state.step} · ${WRITE_STEPS[state.step - 1].title}`);
  heading.append(element("strong", "", "KDA 记事本写入 · 五步完整流程"), stepName);
  const body = element("div", "kdam-module-body");
  const architecture = element("div", "kdam-architecture-host");
  body.append(architecture);
  module.append(heading, body);
  const progress = element("div", "kdam-write-progress");
  const dots = [];
  WRITE_STEPS.forEach((item, index) => {
    const button = element("button", index + 1 === state.step ? "active" : "", String(index + 1));
    button.type = "button";
    button.setAttribute("aria-label", `跳转到 Step ${index + 1}：${item.title}`);
    button.setAttribute("aria-current", index + 1 === state.step ? "step" : "false");
    progress.append(button);
    dots.push(button);
  });
  pane.append(module, progress);

  const paint = (animate = false) => {
    architecture.replaceChildren(buildWriteFlowSvg(state.step));
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index + 1 === state.step);
      dot.setAttribute("aria-current", index + 1 === state.step ? "step" : "false");
    });
    stepName.textContent = `Step ${state.step} · ${WRITE_STEPS[state.step - 1].title}`;
    if (animate) pulse(architecture);
  };
  dots.forEach((dot, index) => dot.addEventListener("click", () => {
    if (state.step === index + 1) return;
    state.step = index + 1;
    state.sliderPct = index * 25;
    paint(true);
    onChange();
  }));
  paint();
  return pane;
};

const retentionPath = (alpha) => {
  const points = [];
  for (let step = 0; step <= 500; step += 10) {
    const x = 36 + (step / 500) * 290;
    const y = 126 - (calcRetention(alpha, step) / 100) * 108;
    points.push(`${step ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
};

const buildDecayPane = (state, onChange) => {
  const pane = element("section", "kdam-decay-pane");
  const plot = svgElement("svg", { class: "kdam-decay-plot", viewBox: "0 0 350 145", role: "img", "aria-label": "不同 alpha 下的记忆保留曲线" });
  const boundaryLine = svgElement("line", { class: "kdam-memory-boundary" });
  const thresholdLine = svgElement("line", { x1: "36", x2: "326", class: "kdam-window-threshold" });
  const boundaryLabel = addSvgText(plot, 0, 0, "", "kdam-boundary-text");
  const thresholdLabel = addSvgText(plot, 0, 0, "", "kdam-threshold-text");
  plot.append(
    svgElement("line", { x1: "36", y1: "18", x2: "36", y2: "126", class: "kdam-axis" }),
    svgElement("line", { x1: "36", y1: "126", x2: "326", y2: "126", class: "kdam-axis" }),
    thresholdLine,
    boundaryLine,
  );
  addSvgText(plot, 5, 18, "100%", "kdam-axis-label");
  addSvgText(plot, 15, 128, "0", "kdam-axis-label");
  addSvgText(plot, 313, 140, "500步", "kdam-axis-label");
  [
    [0.999, "definition", "α=.999 · 变量定义"],
    [0.99, "semantic", "α=.99 · 普通语义"],
    [0.95, "punctuation", "α=.95 · 标点/助词"],
  ].forEach(([alpha, className, label]) => {
    plot.append(svgElement("path", { d: retentionPath(alpha), class: `kdam-retention ${className}` }));
    const x = className === "definition" ? 234 : className === "semantic" ? 117 : 65;
    const step = className === "definition" ? 340 : className === "semantic" ? 140 : 55;
    const y = 126 - (calcRetention(alpha, step) / 100) * 108;
    addSvgText(plot, x, y - 4, label, `kdam-curve-label ${className}`);
  });
  const customPath = svgElement("path", { d: retentionPath(state.alphaSlider), class: "kdam-retention custom" });
  const customLabel = addSvgText(plot, 220, 118, "", "kdam-custom-label");
  plot.append(customPath);
  const alphaControl = element("label", "kdam-alpha-control");
  const alphaReadout = element("span");
  const alpha = element("input");
  alpha.type = "range";
  alpha.min = "0.9";
  alpha.max = "0.9999";
  alpha.step = "0.0001";
  alpha.value = String(state.alphaSlider);
  const alphaWarning = element("strong", "kdam-alpha-warning", "⚠ 低于 KDA 下界：BF16 下溢区");
  alphaControl.append(alphaReadout, alpha, alphaWarning);
  const thresholdControl = element("label", "kdam-threshold-control");
  const thresholdReadout = element("span");
  const threshold = element("input");
  Object.assign(threshold, { type: "range", min: "0.05", max: "0.5", step: "0.05", value: String(state.retentionThreshold) });
  thresholdControl.append(thresholdReadout, threshold);
  const floorNote = element("p", "kdam-floor-note", "有效窗口不是固定常数：它是记忆保留率首次低于选定阈值时的 token 距离。");
  const channelHeader = element("div", "kdam-channel-header");
  channelHeader.append(element("strong", "", "16 通道 α"));
  const switcher = element("div", "segment-control kdam-token-switch");
  const typeLabels = [["definition", "变量定义"], ["verb", "动词"], ["punctuation", "标点"]];
  const typeButtons = [];
  typeLabels.forEach(([id, label]) => {
    const button = element("button", state.decayToken === id ? "active" : "", label);
    button.type = "button";
    switcher.append(button);
    typeButtons.push([id, button]);
  });
  channelHeader.append(switcher);
  const bars = element("div", "kdam-channel-bars");
  const barNodes = Array.from({ length: 16 }, (_, index) => {
    const row = element("div", "kdam-channel-row");
    const fill = element("i");
    row.append(element("span", "", String(index + 1).padStart(2, "0")), fill, element("b"));
    bars.append(row);
    return { row, fill, value: row.querySelector("b") };
  });
  pane.append(plot, alphaControl, thresholdControl, floorNote, channelHeader, bars);
  const paintAlpha = () => {
    customPath.setAttribute("d", retentionPath(state.alphaSlider));
    alphaReadout.textContent = `自定义 α = ${state.alphaSlider.toFixed(4)}`;
    customLabel.textContent = `500步后剩 ${calcRetention(state.alphaSlider, 500).toFixed(1)}%`;
    alphaWarning.hidden = true;
    const window = calcEffectiveWindow(state.alphaSlider, state.retentionThreshold);
    const boundedWindow = Math.min(500, window);
    const x = 36 + (boundedWindow / 500) * 290;
    const y = 126 - state.retentionThreshold * 108;
    boundaryLine.setAttribute("x1", String(x));
    boundaryLine.setAttribute("x2", String(x));
    boundaryLine.setAttribute("y1", "18");
    boundaryLine.setAttribute("y2", "126");
    thresholdLine.setAttribute("y1", String(y));
    thresholdLine.setAttribute("y2", String(y));
    boundaryLabel.setAttribute("x", String(Math.min(268, x + 5)));
    boundaryLabel.setAttribute("y", "29");
    boundaryLabel.textContent = window > 500 ? `有效窗口 ${window} > 图示范围` : `有效窗口 ≈ ${window} token`;
    thresholdLabel.setAttribute("x", "40");
    thresholdLabel.setAttribute("y", String(y - 4));
    thresholdLabel.textContent = `保留阈值 ${(state.retentionThreshold * 100).toFixed(0)}%`;
    thresholdReadout.textContent = `有效记忆标准  ≥ ${(state.retentionThreshold * 100).toFixed(0)}%`;
  };
  const paintBars = () => {
    const values = TOKEN_ALPHA_PROFILES[state.decayToken];
    bars.dataset.profile = state.decayToken;
    values.forEach((value, index) => {
      barNodes[index].fill.style.width = `${Math.max(3, ((value - 0.9) / 0.1) * 100)}%`;
      barNodes[index].value.textContent = value.toFixed(3);
    });
    typeButtons.forEach(([id, button]) => button.classList.toggle("active", id === state.decayToken));
  };
  alpha.addEventListener("input", () => {
    state.alphaSlider = Number(alpha.value);
    paintAlpha();
    onChange();
  });
  threshold.addEventListener("input", () => {
    state.retentionThreshold = Number(threshold.value);
    paintAlpha();
    onChange();
  });
  typeButtons.forEach(([id, button]) => button.addEventListener("click", () => {
    state.decayToken = id;
    paintBars();
    pulse(bars);
    onChange();
  }));
  paintAlpha();
  paintBars();
  return pane;
};

const paintHybridSvg = (svg, tokenCount) => {
  svg.replaceChildren();
  const leftX = 20;
  const rightX = 340;
  addSvgText(svg, leftX + 130, 20, "KDA：位置感知，连续局部状态", "kdam-hybrid-title kda");
  addSvgText(svg, rightX + 130, 20, "Gated MLA：内容驱动，全局精确检索", "kdam-hybrid-title mla");
  svg.append(svgElement("line", { x1: "320", y1: "8", x2: "320", y2: "170", class: "kdam-hybrid-divider" }));
  addSvgText(svg, 320, 92, "互补", "kdam-hybrid-center");
  addSvgText(svg, 320, 108, "不替代", "kdam-hybrid-center");
  const gap = Math.min(31, 240 / Math.max(1, tokenCount - 1));
  for (let index = 0; index < tokenCount; index += 1) {
    const lx = leftX + 25 + index * gap;
    const rx = rightX + 25 + index * gap;
    svg.append(
      svgElement("circle", { cx: lx, cy: "48", r: "4", class: "kdam-hybrid-token kda" }),
      svgElement("rect", { x: lx - 9, y: "67", width: "18", height: "18", class: "kdam-state-box", opacity: String(1 - index * 0.045) }),
      svgElement("circle", { cx: rx, cy: "48", r: "4", class: "kdam-hybrid-token mla" }),
      svgElement("rect", { x: rx - 8, y: "68", width: "16", height: "10", class: "kdam-latent-box" }),
    );
    if (index > 0) svg.append(svgElement("line", { x1: lx - gap + 9, y1: "76", x2: lx - 9, y2: "76", class: "kdam-state-link" }));
    if (index < tokenCount - 1) {
      const lastX = rightX + 25 + (tokenCount - 1) * gap;
      svg.append(svgElement("path", { d: `M${lastX} 45 Q${(lastX + rx) / 2} ${18 + index * 2} ${rx} 64`, class: `kdam-retrieval-arc weight-${index % 3}` }));
    }
  }
  addSvgText(svg, leftX + 130, 112, "O(1) 显存 · 近因偏置", "kdam-hybrid-caption kda");
  addSvgText(svg, leftX + 130, 130, "α 衰减：近处权重高，远处渐退", "kdam-hybrid-note");
  addSvgText(svg, rightX + 130, 112, "O(n) cache · NoPE · 全局可达", "kdam-hybrid-caption mla");
  addSvgText(svg, rightX + 130, 130, "权重由内容决定，不受位置干扰", "kdam-hybrid-note");
  addSvgText(svg, 320, 157, "每个 Block：3 层 KDA + 1 层 Gated MLA", "kdam-block-ratio");
};

const buildHybridPane = (state, onChange) => {
  const pane = element("section", "kdam-hybrid-pane");
  const narrative = element("p", "kdam-hybrid-narrative", "固定状态 S 是有损压缩：远处 token 经多次 α 连乘后逐渐消失。K3 不要求 KDA 记住所有，而用 Gated MLA 周期性补全全局精确检索。");
  const svg = svgElement("svg", { class: "kdam-hybrid-svg", viewBox: "0 0 640 170", role: "img", "aria-label": "KDA 与 Gated MLA 互补关系" });
  const control = element("label", "kdam-token-count-control");
  const readout = element("span");
  const slider = element("input");
  slider.type = "range";
  slider.min = "4";
  slider.max = "12";
  slider.step = "1";
  slider.value = String(state.hybridTokens);
  control.append(readout, slider);
  const validation = element("div", "kdam-scenario-grid");
  [["代码 total += x[i]", "累加进程状态 → KDA", "x 的类型定义 → Gated MLA"], ["跨页脚注引用", "当前句法结构 → KDA", "第 1 页原始定义 → Gated MLA"]].forEach(([title, local, global]) => {
    const card = element("section", "kdam-scenario");
    card.append(element("strong", "", title), element("p", "kda", local), element("p", "mla", global));
    validation.append(card);
  });
  const block = element("div", "kdam-mini-block");
  ["KDA + LatentMoE", "KDA + LatentMoE", "KDA + LatentMoE", "Gated MLA + LatentMoE"].forEach((text, index) => block.append(element("span", index === 3 ? "mla" : "kda", text)));
  block.append(element("small", "", "× 8 Block · 93 层"));
  const bottom = element("div", "kdam-hybrid-bottom");
  bottom.append(validation, block);
  const paint = () => {
    readout.textContent = `token 数：${state.hybridTokens}`;
    paintHybridSvg(svg, state.hybridTokens);
  };
  slider.addEventListener("input", () => {
    state.hybridTokens = Number(slider.value);
    paint();
    onChange();
  });
  pane.append(narrative, svg, control, bottom);
  paint();
  return pane;
};

const buildHybridExperience = (state, onChange) => {
  const pane = element("section", "kdam-hybrid-pane kdam-division-pane");
  pane.append(element("p", "kdam-division-intro", "让序列增长，观察两种记忆的职责：KDA 把连续历史压进固定状态，Gated MLA 为每个 token 保留可精确寻址的 latent。"));
  const lanes = element("div", "kdam-memory-lanes");
  const kdaLane = element("section", "kdam-memory-lane kda");
  const mlaLane = element("section", "kdam-memory-lane mla");
  const kdaTokens = element("div", "kdam-lane-tokens");
  const mlaTokens = element("div", "kdam-lane-tokens");
  const stateBox = element("div", "kdam-fixed-state", "S");
  const latentCache = element("div", "kdam-latent-cache");
  const kdaValue = element("strong");
  const mlaValue = element("strong");
  kdaLane.append(element("span", "", "KDA · 连续信息"), kdaTokens, stateBox, kdaValue, element("small", "", "写入后不再保留单个 token 地址"));
  mlaLane.append(element("span", "", "Gated MLA · 全局精确检索"), mlaTokens, latentCache, mlaValue, element("small", "", "每个 latent 仍对应一个历史 token"));
  lanes.append(kdaLane, mlaLane);
  const control = element("label", "kdam-token-control");
  const readout = element("span");
  const slider = element("input");
  Object.assign(slider, { type: "range", min: "4", max: "12", step: "1", value: String(state.hybridTokens) });
  control.append(readout, slider);
  const block = element("div", "kdam-division-block");
  ["KDA", "KDA", "KDA", "Gated MLA"].forEach((label, index) => block.append(element("i", index === 3 ? "mla" : "", label)));
  pane.append(lanes, control, block);
  const paint = () => {
    kdaTokens.replaceChildren();
    mlaTokens.replaceChildren();
    latentCache.replaceChildren();
    for (let index = 0; index < state.hybridTokens; index += 1) {
      kdaTokens.append(element("i", ""));
      mlaTokens.append(element("i", ""));
      latentCache.append(element("i", ""));
    }
    readout.textContent = `示意序列：${state.hybridTokens} token`;
    kdaValue.textContent = "固定 32 KB";
    mlaValue.textContent = `${(state.hybridTokens * 3584 * 2 / 1024).toFixed(0)} KB / 层`;
  };
  slider.addEventListener("input", () => {
    state.hybridTokens = Number(slider.value);
    paint(); onChange();
  });
  paint();
  return pane;
};

const buildHybridComparisonSide = (state) => {
  const side = element("aside", "kdam-side kdam-division-side");
  side.append(
    element("p", "kdam-side-kicker", "两种记忆，各司其职"),
    element("strong", "kdam-division-count", `${state.hybridTokens} token`),
  );
  const rows = element("div", "kdam-division-table");
  const comparisons = [
    ["方案", [["KDA", "固定状态"], ["Gated MLA", "全局检索"], ["K3 3:1", "组合"]]],
    ["显存", [["KDA", "固定 32 KB"], ["Gated MLA", "随 token 增长"], ["K3 3:1", "低"]]],
    ["职责", [["KDA", "局部连续、顺序感知"], ["Gated MLA", "全局内容寻址"], ["K3 3:1", "两者组合"]]],
    ["远距精度", [["KDA", "有损"], ["Gated MLA", "精确"], ["K3 3:1", "接近全局精确"]]],
  ];
  comparisons.forEach(([label, values]) => {
    const valueCell = element("div", "kdam-division-values");
    values.forEach(([name, value], index) => {
      const line = element("span", index === 2 ? "featured" : "");
      line.append(element("b", "", name), element("i", "", value));
      valueCell.append(line);
    });
    rows.append(element("strong", "", label), valueCell);
  });
  side.append(rows, element("p", "kdam-side-note", "KDA 管连续状态，Gated MLA 周期性补上远距精确检索。"));
  return side;
};

const buildWriteSide = (state) => {
  const side = element("aside", "kdam-side kdam-kda-side");
  const heading = element("div", "kdam-side-heading");
  heading.append(
    element("strong", "", "Kimi Delta Attention"),
    element("span", "", `Step ${state.step} · ${STEP_NAMES[state.step - 1]}`),
  );
  const formulas = element("div", "kdam-formula-stack");
  const rows = [
    ["1", "朴素写入", "Sₜ = Sₜ₋₁ + kₜvₜᵀ", "建立“键 → 值”的关联"],
    ["2", "冲突暴露", "k₂ ≈ k₁ ⇒ Sᵀq 同时含 v₁、v₂", "直接累加会混合相近键的答案"],
    ["3", "Delta 修复", "Sₜ = (I−βₜkₜkₜᵀ)Diag(αₜ)Sₜ₋₁ + βₜkₜvₜᵀ", "衰减旧状态 · 擦除冲突 · 写入新值"],
    ["4", "查询", "õₜ = Sₜᵀqₜ", "查询状态，不再改写 S"],
    ["5", "输出门控", "yₜ = Wₒ[gₜ ⊙ RMSNorm(õₜ)]", "gₜ = Sigmoid(Wg xₜ)"],
  ];
  rows.forEach(([number, title, formula, note]) => {
    const row = element("section", `kdam-formula-row ${Number(number) === state.step ? "active" : ""}`);
    row.append(
      element("span", "kdam-formula-number", number),
      element("strong", "", title),
      element("p", "", formula),
      element("small", "", note),
    );
    formulas.append(row);
  });
  side.append(
    heading,
    buildArchitectureSvg(state.step),
    formulas,
    element("p", "kdam-full-equation", "Sₜ = (I−βₜkₜkₜᵀ) · Diag(αₜ) · Sₜ₋₁ + βₜkₜvₜᵀ"),
  );
  return side;
};

const buildWriteExplanationSide = (state, onChange) => {
  const side = element("aside", "kdam-side kdam-write-explanation");
  side.append(element("strong", "kdam-side-title", "五步公式 · 点击同步数据流"));
  const list = element("div", "kdam-write-step-list");
  WRITE_STEPS.forEach((item, index) => {
    const active = index + 1 === state.step;
    const card = element("section", `kdam-write-step-card ${active ? "active" : "collapsed"}`);
    const trigger = element("button", "kdam-write-step-trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-expanded", String(active));
    trigger.setAttribute("aria-current", active ? "step" : "false");
    trigger.append(
      element("span", "kdam-write-step-number", `Step ${index + 1}`),
      element("strong", "", item.title),
      element("span", "kdam-write-step-toggle", active ? "−" : "+"),
    );
    const details = element("div", "kdam-write-step-details");
    const formulas = element("div", "kdam-write-formulas");
    item.formulas.forEach(([formula, tone]) => formulas.append(element("code", tone, formula)));
    const intuition = element("p", "kdam-write-intuition");
    intuition.append(element("strong", "", "直觉"), element("em", "", item.intuition));
    const why = element("p", "kdam-write-why");
    why.append(element("strong", "", "为什么需要"), element("span", "", item.why));
    details.append(formulas, intuition, why);
    trigger.addEventListener("click", () => {
      if (state.step === index + 1) return;
      state.step = index + 1;
      state.sliderPct = index * 25;
      onChange();
    });
    card.append(trigger, details);
    list.append(card);
  });
  side.append(list);
  return side;
};

const buildEvolutionOverview = (state) => {
  const side = element("aside", "kdam-side kdam-evolution-side kdam-evolution-overview");
  side.append(element("strong", "kdam-side-title", "从衰减到稳定 Delta Rule"));
  const table = element("div", "kdam-evolution-table");
  ["方案", "衰减", "擦除", "稳定性", "门控"].forEach((text) => table.append(element("strong", "", text)));
  [["RetNet", "固定", "无", "稳定", "无"], ["GLA", "逐通道", "无", "可下溢", "低秩"], ["Gated DeltaNet", "动态标量", "有", "可下溢", "低秩"], ["KDA", "逐通道+下界", "有", "稳定", "全秩"]].forEach((row, index) => {
    row.forEach((text) => table.append(element("span", EVOLUTION_MODELS[index].id === state.evolutionModel ? "featured" : "", text)));
  });
  side.append(table, element("p", "kdam-evolution-conclusion", "每一次改造都由前一代的失败逼出来：先学会忘，再学会有选择地忘，最后学会写前擦除与稳定输出。"));
  return side;
};

const buildDecaySide = (state) => {
  const side = element("aside", "kdam-side kdam-decay-side-v2");
  const window = calcEffectiveWindow(state.alphaSlider, state.retentionThreshold);
  side.append(
    element("span", "kdam-side-kicker", "当前通道衰减率 α"),
    element("strong", "kdam-alpha-value-v2", state.alphaSlider.toFixed(4)),
    element("p", "kdam-window-value-v2", `有效窗口 ≈ ${window.toLocaleString("en-US")} token`),
  );
  const compare = element("div", "kdam-method-compare-v2");
  compare.append(
    element("p", "", `当 αⁿ < ${(state.retentionThreshold * 100).toFixed(0)}% 时离开有效窗口`),
    element("p", "", "KDA：不同通道拥有不同记忆寿命"),
    element("small", "", `n = ⌈log(${state.retentionThreshold.toFixed(2)}) / log(α)⌉`),
  );
  side.append(compare);
  return side;
};

const buildHybridSide = (state, onChange) => {
  const side = element("aside", "kdam-side kdam-hybrid-side");
  side.append(element("strong", "kdam-side-title", "互补，不替代"));
  const table = element("div", "kdam-hybrid-table");
  ["", "KDA", "Gated MLA"].forEach((text) => table.append(element("strong", "", text)));
  [["历史形态", "固定状态 S", "历史 latent cₜ"], ["读取方式", "递归读出", "全局相似度"], ["位置感知", "α 衰减", "NoPE"], ["显存", "O(1)", "O(n)"], ["远距精度", "有损", "逐 token 完整"], ["擅长", "局部语义进程", "跨段内容检索"]].forEach((row) => row.forEach((text) => table.append(element("span", "", text))));
  const cache = element("div", "kdam-cache-readout");
  cache.append(
    element("p", "kda", "KDA 状态 S：固定 512 KB（示意）"),
    element("p", "mla", `MLA cache：${(state.hybridTokens * 0.125).toFixed(2)} MB（示意）`),
  );
  const reason = element("section", "kdam-ratio-reason");
  const trigger = element("button", "");
  trigger.type = "button";
  trigger.textContent = `为什么选 3:1，而不是 1:1 或 7:1？ ${state.hybridReasonOpen ? "▼" : "▶"}`;
  const detail = element("div", "");
  detail.hidden = !state.hybridReasonOpen;
  [["速度", "75% 层运行 O(1) KDA"], ["显存", "每 4 层仅 1 层保存 cₜ"], ["精度", "每 4 层至少一次全局校正"]].forEach(([label, text]) => detail.append(element("p", "", `${label}：${text}`)));
  detail.append(element("small", "", "K3 scaling law：3:1 位于速度/精度帕累托前沿。"));
  trigger.addEventListener("click", () => {
    state.hybridReasonOpen = !state.hybridReasonOpen;
    detail.hidden = !state.hybridReasonOpen;
    trigger.textContent = `为什么选 3:1，而不是 1:1 或 7:1？ ${state.hybridReasonOpen ? "▼" : "▶"}`;
    onChange();
  });
  reason.append(trigger, detail);
  side.append(table, cache, reason);
  return side;
};

export const renderKdaMechanism = (block, context) => {
  const stored = context.getValue(block.id, {});
  const validTabs = new Set(TABS.map(([id]) => id));
  const state = {
    activeTab: validTabs.has(stored.activeTab) ? stored.activeTab : "write",
    step: Math.min(5, Math.max(1, Number(stored.step) || 1)),
    sliderPct: Math.min(100, Math.max(0, Number(stored.sliderPct) || 0)),
    beta: Math.min(1, Math.max(0.1, Number(stored.beta) || 0.8)),
    alphaSlider: Math.min(0.9999, Math.max(0.9, Number(stored.alphaSlider) || 0.99)),
    retentionThreshold: Math.min(0.5, Math.max(0.05, Number(stored.retentionThreshold) || 0.2)),
    decayToken: TOKEN_ALPHA_PROFILES[stored.decayToken] ? stored.decayToken : "verb",
    evolutionModel: ["retnet", "gla", "deltanet", "kda"].includes(stored.evolutionModel) ? stored.evolutionModel : "retnet",
    evolutionDistance: Math.min(500, Math.max(0, Number(stored.evolutionDistance) || 180)),
    evolutionAlpha: Math.min(0.999, Math.max(0.9, Number(stored.evolutionAlpha) || 0.99)),
    evolutionAlphaDefinition: Math.min(0.999, Math.max(0.9, Number(stored.evolutionAlphaDefinition) || 0.999)),
    evolutionAlphaSemantic: Math.min(0.999, Math.max(0.9, Number(stored.evolutionAlphaSemantic) || 0.985)),
    evolutionAlphaStructure: Math.min(0.999, Math.max(0.9, Number(stored.evolutionAlphaStructure) || 0.95)),
    evolutionBeta: Math.min(1, Math.max(0, Number(stored.evolutionBeta) || 0.8)),
    hybridTokens: Math.min(12, Math.max(4, Number(stored.hybridTokens) || 8)),
  };
  if (!stored.sliderPct && state.step > 1) state.sliderPct = (state.step - 1) * 25;
  const root = element("article", "block kda-mechanism");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "kdam-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const viewport = element("div", "kdam-viewport");
  const connection = element("button", "page-connection-link", `← ${KDA_CONNECTIONS.architecture.label}`);
  connection.type = "button";
  connection.addEventListener("click", () => context.navigate(KDA_CONNECTIONS.architecture.target));
  const persist = () => {
    context.setValue(block.id, {
      activeTab: state.activeTab,
      step: state.step,
      sliderPct: state.sliderPct,
      beta: state.beta,
      alphaSlider: state.alphaSlider,
      retentionThreshold: state.retentionThreshold,
      decayToken: state.decayToken,
      evolutionModel: state.evolutionModel,
      evolutionDistance: state.evolutionDistance,
      evolutionAlpha: state.evolutionAlpha,
      evolutionAlphaDefinition: state.evolutionAlphaDefinition,
      evolutionAlphaSemantic: state.evolutionAlphaSemantic,
      evolutionAlphaStructure: state.evolutionAlphaStructure,
      evolutionBeta: state.evolutionBeta,
      hybridTokens: state.hybridTokens,
    });
    context.persist();
  };
  const renderView = () => {
    const main = element("section", "kdam-main");
    const left = element("section", "kdam-left");
    const tabBar = element("div", "segment-control kdam-tabs");
    const panelHost = element("div", "kdam-panel-host");
    const sideHost = element("div", "kdam-side-host");
    const renderSide = () => {
      const side = state.activeTab === "evolution" ? buildEvolutionOverview(state)
        : state.activeTab === "write" ? buildWriteExplanationSide(state, renderTab)
          : state.activeTab === "decay" ? buildDecaySide(state)
            : buildHybridComparisonSide(state);
      sideHost.replaceChildren(side);
      persist();
    };
    const renderTab = () => {
      const pane = state.activeTab === "evolution" ? buildEvolutionExperience(state, renderSide)
        : state.activeTab === "write" ? buildWriteExperience(state, renderSide)
          : state.activeTab === "decay" ? buildDecayPane(state, renderSide)
            : buildHybridExperience(state, renderSide);
      panelHost.replaceChildren(pane);
      tabBar.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.activeTab));
      renderSide();
      animateIn(pane);
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
      tabBar.append(button);
    });
    left.append(tabBar, panelHost);
    main.append(left, sideHost);
    viewport.replaceChildren(main);
    renderTab();
  };
  root.trackNavigate = (direction) => {
    const ids = TABS.map(([id]) => id);
    const next = ids.indexOf(state.activeTab) + direction;
    if (next < 0 || next >= ids.length) return false;
    state.activeTab = ids[next];
    persist();
    renderView();
    root.focus({ preventScroll: true });
    return true;
  };
  renderView();
  root.append(connection, claims, viewport, element("p", "kdam-source", `来源：${block.source}`));
  return root;
};
