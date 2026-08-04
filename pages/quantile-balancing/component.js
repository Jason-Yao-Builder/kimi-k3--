import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import {
  EXPERT_LABELS,
  SCORES,
  TARGET_LOAD,
  calcAlpha,
  calcLoads,
  calcMargins,
  calcMatchScore,
  calcNewRouting,
  calcQBBiasDetails,
  formatSigned,
  imbalanceRatio,
  signSgdStep,
} from "./logic.js";

const TABS = [
  ["convergence", "① 收敛对比"],
  ["stepwise", "② 逐步推导"],
  ["dual", "③ 对偶视角"],
];

const ALPHA = calcAlpha(SCORES);
const MARGINS = calcMargins(SCORES, ALPHA);
const QB_DETAILS = calcQBBiasDetails(MARGINS, TARGET_LOAD);
const QB_ROUTING = calcNewRouting(SCORES, QB_DETAILS.biases);
const INITIAL_ROUTING = calcNewRouting(SCORES, [0, 0, 0, 0]);
const INITIAL_LOADS = calcLoads(INITIAL_ROUTING);
const QB_LOADS = calcLoads(QB_ROUTING);
const formatGamma = (value) => (value < 0.01 ? value.toFixed(3) : value.toFixed(2));

const animateIn = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

const animateLoadBars = (bars, labels, from, to) => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = performance.now();
  const duration = reduced ? 1 : MOTION.emphasis;
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    bars.forEach((bar, index) => {
      const value = from[index] + (to[index] - from[index]) * eased;
      bar.style.width = `${Math.max(2, value / 4 * 100)}%`;
    });
    if (progress < 1) requestAnimationFrame(tick);
    else labels.forEach((label, index) => { label.textContent = String(to[index]); });
  };
  requestAnimationFrame(tick);
};

const loadChart = (loads, tone = "") => {
  const chart = element("div", `qb-load-chart ${tone}`);
  const bars = [];
  const labels = [];
  loads.forEach((load, index) => {
    const row = element("div", `qb-load-row ${load > TARGET_LOAD ? "over" : load === 0 ? "empty" : ""}`);
    const track = element("div", "qb-load-track");
    const fill = element("i");
    fill.style.width = `${Math.max(2, load / 4 * 100)}%`;
    track.append(fill, element("b", "qb-target-line"));
    const value = element("strong", "", String(load));
    row.append(element("span", "", EXPERT_LABELS[index]), track, value);
    chart.append(row);
    bars.push(fill);
    labels.push(value);
  });
  return { chart, bars, labels };
};

const biasVector = (values) => element(
  "code",
  "qb-bias-vector",
  `b = [${values.map((value) => formatSigned(value)).join(", ")}]`,
);

const routeTopTwo = (row) => [...row.keys()].sort((a, b) => row[b] - row[a]).slice(0, 2);

const scoreMatrix = (mode) => {
  const matrix = element("div", `qb-score-matrix ${mode}`);
  const showAlpha = mode === "alpha";
  const adjusted = mode === "adjusted";
  const expertHeaders = adjusted
    ? EXPERT_LABELS.map((label, index) => `${label}  b${formatSigned(QB_DETAILS.biases[index])}`)
    : EXPERT_LABELS;
  ["token", ...expertHeaders, ...(showAlpha ? ["α"] : [])].forEach((label) => matrix.append(element("strong", "", label)));
  SCORES.forEach((row, tokenIndex) => {
    matrix.append(element("strong", "", `t${tokenIndex + 1}`));
    const topTwo = routeTopTwo(row);
    row.forEach((score, expertIndex) => {
      const cell = element("span", "qb-score-cell");
      const selected = adjusted ? QB_ROUTING[tokenIndex] === expertIndex : INITIAL_ROUTING[tokenIndex] === expertIndex;
      if (selected) cell.classList.add("selected");
      if (showAlpha && topTwo[0] === expertIndex) cell.classList.add("top-one");
      if (showAlpha && topTwo[1] === expertIndex) cell.classList.add("top-two");
      cell.style.setProperty("--score", String(score));
      const shown = adjusted ? score + QB_DETAILS.biases[expertIndex] : score;
      cell.append(element("b", "", shown.toFixed(2)));
      matrix.append(cell);
    });
    if (showAlpha) matrix.append(element("code", "qb-alpha-cell", ALPHA[tokenIndex].toFixed(2)));
  });
  return matrix;
};

