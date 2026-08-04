import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import { cacheTotal, noCacheTotal, normalizedToken } from "./logic.js";

const animateVector = (line, dot, from, to) => {
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / 680);
    const eased = 6 * progress ** 5 - 15 * progress ** 4 + 10 * progress ** 3;
    const x = from.x + (to.x - from.x) * eased;
    const y = from.y + (to.y - from.y) * eased;
    line.setAttribute("x2", x.toFixed(2));
    line.setAttribute("y2", y.toFixed(2));
    dot.setAttribute("cx", x.toFixed(2));
    dot.setAttribute("cy", y.toFixed(2));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const renderVectorDiagram = (meaning, animate) => {
  const shouldAnimate = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const points = {
    origin: { x: 48, y: 126 },
    original: { x: 174, y: 78 },
    river: { x: 112, y: 24 },
    finance: { x: 314, y: 66 },
  };
  const selected = points[meaning];
  const color = meaning === "river" ? "#255f85" : "#256d52";
  const svg = svgElement("svg", {
    class: `semantic-vector-svg selected-${meaning}`,
    viewBox: "0 0 360 150",
    role: "img",
    "aria-label": "bank 原始向量及河岸、银行语义向量",
  });
  const defs = svgElement("defs");
  [
    ["gray", "#9aa09a"],
    ["blue", "#255f85"],
    ["green", "#256d52"],
  ].forEach(([id, fill]) => {
    const marker = svgElement("marker", { id: `arrow-${id}`, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "5", markerHeight: "5", orient: "auto-start-reverse" });
    marker.append(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill }));
    defs.append(marker);
  });
  svg.append(defs);
  svg.append(
    svgElement("line", { class: "vector-axis", x1: "48", y1: "126", x2: "342", y2: "126", "marker-end": "url(#arrow-gray)" }),
    svgElement("line", { class: "vector-axis", x1: "48", y1: "126", x2: "48", y2: "12", "marker-end": "url(#arrow-gray)" }),
    svgElement("text", { class: "svg-axis-label", x: "306", y: "144" }, "语义维度 1"),
    svgElement("text", { class: "svg-axis-label", x: "18", y: "82", transform: "rotate(-90 18 82)" }, "语义维度 2"),
  );
  ["original", "river", "finance"].forEach((id) => {
    const point = points[id];
    svg.append(svgElement("line", {
      class: "vector-ghost",
      x1: points.origin.x,
      y1: points.origin.y,
      x2: point.x,
      y2: point.y,
      "marker-end": "url(#arrow-gray)",
    }));
  });
  const activeLine = svgElement("line", {
    class: "vector-active",
    x1: points.origin.x,
    y1: points.origin.y,
    x2: shouldAnimate ? points.original.x : selected.x,
    y2: shouldAnimate ? points.original.y : selected.y,
    stroke: color,
    "marker-end": `url(#arrow-${meaning === "river" ? "blue" : "green"})`,
  });
  const activeDot = svgElement("circle", { class: "vector-active-dot", cx: shouldAnimate ? points.original.x : selected.x, cy: shouldAnimate ? points.original.y : selected.y, r: "3.5", fill: color });
  svg.append(activeLine, activeDot);
  const labels = [
    ["original", "原始 e_bank", 128, 72],
    ["river", "河岸 h_bank", 119, 19],
    ["finance", "银行 h_bank", 256, 58],
  ];
  labels.forEach(([id, label, x, y]) => svg.append(svgElement("text", { class: `svg-vector-label ${id === meaning ? "active" : ""}`, x, y }, label)));
  if (shouldAnimate) animateVector(activeLine, activeDot, points.original, selected);
  return svg;
};

