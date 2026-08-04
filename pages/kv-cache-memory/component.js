import { element } from "../../shared/dom/element.js";
import { cacheFormula, phaseMeta, restorePhase } from "./logic.js";

const makeButton = (glyph, label, onClick) => {
  const button = element("button", "kcp-control", glyph);
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
};

const buildMilestones = (phase) => {
  const milestones = element("div", "kcp-milestones");
  ["1", "128K", "512K", "1M"].forEach((token, index) => {
    const marker = element("span", index === Math.min(phase, 3) ? "active" : "", token);
    milestones.append(marker);
    if (index < 3) milestones.append(element("i", "", "→"));
  });
  return milestones;
};

const buildLayerRails = (phase) => {
  const rails = element("div", "kcp-layer-rails");
  rails.append(element("span", "kcp-rail-label", "全局注意力层"));
  for (let index = 0; index < 4; index += 1) {
    const rail = element("div", "kcp-rail");
    rail.append(element("b", "kcp-query", "Q"));
    const line = element("i", "kcp-query-line");
    line.style.setProperty("--line-delay", `${index * 80}ms`);
    rail.append(line);
    const history = element("span", "kcp-history-key", "历史 K");
    rail.append(history);
    const pair = element("span", "kcp-kv-pair");
    pair.append(element("b", "key", "K"), element("b", "value", "V"));
    if (phase === 0) pair.classList.add("pending");
    rail.append(pair);
    rails.append(rail);
  }
  return rails;
};

const buildWarehouse = (phase) => {
  const warehouse = element("div", "kcp-warehouse");
  const primary = element("div", "kcp-memory-row");
  const meter = element("div", "kcp-memory-meter");
  meter.style.setProperty("--fill", `${phaseMeta[phase].fill}%`);
  meter.append(element("span", "", "已占用显存"));
  primary.append(meter);
  warehouse.append(primary);
  if (phase === 4) {
    const concurrent = element("div", "kcp-memory-row concurrent");
    const second = element("div", "kcp-memory-meter");
    second.style.setProperty("--fill", "94%");
    second.append(element("span", "", "并发请求"));
    concurrent.append(second);
    warehouse.append(concurrent);
  }
  return warehouse;
};

const buildWarehousePane = (state, update) => {
  const pane = element("section", "kcp-pane kcp-warehouse-pane");
  const top = element("div", "kcp-pane-topline");
  const intro = element("div", "kcp-pane-label");
  intro.append(element("span", "", "显存仓库"), element("strong", "kcp-phase-note", phaseMeta[state.phase].note));
  const controls = element("div", "kcp-controls");
  const stop = () => {
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
  };
  const play = () => {
    stop();
    if (state.phase === phaseMeta.length - 1) state.phase = 0;
    update();
    state.timer = window.setInterval(() => {
      state.phase = Math.min(phaseMeta.length - 1, state.phase + 1);
      update();
      if (state.phase === phaseMeta.length - 1) stop();
    }, 880);
  };
  controls.append(
    makeButton("▶", "播放显存堆积过程", play),
    makeButton("›", "前进一步", () => { stop(); state.phase = Math.min(phaseMeta.length - 1, state.phase + 1); update(); }),
    makeButton("↺", "重置为初始帧", () => { stop(); state.phase = 0; update(); }),
  );
  top.append(intro, controls);
  const diagram = element("div", "kcp-warehouse-diagram");
  diagram.dataset.phase = String(state.phase);
  diagram.append(buildMilestones(state.phase), buildLayerRails(state.phase), buildWarehouse(state.phase));
  const caption = element("p", "kcp-caption", "新 token 不必重算历史；代价是每层都把新产生的 K/V 留在显存中。 ");
  pane.append(top, diagram, caption);
  return pane;
};

const formulaLine = (parts) => {
  const line = element("p", "kcp-formula-line");
  parts.forEach(([kind, text]) => line.append(element(kind === "strong" ? "strong" : "span", kind === "strong" ? "" : kind, text)));
  return line;
};

const buildDefaultPane = (block, state, update) => {
  const pane = element("section", "kcp-default-panel");
  const simulation = buildWarehousePane(state, update);
  const formula = element("aside", "kcp-formula-panel");
  formula.append(
    element("p", "kcp-pane-label", "关键关系"),
    formulaLine([["strong", "KV显存"], ["operator", " = "], ["", "token数 × 全局注意力层数"], ["operator", " × "], ["", "每token缓存维度 × 精度字节 × 并发请求数"]]),
    element("p", "kcp-formula-plain", cacheFormula),
    element("p", "kcp-qualification", "单请求、BF16、仅缓存张量；模型权重与运行时工作区尚未计入。"),
    element("p", "kcp-analogy", "像保留完整会议录像：回放很快，但会议越长、并发越多，常驻存储越大。"),
  );
  const conclusion = element("p", "kcp-bottom-conclusion", "长上下文不是只让计算变慢，它还会把历史本身变成常驻显存。");
  pane.append(simulation, formula, conclusion);
  return pane;
};

