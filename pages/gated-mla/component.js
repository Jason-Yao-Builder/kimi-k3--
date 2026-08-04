import { element, svgElement } from "../../shared/dom/element.js";
import {
  CHANNEL_LABELS,
  GATE_PROFILE,
  PRIOR_SCHEMES,
  calcKdaStateSize,
  calcMhaCache,
  calcMlaCache,
} from "./logic.js";

const TABS = [
  ["problem", "① KV 爆炸"],
  ["prior", "② 前人方案"],
  ["mla", "③ MLA 核心"],
  ["nope-gate", "④ NoPE 与门控"],
  ["division", "⑤ 与 KDA 分工"],
];

const animateIn = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / 180);
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

const seriesPath = (maxAtMillion) => {
  const lengths = [1000, 10000, 100000, 1000000];
  return lengths.map((length, index) => {
    const x = 44 + index * 92;
    const value = maxAtMillion * length / 1000000;
    const y = 132 - (value / 4571) * 110;
    return `${index ? "L" : "M"}${x} ${y.toFixed(2)}`;
  }).join(" ");
};

const buildProblemPane = (state, onChange) => {
  const pane = element("section", "gmla-problem-pane");
  pane.append(element("p", "gmla-intro", "生成第 t 个 token 时，每层都要保留全部历史 token 的 K/V；长度增加，cache 同步线性增长。"));
  const chart = svgElement("svg", { class: "gmla-growth-chart", viewBox: "0 0 360 158", role: "img", "aria-label": "MHA MQA MLA 的 KV cache 增长曲线" });
  chart.append(
    svgElement("line", { x1: "44", y1: "15", x2: "44", y2: "132", class: "gmla-axis" }),
    svgElement("line", { x1: "44", y1: "132", x2: "328", y2: "132", class: "gmla-axis" }),
  );
  ["1K", "10K", "100K", "1M"].forEach((label, index) => addText(chart, 37 + index * 92, 149, label, "gmla-axis-label"));
  const h100Y = 132 - (80 / 4571) * 110;
  chart.append(svgElement("line", { x1: "44", y1: h100Y, x2: "328", y2: h100Y, class: "gmla-h100-line" }));
  addText(chart, 190, h100Y - 5, "H100 单卡上限 80 GB", "gmla-h100-label");
  const series = [
    ["mha", 4571, "标准 MHA · 4,571 GB"],
    ["mqa", 49, "MQA · 49 GB"],
    ["mla", 571, "MLA · 571 GB"],
  ].map(([id, value, label]) => {
    const path = svgElement("path", { d: seriesPath(value), class: `gmla-growth-line ${id}`, pathLength: "1" });
    chart.append(path);
    addText(chart, id === "mha" ? 230 : 252, id === "mha" ? 28 : id === "mla" ? 112 : 126, label, `gmla-series-label ${id}`);
    return path;
  });
  const warning = addText(chart, 221, 48, "⚠ 无法装入单卡", "gmla-chart-warning");
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

const buildMlaPane = (state, onChange) => {
  const pane = element("section", "gmla-mla-pane");
  pane.append(element("p", "gmla-mla-intro", "存什么和用什么可以分开：先把 xₜ 压成低维 cₜ，cache 只存 cₜ；计算 attention 时再展开 K/V。"));
  const svg = svgElement("svg", { class: "gmla-mla-flow", viewBox: "0 0 360 150", role: "img", "aria-label": "MLA 压缩存储与推理时展开流程" });
  const input = svgElement("g", { class: "gmla-flow-stage", "data-stage": "1" });
  input.append(svgElement("rect", { x: "10", y: "36", width: "78", height: "72", class: "gmla-hidden-box" }));
  for (let index = 0; index < 8; index += 1) input.append(svgElement("line", { x1: 18 + index * 9, x2: 18 + index * 9, y1: "45", y2: "78", class: "gmla-hidden-line" }));
  input.append(svgElement("text", { x: "49", y: "91", "text-anchor": "middle", class: "gmla-flow-text" }, "xₜ · d=7168"));
  const compress = svgElement("g", { class: "gmla-flow-stage", "data-stage": "2" });
  compress.append(
    svgElement("path", { d: "M96 36 L143 57 L143 87 L96 108 Z", class: "gmla-compress-shape" }),
    svgElement("rect", { x: "147", y: "57", width: "22", height: "30", class: "gmla-latent-box" }),
    svgElement("text", { x: "132", y: "126", "text-anchor": "middle", class: "gmla-flow-text" }, "cₜ = Wc·xₜ"),
  );
  const cache = svgElement("g", { class: "gmla-flow-stage", "data-stage": "3" });
  cache.append(
    svgElement("text", { x: "158", y: "42", "text-anchor": "middle", class: "gmla-cache-only" }, "只存这里 ↓"),
    svgElement("text", { x: "158", y: "139", "text-anchor": "middle", class: "gmla-flow-subtext" }, "d_latent=3584"),
  );
  const expand = svgElement("g", { class: "gmla-flow-stage", "data-stage": "4" });
  expand.append(
    svgElement("path", { d: "M177 57 L214 36 L214 108 L177 87 Z", class: "gmla-expand-shape" }),
    svgElement("rect", { x: "220", y: "36", width: "127", height: "72", class: "gmla-rebuild-box" }),
    svgElement("line", { x1: "220", y1: "72", x2: "347", y2: "72", class: "gmla-rebuild-divider" }),
    svgElement("text", { x: "283", y: "60", "text-anchor": "middle", class: "gmla-flow-text" }, "kτ = Wk·cτ"),
    svgElement("text", { x: "283", y: "93", "text-anchor": "middle", class: "gmla-flow-text" }, "vτ = Wv·cτ"),
    svgElement("text", { x: "283", y: "126", "text-anchor": "middle", class: "gmla-flow-subtext" }, "实时重建 · 不常驻"),
  );
  svg.append(input, compress, cache, expand);
  pane.append(svg);
  const ratio = element("div", "gmla-ratio-bars");
  const mha = element("div", "gmla-ratio-row danger");
  mha.append(element("span", "", "标准 MHA"), element("i"), element("strong", "", "24,576 数/token"));
  const mla = element("div", "gmla-ratio-row success");
  mla.append(element("span", "", "MLA"), element("i"), element("strong", "", "3,584 数/token · 约 6.9×"));
  ratio.append(mha, mla);
  pane.append(ratio, element("p", "gmla-mla-conclusion", "全序列 softmax attention 不变；改变的只是 cache 中存什么。"));
  const stages = Array.from(svg.querySelectorAll(".gmla-flow-stage"));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) state.animStage = 4;
  else {
    state.animStage = 0;
    stages.forEach((node) => node.style.opacity = "0.15");
    ratio.style.opacity = "0";
    const start = performance.now();
    let previous = -1;
    const tick = (now) => {
      if (!pane.isConnected) return;
      const stage = Math.min(4, Math.floor((now - start) / 250) + 1);
      if (stage !== previous) {
        previous = stage;
        state.animStage = stage;
        stages.forEach((node) => node.style.opacity = Number(node.dataset.stage) <= stage ? "1" : "0.15");
        ratio.style.opacity = stage >= 4 ? "1" : "0";
        onChange();
      }
      if (stage < 4) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
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

const buildNopeGatePane = (state, onChange) => {
  const pane = element("section", "gmla-nope-gate-pane");
  const nope = element("section", "gmla-nope-panel");
  const nopeCopy = element("div", "gmla-nope-copy");
  nopeCopy.append(
    element("strong", "gmla-panel-title", "NoPE：压缩与旋转不可交换"),
    element("p", "", "RoPE 要逐头旋转 K；但 latent 展开 Wk·cτ 与旋转操作不可交换。K3 直接移除 MLA 的位置编码，由 KDA 的递归衰减承担顺序感知。"),
  );
  const compare = element("div", "gmla-nope-compare");
  const deepseek = element("div", "gmla-nope-row complex");
  deepseek.append(element("span", "", "DeepSeek-V2"), element("i", "", "latent"), element("b", "", "+ 位置 K cache"));
  const k3 = element("div", "gmla-nope-row clean");
  k3.append(element("span", "", "K3 NoPE"), element("i", "", "latent 单路"), element("b", "", "位置由 KDA 承担"));
  compare.append(deepseek, k3);
  nope.append(nopeCopy, compare);
  const fold = element("button", "gmla-nope-fold", state.nopePanelOpen ? "收起工程收益" : "展开工程收益");
  fold.type = "button";
  const foldBody = element("p", "gmla-nope-benefit", "上下文从 128K 扩到 1M 时，MLA 权重无需修改，也不必重调 RoPE frequency base 或 YaRN 插值。");
  foldBody.hidden = !state.nopePanelOpen;
  fold.addEventListener("click", () => {
    state.nopePanelOpen = !state.nopePanelOpen;
    fold.textContent = state.nopePanelOpen ? "收起工程收益" : "展开工程收益";
    foldBody.hidden = !state.nopePanelOpen;
    onChange();
  });
  nope.append(fold, foldBody);
  const gate = element("section", "gmla-gate-panel");
  gate.append(
    element("strong", "gmla-panel-title", "输出门控：同一份全局读出，按当前 token 角色过滤"),
    element("p", "gmla-gate-rule", "Sigmoid(Wg · xₜ) 逐通道生成门值"),
  );
  const columns = element("div", "gmla-gate-columns");
  const brace = gateColumn("}", GATE_PROFILE.brace);
  const print = gateColumn("print", GATE_PROFILE.print);
  columns.append(brace.column, print.column);
  gate.append(columns);
  pane.append(nope, gate);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const start = performance.now();
    const tick = (now) => {
      if (!pane.isConnected) return;
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
  } else state.gateValues = [...GATE_PROFILE.brace];
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

const appendFormulaDerivation = (side, activeStage = 4) => {
  const derivation = element("div", "gmla-formula-derivation");
  [
    [1, "压缩并缓存", "cₜ = Wc · xₜ"],
    [2, "推理时展开", "kτ = Wk·cτ，vτ = Wv·cτ"],
    [4, "全局 softmax attention · NoPE", "a₍ₜ,τ₎ = softmax(qₜᵀkτ / √dₖ)，τ ≤ t\nõₜ = Σ a₍ₜ,τ₎·vτ"],
    [4, "全秩输出门控", "yₜ = Wₒ[Sigmoid(Wg·xₜ) ⊙ õₜ]"],
  ].forEach(([stage, label, formula], index) => {
    const line = element("div", `gmla-formula-line ${activeStage >= stage ? "active" : ""}`);
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

const buildMlaSide = (state) => {
  const side = element("aside", "gmla-side gmla-mla-side");
  side.append(element("p", "gmla-side-kicker", "K3 Gated MLA · 完整公式"));
  appendFormulaDerivation(side, state.animStage);
  return side;
};

const buildNopeGateSide = () => {
  const side = element("aside", "gmla-side gmla-nope-side");
  side.append(element("p", "gmla-side-kicker", "K3 Gated MLA · 完整公式"));
  appendFormulaDerivation(side);
  const rank = element("div", "gmla-rank-note");
  rank.append(
    element("strong", "", "为什么 Wg 必须全秩？"),
    element("p", "", "低秩门控只能感知 xₜ 的小子空间；全秩 Wg 综合全部 7168 维信息决定每个输出通道是否放行。"),
  );
  side.append(rank);
  return side;
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

const buildSide = (state) => state.activeTab === "problem" ? buildProblemSide()
  : state.activeTab === "prior" ? buildPriorSide(state)
    : state.activeTab === "mla" ? buildMlaSide(state)
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
  };
  const root = element("article", "block gated-mla");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "gmla-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const viewport = element("div", "gmla-viewport");
  const persist = () => {
    context.setValue(block.id, {
      activeTab: state.activeTab,
      tokenCount: state.tokenCount,
      nopePanelOpen: state.nopePanelOpen,
      selectedPrior: state.selectedPrior,
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
      const side = buildSide(state);
      sideHost.replaceChildren(side);
      animateIn(side);
      persist();
    };
    const renderTab = () => {
      state.animStage = 0;
      const pane = state.activeTab === "problem" ? buildProblemPane(state, renderSide)
        : state.activeTab === "prior" ? buildPriorPane(state, renderSide)
          : state.activeTab === "mla" ? buildMlaPane(state, renderSide)
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
  root.append(claims, viewport, element("p", "gmla-source", `来源：${block.source}`));
  return root;
};
