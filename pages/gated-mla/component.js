import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import {
  CHANNEL_LABELS,
  GATE_PROFILE,
  PRIOR_SCHEMES,
  calcKdaStateSize,
  calcMhaCache,
  calcMlaCache,
} from "./logic.js";
import { GATED_MLA_CONNECTIONS } from "./connections.js";

const TABS = [
  ["problem", "① KV 爆炸"],
  ["prior", "② 前人方案"],
  ["mla", "③ MLA 核心"],
  ["nope-gate", "④ NoPE"],
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

const addText = (svg, x, y, value, className = "gmla-svg-label") => {
  const node = svgElement("text", { x, y, class: className }, value);
  svg.append(node);
  return node;
};

const CHART_MAX_GB = 5000;
const yFromGb = (value) => 132 - (value / CHART_MAX_GB) * 117;

const seriesPath = (maxAtMillion) => {
  return `M44 132 L326 ${yFromGb(maxAtMillion).toFixed(2)}`;
};

const buildProblemPane = (state, onChange) => {
  const pane = element("section", "gmla-problem-pane");
  pane.append(element("p", "gmla-intro", "横、纵轴均按真实数值线性计量：固定架构下 KV cache = 每 token 固定开销 × token 数，因此三条线都从 0 GB 线性增长。"));
  const chart = svgElement("svg", { class: "gmla-growth-chart", viewBox: "0 0 360 158", role: "img", "aria-label": "MHA MQA MLA 的 KV cache 增长曲线" });
  chart.append(
    svgElement("line", { x1: "44", y1: "15", x2: "44", y2: "132", class: "gmla-axis" }),
    svgElement("line", { x1: "44", y1: "132", x2: "328", y2: "132", class: "gmla-axis" }),
    svgElement("circle", { cx: "44", cy: "132", r: "3.2", class: "gmla-origin-dot" }),
  );
  [[1000, "1K"], [2000, "2K"], [3000, "3K"], [4000, "4K"], [5000, "5K"]].forEach(([value, label]) => {
    const y = yFromGb(value);
    chart.append(svgElement("line", { x1: "44", y1: y, x2: "328", y2: y, class: "gmla-grid-line" }));
    addText(chart, 38, y + 3, label, "gmla-y-axis-label");
  });
  [[0, "0"], [250000, "250K"], [500000, "500K"], [750000, "750K"], [1000000, "1M"]].forEach(([value, label]) => {
    const tick = addText(chart, 44 + (284 * value) / 1000000, 149, label, "gmla-axis-label");
    tick.setAttribute("text-anchor", "middle");
  });
  const originNote = addText(chart, 49, 123, "t=0：全部为 0 GB", "gmla-origin-note");
  originNote.setAttribute("style", "fill: var(--blue); font-family: var(--font-mono); font-size: var(--fixed-font-7); font-weight: 800;");
  const h100Y = yFromGb(80);
  chart.append(svgElement("line", { x1: "44", y1: h100Y, x2: "328", y2: h100Y, class: "gmla-h100-line" }));
  const h100Label = addText(chart, 322, 122, "H100 单卡 80 GB", "gmla-h100-label");
  h100Label.setAttribute("text-anchor", "end");
  const series = [
    ["mha", 4571, "标准 MHA · 4,571 GB", 20],
    ["mqa", 49, "MQA · 49 GB", 108],
    ["mla", 571, "MLA · 571 GB", 97],
  ].map(([id, value, label, labelY]) => {
    const path = svgElement("path", { d: seriesPath(value), class: `gmla-growth-line ${id}`, pathLength: "1" });
    chart.append(path);
    if (id !== "mha") {
      const tone = id === "mqa" ? "var(--blue)" : "var(--green)";
      const leader = svgElement("line", { x1: "326", y1: yFromGb(value).toFixed(2), x2: "317", y2: labelY - 3 });
      leader.setAttribute("style", `stroke: ${tone}; stroke-width: 0.8; stroke-dasharray: 2 2;`);
      chart.append(leader);
    }
    const seriesLabel = addText(chart, 322, labelY, label, `gmla-series-label ${id}`);
    seriesLabel.setAttribute("text-anchor", "end");
    return path;
  });
  const warning = addText(chart, 214, 77, "⚠ 无法装入单卡", "gmla-chart-warning");
  pane.append(chart);
  const cards = element("div", "gmla-number-cards");
  [
    ["danger", "标准 MHA", "1M × 96头 × 128维 × K/V × 93层 × 2B ≈ 4,571 GB"],
    ["", "设计目标", "能装进推理服务器"],
    ["success", "H100 单机 8 卡", "640 GB"],
  ].forEach(([tone, label, value]) => {
    const card = element("div", `gmla-number-card ${tone}`);
    card.append(element("span", "", label), element("strong", "", value));
    cards.append(card);
  });
  pane.append(cards);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    state.animStage = 4;
  } else {
    series.forEach((path) => path.style.strokeDashoffset = "1");
    warning.style.opacity = "0";
    Array.from(cards.children).forEach((card) => card.style.opacity = "0");
    const start = performance.now();
    let lastStage = -1;
    const tick = (now) => {
      if (!pane.isConnected) return;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / 800);
      series.forEach((path) => path.style.strokeDashoffset = String(1 - progress));
      const stage = Math.min(4, Math.floor(elapsed / 200));
      if (stage !== lastStage) {
        lastStage = stage;
        state.animStage = stage;
        warning.style.opacity = stage >= 2 ? "1" : "0";
        Array.from(cards.children).forEach((card, index) => card.style.opacity = stage >= index + 2 ? "1" : "0");
        onChange();
      }
      if (progress < 1 || stage < 4) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return pane;
};

const priorVisual = (scheme) => {
  const svg = svgElement("svg", { class: "gmla-prior-svg", viewBox: "0 0 180 92", role: "img", "aria-label": `${scheme.label} 的多头 KV cache` });
  const tokenXs = Array.from({ length: 8 }, (_, index) => 18 + index * 20);
  tokenXs.forEach((x) => svg.append(svgElement("circle", { cx: x, cy: "16", r: "3.2", class: "gmla-q-dot" })));
  if (scheme.id === "mha") {
    tokenXs.forEach((x) => svg.append(svgElement("rect", { x: x - 5, y: "34", width: "10", height: "38", class: "gmla-kv-stack" })));
    for (let row = 0; row < 7; row += 1) tokenXs.forEach((x) => svg.append(svgElement("line", { x1: x - 4, x2: x + 4, y1: 39 + row * 5, y2: 39 + row * 5, class: "gmla-kv-divider" })));
  } else {
    const groups = scheme.id === "mqa" ? [90] : [58, 122];
    groups.forEach((x) => svg.append(svgElement("rect", { x: x - 12, y: "48", width: "24", height: "24", class: scheme.id === "mqa" ? "gmla-shared-kv warning" : "gmla-shared-kv" })));
    tokenXs.forEach((x, index) => {
      const target = scheme.id === "mqa" ? 90 : index < 4 ? 58 : 122;
      svg.append(svgElement("line", { x1: x, y1: "21", x2: target, y2: "47", class: "gmla-share-line" }));
    });
  }
  addText(svg, 90, 88, scheme.id === "mha" ? "8 头 × 独立 KV" : scheme.id === "mqa" ? "8 Q → 1 套 KV" : "8 Q → 2 组 KV", "gmla-prior-label");
  return svg;
};

const buildPriorPane = (state, onChange) => {
  const pane = element("section", "gmla-prior-pane");
  pane.append(element("p", "gmla-prior-intro", "最直接的想法：让多个 Q 头共用 K/V。存储变小，但每个 K/V 头必须同时服务更多语义方向。"));
  const columns = element("div", "gmla-prior-columns");
  const buttons = [];
  PRIOR_SCHEMES.slice(0, 3).forEach((scheme) => {
    const button = element("button", `gmla-prior-card ${state.selectedPrior === scheme.id ? "active" : ""}`);
    button.type = "button";
    button.dataset.scheme = scheme.id;
    button.append(priorVisual(scheme), element("strong", "", scheme.label), element("span", "", `cache = ${scheme.cache}`));
    if (scheme.id === "mqa") button.append(element("small", "danger", "多头并行检索退化"));
    if (scheme.id === "gqa") button.append(element("small", "", "分组折中，G=2"));
    button.addEventListener("click", () => {
      state.selectedPrior = scheme.id;
      buttons.forEach((item) => item.classList.toggle("active", item.dataset.scheme === scheme.id));
      onChange();
    });
    buttons.push(button);
    columns.append(button);
  });
  const issue = element("div", "gmla-prior-issue");
  issue.append(
    element("strong", "", "减少头数的代价"),
    element("p", "", "头数越少，每套 K/V 服务的 Q 越多；不同 Q 难以同时检索不同语义方向，表达力随共享程度增加而退化。"),
  );
  pane.append(columns, issue, element("p", "gmla-transition", "能否不减少头数，只让每个 token 存的表示更小？"));
  return pane;
};

const buildMlaPane = (state) => {
  const pane = element("section", "gmla-mla-pane");
  pane.append(element("p", "gmla-mla-intro", "历史 token 只常驻低维 latent；当前 token 到来时才展开 K/V、计算全局注意力，再用门控筛掉不该进入输出通道的信息。"));
  const svg = svgElement("svg", { class: "gmla-mla-flow", viewBox: "0 0 620 270", role: "img", "aria-label": "Gated MLA 的历史 KV 重建、当前查询、注意力与门控流程" });
  const defs = svgElement("defs");
  const marker = svgElement("marker", { id: "gmla-flow-arrow", markerWidth: "7", markerHeight: "7", refX: "6", refY: "3.5", orient: "auto" });
  marker.append(svgElement("path", { d: "M0 0 L7 3.5 L0 7 Z", class: "gmla-arrow-head" }));
  defs.append(marker);
  svg.append(defs);
  const stage = (...ids) => `gmla-flow-stage${ids.includes(state.mlaStep) ? " is-active" : ""}`;
  const arrow = (x1, y1, x2, y2, className = "gmla-flow-arrow-line", parent = svg) => parent.append(svgElement("line", { x1, y1, x2, y2, class: className, "marker-end": "url(#gmla-flow-arrow)" }));
  const history = svgElement("g", { class: "gmla-history-stack" });
  ["τ−2", "τ−1", "τ"].forEach((token, index) => {
    const y = 32 + index * 52;
    history.append(svgElement("rect", { x: "18", y, width: "58", height: "31", rx: "3", class: "gmla-history-token" }));
    history.append(svgElement("text", { x: "47", y: y + 20, "text-anchor": "middle", class: "gmla-flow-text" }, `x${token}`));
    arrow(77, y + 15, 103, y + 15);
    const compress = svgElement("g", { class: stage(1) });
    compress.append(svgElement("path", { d: `M104 ${y} L130 ${y + 7} L130 ${y + 24} L104 ${y + 31} Z`, class: "gmla-compress-shape" }));
    history.append(compress);
    arrow(131, y + 15, 145, y + 15);
    history.append(svgElement("rect", { x: "146", y: y + 5, width: "20", height: "21", rx: "2", class: "gmla-latent-box" }));
    history.append(svgElement("text", { x: "156", y: y - 4, "text-anchor": "middle", class: "gmla-latent-label" }, "c"));
    arrow(167, y + 15, 190, y + 15);
    const expand = svgElement("g", { class: stage(2) });
    expand.append(svgElement("path", { d: `M190 ${y + 7} L210 ${y} L210 ${y + 31} L190 ${y + 24} Z`, class: "gmla-expand-shape" }));
    expand.append(svgElement("rect", { x: "214", y, width: "30", height: "13", rx: "2", class: "gmla-kv-box key" }));
    expand.append(svgElement("rect", { x: "214", y: y + 18, width: "30", height: "13", rx: "2", class: "gmla-kv-box value" }));
    expand.append(svgElement("text", { x: "229", y: y + 10, "text-anchor": "middle", class: "gmla-kv-label" }, "k"));
    expand.append(svgElement("text", { x: "229", y: y + 28, "text-anchor": "middle", class: "gmla-kv-label" }, "v"));
    history.append(expand);
  });
  svg.append(history);
  const cache = svgElement("g", { class: stage(1) });
  cache.append(svgElement("text", { x: "145", y: "11", "text-anchor": "end", class: "gmla-cache-only" }, "缓存 c"));
  svg.append(cache);
  const query = svgElement("g", { class: stage(3) });
  query.append(svgElement("rect", { x: "500", y: "28", width: "75", height: "32", rx: "3", class: "gmla-current-token" }));
  query.append(svgElement("text", { x: "537", y: "49", "text-anchor": "middle", class: "gmla-flow-text" }, "新 xₜ"));
  arrow(537, 61, 537, 84, "gmla-flow-arrow-line", query);
  query.append(svgElement("rect", { x: "504", y: "86", width: "67", height: "26", rx: "3", class: "gmla-query-matrix" }));
  query.append(svgElement("text", { x: "537", y: "103", "text-anchor": "middle", class: "gmla-flow-text" }, "Wq"));
  arrow(537, 113, 537, 132, "gmla-flow-arrow-line", query);
  query.append(svgElement("circle", { cx: "537", cy: "144", r: "15", class: "gmla-query-dot" }));
  query.append(svgElement("text", { x: "537", y: "149", "text-anchor": "middle", class: "gmla-kv-label" }, "qₜ"));
  svg.append(query);
  const attention = svgElement("g", { class: stage(3) });
  attention.append(svgElement("path", { d: "M245 47 C366 47 410 142 495 144", class: "gmla-attention-wire", "marker-end": "url(#gmla-flow-arrow)" }));
  attention.append(svgElement("path", { d: "M245 99 C360 99 405 144 495 144", class: "gmla-attention-wire", "marker-end": "url(#gmla-flow-arrow)" }));
  attention.append(svgElement("path", { d: "M245 151 C354 151 403 146 495 144", class: "gmla-attention-wire", "marker-end": "url(#gmla-flow-arrow)" }));
  attention.append(svgElement("rect", { x: "345", y: "169", width: "120", height: "30", rx: "3", class: "gmla-softmax-box" }));
  attention.append(svgElement("text", { x: "405", y: "189", "text-anchor": "middle", class: "gmla-flow-text" }, "softmax → ΣaV"));
  arrow(537, 160, 465, 183, "gmla-attention-wire", attention);
  svg.append(attention);
  const attentionOutput = svgElement("g", { class: stage(3, 4) });
  attentionOutput.append(
    svgElement("rect", { x: "480", y: "169", width: "58", height: "30", rx: "3", class: "gmla-attention-output" }),
    svgElement("text", { x: "509", y: "189", "text-anchor": "middle", class: "gmla-flow-text" }, "õₜ"),
  );
  svg.append(attentionOutput);
  const gate = svgElement("g", { class: stage(4) });
  gate.append(svgElement("path", { d: "M575 44 C608 77 608 226 582 234", class: "gmla-gate-wire", "marker-end": "url(#gmla-flow-arrow)" }));
  gate.append(svgElement("rect", { x: "480", y: "224", width: "102", height: "30", rx: "3", class: "gmla-gate-box" }));
  gate.append(svgElement("text", { x: "531", y: "244", "text-anchor": "middle", class: "gmla-flow-text" }, "σ(Wg·xₜ)"));
  gate.append(svgElement("circle", { cx: "509", cy: "212", r: "9", class: "gmla-product-node" }));
  gate.append(svgElement("text", { x: "509", y: "216", "text-anchor": "middle", class: "gmla-product-label" }, "⊙"));
  gate.append(svgElement("path", { d: "M509 199 L509 203", class: "gmla-gate-wire", "marker-end": "url(#gmla-flow-arrow)" }));
  gate.append(svgElement("path", { d: "M531 224 L517 218", class: "gmla-gate-wire", "marker-end": "url(#gmla-flow-arrow)" }));
  gate.append(svgElement("path", { d: "M518 212 L566 212", class: "gmla-gate-wire", "marker-end": "url(#gmla-flow-arrow)" }));
  gate.append(svgElement("text", { x: "576", y: "216", "text-anchor": "start", class: "gmla-output-label" }, "yₜ"));
  svg.append(gate);
  pane.append(svg);
  const ratio = element("div", "gmla-ratio-bars");
  const mha = element("div", "gmla-ratio-row danger");
  mha.append(element("span", "", "标准 MHA"), element("i"), element("strong", "", "24,576 数/token"));
  const mla = element("div", "gmla-ratio-row success");
  mla.append(element("span", "", "MLA"), element("i"), element("strong", "", "3,584 数/token · 约 6.9×"));
  ratio.append(mha, mla);
  pane.append(ratio, element("p", "gmla-mla-conclusion", "softmax 只在历史位置之间归一化注意力权重；Sigmoid 门控是逐通道 0–1 缩放，不要求通道总和为 1。"));
  return pane;
};

const gateColumn = (token, profile) => {
  const column = element("section", "gmla-gate-column");
  column.append(element("strong", "gmla-gate-token", `当前 token：${token}`), element("p", "gmla-global-readout", "õₜ · 全局 attention 混合读出"));
  const bars = element("div", "gmla-gate-bars");
  const barNodes = profile.map((value, index) => {
    const row = element("div", "gmla-gate-row");
    const fill = element("i");
    fill.style.setProperty("--gate", "0.5");
    row.append(element("span", "", CHANNEL_LABELS[index]), fill, element("b", "", value.toFixed(2)));
    bars.append(row);
    return fill;
  });
  column.append(bars, element("p", "gmla-filtered", "过滤后：高门值通道保留，低门值通道压暗"));
  return { column, barNodes };
};

const buildGatePanel = (state, compact = false) => {
  const gate = element("section", `gmla-gate-panel${compact ? " compact" : ""}`);
  gate.append(
    element("strong", "gmla-panel-title", "输出门控：按当前 token 的任务角色过滤"),
    element("p", "gmla-gate-rule", "Sigmoid(Wg · xₜ) 逐通道生成门值"),
  );
  const columns = element("div", "gmla-gate-columns");
  const brace = gateColumn("}", GATE_PROFILE.brace);
  const print = gateColumn("print", GATE_PROFILE.print);
  columns.append(brace.column, print.column);
  gate.append(columns);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    state.gateValues = [...GATE_PROFILE.brace];
    brace.barNodes.forEach((node, index) => node.style.setProperty("--gate", String(GATE_PROFILE.brace[index])));
    print.barNodes.forEach((node, index) => node.style.setProperty("--gate", String(GATE_PROFILE.print[index])));
    return gate;
  }
  const start = performance.now();
  const tick = (now) => {
    if (!gate.isConnected) return;
    const elapsed = now - start;
    const braceProgress = Math.min(1, elapsed / 600);
    const printProgress = Math.min(1, Math.max(0, elapsed - 200) / 600);
    brace.barNodes.forEach((node, index) => {
      const value = 0.5 + (GATE_PROFILE.brace[index] - 0.5) * braceProgress;
      node.style.setProperty("--gate", String(value));
    });
    print.barNodes.forEach((node, index) => {
      const value = 0.5 + (GATE_PROFILE.print[index] - 0.5) * printProgress;
      node.style.setProperty("--gate", String(value));
    });
    state.gateValues = GATE_PROFILE.brace.map((target) => 0.5 + (target - 0.5) * braceProgress);
    if (printProgress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return gate;
};

const buildAbsolutePositionVisual = () => {
  const svg = svgElement("svg", { class: "gmla-position-svg absolute", viewBox: "0 0 240 120", role: "img", "aria-label": "绝对位置编码把语义与位置向量直接相加" });
  const defs = svgElement("defs");
  const mix = svgElement("linearGradient", { id: "gmla-absolute-mix", x1: "0%", y1: "0%", x2: "100%", y2: "0%" });
  mix.append(svgElement("stop", { offset: "0%", "stop-color": "var(--blue)" }), svgElement("stop", { offset: "100%", "stop-color": "var(--accent)" }));
  defs.append(mix);
  svg.append(defs,
    svgElement("rect", { x: "18", y: "25", width: "32", height: "58", rx: "3", class: "semantic" }),
    svgElement("rect", { x: "72", y: "25", width: "32", height: "58", rx: "3", class: "position" }),
    svgElement("text", { x: "61", y: "58", class: "operator", "text-anchor": "middle" }, "+"),
    svgElement("rect", { x: "132", y: "25", width: "42", height: "58", rx: "3", fill: "url(#gmla-absolute-mix)" }),
    svgElement("text", { x: "34", y: "100", class: "label", "text-anchor": "middle" }, "语义 eₜ"),
    svgElement("text", { x: "88", y: "100", class: "label", "text-anchor": "middle" }, "位置 pₜ"),
    svgElement("text", { x: "153", y: "100", class: "label", "text-anchor": "middle" }, "xₜ=eₜ+pₜ"),
    svgElement("text", { x: "190", y: "53", class: "failure" }, "✕"),
    svgElement("text", { x: "182", y: "70", class: "failure-note" }, ">训练长度：OOD"),
  );
  return svg;
};

const buildRopePositionVisual = () => {
  const svg = svgElement("svg", { class: "gmla-position-svg rope", viewBox: "0 0 240 176", role: "img", "aria-label": "RoPE 相对位置旋转与 MLA 不可交换冲突" });
  svg.append(
    svgElement("path", { d: "M154 106 A100 100 0 0 0 102 49", class: "rope-arc", transform: "translate(0 -35)" }),
    svgElement("line", { x1: "60", y1: "140", x2: "154", y2: "106", class: "rope-guide", transform: "translate(0 -35)" }),
    svgElement("line", { x1: "60", y1: "140", x2: "102", y2: "49", class: "rope-guide", transform: "translate(0 -35)" }),
    svgElement("circle", { cx: "154", cy: "106", r: "5", class: "rope-point s", transform: "translate(0 -35)" }),
    svgElement("circle", { cx: "102", cy: "49", r: "5", class: "rope-point t", transform: "translate(0 -35)" }),
    svgElement("text", { x: "162", y: "109", class: "label", transform: "translate(0 -35)" }, "kₛ"),
    svgElement("text", { x: "109", y: "45", class: "label", transform: "translate(0 -35)" }, "qₜ"),
    svgElement("path", { d: "M107 123 A50 50 0 0 0 81 95", class: "relative-arc", transform: "translate(0 -35)" }),
    svgElement("text", { x: "105", y: "91", class: "relative-label", "text-anchor": "middle", transform: "translate(0 -35)" }, "θ(t−s)"),
    svgElement("text", { x: "178", y: "73", class: "formula", transform: "translate(0 -35)" }, "qₜᵀkₛ"),
    svgElement("text", { x: "178", y: "89", class: "formula green", transform: "translate(0 -35)" }, "∝ cos θ(t−s)"),
    svgElement("text", { x: "49", y: "117", class: "path-label", "text-anchor": "middle" }, "R(θ)·[Wk·cₜ]"),
    svgElement("text", { x: "95", y: "117", class: "path-mark bad" }, "✕"),
    svgElement("text", { x: "119", y: "119", class: "not-equal", "text-anchor": "middle" }, "≠"),
    svgElement("text", { x: "174", y: "117", class: "path-label", "text-anchor": "middle" }, "Wk·[R(θ)·cₜ]"),
    svgElement("text", { x: "222", y: "117", class: "path-mark good" }, "✓"),
    svgElement("text", { x: "49", y: "129", class: "caption", "text-anchor": "middle" }, "想要的形式"),
    svgElement("text", { x: "174", y: "129", class: "caption", "text-anchor": "middle" }, "实际能做到的"),
    svgElement("text", { x: "49", y: "138", class: "path-note", "text-anchor": "middle" }, "先展开 K 再旋转"),
    svgElement("text", { x: "174", y: "138", class: "path-note", "text-anchor": "middle" }, "先旋转 latent"),
    svgElement("text", { x: "181", y: "146", class: "position-cost" }, "+位置 K cache"),
    svgElement("rect", { x: "6", y: "147", width: "171", height: "9", class: "latent-bar" }),
    svgElement("rect", { x: "181", y: "147", width: "53", height: "9", class: "position-bar" }),
    svgElement("text", { x: "6", y: "171", class: "cache-label" }, "latent + 额外位置 K cache"),
  );
  return svg;
};

const buildNopePositionVisual = () => {
  const svg = svgElement("svg", { class: "gmla-position-svg nope", viewBox: "0 0 240 160", role: "img", "aria-label": "KDA 衰减隐式编码距离并省去位置 K cache" });
  svg.append(
    svgElement("line", { x1: "25", y1: "82", x2: "220", y2: "82", class: "axis" }),
    svgElement("line", { x1: "25", y1: "82", x2: "25", y2: "15", class: "axis" }),
    svgElement("path", { d: "M25 20 C55 29 78 45 103 60 C132 76 172 81 218 82 L218 82 L25 82 Z", class: "decay-area" }),
    svgElement("path", { d: "M25 20 C55 29 78 45 103 60 C132 76 172 81 218 82", class: "decay-line", pathLength: "1" }),
    svgElement("circle", { cx: "25", cy: "20", r: "4", class: "decay-point" }),
    svgElement("circle", { cx: "103", cy: "60", r: "4", class: "decay-point middle" }),
    svgElement("circle", { cx: "208", cy: "82", r: "3", class: "decay-point far" }),
    svgElement("line", { x1: "103", y1: "60", x2: "103", y2: "82", class: "guide" }),
    svgElement("text", { x: "31", y: "17", class: "weight-label" }, "≈1.0"),
    svgElement("text", { x: "108", y: "57", class: "weight-label" }, "αᵐ"),
    svgElement("text", { x: "214", y: "75", class: "weight-label", "text-anchor": "end" }, "≈0"),
    svgElement("text", { x: "117", y: "96", class: "axis-label", "text-anchor": "middle" }, "token 距离 d"),
    svgElement("text", { x: "13", y: "49", class: "axis-label", transform: "rotate(-90 13 49)", "text-anchor": "middle" }, "αᵈ"),
    svgElement("text", { x: "11", y: "119", class: "cache-row-label" }, "DeepSeek V2"),
    svgElement("rect", { x: "75", y: "110", width: "102", height: "13", class: "latent-bar" }),
    svgElement("rect", { x: "181", y: "110", width: "42", height: "13", class: "position-bar" }),
    svgElement("text", { x: "11", y: "143", class: "cache-row-label" }, "K3 NoPE"),
    svgElement("rect", { x: "75", y: "134", width: "102", height: "13", class: "latent-bar" }),
    svgElement("rect", { x: "181", y: "134", width: "42", height: "13", class: "position-bar removed" }),
    svgElement("text", { x: "181", y: "158", class: "nope-note" }, "位置由 KDA 承担"),
  );
  return svg;
};

const POSITION_COLUMNS = [
  {
    id: "absolute", year: "2017", title: "绝对位置编码", subtitle: "Transformer · Sinusoidal", tone: "danger",
    issue: "位置直接加入 embedding：语义与位置发生耦合。",
    mechanisms: ["xₜ=eₜ+pₜ，位置向量直接污染语义空间", "Q/K 内积同时混合内容相似度与绝对位置", "训练外位置属于 OOD，长度外推可靠性显著下降", "语义与位置无法再被独立操作"],
    question: "如何让位置进入 attention，却不污染语义空间？", formula: "xₜ = eₜ + pₜ", visual: buildAbsolutePositionVisual,
  },
  {
    id: "rope", year: "2021", title: "RoPE", subtitle: "RoFormer · 旋转位置编码", tone: "neutral",
    issue: "旋转 Q/K，让内积只依赖相对距离 t−s。",
    mechanisms: ["不改 embedding；对 Q/K 施加 R(θ·pos)", "qₜᵀkₛ=qᵀR(θ(t−s))k", "旋转具有周期性，超长距离可能出现相位混淆", "MLA 展开与逐头旋转不可交换，需额外位置 K cache"],
    question: "能否彻底去掉位置编码，不再增加 cache？", formula: "qₜᵀkₛ = qᵀR(θ(t−s))k", visual: buildRopePositionVisual,
  },
  {
    id: "nope", year: "2026", title: "NoPE", subtitle: "Kimi K3 · KDA 隐式位置", tone: "success",
    issue: "KDA 的逐通道衰减 αₜ 让距离自然表现为遗忘。",
    mechanisms: ["Sₜ=Diag(αₜ)(I−βₜkₜkₜᵀ)Sₜ₋₁+βₜkₜvₜᵀ", "αₜ∈(0,1)ᵈᵏ，每个通道独立决定保留率", "历史影响力沿路径连乘 ∏α，距离越远贡献越小", "Gated MLA 完全 NoPE，不旋转、不挂位置 K cache"],
    question: "遗忘即位置：模型只需知道已经遗忘了多少。", formula: "影响力 ∝ ∏ᵢ₌ₛ₊₁ᵗ αᵢ", visual: buildNopePositionVisual,
  },
];

const buildNopeGatePane = (state, onChange) => {
  const pane = element("section", "gmla-position-pane");
  pane.id = "nope-position-encoding";
  const claims = element("ul", "gmla-position-claims");
  [
    "绝对位置编码直接叠加语义与位置；训练长度之外属于分布外位置，外推可靠性显著下降。",
    "RoPE 用旋转将内积改写为相对距离，但周期性与 MLA 展开/旋转不可交换带来超长上下文和额外 cache 问题。",
    "K3 用 KDA 的逐通道衰减 αₜ 隐式承载距离，使 Gated MLA 可以完全 NoPE。",
  ].forEach((claim) => claims.append(element("li", "", claim)));
  const timeline = element("div", "gmla-position-timeline");
  const columnNodes = [];
  POSITION_COLUMNS.forEach((item) => {
    const column = element("section", `gmla-position-column ${item.tone}`);
    column.tabIndex = 0;
    column.dataset.column = item.id;
    const time = element("div", "gmla-position-time");
    time.append(element("i"), element("span", "", item.year));
    const heading = element("header", "gmla-position-heading");
    heading.append(element("h2", "", item.title), element("small", "", item.subtitle));
    const issue = element("p", "gmla-position-issue", item.issue);
    const mechanism = element("ul", "gmla-position-mechanism");
    item.mechanisms.forEach((line) => mechanism.append(element("li", "", line)));
    const visual = item.visual();
    const question = element("p", "gmla-position-question", `→ ${item.question}`);
    const formula = element("code", "gmla-position-formula", item.formula);
    column.append(time, heading, issue, mechanism, formula, visual, question);
    const select = () => {
      state.nopeActiveCol = state.nopeActiveCol === item.id ? null : item.id;
      columnNodes.forEach((node) => {
        node.classList.toggle("selected", node.dataset.column === state.nopeActiveCol);
        node.classList.toggle("deemphasized", Boolean(state.nopeActiveCol) && node.dataset.column !== state.nopeActiveCol);
      });
      onChange();
    };
    column.addEventListener("click", select);
    column.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      select();
    });
    columnNodes.push(column);
    timeline.append(column);
  });
  columnNodes.forEach((node) => {
    node.classList.toggle("selected", node.dataset.column === state.nopeActiveCol);
    node.classList.toggle("deemphasized", Boolean(state.nopeActiveCol) && node.dataset.column !== state.nopeActiveCol);
  });
  pane.append(claims, timeline);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) {
    columnNodes.forEach((node) => { node.style.opacity = "0"; node.style.transform = "translateY(10px)"; });
    const start = performance.now();
    const curve = pane.querySelector(".decay-line");
    const removed = pane.querySelector(".position-bar.removed");
    if (curve) curve.style.strokeDashoffset = "1";
    const tick = (now) => {
      if (!pane.isConnected) return;
      const elapsed = now - start;
      columnNodes.forEach((node, index) => {
        const progress = Math.min(1, Math.max(0, elapsed - index * 100) / 220);
        node.style.opacity = String(progress);
        node.style.transform = `translateY(${(1 - progress) * 10}px)`;
      });
      if (curve) curve.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, elapsed - 200) / 600));
      if (removed) removed.style.transform = `scaleX(${1 - Math.min(1, Math.max(0, elapsed - 500) / 400)})`;
      if (elapsed < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else pane.querySelector(".position-bar.removed")?.setAttribute("style", "transform:scaleX(0)");
  return pane;
};