const buildRailStack = (type) => {
  const root = element("div", `kcp-rail-stack ${type}`);
  const count = type === "mha" ? 9 : 6;
  for (let index = 0; index < count; index += 1) root.append(element("i", ""));
  if (type === "mla") {
    const fixed = element("div", "kcp-fixed-state");
    fixed.append(element("span", "", "69 层 KDA"), element("small", "固定状态"));
    root.append(fixed);
  }
  return root;
};

const buildCalculation = (type) => {
  const isMha = type === "mha";
  const panel = element("section", `kcp-calculation ${type}`);
  const label = element("p", "kcp-calc-label", isMha ? "标准 MHA 反事实基线" : "K3 优化 MLA");
  const title = element("h2", "", isMha ? "如果 93 层都保存标准 K/V" : "K3 只在 24 个 Gated MLA 层保留全局 cache");
  const equation = element("div", "kcp-equation");
  if (isMha) {
    equation.append(
      element("p", "", "单层 = 1,048,576 × 96 × (128K + 128V) × 2B"),
      element("p", "kcp-result", "= 48 GiB"),
      element("p", "", "93 层 = 48 × 93"),
      element("p", "kcp-result", "= 4,464 GiB ≈ 4.36 TiB"),
    );
  } else {
    equation.append(
      element("p", "", "每 token 每层 = 512 维 latent + 64 维共享 K"),
      element("p", "", "总量 = 1,048,576 × 24 × (512 + 64) × 2B"),
      element("p", "kcp-result", "= 27 GiB"),
    );
  }
  const visual = buildRailStack(type);
  const footnote = element("p", "kcp-calc-footnote", isMha
    ? "用于说明代价结构的标准 MHA 反事实基线，不是 K3 实际架构。"
    : "单请求、BF16、24 层、576 维、仅优化 MLA cache 的理论张量量；不是 K3 总推理显存。"
  );
  panel.append(label, title, equation, visual, footnote);
  return panel;
};

const buildRigorousPane = () => {
  const pane = element("section", "kcp-rigorous-panel");
  const comparison = element("div", "kcp-rigorous-comparison");
  comparison.append(buildCalculation("mha"));
  const bridge = element("div", "kcp-compression-bridge");
  bridge.append(element("span", "", "93 层"), element("i", "", "→"), element("strong", "", "24 层全局 cache"), element("small", "", "改变系数与层数，但线性增长仍然存在"));
  comparison.append(bridge, buildCalculation("mla"));
  pane.append(
    comparison,
    element("p", "kcp-bottom-conclusion", "从 4.36 TiB 降到约 27 GiB，解决的是增长斜率；只要逐 token 保留全局 cache，长度和并发仍会继续推高显存。"),
  );
  return pane;
};

export const renderKvCacheProblem = (block, context) => {
  const stored = context.getValue(block.id, {});
  const state = {
    mode: stored.mode === "rigorous" ? "rigorous" : "warehouse",
    phase: restorePhase(stored.phase),
    timer: null,
  };
  const root = element("article", "block kv-cache-problem");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("section", "kcp-claims");
  claims.append(element("p", "kcp-subtitle", "每多读一个 token，每个全局注意力层都要为它留下一份可检索的历史。"));
  const list = element("ul", "kcp-claim-list");
  block.claims.forEach((claim) => list.append(element("li", "", claim)));
  claims.append(list);
  const trackHeader = element("div", "kcp-track-header");
  const switcher = element("div", "segment-control kcp-mode-switch");
  const warehouseButton = element("button", state.mode === "warehouse" ? "active" : "", "显存仓库");
  const rigorousButton = element("button", state.mode === "rigorous" ? "active" : "", "严谨计算");
  warehouseButton.type = "button";
  rigorousButton.type = "button";
  switcher.append(warehouseButton, rigorousButton);
  trackHeader.append(element("span", "kcp-track-label", "局部视图"), switcher);
  const viewport = element("div", "kcp-track-viewport");
  let activePane = null;
  const persist = () => {
    context.setValue(block.id, { mode: state.mode, phase: state.phase });
    context.persist();
  };
  const paintPane = (direction = 1, animate = false) => {
    activePane?.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    const pane = state.mode === "warehouse" ? buildDefaultPane(block, state, () => {
      persist();
      paintPane(1, false);
      root.focus({ preventScroll: true });
    }) : buildRigorousPane();
    viewport.replaceChildren(pane);
    activePane = pane;
    if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pane.animate(
        [{ transform: `translateX(${direction * 7}%)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
        { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  };
  const setMode = (mode) => {
    if (mode === state.mode) return false;
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
    const direction = mode === "rigorous" ? 1 : -1;
    state.mode = mode;
    warehouseButton.classList.toggle("active", mode === "warehouse");
    rigorousButton.classList.toggle("active", mode === "rigorous");
    persist();
    paintPane(direction, true);
    root.focus({ preventScroll: true });
    return true;
  };
  warehouseButton.addEventListener("click", () => setMode("warehouse"));
  rigorousButton.addEventListener("click", () => setMode("rigorous"));
  root.trackNavigate = (direction) => {
    if (direction > 0 && state.mode === "warehouse") return setMode("rigorous");
    if (direction < 0 && state.mode === "rigorous") return setMode("warehouse");
    return false;
  };
  paintPane();
  root.append(claims, trackHeader, viewport, element("p", "kcp-source", `来源：${block.source}`));
  return root;
};
