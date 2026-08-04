import { element, svgElement } from "../../shared/dom/element.js";
import { ANIM_DURATION, ANIM_LOOP_INTERVAL, SOLUTIONS } from "./logic.js";

const SVG = (label) => svgElement("svg", { class: "kvcs-svg", viewBox: "0 0 200 64", role: "img", "aria-label": label });
const text = (x, y, value, className = "kvcs-svg-label") => svgElement("text", { x, y, class: className }, value);

const flashDiagram = () => {
  const svg = SVG("HBM 大矩阵切成四块后依次传输到 SRAM");
  const arrows = [];
  const received = [];
  svg.append(svgElement("rect", { x: "10", y: "5", width: "45", height: "54", class: "kvcs-hbm" }), text(18, 12, "HBM"));
  svg.append(svgElement("rect", { x: "148", y: "13", width: "40", height: "38", class: "kvcs-sram" }), text(151, 9, "SRAM"));
  for (let index = 0; index < 4; index += 1) {
    const y = 8 + index * 12.5;
    svg.append(svgElement("rect", { x: "14", y, width: "37", height: "10", class: `kvcs-hbm-block phase-${index}` }));
    const line = svgElement("line", { x1: "57", y1: y + 5, x2: "146", y2: y + 5, class: "kvcs-transfer" });
    const block = svgElement("rect", { x: "153", y: 16 + index * 8, width: "30", height: "6", class: `kvcs-received phase-${index}` });
    svg.append(line);
    svg.append(block);
    arrows.push(line);
    received.push(block);
  }
  return { node: svg, paint: (step) => {
    const active = step % 4;
    arrows.forEach((arrow, index) => arrow.style.opacity = String(index === active ? 1 : 0.1));
    received.forEach((block, index) => block.style.opacity = String(index <= active ? 1 : 0.12));
  } };
};

const compressDiagram = () => {
  const svg = SVG("大矩阵降维为 latent 小矩阵运算后再升维");
  const grid = (x, y, columns, rows, cell, className) => {
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      svg.append(svgElement("rect", { x: x + column * cell, y: y + row * cell, width: cell - 0.8, height: cell - 0.8, class: className }));
    }
  };
  grid(6, 14, 5, 5, 6, "kvcs-matrix-large");
  svg.append(svgElement("path", { d: "M40 14 L64 24 L64 34 L40 44 Z", class: "kvcs-funnel" }));
  grid(69, 23, 3, 3, 4, "kvcs-matrix-small");
  grid(85, 23, 3, 3, 4, "kvcs-matrix-small");
  grid(101, 23, 3, 3, 4, "kvcs-matrix-small");
  svg.append(svgElement("path", { d: "M116 24 L140 14 L140 44 L116 34 Z", class: "kvcs-expand-funnel" }));
  grid(145, 14, 5, 5, 6, "kvcs-matrix-large output");
  svg.append(text(10, 10, "KV"), text(72, 58, "latent 运算"), text(150, 10, "K/V"));
  return { node: svg, paint: () => {} };
};

const sparseDiagram = () => {
  const svg = SVG("一排 Attention 矩阵，少数局部窗口被高亮");
  for (let matrix = 0; matrix < 8; matrix += 1) {
    const x = 8 + matrix * 24;
    const highlight = [1, 4, 6].includes(matrix);
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) {
      svg.append(svgElement("rect", { x: x + column * 5, y: 23 + row * 5, width: "4", height: "4", class: highlight ? "kvcs-sparse-hot" : "kvcs-sparse-cold" }));
    }
    svg.append(svgElement("rect", { x, y: "21", width: "16", height: "16", class: "kvcs-matrix-frame" }));
  }
  svg.append(text(8, 14, "局部窗口"), text(125, 14, "少量激活"));
  return { node: svg, paint: () => {} };
};

const recurrentDiagram = () => {
  const svg = SVG("token 依次写入固定大小状态矩阵");
  const dots = [];
  const arrows = [];
  for (let index = 0; index < 8; index += 1) {
    const y = 8 + index * 7;
    const dot = svgElement("circle", { cx: "27", cy: y, r: "2.8", class: "kvcs-rec-token" });
    const arrow = svgElement("line", { x1: "34", y1: y, x2: "139", y2: "32", class: "kvcs-rec-arrow" });
    svg.append(dot, arrow);
    dots.push(dot);
    arrows.push(arrow);
  }
  const state = svgElement("rect", { x: "143", y: "12", width: "40", height: "40", class: "kvcs-state" });
  svg.append(state, text(151, 36, "状态 S"));
  return { node: svg, paint: (step) => {
    const active = step % 8;
    dots.forEach((dot, index) => dot.classList.toggle("active", index === active));
    arrows.forEach((arrow, index) => arrow.style.opacity = String(index === active ? 1 : 0.16));
    state.style.opacity = active % 2 ? "0.8" : "0.4";
  } };
};

