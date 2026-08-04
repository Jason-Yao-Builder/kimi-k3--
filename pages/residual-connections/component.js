import { element, svgElement } from "../../shared/dom/element.js";
import {
  ATTNRES_LABELS,
  LAYER_LABELS,
  TOTAL_LAYERS,
  attnResWeights,
  denseInputChannels,
  denseOutputChannels,
  sigmoid,
  sigmoidDerivative,
  softmaxWeights,
} from "./logic.js";

const svg = (className, width = 420, height = 260) => svgElement("svg", {
  class: className, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": className,
});
const svgText = (text, x, y, className = "") => svgElement("text", { x, y, class: className }, text);
const svgLine = (x1, y1, x2, y2, className = "") => svgElement("line", { x1, y1, x2, y2, class: className });
const number = (value) => Number(value).toFixed(value < 0.1 ? 3 : 2);

const button = (label, className, click) => {
  const node = element("button", className, label);
  node.type = "button";
  node.addEventListener("click", click);
  return node;
};

const formula = (parts, className = "rc-formula") => {
  const node = element("p", className);
  parts.forEach((part) => node.append(element("span", part[0], part[1])));
  return node;
};

const gradientTone = (value) => value > 0.5 ? "healthy" : value >= 0.1 ? "warning" : "critical";

const baseActivations = (state) => state.gradMode === "resnet" ? [1.1, 0.55, 0.15] : [3.1, 2, 0.55];
const activationAtStep = (state, layer) => {
  const correction = (state.topLoss - 1) * [0.82, 0.52, 0.28][layer];
  return Math.max(-5, Math.min(5, baseActivations(state)[layer] - correction));
};
const localDerivative = (state, layer) => sigmoidDerivative(activationAtStep(state, layer));
const gradientValue = (state, layer) => {
  let value = state.topLoss;
  for (let index = TOTAL_LAYERS - 2; index >= layer; index -= 1) {
    value *= state.gradMode === "resnet" ? 1 + localDerivative(state, index) : localDerivative(state, index);
  }
  return value;
};

const sigmoidPath = (x, y, width, height) => {
  const points = [];
  for (let step = 0; step <= 30; step += 1) {
    const value = -5 + step / 30 * 10;
    points.push(`${x + step / 30 * width},${y + height - sigmoid(value) * height}`);
  }
  return `M ${points.join(" L ")}`;
};