const convergenceTrack = (title, tone, loads, biases, buttonLabel) => {
  const panel = element("section", `qb-convergence-track ${tone}`);
  panel.append(element("h3", "", title));
  const chart = loadChart(loads, tone);
  const bias = biasVector(biases);
  const action = element("button", "text-button qb-run-button", buttonLabel);
  action.type = "button";
  const round = element("strong", "qb-round", "第 0 轮");
  const ratio = element("p", "qb-ratio");
  const notice = element("p", "qb-track-notice");
  notice.hidden = true;
  panel.append(chart.chart, bias, action, round, ratio, notice);
  return { panel, chart, bias, action, round, ratio, notice };
};

const buildConvergencePane = (state, onChange) => {
  const pane = element("section", "qb-convergence-pane");
  const controls = element("div", "qb-convergence-controls");
  const reset = element("button", "text-button", "↺ 重置");
  reset.type = "button";
  reset.title = "重置 SignSGD 迭代";
  const gammaControl = element("label", "qb-gamma-control");
  const slider = element("input");
  slider.type = "range";
  slider.min = "0.005";
  slider.max = "0.30";
  slider.step = "0.005";
  slider.value = String(state.gamma);
  const gammaValue = element("code", "", formatGamma(state.gamma));
  gammaControl.append(element("span", "", "步长 γ"), slider, gammaValue);
  controls.append(reset, gammaControl);

  const comparison = element("div", "qb-convergence-comparison");
  const legacy = convergenceTrack(
    "SignSGD：固定步长逐轮修正",
    "legacy",
    state.signLoads,
    state.signBiases,
    "▶ 执行下一轮",
  );
  legacy.panel.insertBefore(controls, legacy.chart.chart);
  const separator = element("div", "qb-vs", "vs");
  const exact = convergenceTrack(
    "Quantile Balancing：精确一步",
    "exact",
    state.qbDone ? QB_LOADS : INITIAL_LOADS,
    state.qbDone ? QB_DETAILS.biases : [0, 0, 0, 0],
    "▶ 执行 QB",
  );
  const exactReset = element("button", "text-button qb-track-reset", "↺ 重置");
  exactReset.type = "button";
  exactReset.title = "重置 Quantile Balancing";
  exact.panel.insertBefore(exactReset, exact.chart.chart);
  comparison.append(legacy.panel, separator, exact.panel);
  const summary = element("code", "qb-live-summary");

  const sync = () => {
    legacy.bias.textContent = biasVector(state.signBiases).textContent;
    legacy.round.textContent = `第 ${state.signSgdRound} 轮`;
    const legacyRatio = imbalanceRatio(state.signLoads);
    const underCorrecting = state.gamma <= 0.02 && state.signSgdRound >= 3 && legacyRatio > 1;
    legacy.ratio.textContent = `失衡率：${legacyRatio.toFixed(1)}`;
    legacy.ratio.classList.toggle("balanced", legacyRatio === 1);
    legacy.notice.hidden = !state.oscillating && !underCorrecting;
    legacy.notice.textContent = state.oscillating
      ? "⚠ γ 过大：均衡点附近振荡"
      : "γ 较小：纠正稳定，但收敛缓慢";
    exact.bias.textContent = biasVector(state.qbDone ? QB_DETAILS.biases : [0, 0, 0, 0]).textContent;
    exact.round.textContent = `第 ${state.qbDone ? 1 : 0} 轮`;
    exact.ratio.textContent = state.qbDone ? "失衡率：1.0" : "失衡率：2.0";
    exact.ratio.classList.toggle("balanced", state.qbDone);
    exact.action.disabled = state.qbDone;
    exactReset.disabled = !state.qbDone;
    exact.notice.hidden = !state.qbDone;
    exact.notice.textContent = "✓ 一步到位，无需迭代";
    summary.textContent = `旧方法：第 ${state.signSgdRound} 轮 · 失衡率 ${legacyRatio.toFixed(1)}    QB：第 ${state.qbDone ? 1 : 0} 轮 · 失衡率 ${state.qbDone ? "1.0" : "2.0"}`;
    onChange();
  };

  const resetLegacy = () => {
    const oldLegacy = [...state.signLoads];
    state.signBiases = [0, 0, 0, 0];
    state.signLoads = [...INITIAL_LOADS];
    state.signSgdRound = 0;
    state.signHistory = [];
    state.oscillating = false;
    animateLoadBars(legacy.chart.bars, legacy.chart.labels, oldLegacy, INITIAL_LOADS);
  };
  slider.addEventListener("input", () => {
    state.gamma = Number(slider.value);
    gammaValue.textContent = formatGamma(state.gamma);
    resetLegacy();
    sync();
  });
  legacy.action.addEventListener("click", () => {
    const previous = [...state.signLoads];
    const result = signSgdStep(SCORES, state.signBiases, state.gamma, TARGET_LOAD);
    state.signBiases = result.biases;
    state.signLoads = result.loads;
    state.signSgdRound += 1;
    state.signHistory.push(result.loads.join(""));
    state.signHistory = state.signHistory.slice(-4);
    const history = state.signHistory;
    state.oscillating = state.gamma >= 0.2
      && history.length >= 3
      && history[history.length - 1] === history[history.length - 3]
      && history[history.length - 1] !== history[history.length - 2];
    animateLoadBars(legacy.chart.bars, legacy.chart.labels, previous, state.signLoads);
    animateIn(legacy.bias);
    sync();
  });
  exact.action.addEventListener("click", () => {
    state.qbDone = true;
    animateLoadBars(exact.chart.bars, exact.chart.labels, INITIAL_LOADS, QB_LOADS);
    animateIn(exact.bias);
    sync();
  });
  exactReset.addEventListener("click", () => {
    state.qbDone = false;
    animateLoadBars(exact.chart.bars, exact.chart.labels, QB_LOADS, INITIAL_LOADS);
    animateIn(exact.bias);
    sync();
  });
  reset.addEventListener("click", () => {
    resetLegacy();
    sync();
  });
  pane.append(comparison, summary);
  sync();
  return pane;
};