const buildDivisionPane = (state, onChange) => {
  const pane = element("section", "gmla-division-pane");
  pane.append(element("p", "gmla-division-intro", "让序列增长，观察两种记忆的职责：KDA 把连续历史压进固定状态，MLA 为每个 token 保留可精确寻址的 latent。"));
  const lanes = element("div", "gmla-memory-lanes");
  const kdaLane = element("section", "gmla-memory-lane kda");
  const mlaLane = element("section", "gmla-memory-lane mla");
  const kdaTokens = element("div", "gmla-lane-tokens");
  const mlaTokens = element("div", "gmla-lane-tokens");
  const stateBox = element("div", "gmla-fixed-state", "S");
  const latentCache = element("div", "gmla-latent-cache");
  const kdaValue = element("strong");
  const mlaValue = element("strong");
  kdaLane.append(element("span", "", "KDA · 连续信息"), kdaTokens, stateBox, kdaValue, element("small", "", "写入后不再保留单个 token 地址"));
  mlaLane.append(element("span", "", "Gated MLA · 全局精确检索"), mlaTokens, latentCache, mlaValue, element("small", "", "每个 latent 仍对应一个历史 token"));
  lanes.append(kdaLane, mlaLane);
  const control = element("label", "gmla-token-control");
  const readout = element("span");
  const slider = element("input");
  slider.type = "range";
  slider.min = "4";
  slider.max = "12";
  slider.step = "1";
  slider.value = String(state.tokenCount);
  control.append(readout, slider);
  const block = element("div", "gmla-division-block");
  ["KDA", "KDA", "KDA", "Gated MLA"].forEach((label, index) => block.append(element("i", index === 3 ? "mla" : "", label)));
  pane.append(lanes, control, block);
  const paint = () => {
    kdaTokens.replaceChildren();
    mlaTokens.replaceChildren();
    latentCache.replaceChildren();
    for (let index = 0; index < state.tokenCount; index += 1) {
      kdaTokens.append(element("i", ""));
      mlaTokens.append(element("i", ""));
      latentCache.append(element("i", ""));
    }
    readout.textContent = `示意序列：${state.tokenCount} token`;
    kdaValue.textContent = `固定 ${calcKdaStateSize().toFixed(0)} KB`;
    mlaValue.textContent = `${(state.tokenCount * 3584 * 2 / 1024).toFixed(0)} KB / 层`;
  };
  slider.addEventListener("input", () => {
    state.tokenCount = Number(slider.value);
    paint();
    onChange();
  });
  paint();
  return pane;
};

