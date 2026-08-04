import { element, svgElement } from "../../shared/dom/element.js";
import {
  CLAIMS,
  DETAIL_COPY,
  FORMULAS,
  K15_ATTENTION,
  K15_DETAILS,
  K3_DIMENSIONS,
  LEFT_VIEWS,
  SOURCE,
  TRANSITIONS,
  VERSIONS,
} from "./logic.js?build=20260803-attention-mla";
import { ARCHITECTURE_CONNECTIONS, navigateArchitectureConnection } from "./connections.js";

const svgText = (svg, x, y, text, className = "ae-svg-label", anchor = "start") => {
  svg.append(svgElement("text", { x, y, class: className, "text-anchor": anchor }, text));
};

const segmented = (items, active, onSelect, className = "") => {
  const control = element("div", `segment-control ${className}`);
  control.setAttribute("role", "tablist");
  items.forEach(([id, label]) => {
    const button = element("button", id === active ? "active" : "", label);
    button.type = "button";
    button.dataset.value = id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(id === active));
    button.addEventListener("click", () => onSelect(id));
    control.append(button);
  });
  return control;
};

const baseSvg = (label, height = 210) => svgElement("svg", {
  class: "ae-detail-svg", viewBox: `0 0 420 ${height}`, role: "img", "aria-label": label,
});

const buildK15MhaVisual = () => {
  const svg = baseSvg("KV cache 随序列长度线性增长");
  svg.append(
    svgElement("line", { x1: 48, y1: 174, x2: 386, y2: 174, class: "ae-axis" }),
    svgElement("line", { x1: 48, y1: 174, x2: 48, y2: 24, class: "ae-axis" }),
  );
  [1, 3, 6, 9, 12].forEach((token, index) => {
    const x = 55 + index * 79;
    const y = 166 - index * 31;
    svg.append(svgElement("circle", { cx: x, cy: y, r: index === 4 ? 5 : 3.5, class: index === 4 ? "ae-point hot" : "ae-point" }));
    svgText(svg, x, 192, String(token), "ae-axis-label", "middle");
  });
  svg.append(svgElement("path", { d: "M55 166 L134 135 L213 104 L292 73 L371 42", class: "ae-line blue" }));
  svgText(svg, 205, 207, "序列位置", "ae-axis-label", "middle");
  svgText(svg, 15, 104, "KV 显存", "ae-axis-label", "middle");
  svgText(svg, 213, 89, "6 个 KV 对", "ae-callout", "middle");
  svgText(svg, 371, 27, "12 个 KV 对", "ae-callout hot", "middle");
  svgText(svg, 300, 153, "KV Cache ∝ O(n)", "ae-formula-label", "middle");
  return svg;
};

const buildK15MqaVisual = () => {
  const svg = baseSvg("MQA 的多 Query 头共享一组 KV cache");
  svgText(svg, 76, 27, "H 个 Query 头", "ae-panel-title", "middle");
  [58, 84, 110, 136].forEach((y, index) => {
    svg.append(svgElement("circle", { cx: 48, cy: y, r: 8, class: "ae-point" }));
    svgText(svg, 48, y + 3, index === 3 ? "…" : `Q${index + 1}`, "ae-query-label", "middle");
    svg.append(svgElement("line", { x1: 58, y1: y, x2: 108, y2: 97, class: "ae-share-line" }));
  });
  svg.append(svgElement("rect", { x: 110, y: 70, width: 54, height: 54, class: "ae-shared-kv" }));
  svgText(svg, 137, 94, "1 组", "ae-flow-title", "middle");
  svgText(svg, 137, 111, "K / V", "ae-flow-title", "middle");
  svgText(svg, 107, 157, "多个 Q 共读", "ae-callout", "middle");
  svg.append(
    svgElement("line", { x1: 190, y1: 174, x2: 386, y2: 174, class: "ae-axis" }),
    svgElement("line", { x1: 190, y1: 174, x2: 190, y2: 48, class: "ae-axis" }),
    svgElement("path", { d: "M198 164 L244 151 L291 138 L337 125 L382 112", class: "ae-line green" }),
  );
  [1, 3, 6, 9, 12].forEach((token, index) => {
    const x = 198 + index * 46;
    const y = 164 - index * 13;
    svg.append(svgElement("circle", { cx: x, cy: y, r: 3.5, class: "ae-point" }));
    svgText(svg, x, 192, String(token), "ae-axis-label", "middle");
  });
  svgText(svg, 288, 207, "KV cache 仍是 O(n)，但系数从 H → 1", "ae-formula-label", "middle");
  return svg;
};

