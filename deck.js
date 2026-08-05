import { kvCacheMeaningPage } from "./pages/kv-cache-meaning/page.js";
import { kvCacheCostPage } from "./pages/kv-cache-cost/page.js";
import { kvCacheSolutionsPage } from "./pages/kv-cache-solutions/page.js?build=20260803-arch2";
import { architectureEvolutionPage } from "./pages/architecture-evolution/page.js?build=20260803-architecture-cleanup";
import { gatedMlaPage } from "./pages/gated-mla/page.js?build=20260804-nope-spacing-4";
import { latentMoePage } from "./pages/latent-moe/page.js";
import { pretrainingEvolutionPage } from "./pages/pretraining-evolution/page.js?build=20260805-data29";
import { posttrainingEvolutionPage } from "./pages/posttraining-evolution/page.js?build=20260805-post34";
import { kdaMechanismPage } from "./pages/kda-mechanism/page.js?build=20260804-kda-query-arrow";
import { residualConnectionsPage } from "./pages/residual-connections/page.js";
import { quantileBalancingPage } from "./pages/quantile-balancing/page.js";

export const pages = [kvCacheMeaningPage, kvCacheCostPage, kvCacheSolutionsPage, architectureEvolutionPage, gatedMlaPage, kdaMechanismPage, residualConnectionsPage, latentMoePage, quantileBalancingPage, pretrainingEvolutionPage, posttrainingEvolutionPage];

const navigation = {
  "kv-cache": ["架构", "KV Cache 的意义", "01"],
  "kv-cache-cost": ["架构", "KV Cache 的代价", "02"],
  "kv-cache-solutions": ["架构", "KV Cache 膨胀的解决方案", "03"],
  "architecture-evolution": ["架构", "四代架构演进", "04"],
  "gated-mla": ["架构", "K3 解法：MLA", "05"],
  "kda-mechanism": ["架构", "K3 解法：KDA", "06"],
  "residual-connections": ["架构", "残差连接", "07"],
  "latent-moe": ["架构", "Stable LatentMoE", "08"],
  "quantile-balancing": ["架构", "QB", "09"],
  "pretraining-evolution": ["预训练", "四代预训练演进", "10"],
  "posttraining-evolution": ["后训练", "四代后训练演进", "11"],
};

export const deck = {
  meta: {
    id: "kimi-k3-kv-cache-test",
    title: "Kimi K3 · KV Cache",
    subtitle: "模型架构 / KDA / KV Cache",
  },
  filters: [],
  slides: pages.map((page) => {
    const [navSection, navTitle, navLabel] = navigation[page.slide.id];
    return { ...page.slide, navSection, navTitle, navLabel };
  }),
};

export const pageRenderers = Object.assign({}, ...pages.map((page) => page.renderers));
export const pageStyles = [...new Set(pages.map((page) => page.style))];
