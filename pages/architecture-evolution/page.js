import { renderArchitectureEvolution } from "./component.js?build=20260803-architecture-cleanup";
import { CLAIMS, SOURCE } from "./logic.js";

export const architectureEvolutionPage = {
  style: new URL("./styles.css?build=20260803-attention-mla", import.meta.url).href,
  renderers: { "architecture-evolution": renderArchitectureEvolution },
  slide: {
    id: "architecture-evolution",
    section: "模型架构",
    role: "2.1",
    title: "四代架构演进：从 k1.5 到 Kimi K3",
    layout: "architecture-evolution",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "architecture-evolution" },
      { number: "2.1", label: "四代架构演进", target: "architecture-evolution", current: true },
    ],
    edges: [{ type: "next", target: "gated-mla" }],
    blocks: [{
      type: "architecture-evolution",
      id: "architecture-evolution-lab",
      claims: CLAIMS,
      source: SOURCE,
    }],
  },
};
