import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import { calcKvStats, capacityTokens, logSliderToTokens, tokensToLogSlider } from "./logic.js";

const LAYER_COUNT = 93;
const MIN_TOKENS = 1000;
const MAX_TOKENS = 1000000;
const HBM_BANDWIDTH_GBS = 3350;
const CAPACITY_GB = 640;
const CAPACITY_WARNING_GB = 600;
const easeOut = (value) => 1 - (1 - value) ** 4;
const formatNumber = (value, digits = 0) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
}).format(value);
const logProgress = (tokens) => (Math.log(tokens) - Math.log(MIN_TOKENS)) / (Math.log(MAX_TOKENS) - Math.log(MIN_TOKENS));
const cacheWidth = (tokens) => 3 + logProgress(tokens) * 97;
const formatTokens = (value) => value >= 1000 ? `${formatNumber(value / 1000, value % 1000 ? 1 : 0)}k` : String(value);

const createCacheSvg = () => {
  const svg = svgElement("svg", {
    class: "kvc-cache-svg", viewBox: "0 0 100 100", role: "img",
    "aria-label": "93 层 KV Cache 随上下文长度增加的堆叠图",
  });
  const layers = [];
  for (let index = 0; index < LAYER_COUNT; index += 1) {
    const y = (index * 100) / LAYER_COUNT;
    const height = 100 / LAYER_COUNT;
    const key = svgElement("rect", { class: "kvc-key", x: "0", y, width: "0", height });
    const value = svgElement("rect", { class: "kvc-value", x: "0", y, width: "0", height });
    const separator = svgElement("line", { class: "kvc-layer-line", x1: "0", x2: "100", y1: y + height, y2: y + height });
    svg.append(key, value, separator);
    layers.push({ key, value });
  }
  const overflow = svgElement("rect", { class: "kvc-overflow", x: "0", y: "0", width: "0", height: "100" });
  const boundary = svgElement("line", { class: "kvc-capacity-line", x1: "0", x2: "0", y1: "0", y2: "100" });
  svg.append(overflow, boundary);
  return { svg, layers, overflow, boundary };
};

const animateNumber = (node, from, to, formatter, state) => {
  cancelAnimationFrame(state.numberFrame);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    node.textContent = formatter(to);
    return;
  }
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / 200);
    node.textContent = formatter(from + (to - from) * easeOut(progress));
    if (progress < 1) state.numberFrame = requestAnimationFrame(tick);
  };
  state.numberFrame = requestAnimationFrame(tick);
};

const animateCache = (visual, from, to, state) => {
  cancelAnimationFrame(state.cacheFrame);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paint = (tokens) => {
    const width = cacheWidth(tokens);
    visual.layers.forEach(({ key, value }) => {
      key.setAttribute("width", (width / 2).toFixed(3));
      value.setAttribute("x", (width / 2).toFixed(3));
      value.setAttribute("width", (width / 2).toFixed(3));
    });
    const overWidth = Math.max(0, width - cacheWidth(capacityTokens));
    visual.overflow.setAttribute("x", cacheWidth(capacityTokens).toFixed(3));
    visual.overflow.setAttribute("width", overWidth.toFixed(3));
    visual.boundary.setAttribute("x1", cacheWidth(capacityTokens).toFixed(3));
    visual.boundary.setAttribute("x2", cacheWidth(capacityTokens).toFixed(3));
  };
  if (reducedMotion) return paint(to);
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / MOTION.fast);
    paint(Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * easeOut(progress)));
    if (progress < 1) state.cacheFrame = requestAnimationFrame(tick);
  };
  state.cacheFrame = requestAnimationFrame(tick);
};

const createMetric = (className, label, detail) => {
  const metric = element("section", className);
  const value = element("strong", "kvc-metric-value");
  metric.append(element("span", "kvc-metric-label", label), value, element("p", "kvc-metric-detail", detail));
  return { metric, value };
};