const stepper = (state, jumpTo) => {
  const nav = element("nav", "qb-stepper");
  nav.setAttribute("aria-label", "QB 推导步骤");
  ["路由失衡", "token 门槛 α", "专家分位点", "均衡路由"].forEach((label, index) => {
    const step = index + 1;
    const button = element("button", step < state.step ? "done" : step === state.step ? "active" : "");
    button.type = "button";
    button.setAttribute("aria-label", `Step ${step}：${label}`);
    button.append(element("b", "", step < state.step ? "✓" : String(step)), element("span", "", label));
    button.addEventListener("click", () => jumpTo(step));
    nav.append(button);
  });
  return nav;
};

const loadStrip = (loads, balanced = false) => {
  const strip = element("div", `qb-load-strip ${balanced ? "balanced" : ""}`);
  loads.forEach((load, index) => {
    const item = element("div", load > TARGET_LOAD ? "over" : load === 0 ? "empty" : "");
    const bar = element("i");
    bar.style.height = `${Math.max(4, load / 4 * 100)}%`;
    item.append(element("strong", "", String(load)), bar, element("span", "", EXPERT_LABELS[index]));
    strip.append(item);
  });
  return strip;
};

const marginColumns = () => {
  const columns = element("div", "qb-margin-columns");
  EXPERT_LABELS.forEach((expert, expertIndex) => {
    const column = element("section", "qb-margin-column");
    column.append(element("h3", "", expert));
    const sorted = MARGINS.map((row, tokenIndex) => ({ tokenIndex, value: row[expertIndex] }))
      .sort((a, b) => b.value - a.value);
    const bars = element("div", "qb-margin-bars");
    sorted.forEach(({ tokenIndex, value }, rank) => {
      const row = element("div", `qb-margin-row ${value >= 0 ? "positive" : "negative"} ${rank < TARGET_LOAD ? "keep" : ""} ${rank === TARGET_LOAD ? "quantile" : ""}`);
      const track = element("span");
      const fill = element("i");
      fill.style.width = `${Math.max(5, Math.abs(value) / 0.72 * 48)}%`;
      track.append(fill);
      row.append(element("code", "", `t${tokenIndex + 1}`), track, element("b", "", formatSigned(value)));
      bars.append(row);
    });
    const raw = QB_DETAILS.raw[expertIndex];
    column.append(
      bars,
      element("p", "qb-quantile-note", `第 3 大归零 → b̂${expertIndex + 1}=${formatSigned(raw)}`),
    );
    columns.append(column);
  });
  return columns;
};

