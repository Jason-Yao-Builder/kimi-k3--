import { validateDeck } from "./validate-deck.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clone = (value) => JSON.parse(JSON.stringify(value));
const pxToPercent = (value, total) => (total ? (value / total) * 100 : 0);
const editableTarget = (target) => target?.closest?.("[data-edit-field]");

const editorLabels = {
  actions: "操作组件",
  case: "案例组件",
  comparison: "比较组件",
  formula: "公式组件",
  hero: "主视觉组件",
  image: "图片组件",
  matrix: "矩阵组件",
  simulation: "模拟组件",
  text: "文本组件",
  track: "局部轨道",
};

export class EditorController {
  constructor(engine, refs) {
    this.engine = engine;
    this.refs = refs;
    this.active = false;
    this.selectedId = null;
    this.drag = null;
    this.history = [];
    this.historyIndex = -1;
    this.storageKey = `html-presentation-editor:${engine.deck.meta.id}:v2`;
    this.assignIds();
    this.restore();
    this.assignIds();
    this.history = [this.snapshot()];
    this.historyIndex = 0;
  }

  get currentSlide() {
    return this.engine.currentSlide;
  }

  bind() {
    this.refs.editMode.addEventListener("click", () => this.toggle());
    this.refs.undo.addEventListener("click", () => this.undo());
    this.refs.redo.addEventListener("click", () => this.redo());
    this.refs.addText.addEventListener("click", () => this.addText());
    this.refs.duplicate.addEventListener("click", () => this.duplicate());
    this.refs.resetLayout.addEventListener("click", () => this.resetLayout());
    this.refs.sendBackward.addEventListener("click", () => this.changeLayer(-1));
    this.refs.bringForward.addEventListener("click", () => this.changeLayer(1));
    this.refs.deleteBlock.addEventListener("click", () => this.deleteSelected());
    this.refs.stage.addEventListener("pointerdown", (event) => this.onPointerDown(event), true);
    this.refs.stage.addEventListener("click", (event) => this.onClick(event), true);
    this.refs.stage.addEventListener("dblclick", (event) => this.onDoubleClick(event), true);
    document.addEventListener("pointermove", (event) => this.onPointerMove(event));
    document.addEventListener("pointerup", (event) => this.onPointerUp(event));
    document.addEventListener("keydown", (event) => this.onKeyDown(event), true);
  }

  assignIds() {
    this.engine.deck.slides.forEach((slide) => {
      const visit = (block, path) => {
        block._editorId ||= `${slide.id}:${path}`;
        (block.items || []).forEach((item, itemIndex) => {
          (item.blocks || []).forEach((child, childIndex) => visit(child, `${path}.items.${itemIndex}.blocks.${childIndex}`));
        });
      };
      (slide.blocks || []).forEach((block, index) => visit(block, `blocks.${index}`));
    });
  }