const buildK15Visual = (attention) => attention === "mqa" ? buildK15MqaVisual() : buildK15MhaVisual();

const matrixBlock = (svg, x, y, width, height, className) => {
  svg.append(svgElement("rect", { x, y, width, height, rx: 3, class: className }));
  for (let index = 1; index < 5; index += 1) {
    const lineY = y + index * height / 5;
    svg.append(svgElement("line", { x1: x + 7, y1: lineY, x2: x + width - 7, y2: lineY, class: "ae-matrix-line" }));
  }
};

const buildK2Visual = () => {
  const svg = baseSvg("K2 MLA 的压缩、缓存与展开流程", 240);
  matrixBlock(svg, 18, 61, 77, 92, "ae-matrix-block input");
  svgText(svg, 56, 47, "输入 hₜ", "ae-panel-title", "middle");
  svgText(svg, 56, 169, "d_model = 7168", "ae-axis-label", "middle");
  svg.append(svgElement("polygon", { points: "112,61 149,77 149,137 112,153", class: "ae-trapezoid compress" }));
  svgText(svg, 130, 47, "Wᴰₖᵥ", "ae-flow-title", "middle");
  svgText(svg, 130, 174, "压缩", "ae-axis-label", "middle");
  matrixBlock(svg, 164, 80, 40, 53, "ae-matrix-block latent");
  svgText(svg, 184, 47, "只缓存", "ae-callout green", "middle");
  svgText(svg, 184, 151, "cᴷⱽₜ = 512", "ae-stat success", "middle");
  svgText(svg, 184, 167, "+ kᴿₜ = 64", "ae-axis-label", "middle");
  svg.append(svgElement("polygon", { points: "219,77 256,61 256,153 219,137", class: "ae-trapezoid expand" }));
  svgText(svg, 237, 47, "Wᵁₖ / Wᵁᵥ", "ae-flow-title", "middle");
  svgText(svg, 237, 174, "推理时展开", "ae-axis-label", "middle");
  matrixBlock(svg, 272, 61, 126, 92, "ae-matrix-block output");
  svg.append(svgElement("line", { x1: 272, y1: 107, x2: 398, y2: 107, class: "ae-matrix-line" }));
  svgText(svg, 335, 47, "每头 K / V", "ae-panel-title active", "middle");
  svgText(svg, 335, 96, "Kₜ", "ae-flow-title", "middle");
  svgText(svg, 335, 129, "Vₜ", "ae-flow-title", "middle");
  svgText(svg, 335, 169, "64 个头的读出", "ae-axis-label", "middle");
  svg.append(svgElement("line", { x1: 18, y1: 194, x2: 398, y2: 194, class: "ae-divider" }));
  svgText(svg, 210, 215, "逐头 K/V：20,480 个数/token  →  MLA cache：576 个数/token", "ae-formula-label", "middle");
  svgText(svg, 210, 233, "20,480 ÷ 576 = 35.6× 更小的 KV cache", "ae-stat success", "middle");
  return svg;
};