const buildStepContent = (step) => {
  const content = element("section", `qb-step-content step-${step}`);
  if (step === 1) {
    content.append(
      element("h3", "", "初始 Top-1 路由"),
      scoreMatrix("initial"),
      loadStrip(INITIAL_LOADS),
      element("p", "qb-callout danger", "Router 没有容量约束，天然偏向高分专家"),
    );
  } else if (step === 2) {
    content.append(
      element("h3", "", "每个 token 的第二名就是改选门槛"),
      scoreMatrix("alpha"),
      element("code", "qb-alpha-vector", `α = [${ALPHA.map((value) => value.toFixed(2)).join(", ")}]`),
      element("p", "qb-callout", "αᵢ = 第二名分数；其他专家至少要超过它才能抢走这个 token"),
    );
  } else if (step === 3) {
    content.append(
      element("h3", "", "按专家排序余量，读取第 q+1 大分位点"),
      marginColumns(),
      element("code", "qb-final-bias", `减均值 ${QB_DETAILS.mean.toFixed(4)} → b = [${QB_DETAILS.biases.map((value) => formatSigned(value)).join(", ")}]`),
      element("p", "qb-callout", "让第 q+1 大余量恰好等于 0：前 q 个 token 留下，其余让路"),
    );
  } else {
    const initialScore = calcMatchScore(SCORES, INITIAL_ROUTING);
    const finalScore = calcMatchScore(SCORES, QB_ROUTING);
    content.append(
      element("h3", "", "应用偏置后重新 Top-1"),
      scoreMatrix("adjusted"),
      element("p", "qb-route-quality", `QB 均衡分数 ${finalScore.toFixed(2)} ≥ 强制轮转 5.37；原始未约束分数 ${initialScore.toFixed(2)}`),
      element("p", "qb-callout success", "偏置只决定路由；输出混合仍使用原始分数 s"),
    );
  }
  return content;
};

const buildStepwisePane = (state, onStep) => {
  const pane = element("section", "qb-stepwise-pane");
  const host = element("div", "qb-step-host");
  const renderStep = () => {
    const content = buildStepContent(state.step);
    host.replaceChildren(content);
    animateIn(content);
  };
  const jumpTo = (step) => onStep(step);
  const next = element("button", "text-button qb-next-step", state.step === 4 ? "✓ 推导完成" : "下一步 →");
  next.type = "button";
  next.disabled = state.step === 4;
  next.addEventListener("click", () => jumpTo(Math.min(4, state.step + 1)));
  pane.append(stepper(state, jumpTo), host, next);
  renderStep();
  return pane;
};

