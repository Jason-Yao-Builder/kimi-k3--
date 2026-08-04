import { MOTION } from "../design/tokens.js";

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const editable = (node, field) => {
  node.dataset.editField = field;
  return node;
};

const renderText = (block) => {
  const root = element("article", "block text-block");
  if (block.eyebrow) root.append(editable(element("p", "eyebrow", block.eyebrow), "eyebrow"));
  root.append(editable(element("h2", "", block.heading), "heading"));
  root.append(editable(element("p", "body-copy", block.body), "body"));
  if (block.callout) root.append(editable(element("p", "callout", block.callout), "callout"));
  return root;
};

const renderHero = (block) => {
  const root = element("article", "block hero-block");
  root.append(editable(element("p", "eyebrow", block.kicker), "kicker"));
  root.append(editable(element("h2", "hero-title", block.headline), "headline"));
  root.append(editable(element("p", "hero-summary", block.summary), "summary"));
  const metric = element("div", "hero-metric");
  metric.append(editable(element("strong", "", block.metric.value), "metric.value"));
  metric.append(editable(element("span", "", block.metric.label), "metric.label"));
  root.append(metric);
  return root;
};

const renderFormula = (block) => {
  const root = element("article", "block formula-block");
  root.append(editable(element("div", "formula", block.expression), "expression"));
  root.append(editable(element("p", "", block.note), "note"));
  return root;
};

const renderCase = (block) => {
  const root = element("article", "block case-block");
  root.append(element("p", "eyebrow", "CONCRETE FRAME"));
  root.append(editable(element("h3", "", block.title), "title"));
  root.append(editable(element("p", "body-copy", block.body), "body"));
  return root;
};

const renderMatrix = (block) => {
  const root = element("article", "block matrix-block");
  const head = element("div", "block-heading");
  head.append(editable(element("h3", "", block.title), "title"), element("span", "", "n × n"));
  const matrix = element("div", "matrix-grid");
  matrix.style.setProperty("--matrix-size", block.rows);
  for (let i = 0; i < block.rows ** 2; i += 1) {
    const cell = element("i");
    cell.style.setProperty("--delay", `${i * 10}ms`);
    matrix.append(cell);
  }
  root.append(head, matrix, editable(element("p", "caption", block.caption), "caption"));
  return root;
};

const renderComparison = (block) => {
  const root = element("div", "block comparison-block");
  block.items.forEach((item, index) => {
    const row = element("article", `comparison-row tone-${item.tone}`);
    row.append(element("span", "comparison-index", `0${index + 1}`));
    const copy = element("div");
    copy.append(
      editable(element("h3", "", item.label), `items.${index}.label`),
      editable(element("p", "", item.value), `items.${index}.value`),
    );
    row.append(copy, element("span", "comparison-arrow", "→"));
    root.append(row);
  });
  return root;
};

const renderImage = (block, context) => {
  const root = element("figure", "block image-block");
  const image = element("img");
  image.src = block.src;
  image.alt = block.alt;
  root.append(image, editable(element("figcaption", "", block.caption), "caption"));
  if (block.zoomable) {
    const button = element("button", "zoom-button", "⛶");
    button.type = "button";
    button.title = "放大组件";
    button.setAttribute("aria-label", "放大组件");
    button.addEventListener("click", () => context.toggleZoom(root));
    root.append(button);
  }
  return root;
};

const renderActions = (block, context) => {
  const root = element("div", "block action-block");
  block.actions.forEach((item, index) => {
    const button = editable(element("button", "action-button", item.label), `actions.${index}.label`);
    button.type = "button";
    button.addEventListener("click", () => context.action(item));
    root.append(button);
  });
  return root;
};

const renderSimulation = (block, context) => {
  const root = element("article", "block simulation-block");
  const value = context.getValue(block.id, block.value);
  const header = element("div", "simulation-header");
  header.append(editable(element("div", "eyebrow", block.label), "label"));
  const number = element("strong", "", value.toLocaleString());
  header.append(number);
  const range = element("input");
  range.type = "range";
  range.min = block.min;
  range.max = block.max;
  range.step = block.step;
  range.value = value;
  const chart = element("div", "complexity-chart");
  const standard = element("div", "bar standard");
  const linear = element("div", "bar linear");
  chart.append(standard, linear);
  const labels = element("div", "chart-labels");
  labels.innerHTML = "<span>标准注意力 O(n²)</span><span>线性注意力 O(n)</span>";
  const update = (next) => {
    const ratio = next / block.max;
    standard.style.setProperty("--bar", `${Math.max(7, ratio ** 2 * 100)}%`);
    linear.style.setProperty("--bar", `${Math.max(7, ratio * 100)}%`);
    number.textContent = Number(next).toLocaleString();
    context.setValue(block.id, Number(next));
  };
  range.addEventListener("input", (event) => update(event.target.value));
  update(value);
  root.append(header, range, chart, labels);
  return root;
};