const buildProblemSide = () => {
  const side = element("aside", "gmla-side gmla-problem-side");
  side.append(element("h2", "", "KV cache 为什么这么大？"));
  const derivation = element("div", "gmla-cache-derivation");
  [
    "单层 KV cache",
    "= L × H × dₖ × 2（K+V）× 精度字节",
    "= 1,000,000 × 96 × 128 × 2 × 2B",
    "= 49 GB（单层）",
    "× 93 层 ≈ 4,571 GB",
  ].forEach((line, index) => derivation.append(element(index >= 3 ? "strong" : "p", index === 4 ? "danger" : "", line)));
  side.append(derivation, element("p", "gmla-side-note", "这是 MHA 的原理性代价：序列越长，cache 线性增长。"));
  return side;
};

const buildPriorSide = (state) => {
  const side = element("aside", "gmla-side gmla-prior-side");
  side.append(element("p", "gmla-side-kicker", "每个查询头能拥有多少独立 KV？"));
  const compare = element("div", "gmla-prior-compare");
  const widths = { mha: "100%", mqa: "12%", gqa: "30%", mla: "15%" };
  PRIOR_SCHEMES.forEach((scheme) => {
    const row = element("section", `gmla-compare-row ${scheme.featured ? "featured" : ""} ${state.selectedPrior === scheme.id ? "selected" : ""}`);
    const heading = element("div", "gmla-compare-heading");
    heading.append(element("strong", "", scheme.label), element("code", "", scheme.cache));
    const meter = element("div", "gmla-cache-meter");
    const fill = element("i");
    fill.style.width = widths[scheme.id];
    meter.append(fill);
    row.append(
      heading,
      meter,
      element("p", "", `性能代价：${scheme.cost}`),
      element("small", "", `采用：${scheme.adoption}`),
    );
    compare.append(row);
  });
  side.append(compare, element("p", "gmla-side-note", "MQA/GQA 减少 KV 头数；MLA 保留多头检索，只压缩每个 token 的表示。"));
  return side;
};