export const renderKvCacheCost = (block, context) => {
  const stored = context.getValue(block.id, {});
  const initialTokens = Math.min(MAX_TOKENS, Math.max(MIN_TOKENS, Number(stored.tokenCount) || 10000));
  const initialStats = calcKvStats(initialTokens);
  const state = {
    tokenCount: initialTokens, kvGb: initialStats.kvGb, decodeMs: initialStats.decodeMs,
    overCapacity: initialStats.overCapacity, cacheFrame: null,
    capacityWarning: initialStats.kvGb >= CAPACITY_WARNING_GB,
    waitAnimation: { numberFrame: null }, totalAnimation: { numberFrame: null },
  };
  const root = element("article", "block kv-cache-cost");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "kvc-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const lab = element("section", "kvc-lab");
  const left = element("section", "kvc-cache-panel");
  const right = element("aside", "kvc-decode-panel");
  const visual = createCacheSvg();
  const cacheStage = element("div", "kvc-cache-stage");
  const boundaryLabel = element("span", "kvc-boundary-label", "H100 × 8 = 640 GB 边界");
  cacheStage.append(visual.svg, boundaryLabel);
  const sliderLabel = element("label", "kvc-slider-label", "上下文长度");
  const slider = element("input", "kvc-slider");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "0.1";
  slider.value = String(tokensToLogSlider(initialTokens));
  const tokenReadout = element("output", "kvc-token-readout");
  sliderLabel.append(slider, tokenReadout);
  const ticks = element("div", "kvc-slider-ticks");
  [1000, 10000, 100000, 500000, 1000000].forEach((tokens) => ticks.append(element("span", "", formatTokens(tokens))));
  left.append(
    element("div", "kvc-panel-heading", "93 层 K/V 均常驻显存"),
    cacheStage,
    element("div", "kvc-legend", "K  Key"),
    sliderLabel,
    ticks,
  );
  const wait = createMetric("kvc-wait-metric", "单步解码等待", "= KV Cache 大小 ÷ HBM 带宽（3.35 TB/s）");
  const total = createMetric("kvc-total-metric", "KV Cache 总量", "仅计单请求、BF16 的 K/V 张量");
  const equation = element("p", "kvc-equation");
  const kvFormula = element("p", "kvc-formula");
  const waitFormula = element("p", "kvc-wait-formula");
  right.append(wait.metric, total.metric, kvFormula, waitFormula, equation);
  lab.append(left, right);
  const update = (previous = state.tokenCount) => {
    const next = calcKvStats(state.tokenCount);
    const previousStats = calcKvStats(previous);
    state.kvGb = next.kvGb;
    state.decodeMs = next.decodeMs;
    state.overCapacity = next.overCapacity;
    state.capacityWarning = next.kvGb >= CAPACITY_WARNING_GB;
    root.dataset.overCapacity = String(state.overCapacity);
    root.dataset.capacityWarning = String(state.capacityWarning);
    boundaryLabel.dataset.visible = String(state.capacityWarning);
    tokenReadout.textContent = `${formatTokens(state.tokenCount)} token`;
    animateCache(visual, previous, state.tokenCount, state);
    animateNumber(wait.value, previousStats.decodeMs, next.decodeMs, (value) => `${formatNumber(value, value < 10 ? 1 : 0)} ms`, state.waitAnimation);
    animateNumber(total.value, previousStats.kvGb, next.kvGb, (value) => `${formatNumber(value, value < 10 ? 2 : 0)} GB`, state.totalAnimation);
    kvFormula.textContent = "KV = token × 93 层 × 96 头 × (128K + 128V) × BF16 2B";
    waitFormula.textContent = `等待 = ${formatNumber(next.kvGb, next.kvGb < 10 ? 2 : 0)} GB ÷ ${formatNumber(HBM_BANDWIDTH_GBS)} GB/s`;
    equation.textContent = `${formatNumber(next.kvGb, next.kvGb < 10 ? 2 : 0)} GB ÷ ${formatNumber(HBM_BANDWIDTH_GBS)} GB/s = ${formatNumber(next.decodeMs, next.decodeMs < 10 ? 1 : 0)} ms`;
    context.setValue(block.id, { tokenCount: state.tokenCount });
    context.persist();
  };
  slider.addEventListener("input", () => {
    const previous = state.tokenCount;
    state.tokenCount = logSliderToTokens(slider.value);
    update(previous);
  });
  update(initialTokens);
  root.append(claims, lab, element("p", "kvc-source", `来源：${block.source}`));
  return root;
};
