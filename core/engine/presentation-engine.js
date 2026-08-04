import { EditorController } from "./editor-controller.js";

const create = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export class PresentationEngine {
  constructor(deck, refs, blockRegistry) {
    this.deck = deck;
    this.refs = refs;
    this.renderBlock = blockRegistry.renderBlock;
    this.componentTypes = blockRegistry.componentTypes;
    this.editor = new EditorController(this, refs);
    this.slideMap = new Map(deck.slides.map((slide) => [slide.id, slide]));
    this.state = {
      activeId: deck.slides.find((slide) => !slide.detour).id,
      hiddenTags: new Set(),
      tracks: new Map(),
      values: new Map(),
      returnStack: [],
      overview: false,
      activeTrack: null,
    };
    this.lastDirection = 1;
    this.pointer = null;
    this.restoreFromUrl();
  }

  get visibleSlides() {
    return this.mainRoute.filter((slide) => {
      return !(slide.tags || []).some((tag) => this.state.hiddenTags.has(tag));
    });
  }

  get mainRoute() {
    const route = [];
    const seen = new Set();
    let slide = this.deck.slides.find((item) => !item.detour);
    while (slide && !seen.has(slide.id)) {
      route.push(slide);
      seen.add(slide.id);
      const next = (slide.edges || []).find((edge) => edge.type === "next");
      slide = next ? this.slideMap.get(next.target) : null;
    }
    return route;
  }

  get currentSlide() {
    return this.slideMap.get(this.state.activeId);
  }

  init() {
    this.bindShell();
    this.render();
  }

  bindShell() {
    this.editor.bind();
    this.refs.prev.addEventListener("click", () => this.navigate(-1));
    this.refs.next.addEventListener("click", () => this.navigate(1));
    this.refs.overviewButton.addEventListener("click", () => this.toggleOverview());
    this.refs.fullscreen.addEventListener("click", () => this.toggleFullscreen());
    this.refs.menu.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    this.refs.backdrop.addEventListener("click", () => this.closeZoom());
    this.refs.stageWrap.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
    this.refs.stageWrap.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.refs.stageWrap.addEventListener("pointerup", (event) => this.onPointerUp(event));
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("hashchange", () => {
      this.state.hiddenTags.clear();
      this.state.tracks.clear();
      this.state.values.clear();
      this.state.activeTrack = null;
      this.restoreFromUrl();
      this.render();
    });
  }

  navigate(direction) {
    const slides = this.visibleSlides;
    const index = slides.findIndex((slide) => slide.id === this.state.activeId);
    if (index === -1 && this.currentSlide?.detour) {
      if (direction > 0) this.returnFromBranch();
      return;
    }
    const next = slides[index + direction];
    if (!next) return;
    this.lastDirection = direction;
    this.state.activeTrack = null;
    this.state.activeId = next.id;
    this.render();
  }

  goto(id, direction = 1) {
    if (!this.slideMap.has(id)) return;
    this.lastDirection = direction;
    this.state.activeTrack = null;
    this.state.activeId = id;
    this.state.overview = false;
    document.body.classList.remove("sidebar-open");
    this.render();
  }

  branch(target) {
    this.state.returnStack.push(this.state.activeId);
    this.goto(target, 1);
  }

  returnFromBranch() {
    const target = this.state.returnStack.pop() || this.visibleSlides[0].id;
    this.goto(target, -1);
  }

  action(item) {
    if (item.action === "branch") this.branch(item.target);
    if (item.action === "return") this.returnFromBranch();
  }

  trackKey(id) {
    return `${this.state.activeId}:${id}`;
  }

  getTrackState(id) {
    return this.state.tracks.get(this.trackKey(id)) || { index: 0, compare: false };
  }

  updateTrack(id, patch) {
    const key = this.trackKey(id);
    this.state.tracks.set(key, { ...this.getTrackState(id), ...patch });
  }

  activateTrack(id) {
    this.state.activeTrack = { slideId: this.state.activeId, id };
    this.updateTrackActivation();
    this.persistUrl();
  }

  clearActiveTrack() {
    this.state.activeTrack = null;
    this.updateTrackActivation();
    this.persistUrl();
  }

  activeTrackNode() {
    const active = this.state.activeTrack;
    if (!active || active.slideId !== this.state.activeId) return null;
    return this.refs.stage.querySelector(`[data-track="${CSS.escape(active.id)}"]`);
  }

  updateTrackActivation() {
    this.refs.stage.querySelectorAll("[data-track]").forEach((track) => {
      const active = this.state.activeTrack;
      track.dataset.keyActive = String(
        active?.slideId === this.state.activeId && active.id === track.dataset.track,
      );
    });
  }

  restoreTrackFocus() {
    this.updateTrackActivation();
    const track = this.activeTrackNode();
    if (track) requestAnimationFrame(() => track.focus({ preventScroll: true }));
  }

  getValue(id, fallback) {
    return this.state.values.get(this.trackKey(id)) ?? fallback;
  }

  setValue(id, value) {
    this.state.values.set(this.trackKey(id), value);
  }

  componentContext() {
    return {
      action: (item) => this.action(item),
      getTrackState: (id) => this.getTrackState(id),
      updateTrack: (id, patch) => this.updateTrack(id, patch),
      getValue: (id, fallback) => this.getValue(id, fallback),
      setValue: (id, value) => this.setValue(id, value),
      toggleZoom: (node) => this.toggleZoom(node),
      activateTrack: (id) => this.activateTrack(id),
      persist: () => this.persistUrl(),
      refresh: () => this.render(),
    };
  }

  render() {
    this.closeZoom();
    const slide = this.currentSlide;
    const article = create("article", `slide slide-${slide.layout}`);
    article.dataset.slideId = slide.id;
    article.classList.add(this.lastDirection > 0 ? "enter-forward" : "enter-backward");
    const header = create("header", "slide-header");
    if (slide.hierarchyHeader && slide.path?.length) {
      header.classList.add("hierarchy-header");
      const hierarchy = create("div", "slide-heading-hierarchy");
      slide.path.forEach((item, index) => {
        if (index) hierarchy.append(create("span", "hierarchy-separator", "—"));
        const node = create("div", "hierarchy-item");
        node.dataset.current = String(Boolean(item.current));
        node.append(create("small", "", item.number));
        const label = item.current ? slide.title : item.label;
        const heading = create(item.current ? "h1" : "strong", "", label);
        if (item.current) {
          heading.dataset.editField = "title";
          heading.editorSlide = slide;
        }
        node.append(heading);
        hierarchy.append(node);
      });
      header.append(hierarchy);
    } else {
      const meta = create("div");
      meta.append(
        create("span", "role-label", slide.role),
        create("span", "section-name", slide.section),
      );
      const title = create("h1", "", slide.title);
      title.dataset.editField = "title";
      title.editorSlide = slide;
      header.append(meta, title);
    }
    const body = create("div", "slide-body");
    slide.blocks.forEach((block) => body.append(this.renderBlock(block, this.componentContext())));
    article.append(header, body);
    this.refs.stage.replaceChildren(article);
    this.renderSidebar();
    this.renderFilters();
    this.renderPlayer();
    this.renderOverview();
    this.persistUrl();
    this.restoreTrackFocus();
    this.editor.afterRender(article);
  }

  renderSidebar() {
    this.refs.nav.replaceChildren();
    let lastSection = "";
    const navigationSlides = [...this.mainRoute, ...this.deck.slides.filter((slide) => slide.detour)];
    navigationSlides.forEach((slide) => {
      if (slide.section !== lastSection) {
        this.refs.nav.append(create("p", "nav-section", slide.section));
        lastSection = slide.section;
      }
      const hidden = (slide.tags || []).some((tag) => this.state.hiddenTags.has(tag));
      const button = create("button", "nav-item");
      button.type = "button";
      button.dataset.active = String(slide.id === this.state.activeId);
      button.dataset.hidden = String(hidden);
      button.innerHTML = `<span></span><strong>${slide.title}</strong><small>${slide.role}</small>`;
      button.title = hidden ? "已从主路径隐藏，仍可手动查看" : slide.title;
      button.addEventListener("click", () => this.goto(slide.id));
      this.refs.nav.append(button);
    });
  }

  renderFilters() {
    this.refs.filters.replaceChildren();
    this.deck.filters.forEach((filter) => {
      const label = create("label", "filter-control");
      const input = create("input");
      input.type = "checkbox";
      input.checked = !this.state.hiddenTags.has(filter.tag);
      const track = create("span", "toggle-track");
      label.append(input, track, create("span", "", filter.label));
      input.addEventListener("change", () => {
        if (input.checked) this.state.hiddenTags.delete(filter.tag);
        else this.state.hiddenTags.add(filter.tag);
        if (!this.visibleSlides.some((slide) => slide.id === this.state.activeId) && !this.currentSlide.detour) {
          this.state.activeId = this.visibleSlides[0].id;
        }
        this.render();
      });
      this.refs.filters.append(label);
    });
  }

  renderPlayer() {
    const slides = this.visibleSlides;
    const index = slides.findIndex((slide) => slide.id === this.state.activeId);
    const displayIndex = index < 0 ? "补充" : String(index + 1).padStart(2, "0");
    this.refs.count.textContent = `${displayIndex} / ${String(slides.length).padStart(2, "0")}`;
    const progress = index < 0 ? 0 : ((index + 1) / slides.length) * 100;
    this.refs.progress.style.width = `${progress}%`;
    this.refs.crumb.replaceChildren();
    const path = this.currentSlide.path || [];
    if (path.length) {
      path.forEach((item, pathIndex) => {
        if (pathIndex) this.refs.crumb.append(create("span", "crumb-separator", "/"));
        const node = create(item.current ? "span" : "button", "crumb-node", `${item.number} ${item.label}`);
        node.dataset.current = String(Boolean(item.current));
        if (!item.current) {
          node.type = "button";
          node.addEventListener("click", () => this.goto(item.target));
        }
        this.refs.crumb.append(node);
      });
    } else {
      this.refs.crumb.textContent = `${this.currentSlide.section} / ${this.currentSlide.role}`;
    }
    this.refs.prev.disabled = index <= 0;
    this.refs.next.disabled = index === slides.length - 1 && !this.currentSlide.detour;
  }

  renderOverview() {
    this.refs.overview.hidden = !this.state.overview;
    this.refs.stage.hidden = this.state.overview;
    if (!this.state.overview) return;
    this.refs.overview.replaceChildren();
    this.visibleSlides.forEach((slide, index) => {
      const button = create("button", "overview-card");
      button.type = "button";
      button.append(
        create("span", "", String(index + 1).padStart(2, "0")),
        create("small", "", slide.role),
        create("strong", "", slide.title),
      );
      button.addEventListener("click", () => this.goto(slide.id));
      this.refs.overview.append(button);
    });
  }

  toggleOverview() {
    this.state.overview = !this.state.overview;
    this.refs.overviewButton.textContent = this.state.overview ? "返回演示" : "总览";
    this.render();
  }

  async toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  toggleZoom(node) {
    if (node.classList.contains("is-zoomed")) {
      this.closeZoom();
      return;
    }
    this.closeZoom();
    node.classList.add("is-zoomed");
    this.refs.backdrop.hidden = false;
    document.body.classList.add("zoom-active");
  }

  closeZoom() {
    document.querySelector(".is-zoomed")?.classList.remove("is-zoomed");
    this.refs.backdrop.hidden = true;
    document.body.classList.remove("zoom-active");
  }

  tryTrackNavigate(track, direction) {
    return Boolean(track?.trackNavigate?.(direction));
  }

  onWheel(event) {
    if (this.editor.active) return;
    if (this.state.overview || document.body.classList.contains("zoom-active")) return;
    if (event.target.matches("input, button") || event.target.closest("button")) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const track = event.target.closest("[data-track]");
    if (horizontal) {
      event.preventDefault();
      if (track) this.tryTrackNavigate(track, Math.sign(event.deltaX));
      return;
    }
    if (Math.abs(event.deltaY) < 18) return;
    event.preventDefault();
    const now = performance.now();
    if (now - (this.lastWheelAt || 0) < 650) return;
    this.lastWheelAt = now;
    this.navigate(Math.sign(event.deltaY));
  }

  onPointerDown(event) {
    if (this.editor.active) return;
    if (event.target.closest("input, button, select, textarea, label")) {
      this.pointer = null;
      return;
    }
    const track = event.target.closest("[data-track]");
    if (track) this.activateTrack(track.dataset.track);
    else this.clearActiveTrack();
    this.pointer = {
      x: event.clientX,
      y: event.clientY,
      track,
    };
  }

  onPointerUp(event) {
    if (this.editor.active) return;
    if (!this.pointer) return;
    const dx = event.clientX - this.pointer.x;
    const dy = event.clientY - this.pointer.y;
    const track = this.pointer.track;
    this.pointer = null;
    if (Math.abs(dx) < 55 && Math.abs(dy) < 55) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      const direction = dx < 0 ? 1 : -1;
      if (track) this.tryTrackNavigate(track, direction);
    } else {
      this.navigate(dy < 0 ? 1 : -1);
    }
  }

  onKeyDown(event) {
    if (this.editor.active) return;
    if (event.key === "Escape") {
      if (document.body.classList.contains("zoom-active")) this.closeZoom();
      else if (this.state.overview) this.toggleOverview();
      return;
    }
    if (event.target.matches("input, textarea, select")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      this.tryTrackNavigate(this.activeTrackNode(), direction);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.navigate(-1);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.navigate(1);
    }
    if (event.key.toLowerCase() === "o") this.toggleOverview();
  }

  persistUrl() {
    const params = new URLSearchParams();
    params.set("slide", this.state.activeId);
    if (this.state.hiddenTags.size) params.set("hide", [...this.state.hiddenTags].join(","));
    const trackState = [...this.state.tracks.entries()]
      .map(([key, value]) => `${key}:${value.index}:${value.compare ? 1 : 0}`)
      .join("|");
    if (trackState) params.set("tracks", trackState);
    if (this.state.activeTrack) {
      params.set("activeTrack", `${this.state.activeTrack.slideId}:${this.state.activeTrack.id}`);
    }
    if (this.state.values.size) {
      params.set("values", JSON.stringify(Object.fromEntries(this.state.values)));
    }
    history.replaceState(null, "", `#${params.toString()}`);
  }

  restoreFromUrl() {
    const params = new URLSearchParams(location.hash.slice(1));
    const slide = params.get("slide");
    if (slide && this.slideMap.has(slide)) this.state.activeId = slide;
    const hidden = params.get("hide");
    if (hidden) hidden.split(",").filter(Boolean).forEach((tag) => this.state.hiddenTags.add(tag));
    const tracks = params.get("tracks");
    if (tracks) {
      tracks.split("|").forEach((entry) => {
        const parts = entry.split(":");
        const compare = parts.pop() === "1";
        const index = Number(parts.pop());
        this.state.tracks.set(parts.join(":"), { index, compare });
      });
    }
    const values = params.get("values");
    if (values) {
      try {
        const restored = JSON.parse(values);
        Object.entries(restored).forEach(([key, value]) => this.state.values.set(key, value));
      } catch {
        // Ignore malformed state in a manually edited URL.
      }
    }
    const activeTrack = params.get("activeTrack");
    if (activeTrack) {
      const divider = activeTrack.indexOf(":");
      const slideId = activeTrack.slice(0, divider);
      const id = activeTrack.slice(divider + 1);
      if (divider > 0 && this.slideMap.has(slideId)) this.state.activeTrack = { slideId, id };
    }
  }
}