const renderSemantic = (block, state) => {
  const sentence = block.sentences[state.sentence];
  const tokens = sentence.text.split(" ");
  const bankIndex = tokens.findIndex((token) => normalizedToken(token) === "bank");
  const contextTokens = tokens.slice(0, bankIndex);
  const root = element("section", "semantic-panel");
  const heading = element("div", "lab-column-heading");
  heading.append(element("span", "column-index", "A"), element("strong", "", "同一个 bank，表示为何不同？"));
  const choices = element("div", "sentence-switch segment-control");
  block.sentences.forEach((item, index) => {
    const button = element("button", index === state.sentence ? "active" : "", item.label);
    button.type = "button";
    button.addEventListener("click", () => state.selectSentence(index));
    choices.append(button);
  });

  const sentenceLine = element("p", "semantic-sentence", sentence.text);
  const attention = element("div", "attention-flow");
  const products = element("div", "key-products");
  contextTokens.forEach((token, index) => {
    const product = element("div", "key-product");
    product.append(
      element("span", "query-chip", "q_bank"),
      element("span", "operator", "·"),
      element("span", "key-chip", `k_${normalizedToken(token)}`),
      element("span", "operator", "→"),
      element("span", "weight-chip", `s${index + 1}`),
    );
    products.append(product);
  });
  const aggregation = element("div", "value-aggregation");
  aggregation.append(
    element("span", "softmax-step", "a = softmax(s),  context = Σ aᵢvᵢ"),
    element("strong", "residual-equation", "新 token = 旧 token + Σᵢ softmax(q_bank·kᵢ)vᵢ"),
  );
  attention.append(products, aggregation);

  const plane = element("div", "vector-plane");
  plane.append(renderVectorDiagram(sentence.id, state.animate));
  root.append(heading, choices, sentenceLine, attention, plane);
  return root;
};

const renderTriangle = (size, cellClass, cellSize) => {
  const triangle = element("div", "attention-triangle");
  triangle.style.setProperty("--cell-size", `${cellSize}px`);
  for (let tokenIndex = 1; tokenIndex <= size; tokenIndex += 1) {
    const tone = typeof cellClass === "function" ? cellClass(tokenIndex) : cellClass;
    const column = element("div", `attention-column ${tone}`);
    column.style.setProperty("--column-delay", `${tokenIndex * 22}ms`);
    for (let comparison = 0; comparison < tokenIndex; comparison += 1) {
      column.append(element("i", "attention-cell"));
    }
    triangle.append(column);
  }
  return triangle;
};

const renderNoCacheGraphic = (state) => {
  const root = element("div", "triangle-sequence no-cache-sequence");
  const largest = state.prefix + state.step;
  const cellSize = Math.max(2.4, Math.min(7, 190 / (state.step * largest)));
  for (let index = 1; index <= state.step; index += 1) {
    const snapshot = element("div", "triangle-snapshot");
    snapshot.style.setProperty("--snapshot-delay", `${(index - 1) * 120}ms`);
    snapshot.append(
      renderTriangle(state.prefix + index, "recomputed", cellSize),
      element("span", "snapshot-label", `t+${index} · T(${state.prefix + index})`),
    );
    root.append(snapshot);
  }
  return root;
};

const renderCacheGraphic = (state) => {
  const root = element("div", "triangle-sequence cache-sequence");
  root.append(element("span", "cache-axis-label", "KV Cache"));
  const largest = state.prefix + state.step;
  const cellSize = Math.max(2.4, Math.min(7, 190 / (state.step * largest)));
  for (let index = 1; index <= state.step; index += 1) {
    const length = state.prefix + index;
    const snapshot = element("div", "triangle-snapshot cache-snapshot");
    snapshot.style.setProperty("--snapshot-delay", `${(index - 1) * 120}ms`);
    const cacheBar = element("div", "cache-length-bar");
    for (let tokenIndex = 1; tokenIndex <= length; tokenIndex += 1) {
      cacheBar.append(element("i", tokenIndex === length ? "new" : "stored"));
    }
    snapshot.append(
      renderTriangle(length, (tokenIndex) => tokenIndex === length ? "new" : "cached", cellSize),
      element("span", "snapshot-label", `t+${index} · KV=${length}`),
      cacheBar,
    );
    root.append(snapshot);
  }
  return root;
};