const appendFormulaDerivation = (side, activeStage = 4, onSelect) => {
  const derivation = element("div", "gmla-formula-derivation");
  [
    [1, "压缩并缓存", "cₜ = Wc · xₜ"],
    [2, "推理时展开", "kτ = Wk·cτ，vτ = Wv·cτ"],
    [3, "全局 attention", "õₜ = Σ softmax(qₜᵀkτ / √dₖ)·vτ"],
    [4, "全秩门控输出", "yₜ = Wₒ[σ(Wg·xₜ) ⊙ õₜ]"],
  ].forEach(([stage, label, formula], index) => {
    const line = element(onSelect ? "button" : "div", `gmla-formula-line ${activeStage === stage ? "active" : ""}`);
    if (onSelect) {
      line.type = "button";
      line.setAttribute("aria-pressed", String(activeStage === stage));
      line.addEventListener("click", () => onSelect(stage));
    }
    line.append(element("span", "", `0${index + 1} · ${label}`), element("strong", "", formula));
    derivation.append(line);
  });
  const notes = element("div", "gmla-formula-notes");
  [
    ["cₜ", "低维 cache"],
    ["NoPE", "位置由 KDA 承担"],
    ["Wg", "全秩逐通道门控"],
  ].forEach(([term, detail]) => {
    const note = element("p");
    note.append(element("strong", "", term), element("span", "", detail));
    notes.append(note);
  });
  side.append(derivation, notes);
};

