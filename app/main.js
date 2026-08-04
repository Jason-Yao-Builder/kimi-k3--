import { deck, pageRenderers, pageStyles } from "../deck.js?build=20260805-post34";
import { PresentationEngine } from "../core/engine/presentation-engine.js?build=20260804-scrollguard";
import { validateDeck } from "../core/engine/validate-deck.js";
import { createBlockRegistry } from "../shared/components/registry.js";
import { initAppearanceController } from "./appearance-controller.js";

const stageElement = document.querySelector("#stage");

const syncPresentationScale = () => {
  const scale = Math.min(1, stageElement.clientWidth / 1280);
  stageElement.style.setProperty("--presentation-scale", scale.toFixed(5));
};

new ResizeObserver(syncPresentationScale).observe(stageElement);
syncPresentationScale();

initAppearanceController({
  control: document.querySelector("#appearance-control"),
  button: document.querySelector("#appearance-button"),
  panel: document.querySelector("#appearance-panel"),
  themeColor: document.querySelector('meta[name="theme-color"]'),
});

pageStyles.forEach((href) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
});

const blockRegistry = createBlockRegistry(pageRenderers);
const errors = validateDeck(deck, blockRegistry.componentTypes);
if (errors.length) {
  document.querySelector("#stage").innerHTML = `
    <article class="fatal-error">
      <h1>演示协议校验失败</h1>
      <pre>${errors.join("\n")}</pre>
    </article>
  `;
  throw new Error(errors.join("\n"));
}

document.title = deck.meta.title;

const engine = new PresentationEngine(deck, {
  stage: stageElement,
  stageWrap: document.querySelector("#stage-wrap"),
  nav: document.querySelector("#slide-nav"),
  filters: document.querySelector("#filter-list"),
  prev: document.querySelector("#prev-button"),
  next: document.querySelector("#next-button"),
  progress: document.querySelector("#progress-bar"),
  count: document.querySelector("#page-count"),
  crumb: document.querySelector("#breadcrumb"),
  overview: document.querySelector("#overview"),
  overviewButton: document.querySelector("#overview-button"),
  editMode: document.querySelector("#edit-mode-button"),
  editToolbar: document.querySelector("#edit-toolbar"),
  undo: document.querySelector("#undo-button"),
  redo: document.querySelector("#redo-button"),
  addText: document.querySelector("#add-text-button"),
  duplicate: document.querySelector("#duplicate-button"),
  resetLayout: document.querySelector("#reset-layout-button"),
  sendBackward: document.querySelector("#send-backward-button"),
  bringForward: document.querySelector("#bring-forward-button"),
  deleteBlock: document.querySelector("#delete-button"),
  editorSelection: document.querySelector("#editor-selection-label"),
  editorSaveState: document.querySelector("#editor-save-state"),
  fullscreen: document.querySelector("#fullscreen-button"),
  menu: document.querySelector("#menu-button"),
  backdrop: document.querySelector("#zoom-backdrop"),
}, blockRegistry);

engine.init();
