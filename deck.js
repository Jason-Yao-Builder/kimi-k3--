import { kvCacheMeaningPage } from "./pages/kv-cache-meaning/page.js";
import { kvCacheMemoryPage } from "./pages/kv-cache-memory/page.js";
import { kvCacheCostPage } from "./pages/kv-cache-cost/page.js";
import { kvCacheSolutionsPage } from "./pages/kv-cache-solutions/page.js";
import { gatedMlaPage } from "./pages/gated-mla/page.js?build=20260731-2";
import { latentMoePage } from "./pages/latent-moe/page.js";
import { kdaMechanismPage } from "./pages/kda-mechanism/page.js";
import { residualConnectionsPage } from "./pages/residual-connections/page.js";

export const pages = [kvCacheMemoryPage, kvCacheMeaningPage, kvCacheCostPage, kvCacheSolutionsPage, gatedMlaPage, latentMoePage, kdaMechanismPage, residualConnectionsPage];

export const deck = {
  meta: {
    id: "kimi-k3-kv-cache-test",
    title: "Kimi K3 · KV Cache",
    subtitle: "模型架构 / KDA / KV Cache",
  },
  filters: [],
  slides: pages.map((page) => page.slide),
};

export const pageRenderers = Object.assign({}, ...pages.map((page) => page.renderers));
export const pageStyles = [...new Set(pages.map((page) => page.style))];