  restore() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.deckId !== this.engine.deck.meta.id || !Array.isArray(saved.slides)) return;
      const candidate = { ...this.engine.deck, slides: saved.slides };
      if (validateDeck(candidate, this.engine.componentTypes).length) return;
      this.engine.deck.slides = saved.slides;
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  snapshot() {
    return JSON.stringify(this.engine.deck.slides);
  }

  persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        version: 1,
        deckId: this.engine.deck.meta.id,
        slides: this.engine.deck.slides,
      }));
      this.refs.editorSaveState.textContent = "已保存";
    } catch {
      this.refs.editorSaveState.textContent = "保存失败";
    }
  }

  pushHistory() {
    const next = this.snapshot();
    if (next === this.history[this.historyIndex]) return;
    this.history.splice(this.historyIndex + 1);
    this.history.push(next);
    this.historyIndex = this.history.length - 1;
    if (this.history.length > 80) {
      this.history.shift();
      this.historyIndex -= 1;
    }
    this.refs.editorSaveState.textContent = "未保存";
    this.persist();
    this.updateToolbar();
  }

  restoreHistory(index) {
    if (index < 0 || index >= this.history.length) return;
    this.engine.deck.slides = JSON.parse(this.history[index]);
    this.engine.slideMap = new Map(this.engine.deck.slides.map((slide) => [slide.id, slide]));
    this.historyIndex = index;
    this.assignIds();
    this.engine.render();
    this.persist();
  }

  undo() {
    if (this.active && this.historyIndex > 0) this.restoreHistory(this.historyIndex - 1);
  }

  redo() {
    if (this.active && this.historyIndex < this.history.length - 1) this.restoreHistory(this.historyIndex + 1);
  }

  toggle() {
    this.active = !this.active;
    if (this.active && this.engine.state.overview) {
      this.engine.state.overview = false;
      this.engine.render();
    }
    document.body.classList.toggle("edit-mode", this.active);
    this.refs.editMode.textContent = this.active ? "完成" : "编辑";
    this.refs.editMode.setAttribute("aria-pressed", String(this.active));
    this.refs.editToolbar.hidden = !this.active;
    this.refs.overviewButton.disabled = this.active;
    if (!this.active) this.selectedId = null;
    this.afterRender(this.refs.stage.querySelector(".slide"));
  }

  afterRender(article) {
    if (!article) return;
    article.dataset.editing = String(this.active);
    if (!this.active) return;
    const node = this.selectedNode();
    if (node) {
      this.decorateSelected(node);
      this.refs.editorSelection.textContent = editorLabels[node.dataset.blockType] || "元素";
    } else {
      this.selectedId = null;
    }
    this.updateToolbar();
  }

  updateToolbar() {
    const disabled = !this.active || !this.selectedId;
    [this.refs.duplicate, this.refs.resetLayout, this.refs.sendBackward, this.refs.bringForward, this.refs.deleteBlock]
      .forEach((button) => { button.disabled = disabled; });
    this.refs.undo.disabled = !this.active || this.historyIndex <= 0;
    this.refs.redo.disabled = !this.active || this.historyIndex >= this.history.length - 1;
    if (!this.active) this.refs.editorSelection.textContent = "播放模式";
    else if (!this.selectedId) this.refs.editorSelection.textContent = "未选择";
  }

  selectedNode() {
    if (!this.selectedId) return null;
    return [...this.refs.stage.querySelectorAll(".slide-body > [data-block-id]")]
      .find((node) => node.dataset.blockId === this.selectedId) || null;
  }

  decorateSelected(node) {
    node.classList.add("editor-selected");
    if (!node.querySelector(":scope > .editor-resize-handle")) {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "editor-resize-handle";
      handle.title = "拖动调整大小";
      handle.setAttribute("aria-label", "拖动调整大小");
      node.append(handle);
    }
  }

  findBlock(id, blocks = this.currentSlide?.blocks || []) {
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (block._editorId === id) return { block, blocks, index };
      for (const item of block.items || []) {
        const nested = this.findBlock(id, item.blocks || []);
        if (nested) return nested;
      }
    }
    return null;
  }

  setPath(target, path, value) {
    const parts = path.split(".");
    const key = parts.pop();
    let cursor = target;
    parts.forEach((part) => { cursor = cursor[part]; });
    cursor[key] = value;
  }

  selectNode(node) {
    if (!node) {
      this.selectedId = null;
      this.refs.stage.querySelectorAll(".editor-selected").forEach((item) => item.classList.remove("editor-selected"));
      this.afterRender(this.refs.stage.querySelector(".slide"));
      return;
    }
    this.selectedId = node.dataset.blockId;
    this.refs.editorSelection.textContent = editorLabels[node.dataset.blockType] || "元素";
    this.refs.stage.querySelectorAll(".editor-selected").forEach((item) => item.classList.remove("editor-selected"));
    this.decorateSelected(node);
    this.updateToolbar();
  }

  selectableNode(target) {
    const node = target?.closest?.(".slide-body > [data-block-id]");
    return node?.dataset.blockId ? node : null;
  }

  ensureGeometry(node, block) {
    if (block.editor) return block.editor;
    const body = node.closest(".slide-body");
    const bodyRect = body.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    block.editor = {
      x: clamp(pxToPercent(rect.left - bodyRect.left, bodyRect.width), 0, 100),
      y: clamp(pxToPercent(rect.top - bodyRect.top, bodyRect.height), 0, 100),
      w: clamp(pxToPercent(rect.width, bodyRect.width), 10, 100),
      h: clamp(pxToPercent(rect.height, bodyRect.height), 10, 100),
      z: 1,
    };
    block.editor.x = Math.min(block.editor.x, 100 - block.editor.w);
    block.editor.y = Math.min(block.editor.y, 100 - block.editor.h);
    this.applyGeometry(node, block.editor);
    return block.editor;
  }

  applyGeometry(node, geometry) {
    node.dataset.freeform = "true";
    node.style.setProperty("--editor-x", `${geometry.x}%`);
    node.style.setProperty("--editor-y", `${geometry.y}%`);
    node.style.setProperty("--editor-w", `${geometry.w}%`);
    node.style.setProperty("--editor-h", `${geometry.h}%`);
    node.style.setProperty("--editor-z", String(geometry.z || 1));
  }

  onClick(event) {
    if (!this.active) return;
    const target = event.target;
    event.stopPropagation();
    if (target.closest("button, input, select, textarea") && !target.closest(".editor-resize-handle")) {
      event.preventDefault();
      return;
    }
    const node = this.selectableNode(target);
    if (node) this.selectNode(node);
    else if (!editableTarget(target)) this.selectNode(null);
  }

  onDoubleClick(event) {
    if (!this.active) return;
    const field = editableTarget(event.target);
    if (!field) return;
    event.preventDefault();
    event.stopPropagation();
    this.beginTextEdit(field);
  }

  beginTextEdit(field) {
    if (field.isContentEditable) return;
    const node = field.closest("[data-block-id]");
    const block = node?.editorBlock;
    const slide = field.editorSlide;
    const before = this.snapshot();
    field.contentEditable = "true";
    field.classList.add("editor-text-active");
    field.focus({ preventScroll: true });
    const finish = (event) => {
      field.removeEventListener("blur", finish);
      field.removeEventListener("keydown", onKeyDown);
      field.contentEditable = "false";
      field.classList.remove("editor-text-active");
      if (event?.type === "keydown" && event.key === "Escape") {
        this.engine.deck.slides = JSON.parse(before);
        this.engine.slideMap = new Map(this.engine.deck.slides.map((item) => [item.id, item]));
        this.engine.render();
        return;
      }
      const value = field.textContent.trim();
      if (slide) slide.title = value || slide.title;
      else if (block) this.setPath(block, field.dataset.editField, value);
      this.pushHistory();
      this.engine.render();
    };
    const onKeyDown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        field.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finish(event);
      }
    };
    field.addEventListener("blur", finish);
    field.addEventListener("keydown", onKeyDown);
  }

  onPointerDown(event) {
    if (!this.active || event.button !== 0) return;
    const target = event.target;
    const node = this.selectableNode(target);
    if (!node) return;
    this.selectNode(node);
    if (target.closest(".editor-resize-handle")) {
      event.preventDefault();
      event.stopPropagation();
      this.startDrag(event, node, "resize");
      return;
    }
    if (target.closest("button, input, select, textarea") || editableTarget(target)) return;
    event.preventDefault();
    event.stopPropagation();
    this.startDrag(event, node, "move");
  }

  startDrag(event, node, mode) {
    const record = this.findBlock(node.dataset.blockId);
    if (!record) return;
    const body = node.closest(".slide-body");
    const bodyRect = body.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    this.drag = {
      mode,
      node,
      block: record.block,
      startX: event.clientX,
      startY: event.clientY,
      bodyRect,
      startGeometry: record.block.editor ? { ...record.block.editor } : null,
      startRect: rect,
      moved: false,
    };
  }

  onPointerMove(event) {
    const drag = this.drag;
    if (!drag || !this.active) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.startGeometry = { ...this.ensureGeometry(drag.node, drag.block) };
      drag.historyBefore = this.snapshot();
    }
    event.preventDefault();
    const geometry = drag.block.editor;
    const deltaX = pxToPercent(dx, drag.bodyRect.width);
    const deltaY = pxToPercent(dy, drag.bodyRect.height);
    if (drag.mode === "move") {
      geometry.x = clamp(drag.startGeometry.x + deltaX, 0, 100 - geometry.w);
      geometry.y = clamp(drag.startGeometry.y + deltaY, 0, 100 - geometry.h);
    } else {
      geometry.w = clamp(drag.startGeometry.w + deltaX, 10, 100 - geometry.x);
      geometry.h = clamp(drag.startGeometry.h + deltaY, 10, 100 - geometry.y);
    }
    this.applyGeometry(drag.node, geometry);
  }

  onPointerUp() {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (drag.moved) {
      this.pushHistory();
      this.decorateSelected(drag.node);
    }
  }

  addText() {
    if (!this.active || !this.currentSlide) return;
    const id = `${this.currentSlide.id}:text:${Date.now().toString(36)}`;
    const block = {
      _editorId: id,
      type: "text",
      eyebrow: "新增文本",
      heading: "双击编辑标题",
      body: "双击编辑这段内容，然后拖动边框调整位置。",
      editor: { x: 26, y: 28, w: 48, h: 25, z: 5 },
    };
    this.currentSlide.blocks.push(block);
    this.selectedId = id;
    this.pushHistory();
    this.engine.render();
  }

  duplicate() {
    const record = this.findBlock(this.selectedId);
    if (!this.active || !record || record.blocks !== this.currentSlide.blocks) return;
    const copy = clone(record.block);
    const stamp = Date.now().toString(36);
    const renewIds = (block, path) => {
      block._editorId = `${this.currentSlide.id}:copy:${stamp}:${path}`;
      (block.items || []).forEach((item, itemIndex) => {
        (item.blocks || []).forEach((child, childIndex) => renewIds(child, `${path}.${itemIndex}.${childIndex}`));
      });
    };
    renewIds(copy, "root");
    copy.editor = { ...(copy.editor || { x: 10, y: 10, w: 40, h: 30, z: 1 }) };
    copy.editor.x = Math.min(copy.editor.x + 3, 100 - copy.editor.w);
    copy.editor.y = Math.min(copy.editor.y + 3, 100 - copy.editor.h);
    record.blocks.splice(record.index + 1, 0, copy);
    this.selectedId = copy._editorId;
    this.pushHistory();
    this.engine.render();
  }

  resetLayout() {
    const record = this.findBlock(this.selectedId);
    if (!this.active || !record || !record.block.editor) return;
    delete record.block.editor;
    this.pushHistory();
    this.engine.render();
  }

  changeLayer(direction) {
    const record = this.findBlock(this.selectedId);
    const node = this.selectedNode();
    if (!this.active || !record || !node) return;
    const geometry = this.ensureGeometry(node, record.block);
    geometry.z = Math.max(1, (geometry.z || 1) + direction);
    this.pushHistory();
    this.engine.render();
  }

  deleteSelected() {
    const record = this.findBlock(this.selectedId);
    if (!this.active || !record || record.blocks !== this.currentSlide.blocks) return;
    record.blocks.splice(record.index, 1);
    this.selectedId = null;
    this.pushHistory();
    this.engine.render();
  }

  nudge(dx, dy) {
    const record = this.findBlock(this.selectedId);
    const node = this.selectedNode();
    if (!this.active || !record || !node) return;
    const geometry = this.ensureGeometry(node, record.block);
    geometry.x = clamp(geometry.x + dx, 0, 100 - geometry.w);
    geometry.y = clamp(geometry.y + dy, 0, 100 - geometry.h);
    this.applyGeometry(node, geometry);
    this.pushHistory();
  }

  onKeyDown(event) {
    if (!this.active) {
      if (event.key.toLowerCase() === "e" && !event.target.matches("input, textarea, [contenteditable='true']")) {
        event.preventDefault();
        this.toggle();
      }
      return;
    }
    if (event.target.matches("input, textarea, select, [contenteditable='true']")) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
      return;
    }
    if (mod && event.key.toLowerCase() === "y") {
      event.preventDefault();
      this.redo();
      return;
    }
    if (mod && event.key.toLowerCase() === "d") {
      event.preventDefault();
      this.duplicate();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.deleteSelected();
      return;
    }
    if (event.key === "Escape") {
      if (this.selectedId) this.selectNode(null);
      else this.toggle();
      return;
    }
    const step = event.shiftKey ? 2 : 0.5;
    if (event.key === "ArrowLeft") { event.preventDefault(); this.nudge(-step, 0); }
    if (event.key === "ArrowRight") { event.preventDefault(); this.nudge(step, 0); }
    if (event.key === "ArrowUp") { event.preventDefault(); this.nudge(0, -step); }
    if (event.key === "ArrowDown") { event.preventDefault(); this.nudge(0, step); }
  }
}