const buildMlaSide = (state, onSelect) => {
  const side = element("aside", "gmla-side gmla-mla-side");
  const rationale = element("section", "gmla-gate-rationale");
  const facts = element("div", "gmla-apple-context");
  [
    ["历史 01", "苹果的愿景是：创造改变世界的产品"],
    ["历史 02", "苹果的营收是：硬件与服务共同贡献"],
    ["历史 03", "苹果的供应链是：连接零部件与全球制造"],
    ["新 token", "苹果的成本结构"],
  ].forEach(([label, copy]) => {
    const row = element("p");
    row.append(element("span", "", label), element("b", "", copy));
    facts.append(row);
  });
  rationale.append(
    element("strong", "", "为什么 Gated MLA 必须有 Gate？"),
    element("p", "gmla-gate-premise", "相关性召回不等于当前任务真正有用；attention 负责找相关信息，Gate 再决定哪些通道可以进入输出。"),
    facts,
    element("p", "gmla-attention-example", "仅用 attention：四段都含“苹果”，因此愿景、营收、供应链都会被召回。"),
    element("p", "gmla-gate-example", "加入 Gate：压低“愿景”通道，保留与成本直接相关的营收和供应链信息。"),
  );
  side.append(element("p", "gmla-side-kicker", "K3 Gated MLA · 四步路径"), rationale);
  appendFormulaDerivation(side, state.mlaStep, onSelect);
  side.append(buildGatePanel(state, true));
  return side;
};