const buildGradientMap = (state) => {
  const panel = element("section", "rc-card rc-gradient-card");
  const heading = element("div", "rc-card-heading");
  heading.append(element("h2", "", "梯度消失问题"));
  const switcher = element("div", "rc-mini-tabs");
  [
    ["vanilla", "梯度消失"],
    ["resnet", "理想传播"],
  ].forEach(([mode, label]) => switcher.append(button(label, state.gradMode === mode ? "active" : "", () => {
    state.gradMode = mode;
    state.paint();
  })));
  heading.append(switcher);
  const graphic = svg("rc-gradient-svg", 440, 280);
  const sliderLabel = element("label", "rc-slider-label");
  const valueText = element("span", "", `顶层上游梯度 L = ${state.topLoss.toFixed(2)}`);
  const equations = element("div", "rc-gradient-equations");
  const updateLine = element("p", "rc-update-line");
  const forwardLine = element("p", "rc-forward-line");
  const backwardLine = element("p", "rc-backward-line");
  equations.append(updateLine, forwardLine, backwardLine);
  sliderLabel.append(valueText);
  const draw = () => {
    graphic.replaceChildren();
    graphic.append(svgText("前向工作点：不同位置的 sigmoid 导数不同", 22, 14, "rc-chart-section-label"));
    [0, 1, 2].forEach((layer) => {
      const x = 24 + layer * 139;
      const base = baseActivations(state)[layer];
      const a = activationAtStep(state, layer);
      const derivative = localDerivative(state, layer);
      graphic.append(svgElement("rect", { x: x - 6, y: 19, width: 108, height: 117, rx: 6, class: "rc-sigmoid-card" }));
      graphic.append(svgElement("path", { d: sigmoidPath(x, 31, 96, 61), class: "rc-sigmoid-curve" }));
      graphic.append(svgText("σ(z)", x, 29, "rc-sigmoid-function"));
      graphic.append(svgLine(x, 92, x + 96, 92, "rc-sigmoid-axis"));
      graphic.append(svgLine(x + 48, 29, x + 48, 95, "rc-sigmoid-axis"));
      const baseX = x + (base + 5) / 10 * 96;
      const baseY = 92 - sigmoid(base) * 61;
      const px = x + (a + 5) / 10 * 96;
      const py = 92 - sigmoid(a) * 61;
      graphic.append(svgElement("circle", { cx: baseX, cy: baseY, r: 4, class: "rc-sigmoid-baseline" }));
      graphic.append(svgLine(baseX, baseY, px, py, "rc-sigmoid-update"));
      graphic.append(svgElement("circle", { cx: px, cy: py, r: 5, class: `rc-sigmoid-point ${gradientTone(derivative)}` }));
      graphic.append(svgText(`层 ${layer + 1}`, x, 114, "rc-svg-label"));
      graphic.append(svgText(`zᵗ=${base.toFixed(1)} → zᵗ⁺¹=${a.toFixed(1)}`, x, 129, "rc-sigmoid-metric"));
    });
    graphic.append(svgText("反向梯度：逐层乘 Jacobian", 22, 158, "rc-chart-section-label"));
    [2, 1, 0].forEach((layer, index) => {
      const x = 325 - index * 128;
      const value = gradientValue(state, layer);
      if (index < 2) graphic.append(svgLine(x - 5, 195, x - 77, 195, `rc-backward ${gradientTone(value)}`));
      graphic.append(svgElement("rect", { x: x - 27, y: 174, width: 54, height: 40, rx: 4, class: `rc-gradient-token ${gradientTone(value)}` }));
      graphic.append(svgText(`g${layer + 1}`, x - 9, 191, "rc-node-text"));
      graphic.append(svgText(number(value), x - 12, 207, "rc-gradient-number"));
    });
    graphic.append(svgText(state.gradMode === "resnet" ? "每层 Jacobian：1 + σ′(a)，identity path 保留梯度" : "每层 Jacobian：σ′(a) ≤ 0.25，饱和区会把梯度相乘压小", 22, 252, "rc-svg-note"));
    valueText.textContent = `顶层上游梯度 L = ${state.topLoss.toFixed(2)}（两种模式完全相同）`;
    const z = [0, 1, 2].map((layer) => activationAtStep(state, layer));
    const h = z.map((value) => sigmoid(value));
    const gradients = [0, 1, 2].map((layer) => gradientValue(state, layer));
    updateLine.textContent = "○ 为前向传播的基准预激活 zᵗ；● 为同一位置单步更新后的 zᵗ⁺¹ = zᵗ − η·L·δ。滑轴只改变这次修正的强度。";
    if (state.gradMode === "resnet") {
      forwardLine.textContent = `残差前向：zᵗ⁺¹ = [${z.map((value) => value.toFixed(2)).join(", ")}]；xₗ₊₁ = xₗ + σ(zₗ)，identity 分支不经过饱和区。`;
      backwardLine.textContent = `残差反向：g₃=L=${gradients[2].toFixed(2)}，g₂=L·(1+σ′₂)=${gradients[1].toFixed(3)}，g₁=L·(1+σ′₂)(1+σ′₁)=${gradients[0].toFixed(3)}。`;
    } else {
      forwardLine.textContent = `普通前向：zᵗ⁺¹ = [${z.map((value) => value.toFixed(2)).join(", ")}] → h=σ(z) = [${h.map((value) => value.toFixed(2)).join(", ")}]; 多层主路逐层经过 sigmoid。`;
      backwardLine.textContent = `普通反向：g₃=L=${gradients[2].toFixed(2)}，g₂=L·σ′₂=${gradients[1].toFixed(3)}，g₁=L·σ′₂·σ′₁=${gradients[0].toFixed(3)}。`;
    }
  };
  draw();
  const input = element("input", "rc-range");
  input.type = "range";
  input.min = "0.01";
  input.max = "2";
  input.step = "0.01";
  input.value = String(state.topLoss);
  const updateRangeFill = () => input.style.setProperty("--range-fill", `${(state.topLoss - 0.01) / 1.99 * 100}%`);
  updateRangeFill();
  input.addEventListener("input", () => { state.topLoss = Number(input.value); updateRangeFill(); draw(); state.refreshers.forEach((refresh) => refresh()); });
  input.addEventListener("change", () => state.persist());
  sliderLabel.append(input);
  panel.append(heading, graphic, sliderLabel, equations);
  return panel;
};