const buildK25Visual = () => {
  const svg = baseSvg("K2.5 视觉编码器接入语言主干");
  const blocks = [[22, "MoonViT-3D", "SigLIP 初始化"], [170, "MLP Projector", "映射 hidden space"], [292, "K2 MoE LLM", "MLA · 384 专家"]];
  blocks.forEach(([x, title, note], index) => {
    svg.append(svgElement("rect", { x, y: 80, width: index === 1 ? 104 : 112, height: 64, rx: 4, class: `ae-flow-block tone-${index}` }));
    svgText(svg, x + (index === 1 ? 52 : 56), 105, title, "ae-flow-title", "middle");
    svgText(svg, x + (index === 1 ? 52 : 56), 124, note, "ae-axis-label", "middle");
    if (index < 2) svgText(svg, x + (index === 0 ? 130 : 116), 115, "→", "ae-flow-arrow", "middle");
  });
  svg.append(svgElement("rect", { x: 34, y: 20, width: 170, height: 42, rx: 4, class: "ae-warning" }));
  svgText(svg, 119, 38, "SigLIP 对比目标 ≠ NTP", "ae-warning-title", "middle");
  svgText(svg, 119, 53, "目标错位 → 梯度 spike", "ae-axis-label", "middle");
  svgText(svg, 210, 181, "早期 10% 视觉融合 > 晚期 50%", "ae-stat success", "middle");
  return svg;
};

const buildK3Sequence = () => {
  const svg = baseSvg("KDA 与 MLA 的显存增长对比", 220);
  svgText(svg, 22, 46, "KDA", "ae-panel-title active");
  svgText(svg, 22, 144, "MLA", "ae-panel-title green");
  svg.append(
    svgElement("line", { x1: 74, y1: 68, x2: 382, y2: 68, class: "ae-line blue state-line" }),
    svgElement("path", { d: "M74 181 L150 172 L227 157 L304 137 L382 111", class: "ae-line green" }),
    svgElement("line", { x1: 74, y1: 199, x2: 382, y2: 199, class: "ae-axis" }),
  );
  svgText(svg, 225, 58, "O(1) · 固定状态矩阵 S", "ae-callout", "middle");
  svgText(svg, 260, 151, "O(n) · 系数较小", "ae-callout green", "middle");
  svgText(svg, 74, 215, "0", "ae-axis-label", "middle");
  svgText(svg, 382, 215, "1M token", "ae-axis-label", "middle");
  svgText(svg, 210, 102, "3 层 KDA + 1 层 MLA：75% 层缓存不增长", "ae-mix-label", "middle");
  return svg;
};

const buildK3Depth = () => {
  const svg = baseSvg("Block Attention Residuals 跨层检索", 220);
  for (let index = 0; index < 6; index += 1) {
    const y = 180 - index * 28;
    svg.append(svgElement("rect", { x: 92, y, width: 92, height: 20, rx: 3, class: "ae-layer" }));
    svgText(svg, 138, y + 14, `L${index + 1}`, "ae-flow-title", "middle");
    if (index < 5) svg.append(svgElement("line", { x1: 138, y1: y - 3, x2: 138, y2: y - 8, class: "ae-layer-link" }));
  }
  svg.append(
    svgElement("rect", { x: 74, y: 112, width: 130, height: 94, rx: 4, class: "ae-block-boundary" }),
    svgElement("rect", { x: 74, y: 24, width: 130, height: 82, rx: 4, class: "ae-block-boundary" }),
    svgElement("path", { d: "M184 134 C330 134 330 50 184 50", class: "ae-attn-arc" }),
    svgElement("path", { d: "M184 78 L184 50", class: "ae-attn-local" }),
  );
  svgText(svg, 302, 92, "L6 读取 L5 + Block n−1 末端", "ae-callout", "middle");
  svgText(svg, 26, 160, "Block n−1", "ae-axis-label");
  svgText(svg, 26, 67, "Block n", "ae-axis-label");
  svgText(svg, 302, 180, "虚线：跨 Block 残差通道", "ae-mix-label", "middle");
  return svg;
};