const diagramFor = (id) => ({
  "flash-attn": flashDiagram,
  "kv-compress": compressDiagram,
  "sparse-attn": sparseDiagram,
  "linear-recurrent": recurrentDiagram,
}[id]());

const animateDetail = (wrap, expanded, state) => {
  cancelAnimationFrame(state.frame);
  if (expanded) wrap.hidden = false;
  const from = expanded ? 0 : wrap.scrollHeight;
  const to = expanded ? wrap.scrollHeight : 0;
  const started = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - started) / 200);
    const eased = 1 - (1 - progress) ** 4;
    wrap.style.height = `${from + (to - from) * eased}px`;
    if (progress < 1) state.frame = requestAnimationFrame(tick);
    else {
      wrap.style.height = expanded ? "auto" : "0px";
      wrap.hidden = !expanded;
    }
  };
  state.frame = requestAnimationFrame(tick);
};

const buildCard = (solution, onToggle) => {
  const card = element("section", "kvcs-card");
  card.dataset.id = solution.id;
  const summary = element("button", "kvcs-summary");
  summary.type = "button";
  summary.setAttribute("aria-expanded", "false");
  const diagram = diagramFor(solution.id);
  const visual = element("div", "kvcs-visual");
  visual.append(diagram.node);
  const copy = element("div", "kvcs-copy");
  const titleLine = element("div", "kvcs-title-line");
  titleLine.append(
    element("strong", "", solution.label),
    element("span", "kvcs-memory", solution.memory),
    element("span", solution.recallPositive ? "kvcs-recall positive" : "kvcs-recall", solution.recall),
  );
  if (solution.k3) titleLine.append(element("span", "kvcs-k3", "K3 ✓"));
  copy.append(titleLine, element("p", "kvcs-tagline", solution.tagline));
  const arrow = element("span", "kvcs-disclosure", "›");
  summary.append(visual, copy, arrow);
  const detailWrap = element("div", "kvcs-detail-wrap");
  detailWrap.hidden = true;
  detailWrap.style.height = "0px";
  const detail = element("div", "kvcs-detail");
  solution.detail.forEach((line) => detail.append(element("p", "", line)));
  detail.append(element("p", "kvcs-reps", `代表：${solution.reps.join(" / ")}`));
  detailWrap.append(detail);
  summary.addEventListener("click", () => onToggle(solution.id));
  card.append(summary, detailWrap);
  const heightState = { frame: null };
  return {
    card, diagram,
    update: (expanded, animate) => {
      card.classList.toggle("expanded", expanded);
      summary.setAttribute("aria-expanded", String(expanded));
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || !animate) {
        detailWrap.hidden = !expanded;
        detailWrap.style.height = expanded ? "auto" : "0px";
      } else animateDetail(detailWrap, expanded, heightState);
    },
  };
};

export const renderKvCacheSolutions = (block, context) => {
  const stored = context.getValue(block.id, {});
  const state = { expandedCard: SOLUTIONS.some((item) => item.id === stored.expandedCard) ? stored.expandedCard : null };
  const root = element("article", "block kv-cache-solutions");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "kvcs-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const cards = element("section", "kvcs-cards");
  const cardNodes = [];
  const update = (animate = true) => {
    cardNodes.forEach((item) => item.update(item.card.dataset.id === state.expandedCard, animate));
    context.setValue(block.id, { expandedCard: state.expandedCard });
    context.persist();
  };
  SOLUTIONS.forEach((solution) => {
    const card = buildCard(solution, (id) => {
      state.expandedCard = state.expandedCard === id ? null : id;
      update(true);
    });
    cardNodes.push(card);
    cards.append(card.card);
  });
  const hybrid = element("p", "kvcs-hybrid", "→ Kimi K3 混合 KDA（3层）+ Gated MLA（1层），每个 block 以 3:1 比例交替，兼顾 O(1) 状态与精确全局检索");
  update(false);
  root.append(claims, cards, hybrid, element("p", "kvcs-source", `来源：${block.source}`));
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let timer = null;
    const play = () => {
      if (!root.isConnected) {
        if (timer) window.clearInterval(timer);
        return;
      }
      const step = Math.floor((Date.now() % ANIM_LOOP_INTERVAL) / ANIM_DURATION);
      cardNodes.forEach((item) => item.diagram.paint(step));
    };
    timer = window.setInterval(play, 50);
  } else cardNodes.forEach((item) => item.diagram.paint(3));
  return root;
};