const buildNopeGateSide = () => {
  return element("aside", "gmla-side gmla-nope-side");
};

const buildDivisionSide = (state) => {
  const side = element("aside", "gmla-side gmla-division-side");
  side.append(
    element("p", "gmla-side-kicker", "两种记忆，各司其职"),
    element("strong", "gmla-division-count", `${state.tokenCount} token`),
  );
  const rows = element("div", "gmla-division-table");
  [
    ["KDA", "固定 32 KB", "局部连续、顺序感知", "有损"],
    ["Gated MLA", "随 token 增长", "全局内容寻址", "精确"],
    ["K3 3:1", "低", "两者组合", "接近全局精确"],
  ].forEach((row, index) => row.forEach((value) => rows.append(element("span", index === 2 ? "featured" : "", value))));
  side.append(rows, element("p", "gmla-side-note", "KDA 管连续状态，Gated MLA 周期性补上远距精确检索。"));
  return side;
};

const buildSide = (state, onMlaStep) => state.activeTab === "problem" ? buildProblemSide()
  : state.activeTab === "prior" ? buildPriorSide(state)
    : state.activeTab === "mla" ? buildMlaSide(state, onMlaStep)
      : state.activeTab === "nope-gate" ? buildNopeGateSide() : buildDivisionSide(state);