const buildK3Width = () => {
  const svg = baseSvg("Stable LatentMoE 稀疏专家路由", 220);
  svg.append(svgElement("rect", { x: 22, y: 88, width: 62, height: 38, rx: 3, class: "ae-input" }));
  svgText(svg, 53, 111, "x", "ae-flow-title", "middle");
  svg.append(svgElement("path", { d: "M84 107 L133 107", class: "ae-arrow-line" }));
  svg.append(svgElement("polygon", { points: "133,107 170,78 207,107 170,136", class: "ae-router" }));
  svgText(svg, 170, 104, "Router", "ae-flow-title", "middle");
  svgText(svg, 170, 119, "3584d", "ae-axis-label", "middle");
  for (let index = 0; index < 64; index += 1) {
    const col = index % 8;
    const row = Math.floor(index / 8);
    svg.append(svgElement("circle", { cx: 252 + col * 18, cy: 43 + row * 18, r: 5, class: index < 16 ? "ae-expert active" : "ae-expert" }));
  }
  svg.append(svgElement("path", { d: "M207 107 L240 107", class: "ae-arrow-line" }));
  svgText(svg, 318, 199, "16 / 896 激活", "ae-stat danger", "middle");
  svgText(svg, 318, 18, "SiTU-GLU + QB", "ae-callout green", "middle");
  return svg;
};

const buildVisual = (state) => {
  if (state.activeVersion === "k1.5") return buildK15Visual(state.k15Attention);
  if (state.activeVersion === "k2") return buildK2Visual();
  if (state.activeVersion === "k2.5") return buildK25Visual();
  if (state.k3Dimension === "depth") return buildK3Depth();
  if (state.k3Dimension === "width") return buildK3Width();
  return buildK3Sequence();
};

const buildFormulaPanel = (state) => {
  const panel = element("div", "ae-formula-panel");
  const key = state.activeVersion === "k3" ? state.k3Dimension : state.activeVersion === "k1.5" ? state.k15Attention : state.activeVersion;
  FORMULAS[key].forEach((formula, index) => {
    const row = element("div", "ae-formula-row");
    row.append(element("span", "", String(index + 1).padStart(2, "0")), element("code", "", formula));
    panel.append(row);
  });
  if (state.activeVersion === "k3") {
    const boundary = state.k3Dimension === "sequence" ? "固定状态节省显存，但递归压缩有损；MLA 周期性恢复全局精确检索。"
      : state.k3Dimension === "depth" ? "Block 摘要减少全连接深度注意力的成本，同时保留跨块信息通道。"
        : "低维路由减少路由成本；只激活 16 个专家，让 2.78T 容量保持稀疏计算。";
    panel.append(element("p", "ae-formula-boundary", boundary));
  }
  return panel;
};

const animateSwap = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  node.animate([{ opacity: 0, transform: "translateX(12px)" }, { opacity: 1, transform: "translateX(0)" }], {
    duration: 280, easing: "cubic-bezier(0.22,1,0.36,1)",
  });
};