const dualChart = (points, tone) => {
  const svg = svgElement("svg", { class: `qb-dual-chart ${tone}`, viewBox: "0 0 220 70", role: "img", "aria-label": tone === "legacy" ? "SignSGD 多轮锯齿收敛" : "QB 一步到达均衡" });
  svg.append(
    svgElement("line", { x1: "12", y1: "58", x2: "208", y2: "58", class: "qb-chart-axis" }),
    svgElement("line", { x1: "12", y1: "10", x2: "12", y2: "58", class: "qb-chart-axis" }),
    svgElement("polyline", { points, class: "qb-chart-line" }),
  );
  return svg;
};

const buildDualPane = () => {
  const pane = element("section", "qb-dual-pane");
  const objective = element("div", "qb-objective-flow");
  [
    ["原始问题 · 最大化路由匹配", "max  Σᵢⱼ xᵢⱼ sᵢⱼ", "约束：每 token 选 k 个；每专家收 q 个", "NP 难：整数规划", "danger"],
    ["松弛为对偶问题", "引入 token 门槛 αᵢ，专家价格 βⱼ", "路由偏置 bⱼ = −βⱼ", "线性松弛仍有整数最优解", "success"],
    ["坐标交替最小化", "固定 β → 求精确 α；固定 α → 求精确 β", "QB = 一次 β 坐标更新", "同一目标，直接读距离", "blue"],
  ].forEach(([label, formula, detail, note, tone]) => {
    const row = element("div", `qb-objective-row ${tone}`);
    row.append(element("span", "", label), element("code", "", formula), element("p", "", detail), element("small", "", note));
    objective.append(row);
  });
  const compare = element("div", "qb-dual-compare");
  const legacy = element("section", "qb-dual-card legacy");
  legacy.append(
    element("h3", "", "SignSGD on dual"),
    element("code", "", "bⱼ ← bⱼ + γ · sign(q − Lⱼ)"),
    element("p", "", "只知方向，不知距离"),
    dualChart("12,52 38,30 64,48 90,25 116,43 142,22 168,36 194,18", "legacy"),
  );
  const exact = element("section", "qb-dual-card exact");
  exact.append(
    element("h3", "", "Exact coordinate minimization"),
    element("code", "", "bⱼ = −quantile(marginⱼ, 1 − k/n)"),
    element("p", "", "一步到最优点，保留高余量 token"),
    dualChart("12,52 194,18", "exact"),
  );
  compare.append(legacy, exact);
  pane.append(objective, compare);
  return pane;
};

const buildConvergenceSide = (state) => {
  const side = element("aside", "qb-side qb-convergence-side");
  const legacyRatio = imbalanceRatio(state.signLoads);
  side.append(
    element("p", "qb-side-kicker", "实时联动读数"),
    element("strong", "qb-side-metric legacy", `SignSGD · 第 ${state.signSgdRound} 轮`),
    element("code", "", `失衡率 ${legacyRatio.toFixed(1)} · γ=${formatGamma(state.gamma)}`),
    element("strong", `qb-side-metric ${state.qbDone ? "success" : "pending"}`, state.qbDone ? "✓ QB · 第 1 轮完成" : "QB 待执行"),
    element("p", "qb-side-note", "目标均衡负载：每专家 q = mk/n = 2"),
  );
  return side;
};