export const renderGatedMla = (block, context) => {
  const stored = context.getValue(block.id, {});
  const validTabs = new Set(TABS.map(([id]) => id));
  const state = {
    activeTab: validTabs.has(stored.activeTab) ? stored.activeTab : "problem",
    animStage: 0,
    tokenCount: Math.min(12, Math.max(4, Number(stored.tokenCount) || 8)),
    gateValues: Array.isArray(stored.gateValues) ? stored.gateValues.slice(0, 8) : Array(8).fill(0.5),
    nopePanelOpen: Boolean(stored.nopePanelOpen),
    selectedPrior: ["mha", "mqa", "gqa"].includes(stored.selectedPrior) ? stored.selectedPrior : "mha",
    mlaStep: Math.min(4, Math.max(1, Number(stored.mlaStep) || 1)),
    nopeActiveCol: ["absolute", "rope", "nope"].includes(stored.nopeActiveCol) ? stored.nopeActiveCol : null,
  };
  const root = element("article", "block gated-mla");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "gmla-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const viewport = element("div", "gmla-viewport");
  const connection = element("button", "page-connection-link", `← ${GATED_MLA_CONNECTIONS.architecture.label}`);
  connection.type = "button";
  connection.addEventListener("click", () => context.navigate(GATED_MLA_CONNECTIONS.architecture.target));
  const persist = () => {
    context.setValue(block.id, {
      activeTab: state.activeTab,
      tokenCount: state.tokenCount,
      nopePanelOpen: state.nopePanelOpen,
      selectedPrior: state.selectedPrior,
      mlaStep: state.mlaStep,
      nopeActiveCol: state.nopeActiveCol,
    });
    context.persist();
  };
  const renderView = () => {
    const main = element("section", "gmla-main");
    const left = element("section", "gmla-left");
    const tabs = element("div", "segment-control gmla-tabs");
    const panelHost = element("div", "gmla-panel-host");
    const sideHost = element("div", "gmla-side-host");
    const renderSide = () => {
      const side = buildSide(state, (stage) => {
        state.mlaStep = stage;
        renderTab();
      });
      sideHost.replaceChildren(side);
      animateIn(side);
      persist();
    };
    const renderTab = () => {
      state.animStage = state.activeTab === "mla" ? state.mlaStep : 0;
      main.classList.toggle("gmla-nope-main", state.activeTab === "nope-gate");
      const pane = state.activeTab === "problem" ? buildProblemPane(state, renderSide)
        : state.activeTab === "prior" ? buildPriorPane(state, renderSide)
          : state.activeTab === "mla" ? buildMlaPane(state)
            : state.activeTab === "nope-gate" ? buildNopeGatePane(state, renderSide) : buildDivisionPane(state, renderSide);
      panelHost.replaceChildren(pane);
      tabs.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.activeTab));
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
      tabs.append(button);
    });
    left.append(tabs, panelHost);
    main.append(left, sideHost);
    viewport.replaceChildren(main);
    renderTab();
  };
  renderView();
  root.append(connection, claims, viewport);
  if (block.source) root.append(element("p", "gmla-source", `来源：${block.source}`));
  return root;
};