const buildResidualBlocks = (state) => {
  const panel = element("section", "rc-card rc-resnet-card");
  panel.append(element("h2", "", "ResNet：通过直连解决梯度消失问题"));
  const graphic = svg("rc-resnet-svg", 440, 280);
  const jacobianLabels = [];
  [0, 1, 2].forEach((layer) => {
    const x = 18 + layer * 140;
    const selected = state.selectedLayer === layer;
    const main = svgElement("g", { class: `rc-residual-block ${selected ? "selected" : ""}`, tabindex: "0", role: "button", "aria-label": `选择第 ${layer + 1} 层` });
    main.append(svgElement("rect", { x: x - 5, y: 83, width: 126, height: 139, rx: 8, class: "rc-residual-frame" }));
    main.append(svgText(`Residual block ${layer + 1}`, x + 9, 103, "rc-block-label"));
    main.append(svgElement("circle", { cx: x + 16, cy: 155, r: 13, class: "rc-residual-input" }));
    main.append(svgText(`x${layer}`, x + 8, 160, "rc-node-text"));
    main.append(svgLine(x + 29, 155, x + 44, 155, "rc-forward"));
    main.append(svgElement("rect", { x: x + 44, y: 138, width: 33, height: 34, rx: 4, class: "rc-block-body" }));
    main.append(svgText("F", x + 56, 160, "rc-node-text"));
    main.append(svgLine(x + 77, 155, x + 89, 155, "rc-forward"));
    main.append(svgElement("circle", { cx: x + 99, cy: 155, r: 11, class: "rc-plus" }));
    main.append(svgText("+", x + 95, 160, "rc-plus-text"));
    main.append(svgElement("path", { d: `M ${x + 16} 141 C ${x + 17} 113, ${x + 98} 113, ${x + 99} 142`, class: "rc-skip" }));
    main.append(svgText("identity", x + 44, 123, "rc-skip-label"));
    main.append(svgText(`x${layer + 1}`, x + 83, 198, "rc-svg-label"));
    const jacobian = svgText("", x + 10, 213, "rc-resnet-jacobian");
    jacobianLabels.push({ layer, node: jacobian });
    main.append(jacobian);
    main.addEventListener("click", () => { state.selectedLayer = layer; state.paint(); });
    main.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") main.click(); });
    graphic.append(main);
  });
  const g = gradientValue({ ...state, gradMode: "resnet" }, state.selectedLayer);
  const detail = element("div", "rc-resnet-detail");
  const forwardFormula = element("p", "rc-forward-residual", "");
  const productFormula = element("p", "rc-product-formula", "");
  const localFormula = element("p", "rc-local-residual", "");
  const valueResult = element("p", "rc-value-result", `${LAYER_LABELS[state.selectedLayer]}：∂L/∂x = ${number(g)}（顶层 L=${state.topLoss.toFixed(2)}）`);
  detail.append(
    forwardFormula,
    productFormula,
    localFormula,
    valueResult,
  );
  const refresh = () => {
    jacobianLabels.forEach(({ layer, node }) => { node.textContent = `J${layer + 1}=1+σ′=${(1 + localDerivative(state, layer)).toFixed(2)}`; });
    const next = gradientValue({ ...state, gradMode: "resnet" }, state.selectedLayer);
    const derivative = localDerivative(state, state.selectedLayer);
    const factors = [];
    for (let layer = TOTAL_LAYERS - 2; layer >= state.selectedLayer; layer -= 1) {
      factors.push(`(1+σ′(z${layer + 1}))`);
    }
    forwardFormula.textContent = `前向：F${state.selectedLayer}(x)=σ(W${state.selectedLayer}x+b${state.selectedLayer})；x${state.selectedLayer + 1}=F${state.selectedLayer}(x${state.selectedLayer})+x${state.selectedLayer}`;
    productFormula.textContent = `${LAYER_LABELS[state.selectedLayer]}：g = L · ${factors.join(" · ") || "1"} = ${number(next)}；每一项都至少保留 identity 的 1。`;
    localFormula.textContent = `当前块：σ′=${derivative.toFixed(3)}，主路径为 σ′；残差 Jacobian = 1+σ′ = ${(1 + derivative).toFixed(3)}。`;
    valueResult.textContent = `${LAYER_LABELS[state.selectedLayer]}：∂L/∂x = ${number(next)}（顶层 L=${state.topLoss.toFixed(2)}）`;
  };
  refresh();
  state.refreshers.push(refresh);
  panel.append(graphic, detail);
  return panel;
};