export const renderArchitectureEvolution = (block, context) => {
  const stored = context.getValue(block.id, {});
  const state = {
    activeVersion: VERSIONS.some((version) => version.id === stored.activeVersion) ? stored.activeVersion : "k3",
    leftView: LEFT_VIEWS.some(([id]) => id === stored.leftView) ? stored.leftView : "attention",
    rightMode: ["visual", "formula"].includes(stored.rightMode) ? stored.rightMode : "visual",
    k15Attention: K15_ATTENTION.some(([id]) => id === stored.k15Attention) ? stored.k15Attention : "mha",
    k3Dimension: K3_DIMENSIONS.some(([id]) => id === stored.k3Dimension) ? stored.k3Dimension : "sequence",
  };
  const root = element("article", "block architecture-evolution");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "ae-claims");
  CLAIMS.forEach((claim) => claims.append(element("li", "", claim)));
  const main = element("section", "ae-main");
  const left = element("section", "ae-panel ae-left");
  const right = element("section", "ae-panel ae-right");

  const persist = () => {
    context.setValue(block.id, { ...state });
    context.persist();
  };

  const renderLeft = () => {
    left.replaceChildren();
    const tabs = segmented(LEFT_VIEWS, state.leftView, (id) => {
      if (id === state.leftView) return;
      state.leftView = id;
      persist();
      renderLeft();
    }, "ae-left-tabs");
    const map = element("div", "ae-version-map");
    VERSIONS.forEach((version, index) => {
      const row = element("button", `ae-version-row ${version.id === state.activeVersion ? "selected" : ""}`);
      row.type = "button";
      row.dataset.version = version.id;
      row.setAttribute("aria-pressed", String(version.id === state.activeVersion));
      const identity = element("span", "ae-version-identity");
      identity.append(element("strong", "", version.label), element("small", "", version.date));
      const detail = version[state.leftView];
      const blockNode = element("span", `ae-version-block ${version.id === "k3" ? "k3" : ""}`);
      blockNode.append(element("strong", "", detail.title), element("small", "", detail.detail), element("em", "", detail.badge));
      row.append(identity, blockNode);
      row.addEventListener("click", () => {
        if (state.activeVersion === version.id) return;
        state.activeVersion = version.id;
        persist();
        renderLeft();
        renderRight();
      });
      map.append(row);
      if (index < VERSIONS.length - 1) {
        const transition = element("div", `ae-transition t-${index}`);
        transition.append(element("span", "", "↓"), element("small", "", TRANSITIONS[state.leftView][index]));
        map.append(transition);
      }
    });
    left.append(tabs, map);
  };

  const renderRight = () => {
    right.replaceChildren();
    const version = VERSIONS.find((item) => item.id === state.activeVersion);
    if (state.activeVersion === "k2.5") {
      const inherit = element("div", "ae-k25-inherit-only", "K2.5 架构完全继承 K2");
      right.append(inherit);
      animateSwap(inherit);
      return;
    }
    const toolbar = element("div", "ae-right-toolbar");
    toolbar.append(
      element("span", "ae-version-kicker", `${version.label} · ${LEFT_VIEWS.find(([id]) => id === state.leftView)[1]}`),
      segmented([["visual", "图解"], ["formula", "公式"]], state.rightMode, (id) => {
        if (id === state.rightMode) return;
        state.rightMode = id;
        persist();
        renderRight();
      }, "ae-mode-tabs"),
    );
    const detail = state.activeVersion === "k1.5" ? K15_DETAILS[state.k15Attention] : DETAIL_COPY[state.activeVersion];
    const content = element("div", `ae-detail-content ${state.activeVersion === "k1.5" ? "has-k15-tabs" : ""}`);
    content.append(element("h2", "", detail.title));
    if (state.activeVersion === "k1.5") {
      content.append(segmented(K15_ATTENTION, state.k15Attention, (id) => {
        if (id === state.k15Attention) return;
        state.k15Attention = id;
        persist();
        renderRight();
      }, "ae-k15-tabs"));
    }
    if (state.activeVersion === "k3") {
      content.append(segmented(K3_DIMENSIONS, state.k3Dimension, (id) => {
        if (id === state.k3Dimension) return;
        state.k3Dimension = id;
        persist();
        renderRight();
      }, "ae-dimension-tabs"));
    }
    const media = element("div", `ae-detail-media mode-${state.rightMode}`);
    media.append(state.rightMode === "visual" ? buildVisual(state) : buildFormulaPanel(state));
    content.append(media, element("p", "ae-detail-note", detail.note));
    const footer = element("footer", "ae-detail-footer");
    footer.append(element("strong", "", detail.footer));
    const links = element("div", "ae-connection-links");
    ARCHITECTURE_CONNECTIONS.forEach((connection) => {
      const button = element("button", `connection-${connection.id}`, `${connection.label} →`);
      button.type = "button";
      button.addEventListener("click", () => navigateArchitectureConnection(context, connection));
      links.append(button);
    });
    footer.append(links);
    right.append(toolbar, content, footer);
    animateSwap(content);
  };

  root.trackNavigate = (direction) => {
    const ids = VERSIONS.map((version) => version.id);
    const next = ids.indexOf(state.activeVersion) + direction;
    if (next < 0 || next >= ids.length) return false;
    state.activeVersion = ids[next];
    persist();
    renderLeft();
    renderRight();
    root.focus({ preventScroll: true });
    return true;
  };

  renderLeft();
  renderRight();
  main.append(left, right);
  root.append(claims, main, element("p", "ae-source", `来源：${SOURCE}`));
  return root;
};