const buildStepSide = (state) => {
  const side = element("aside", "qb-side qb-step-side");
  side.append(element("p", "qb-side-kicker", `STEP 0${state.step} · 计算读数`));
  if (state.step === 1) {
    side.append(element("strong", "qb-side-big", "(4, 3, 1, 0)"), element("p", "qb-side-note", "目标均衡负载：每专家 q = mk/n = 2"), element("code", "qb-side-danger", "失衡率：max/min = ∞（E₄为 0）"));
  } else if (state.step === 2) {
    side.append(element("code", "qb-side-vector", `α = [${ALPHA.map((value) => value.toFixed(2)).join(", ")}]`), element("code", "", "αᵢ = top-(k+1) 分数"), element("p", "qb-side-note", "αᵢ 是 token i 的改选门槛，不是偏置"));
  } else if (state.step === 3) {
    const list = element("div", "qb-side-bias-list");
    QB_DETAILS.raw.forEach((value, index) => list.append(element("code", "", `E${index + 1}  b̂=${formatSigned(value)}`)));
    side.append(list, element("code", "", `mean(b̂) = ${QB_DETAILS.mean.toFixed(4)}`), element("code", "qb-side-vector", `b = [${QB_DETAILS.biases.map((value) => formatSigned(value)).join(", ")}]`), element("p", "qb-side-note", "减均值消除公共平移，Top-k 结果不变"));
  } else {
    side.append(element("strong", "qb-side-big success", "(2, 2, 2, 2)"), element("code", "", `原始匹配分数：${calcMatchScore(SCORES, INITIAL_ROUTING).toFixed(2)}`), element("code", "qb-side-success", `QB 后匹配分数：${calcMatchScore(SCORES, QB_ROUTING).toFixed(2)}`), element("p", "qb-side-note", "偏置冻结于推理阶段，在线不重算"));
  }
  return side;
};

const buildDualSide = () => {
  const side = element("aside", "qb-side qb-dual-side");
  side.append(
    element("p", "qb-side-kicker", "K3 实际规模"),
    element("strong", "qb-side-title", "大批次下的可实现算法"),
  );
  const facts = element("div", "qb-scale-facts");
  [["批次 token 数 m", "数百万（训练）"], ["专家数 n", "896"], ["激活专家 k", "16"], ["目标负载 q", "mk/n"]].forEach(([label, value]) => facts.append(element("span", "", label), element("strong", "", value)));
  const histogram = element("div", "qb-histogram-note");
  histogram.append(element("strong", "", "直方图估计"), element("p", "", "每专家维护 1000 桶余量直方图"), element("p", "", "all-reduce 汇总桶计数"), element("p", "", "通信量 < 直接交换余量的 1%"));
  side.append(facts, histogram);
  return side;
};

const buildFormulaView = (onBack) => {
  const view = element("section", "qb-formula-view");
  const back = element("button", "qb-formula-back", "← 返回动画");
  back.type = "button";
  back.addEventListener("click", onBack);
  const chain = element("div", "qb-formula-chain");
  [
    ["01", "QB 偏置更新公式", "marginᵢⱼ = sᵢⱼ − αᵢ\nαᵢ = token i 的第 k+1 大分数\nb̂ⱼ = −quantile({marginᵢⱼ}ᵢ, 1 − k/n)\nbⱼ = b̂ⱼ − (1/n)Σⱼb̂ⱼ", "路由：Top-k(sᵢⱼ + bⱼ)\n输出权重：Sigmoid(sᵢⱼ)，使用原始分数"],
    ["02", "对偶问题形式", "Primal：max Σᵢⱼ xᵢⱼsᵢⱼ\nΣⱼxᵢⱼ=k，Σᵢxᵢⱼ=q，xᵢⱼ∈{0,1}\nDual：min Σᵢk·αᵢ + Σⱼq·βⱼ", "约束：αᵢ + βⱼ ≥ sᵢⱼ\nQB = 一步 β 坐标下降；旧方法 = SignSGD"],
    ["03", "直方图估计 · 大规模实现", "本地：margin 分桶\n汇总：all-reduce(桶计数)\n读值：累计直方图取第 (1−k/n) 分位点", "误差 ≤ 一个桶宽\nK3：每专家 1000 桶，通信量 < 直接交换余量的 1%"],
  ].forEach(([number, title, formula, detail]) => {
    const row = element("section", "qb-formula-row");
    row.append(element("span", "qb-formula-number", number), element("h2", "", title), element("code", "", formula), element("p", "", detail));
    chain.append(row);
  });
  view.append(back, chain);
  return view;
};