const buildSequentialError = () => {
  const panel = element("section", "rc-card rc-sequence-card");
  panel.append(element("h2", "", "第 l 层只能看到 l-1 层"));
  const graphic = svg("rc-sequence-svg", 440, 280);
  const steps = [
    ["马冬梅", "第 1 层"], ["马冬什么？", "第 2 层"], ["马什么梅？", "第 3 层"], ["马大胖！", "第 4 层"], ["想看第 1 层说啥…", "第 5 层"],
  ];
  for (let index = 0; index < 5; index += 1) {
    const x = 39 + index * 90;
    const wrong = index >= 2;
    const bubbleWidth = index === 4 ? 82 : 66;
    const bubbleX = x - bubbleWidth / 2;
    if (index > 0) graphic.append(svgLine(x - 46, 138, x - 19, 138, wrong ? "rc-error-link" : "rc-forward"));
    graphic.append(svgElement("rect", { x: bubbleX, y: 42, width: bubbleWidth, height: 28, rx: 6, class: `rc-dialogue-bubble ${wrong ? "wrong" : ""}` }));
    graphic.append(svgElement("path", { d: `M ${x - 6} 70 L ${x + 4} 70 L ${x - 1} 80 Z`, class: `rc-dialogue-tail ${wrong ? "wrong" : ""}` }));
    graphic.append(svgText(steps[index][0], bubbleX + 6, 60, "rc-dialogue-text"));
    graphic.append(svgElement("circle", { cx: x, cy: 138, r: 18, class: `rc-sequence-node ${wrong ? "wrong" : ""}` }));
    graphic.append(svgText(String(index + 1), x - 3, 143, "rc-node-text"));
    graphic.append(svgText(steps[index][1], x - 17, 174, wrong ? "rc-error-text" : "rc-svg-label"));
  }
  graphic.append(svgText("第 5 层只能听到第 4 层的“马大胖”，无法直接回看第 1 层的“马冬梅”。", 25, 224, "rc-sequence-explanation"));
  panel.append(graphic, element("p", "rc-dense-bridge", "DenseNet：让目标层直接读取所有前层特征，避免只继承单一路径。 →"));
  return panel;
};

const buildResnetPanel = (state) => {
  const panel = element("section", "rc-panel rc-resnet-panel active");
  panel.append(buildGradientMap(state), buildResidualBlocks(state), buildSequentialError());
  return panel;
};