const renderVisualColumn = (block, state, cached) => {
  const prefix = state.prefix;
  const length = prefix + state.step;
  const root = element("section", `compute-column ${cached ? "with-cache" : "without-cache"}`);
  const heading = element("div", "lab-column-heading");
  heading.append(
    element("span", "column-index", cached ? "C" : "B"),
    element("strong", "", cached ? "有 KV Cache" : "无 KV Cache"),
  );
  const caption = cached
    ? `${state.step} 步均复用灰色历史区，只计算最右新列；KV 长度增至 ${length}`
    : `${state.step} 步分别重算 T(${prefix + 1}) 至 T(${length})，共 ${state.step} 个完整三角`;
  const graphic = element("div", "triangle-stage");
  graphic.append(cached ? renderCacheGraphic(state) : renderNoCacheGraphic(state));
  const metric = element("div", "compute-metric");
  metric.append(
    element("strong", "", String(cached ? cacheTotal(prefix, state.step) : noCacheTotal(prefix, state.step))),
    element("span", "", cached ? "累计新增单元" : "累计重算单元"),
  );
  root.append(heading, element("p", "compute-caption", caption), graphic, metric);
  return root;
};

const renderFormulaColumn = (block, state, cached) => {
  const prefix = state.prefix;
  const terms = Array.from({ length: state.step }, (_, index) => `T(${prefix + index + 1})`).join(" + ");
  const root = element("section", `compute-column formula-column ${cached ? "with-cache" : "without-cache"}`);
  const heading = element("div", "lab-column-heading");
  heading.append(
    element("span", "column-index", cached ? "C" : "B"),
    element("strong", "", cached ? "有 KV Cache" : "无 KV Cache"),
  );
  const expression = cached
    ? "Σᵢ₌₁ᵏ (x+i) = kx + k(k+1)/2"
    : "Σᵢ₌₁ᵏ T(x+i),  T(n)=n(n+1)/2";
  const explanation = cached
    ? `x=${prefix}, k=${state.step}：累计只新增 ${cacheTotal(prefix, state.step)} 个 attention score`
    : `x=${prefix}, k=${state.step}：${terms} = ${noCacheTotal(prefix, state.step)} 个单元`;
  const order = cached ? "单步 O(n) · KV 存储 O(n)" : "单步 O(n²) · 不保存历史 K/V";
  const presentation = element("div", "formula-presentation");
  presentation.append(
    element("div", "formula-stage", expression),
    element("p", "formula-explanation", explanation),
  );
  root.append(
    heading,
    presentation,
    element("p", "complexity-note", order),
  );
  return root;
};