export const renderQuantileBalancing = (block, context) => {
  const stored = context.getValue(block.id, {});
  const validTabs = new Set(TABS.map(([id]) => id));
  const state = {
    activeTab: validTabs.has(stored.activeTab) ? stored.activeTab : "convergence",
    step: Math.min(4, Math.max(1, Number(stored.step) || 1)),
    signSgdRound: Math.max(0, Number(stored.signSgdRound) || 0),
    gamma: Math.min(0.3, Math.max(0.005, Number(stored.gamma) || 0.01)),
    qbDone: Boolean(stored.qbDone),
    signBiases: Array.isArray(stored.signBiases) && stored.signBiases.length === 4 ? stored.signBiases : [0, 0, 0, 0],
    signLoads: Array.isArray(stored.signLoads) && stored.signLoads.length === 4 ? stored.signLoads : [...INITIAL_LOADS],
    signHistory: Array.isArray(stored.signHistory) ? stored.signHistory.slice(-4) : [],
    oscillating: Boolean(stored.oscillating),
    view: stored.view === "formula" ? "formula" : "main",
  };
  const root = element("article", "block quantile-balancing");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const returnButton = element("button", "qb-return", "← 返回 LatentMoE");
  returnButton.type = "button";
  returnButton.addEventListener("click", () => context.action({ action: "branch", target: "latent-moe" }));
  const claims = element("ul", "qb-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const viewport = element("div", "qb-viewport");
  const persist = () => {
    context.setValue(block.id, {
      activeTab: state.activeTab,
      step: state.step,
      signSgdRound: state.signSgdRound,
      gamma: state.gamma,
      qbDone: state.qbDone,
      signBiases: state.signBiases,
      signLoads: state.signLoads,
      signHistory: state.signHistory,
      oscillating: state.oscillating,
      view: state.view,
    });
    context.persist();
  };

  const renderMain = () => {
    const main = element("section", "qb-main");
    const left = element("section", "qb-left");
    const tabs = element("div", "segment-control qb-tabs");
    const panelHost = element("div", "qb-panel-host");
    const sideHost = element("div", "qb-side-host");
    const renderTab = () => {
      const pane = state.activeTab === "convergence"
        ? buildConvergencePane(state, () => { renderSide(); persist(); })
        : state.activeTab === "stepwise"
          ? buildStepwisePane(state, (step) => { state.step = step; renderMain(); persist(); })
          : buildDualPane();
      panelHost.replaceChildren(pane);
      tabs.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.activeTab));
      animateIn(pane);
    };
    const renderSide = () => {
      const side = state.activeTab === "convergence" ? buildConvergenceSide(state)
        : state.activeTab === "stepwise" ? buildStepSide(state) : buildDualSide();
      sideHost.replaceChildren(side);
      animateIn(side);
    };
    TABS.forEach(([id, label]) => {
      const button = element("button", state.activeTab === id ? "active" : "", label);
      button.type = "button";
      button.dataset.tab = id;
      button.addEventListener("click", () => {
        if (state.activeTab === id) return;
        state.activeTab = id;
        renderMain();
        persist();
      });
      tabs.append(button);
    });
    left.append(tabs, panelHost);
    main.append(left, sideHost);
    viewport.replaceChildren(main);
    renderSide();
    renderTab();
  };

  const renderView = () => {
    if (state.view === "formula") {
      viewport.replaceChildren(buildFormulaView(() => {
        state.view = "main";
        persist();
        renderView();
        root.focus({ preventScroll: true });
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
  renderView();
  root.append(returnButton, claims, viewport, element("p", "qb-source", `来源：${block.source}`));
  return root;
};