const renderTrack = (block, context) => {
  const root = element("section", "block local-track");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const header = element("div", "track-header");
  header.append(editable(element("span", "track-label", block.label), "label"));
  const tabs = element("div", "segment-control");
  const modeButton = element("button", "mode-button");
  modeButton.type = "button";
  header.append(tabs, modeButton);
  const viewport = element("div", "track-viewport");
  let finishTransition = null;

  const buildPane = (item, compare) => {
    const pane = element("div", "track-pane");
    if (compare) pane.append(element("p", "pane-label", item.label));
    item.blocks.forEach((child) => {
      if (child.type === "track") throw new Error("局部 Track 内不允许继续嵌套 Track");
      pane.append(context.renderBlock(child, context));
    });
    return pane;
  };

  const paintControls = () => {
    const current = context.getTrackState(block.id);
    tabs.replaceChildren();
    block.items.forEach((item, index) => {
      const tab = editable(element("button", index === current.index ? "active" : "", item.label), `items.${index}.label`);
      tab.type = "button";
      tab.addEventListener("click", () => {
        context.activateTrack(block.id);
        selectIndex(index);
      });
      tabs.append(tab);
    });
    modeButton.textContent = current.compare ? "单页" : "并排";
    modeButton.title = current.compare ? "切回单页" : "并排比较";
  };

  const paint = () => {
    const current = context.getTrackState(block.id);
    paintControls();
    viewport.className = current.compare ? "track-viewport compare" : "track-viewport";
    const items = current.compare ? block.items : [block.items[current.index]];
    viewport.replaceChildren(...items.map((item) => buildPane(item, current.compare)));
  };

  const slideTo = (index, direction) => {
    finishTransition?.();
    const wasCompare = context.getTrackState(block.id).compare;
    const oldPane = viewport.firstElementChild;
    const newPane = buildPane(block.items[index], false);
    context.updateTrack(block.id, { index, compare: false });
    paintControls();
    context.persist();
    viewport.className = "track-viewport";
    if (wasCompare) {
      viewport.replaceChildren(newPane);
      newPane.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.fast, easing: "ease-out" });
      root.focus({ preventScroll: true });
      return;
    }
    if (!oldPane || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      viewport.replaceChildren(newPane);
      root.focus({ preventScroll: true });
      return;
    }

    const oldHeight = viewport.getBoundingClientRect().height;
    viewport.style.height = `${oldHeight}px`;
    oldPane.style.position = "absolute";
    oldPane.style.inset = "0";
    newPane.style.position = "absolute";
    newPane.style.inset = "0";
    viewport.append(newPane);
    viewport.style.height = `${Math.max(oldHeight, newPane.scrollHeight)}px`;
    const outgoing = oldPane.animate(
      [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-direction * 100}%)`, opacity: 0.4 }],
      { duration: MOTION.normal, easing: MOTION.easing },
    );
    const incoming = newPane.animate(
      [{ transform: `translateX(${direction * 100}%)`, opacity: 0.4 }, { transform: "translateX(0)", opacity: 1 }],
      { duration: MOTION.normal, easing: MOTION.easing },
    );
    let completed = false;
    finishTransition = () => {
      if (completed) return;
      completed = true;
      outgoing.cancel();
      incoming.cancel();
      newPane.removeAttribute("style");
      viewport.style.removeProperty("height");
      viewport.replaceChildren(newPane);
      finishTransition = null;
      root.focus({ preventScroll: true });
    };
    Promise.all([outgoing.finished, incoming.finished]).then(finishTransition).catch(() => {});
  };

  const selectIndex = (index) => {
    const current = context.getTrackState(block.id);
    if (index === current.index && !current.compare) return false;
    slideTo(index, Math.sign(index - current.index) || 1);
    return true;
  };

  root.trackNavigate = (direction) => {
    const current = context.getTrackState(block.id);
    if (current.compare) return false;
    const next = current.index + direction;
    if (next < 0 || next >= block.items.length) return false;
    return selectIndex(next);
  };
  modeButton.addEventListener("click", () => {
    context.activateTrack(block.id);
    finishTransition?.();
    const current = context.getTrackState(block.id);
    context.updateTrack(block.id, { compare: !current.compare });
    paint();
    context.persist();
    root.focus({ preventScroll: true });
  });
  paint();
  root.append(header, viewport);
  return root;
};

const sharedRenderers = {
  actions: renderActions,
  case: renderCase,
  comparison: renderComparison,
  formula: renderFormula,
  hero: renderHero,
  image: renderImage,
  matrix: renderMatrix,
  simulation: renderSimulation,
  text: renderText,
};

export function createBlockRegistry(pageRenderers = {}) {
  const renderers = { ...sharedRenderers, ...pageRenderers };
  const renderBlock = (block, context) => {
    const renderer = block.type === "track" ? renderTrack : renderers[block.type];
    if (!renderer) return element("div", "block component-error", `未知组件：${block.type}`);
    const node = renderer(block, { ...context, renderBlock });
    node.editorBlock = block;
    if (block._editorId) node.dataset.blockId = block._editorId;
    if (block.editor) {
      node.dataset.freeform = "true";
      node.style.setProperty("--editor-x", `${block.editor.x}%`);
      node.style.setProperty("--editor-y", `${block.editor.y}%`);
      node.style.setProperty("--editor-w", `${block.editor.w}%`);
      node.style.setProperty("--editor-h", `${block.editor.h}%`);
      node.style.setProperty("--editor-z", String(block.editor.z || 1));
    }
    node.dataset.blockType = block.type;
    return node;
  };
  return {
    renderBlock,
    componentTypes: new Set([...Object.keys(renderers), "track"]),
  };
}