export const renderKvCacheDemo = (block, context) => {
  const stored = context.getValue(block.id, {});
  const state = {
    sentence: Number.isInteger(stored.sentence) ? stored.sentence : 0,
    mode: stored.mode === "formula" ? "formula" : "visual",
    prefix: Math.min(block.maxPrefixLength, Math.max(block.minPrefixLength, Number(stored.prefix) || block.prefixLength)),
    step: Math.min(block.maxNewTokens, Math.max(1, Number(stored.step) || 1)),
  };
  const root = element("article", "block kv-cache-demo");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claimArea = element("section", "kv-claims");
  const claimList = element("ul", "kv-claim-list");
  block.claims.forEach((claim) => {
    const item = element("li");
    item.append(element("p", "", claim));
    claimList.append(item);
  });
  claimArea.append(claimList);

  const lab = element("section", "kv-lab");
  const toolbar = element("div", "kv-lab-toolbar");
  const prefixControl = element("label", "step-control");
  prefixControl.dataset.shortLabel = `x=${state.prefix}`;
  const prefixLabel = element("span", "", `原始 token x：${state.prefix}`);
  const prefixSlider = element("input");
  prefixSlider.type = "range";
  prefixSlider.min = String(block.minPrefixLength);
  prefixSlider.max = String(block.maxPrefixLength);
  prefixSlider.step = "1";
  prefixSlider.value = String(state.prefix);
  prefixControl.append(prefixLabel, prefixSlider);
  const stepControl = element("label", "step-control");
  stepControl.dataset.shortLabel = `k=${state.step}`;
  const stepLabel = element("span", "", `新增 token：${state.step} / ${block.maxNewTokens}`);
  const slider = element("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = String(block.maxNewTokens);
  slider.step = "1";
  slider.value = String(state.step);
  stepControl.append(stepLabel, slider);
  const modeControl = element("div", "segment-control mode-switch");
  const visualButton = element("button", state.mode === "visual" ? "active" : "", "图解");
  const formulaButton = element("button", state.mode === "formula" ? "active" : "", "公式");
  visualButton.type = "button";
  formulaButton.type = "button";
  modeControl.append(visualButton, formulaButton);
  toolbar.append(element("span", "lab-title", "自回归解码计算"), prefixControl, stepControl, modeControl);

  const columns = element("div", "kv-lab-columns");
  const semanticSlot = element("div", "semantic-slot");
  const computeViewport = element("div", "compute-viewport");
  const computeTrack = element("div", "compute-track");
  computeViewport.append(computeTrack);
  columns.append(semanticSlot, computeViewport);

  const persist = () => {
    context.setValue(block.id, {
      sentence: state.sentence,
      mode: state.mode,
      prefix: state.prefix,
      step: state.step,
    });
    context.persist();
  };
  const paintSemantic = (animate = false) => {
    semanticSlot.replaceChildren(renderSemantic(block, {
      sentence: state.sentence,
      animate,
      selectSentence: (index) => {
        state.sentence = index;
        persist();
        paintSemantic(true);
      },
    }));
  };
  const buildComputePair = () => {
    const pair = element("div", "compute-pair");
    const renderer = state.mode === "visual" ? renderVisualColumn : renderFormulaColumn;
    pair.append(renderer(block, state, false), renderer(block, state, true));
    return pair;
  };
  const paintCompute = (animate = false, direction = 1) => {
    computeTrack.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    const next = buildComputePair();
    computeTrack.replaceChildren(next);
    if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      next.animate(
        [
          { transform: `translateX(${direction * 10}%)`, opacity: 0 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration: MOTION.normal, easing: MOTION.easing },
      );
    }
  };
  const setMode = (mode) => {
    if (mode === state.mode) return;
    const direction = mode === "formula" ? 1 : -1;
    state.mode = mode;
    visualButton.classList.toggle("active", mode === "visual");
    formulaButton.classList.toggle("active", mode === "formula");
    persist();
    paintCompute(true, direction);
  };
  slider.addEventListener("input", () => {
    state.step = Number(slider.value);
    stepLabel.textContent = `新增 token：${state.step} / ${block.maxNewTokens}`;
    stepControl.dataset.shortLabel = `k=${state.step}`;
    persist();
    paintCompute();
  });
  prefixSlider.addEventListener("input", () => {
    state.prefix = Number(prefixSlider.value);
    prefixLabel.textContent = `原始 token x：${state.prefix}`;
    prefixControl.dataset.shortLabel = `x=${state.prefix}`;
    persist();
    paintCompute();
  });
  visualButton.addEventListener("click", () => setMode("visual"));
  formulaButton.addEventListener("click", () => setMode("formula"));
  root.trackNavigate = (direction) => {
    if (direction > 0 && state.mode === "visual") {
      setMode("formula");
      root.focus({ preventScroll: true });
      return true;
    }
    if (direction < 0 && state.mode === "formula") {
      setMode("visual");
      root.focus({ preventScroll: true });
      return true;
    }
    return false;
  };
  paintSemantic();
  paintCompute();
  lab.append(toolbar, columns);
  root.append(claimArea, lab, element("p", "kv-source", `来源：${block.source}`));
  return root;
};