const denseInput = (label, value, min, max, update) => {
  const wrap = element("label", "rc-number-input", label);
  const input = element("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.value = String(value);
  input.addEventListener("input", () => {
    const next = Number(input.value);
    if (Number.isFinite(next)) update(Math.max(min, Math.min(max, next)));
  });
  wrap.append(input);
  return wrap;
};

const buildDenseGraph = (state) => {
  const card = element("section", "rc-card rc-dense-graph-card");
  const heading = element("div", "rc-card-heading");
  heading.append(element("h2", "", "每层 concat 所有前层输出"));
  const selector = element("div", "rc-layer-selector");
  [1, 2, 3, 4].forEach((index) => selector.append(button(`x${index}`, state.denseSelected === index ? "active" : "", () => {
    state.denseSelected = index;
    state.paint();
  })));
  heading.append(selector);
  const graphic = svg("rc-dense-svg", 560, 290);
  const positions = [55, 160, 265, 370, 475];
  const colors = ["amber", "blue", "green", "red"];
  positions.forEach((x, index) => {
    const ch = denseOutputChannels(index, state.denseC0, state.denseK);
    const selected = index === state.denseSelected;
    graphic.append(svgElement("rect", { x, y: 72, width: 57, height: 38, rx: 5, class: `rc-dense-node ${selected ? "selected" : ""}` }));
    graphic.append(svgText(`x${index}`, x + 18, 96, "rc-node-text"));
    graphic.append(svgText(index === 0 ? `${ch} ch 基础` : `${ch} ch 新增`, x - 3, 126, selected ? "rc-dense-channel final" : "rc-dense-channel"));
  });
  if (state.denseSelected > 0) {
    for (let source = 0; source < state.denseSelected; source += 1) {
      const from = positions[source] + 28;
      const to = positions[state.denseSelected] + 28;
      graphic.append(svgElement("path", { d: `M ${from} 111 C ${from + 18} 164, ${to - 22} 164, ${to} 112`, class: `rc-dense-link ${colors[source % colors.length]} selected` }));
    }
  }
  const inputs = Array.from({ length: state.denseSelected }, (_, index) => index);
  graphic.append(svgText(`生成 x${state.denseSelected} 前的 concat 输入`, 30, 181, "rc-dense-caption"));
  let cursor = 30;
  inputs.forEach((source) => {
    const output = denseOutputChannels(source, state.denseC0, state.denseK);
    const width = Math.max(42, Math.min(92, output / 1.35));
    graphic.append(svgElement("rect", { x: cursor, y: 195, width, height: 38, rx: 3, class: `rc-concat-block ${colors[source % colors.length]}` }));
    graphic.append(svgText(`x${source}`, cursor + 7, 218, "rc-concat-text"));
    graphic.append(svgText(`${output}`, cursor + 7, 228, "rc-concat-small"));
    cursor += width + 5;
  });
  if (!inputs.length) graphic.append(svgText("x₀ 是初始特征图，不由 Dense layer 生成。", 30, 218, "rc-svg-note"));
  else {
    graphic.append(svgText("concat", cursor + 4, 218, "rc-concat-arrow"));
    graphic.append(svgLine(cursor - 5, 214, cursor + 2, 214, "rc-forward"));
    graphic.append(svgText(`= ${denseInputChannels(state.denseSelected, state.denseC0, state.denseK)} channels`, 31, 265, "rc-concat-result"));
  }
  const controls = element("div", "rc-dense-controls");
  const targetInput = denseInputChannels(state.denseSelected, state.denseC0, state.denseK);
  const targetFormula = state.denseSelected === 1 ? `x₁ 输入 = c₀ = ${targetInput}` : `x${state.denseSelected} 输入 = c₀ + ${state.denseSelected - 1}k = ${targetInput}`;
  controls.append(
    denseInput("初始通道 c₀", state.denseC0, 8, 256, (value) => { state.denseC0 = value; state.paint(); }),
    denseInput("每层新增通道 k", state.denseK, 1, 128, (value) => { state.denseK = value; state.paint(); }),
    element("p", "rc-target-channel", targetFormula),
    element("p", "rc-connection-count", `固定参数：c₀=${state.denseC0}，k=${state.denseK}；concat 输入：${inputs.map((source) => `x${source}:${denseOutputChannels(source, state.denseC0, state.denseK)}`).join(" + ")}。`),
  );
  card.append(heading, graphic, controls);
  return card;
};

const buildDenseCost = (state) => {
  const card = element("section", "rc-card rc-dense-cost-card");
  card.append(element("h2", "", "代价：channel 线性累积"));
  card.append(formula([["", "xₗ = Hₗ([x₀, x₁, …, xₗ₋₁])"], ["dim", "；l≥1 时输入 channels = c₀ + k·(l−1)"]]));
  const chart = svg("rc-channel-chart", 500, 150);
  const values = Array.from({ length: 5 }, (_, index) => denseInputChannels(index, state.denseC0, state.denseK));
  const selectedValue = values[state.denseSelected];
  const max = Math.max(...values);
  chart.append(svgLine(38, 9, 38, 124, "rc-axis"), svgLine(38, 124, 482, 124, "rc-axis"));
  chart.append(svgText("输入通道数", 4, 18, "rc-axis-title"), svgText("目标层 l", 433, 148, "rc-axis-title"));
  values.forEach((value, index) => {
    const height = 98 * value / max;
    const x = 66 + index * 79;
    chart.append(svgElement("rect", { x, y: 123 - height, width: 42, height, rx: 3, class: `rc-channel-bar ${index === state.denseSelected ? "last" : ""}` }));
    chart.append(svgText(String(value), x + 3, 116 - height, "rc-bar-label"));
    chart.append(svgText(`x${index}`, x + 7, 142, "rc-axis-label"));
  });
  const ratio = Math.pow(selectedValue / state.denseC0, 2);
  const comparison = element("div", "rc-cost-comparison");
  comparison.append(
    element("p", "rc-chart-caption", `横轴：生成目标 xₗ；纵轴：进入 Hₗ 前 concat 后的输入宽度。红色柱：当前选中的 x${state.denseSelected}。`),
    element("p", "", "ResNet：O(c² × H × W)，每层固定"),
    element("p", "", "DenseNet：O((c₀+k·(l−1))² × H × W)，随深度二次增长"),
    element("p", "rc-cost-result", `生成 x${state.denseSelected} 时：(${selectedValue} / ${state.denseC0})² ≈ ${ratio.toFixed(2)} 倍`),
  );
  card.append(chart, comparison);
  return card;
};

const buildDensePanel = (state) => {
  const panel = element("section", "rc-panel rc-dense-panel active");
  panel.append(buildDenseGraph(state), buildDenseCost(state));
  return panel;
};

const baseLogits = [-1.2, 0.8, 1.4, 0.2];

const buildAttentionGraph = (state) => {
  const card = element("section", "rc-card rc-attn-graph-card");
  const heading = element("div", "rc-card-heading");
  heading.append(element("h2", "", "把 residual 改造成深度检索器"));
  const architectureLink = element("button", "rc-architecture-link", "Kimi K3 架构位置（待接入）");
  architectureLink.type = "button";
  architectureLink.disabled = true;
  heading.append(architectureLink);
  card.append(heading);
  const weights = attnResWeights(state.attnEmphasis);
  const graphic = svg("rc-attn-svg", 660, 320);
  const blockSizes = [12, 12, 12, 12, 12, 12, 12, 9];
  const rowHeight = 2.45;
  let blockY = 46;
  graphic.append(svgText("93 层 backbone", 20, 17, "rc-attn-section-title"));
  graphic.append(svgText("长杠：Attention（KDA / Gated MLA）   短杠组：Stable LatentMoE FFN", 20, 30, "rc-small-note"));
  blockSizes.forEach((size, blockIndex) => {
    const height = size * rowHeight + 7;
    graphic.append(svgElement("rect", { x: 18, y: blockY, width: 205, height, rx: 4, class: "rc-attn-block-group" }));
    graphic.append(svgText(`Block ${blockIndex + 1} · ${size} 层`, 152, blockY + 10, "rc-attn-block-index"));
    for (let layer = 0; layer < size; layer += 1) {
      const y = blockY + 16 + layer * rowHeight;
      const gatedMla = layer % 4 === 3;
      graphic.append(svgLine(30, y, gatedMla ? 120 : 103, y, gatedMla ? "rc-attn-depth-line mla" : "rc-attn-depth-line"));
      [0, 1, 2, 3].forEach((branch) => graphic.append(svgLine(110 + branch * 7, y - .8, 115 + branch * 7, y - .8, "rc-attn-ffn-line")));
    }
    blockY += height + 2;
  });
  graphic.append(svgElement("path", { d: "M 231 164 C 248 164, 258 164, 273 164", class: "rc-block-reduce-arrow" }));
  graphic.append(svgElement("path", { d: "M 266 158 L 274 164 L 266 170", class: "rc-block-reduce-arrow" }));
  graphic.append(svgText("block 内 ∑fⱼ(hⱼ) → bₙ", 228, 147, "rc-attn-reduce-label"));
  graphic.append(svgText("跨 Block 可检索表示", 286, 40, "rc-attn-section-title"));
  const candidates = ["b₀=h₁", "b₁", "b₄", "b₈"];
  const candidateYs = [56, 111, 166, 221];
  candidateYs.forEach((y, index) => {
    const selected = state.attnEmphasis === index;
    graphic.append(svgElement("path", {
      d: `M 394 ${y + 18} C 465 ${y + 18}, 484 159, 546 159`,
      class: `rc-attn-link ${selected ? "selected" : ""}`,
      "stroke-width": String(1.5 + weights[index] * 12),
      opacity: String(0.22 + weights[index] * 0.78),
    }));
    graphic.append(svgElement("rect", { x: 286, y, width: 108, height: 36, rx: 4, class: `rc-attn-history ${selected ? "selected" : ""}` }));
    graphic.append(svgText(candidates[index], 298, y + 22, "rc-node-text"));
    graphic.append(svgText(`α=${weights[index].toFixed(2)}`, 414, y + 22, "rc-attn-weight"));
  });
  graphic.append(svgElement("rect", { x: 546, y: 130, width: 92, height: 58, rx: 5, class: "rc-pseudo-query" }));
  graphic.append(svgText("wₗ", 580, 153, "rc-node-text"));
  graphic.append(svgText("pseudo-query", 557, 172, "rc-small-note"));
  graphic.append(svgText("8 个 Block：7×12 层 + 最后 9 层；b₀=h₁ 保留 embedding。", 286, 292, "rc-attn-result"));
  const choiceLabel = element("p", "rc-attn-choice-label", "图中抽样展开 b₀、b₁、b₄、b₈；实际注意力读取当前 Block 之前的全部 Block 表示。 ");
  const choices = element("div", "rc-attn-choices");
  ATTNRES_LABELS.forEach((label, index) => choices.append(button(label, state.attnEmphasis === index ? "active" : "", () => {
    state.attnEmphasis = index;
    state.paint();
  })));
  card.append(graphic, choiceLabel, choices);
  return card;
};

const buildAttentionMath = (state) => {
  const card = element("section", "rc-card rc-attn-math-card");
  card.append(element("h2", "", "Attention Residuals 完整计算链"));
  const logits = baseLogits.map((value, index) => value + (index === state.attnEmphasis ? 2.2 : 0));
  const weights = softmaxWeights(logits);
  const values = [0.4, 1, 1.5, 0.8];
  const aggregate = weights.reduce((sum, weight, index) => sum + weight * values[index], 0);
  const residualUpdate = aggregate * 0.2;
  const chain = element("div", "rc-attn-chain");
  const stepOne = element("section", "rc-attn-step");
  stepOne.append(element("b", "", "Step 1 · 定义 Block 候选"), element("p", "", `qₗ = wₗ；Block AttnRes 取 kᵢ=vᵢ=bᵢ，其中 b₀=h₁，bₙ=Σⱼ∈Bₙfⱼ(hⱼ)。当前演示让 qₗ 对 ${ATTNRES_LABELS[state.attnEmphasis]} 更敏感。`));
  const stepTwo = element("section", "rc-attn-step");
  stepTwo.append(element("b", "", "Step 2 · 打分并归一化"), element("p", "rc-calc-heading", `z = [${logits.map((value) => value.toFixed(1)).join(", ")}]；α = softmax(z)`));
  const weightsBox = element("div", "rc-softmax-calc");
  weights.forEach((weight, index) => {
    const row = element("div", "rc-weight-row");
    row.append(element("span", "", `α${index}`));
    const bar = element("i", index === state.attnEmphasis ? "active" : "");
    bar.style.setProperty("--weight", `${weight * 100}%`);
    row.append(bar, element("b", "", weight.toFixed(2)));
    weightsBox.append(row);
  });
  const names = ["Embedding", "Block 1", "Block 4", "Block 8"];
  stepTwo.append(weightsBox, element("p", "rc-attn-reading", `最大权重指向 ${names[state.attnEmphasis]}；图中相应连线会变粗。`));
  const stepThree = element("section", "rc-attn-step");
  stepThree.append(element("b", "", "Step 3 · 加权读取历史"), element("p", "", `hₗ = ${weights.map((weight, index) => `${weight.toFixed(2)}×${values[index]}`).join(" + ")} = ${aggregate.toFixed(2)}（示意标量）`));
  const stepFour = element("section", "rc-attn-step");
  stepFour.append(element("b", "", "Step 4 · 进入当前 Block"), element("p", "", `hₗ 输入当前层；Block 内继续累加 bₙ。示意：${aggregate.toFixed(2)} + Fₗ(hₗ)=${residualUpdate.toFixed(2)} → ${(aggregate + residualUpdate).toFixed(2)}`));
  chain.append(stepOne, stepTwo, stepThree, stepFour);
  card.append(chain);
  return card;
};

const buildAttentionPanel = (state) => {
  const panel = element("section", "rc-panel rc-attn-panel active");
  panel.append(buildAttentionGraph(state), buildAttentionMath(state));
  return panel;
};

export const renderResidualConnections = (block, context) => {
  const stored = context.getValue(block.id, {});
  const state = {
    tab: ["resnet", "densenet", "attnres"].includes(stored.tab) ? stored.tab : "resnet",
    topLoss: Number.isFinite(stored.topLoss) ? stored.topLoss : 1,
    gradMode: stored.gradMode === "resnet" ? "resnet" : "vanilla",
    selectedLayer: Number.isInteger(stored.selectedLayer) ? stored.selectedLayer : 0,
    denseSelected: Number.isInteger(stored.denseSelected) ? Math.max(1, Math.min(4, stored.denseSelected)) : 4,
    denseC0: Number.isFinite(stored.denseC0) ? stored.denseC0 : 64,
    denseK: Number.isFinite(stored.denseK) ? stored.denseK : 32,
    attnEmphasis: Number.isInteger(stored.attnEmphasis) ? stored.attnEmphasis : 2,
    refreshers: [],
  };
  const root = element("article", "block residual-connections");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const persist = () => {
    context.setValue(block.id, {
      tab: state.tab, topLoss: state.topLoss, gradMode: state.gradMode, selectedLayer: state.selectedLayer,
      denseSelected: state.denseSelected, denseC0: state.denseC0, denseK: state.denseK, attnEmphasis: state.attnEmphasis,
    });
    context.persist();
  };
  state.persist = persist;
  const body = element("div", "rc-content");
  let activePane = null;
  const buildPane = () => (state.tab === "resnet" ? buildResnetPanel(state) : state.tab === "densenet" ? buildDensePanel(state) : buildAttentionPanel(state));
  const paint = ({ direction = 1, animate = false } = {}) => {
    persist();
    state.refreshers = [];
    const nextPane = buildPane();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || !activePane || reducedMotion) {
      body.replaceChildren(nextPane);
      activePane = nextPane;
      return;
    }
    const offset = direction > 0 ? "7%" : "-7%";
    const outgoing = activePane.animate(
      [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-direction * 7}%)`, opacity: 0 }],
      { duration: 280, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" },
    );
    nextPane.style.transform = `translateX(${offset})`;
    nextPane.style.opacity = "0";
    body.append(nextPane);
    const incoming = nextPane.animate(
      [{ transform: `translateX(${offset})`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
      { duration: 360, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" },
    );
    activePane = nextPane;
    Promise.allSettled([outgoing.finished, incoming.finished]).then(() => {
      if (activePane === nextPane) body.replaceChildren(nextPane);
    });
  };
  state.paint = paint;
  const claims = element("section", "rc-claims");
  const list = element("ol", "rc-claim-list");
  block.claims.forEach((claim) => list.append(element("li", "", claim)));
  claims.append(list);
  const tabs = element("div", "rc-tab-bar", "");
  const tabButtons = new Map();
  const updateTabButtons = () => tabButtons.forEach((node, id) => node.classList.toggle("active", id === state.tab));
  [["resnet", "ResNet"], ["densenet", "DenseNet"], ["attnres", "Attention Residuals"]].forEach(([id, label]) => {
    const tabButton = button(label, state.tab === id ? "active" : "", () => {
      if (state.tab === id) return;
      const ids = ["resnet", "densenet", "attnres"];
      const direction = ids.indexOf(id) > ids.indexOf(state.tab) ? 1 : -1;
      state.tab = id;
      updateTabButtons();
      paint({ direction, animate: true });
      root.focus({ preventScroll: true });
    });
    tabButtons.set(id, tabButton);
    tabs.append(tabButton);
  });
  root.trackNavigate = (direction) => {
    const ids = ["resnet", "densenet", "attnres"];
    const next = ids.indexOf(state.tab) + direction;
    if (next < 0 || next >= ids.length) return false;
    state.tab = ids[next];
    updateTabButtons();
    paint({ direction, animate: true });
    root.focus({ preventScroll: true });
    return true;
  };
  paint();
  root.append(claims, tabs, body, element("p", "rc-source", `来源：${block.source}`));
  return root;
};
