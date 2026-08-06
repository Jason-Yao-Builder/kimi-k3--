import { renderPretrainingEvolution } from "./component.js?build=20260805-data28";

export const pretrainingEvolutionPage = {
  style: new URL("./styles.css?build=20260805-data28", import.meta.url).href,
  renderers: { "pretraining-evolution": renderPretrainingEvolution },
  slide: {
    id: "pretraining-evolution",
    section: "预训练",
    role: "3.1",
    title: "预训练演进：K1.5 → K2 → K2.5 → K3",
    layout: "pretraining-evolution",
    hierarchyHeader: true,
    path: [
      { number: "3", label: "预训练", target: "pretraining-evolution" },
      { number: "3.1", label: "四代演进", target: "pretraining-evolution", current: true },
    ],
    edges: [{ type: "next", target: "posttraining-evolution" }],
    blocks: [{
      type: "pretraining-evolution",
      id: "pretraining-evolution-lab",
      claims: [
        "K1.5 建立多维质量评分并首次训练长上下文，但视觉仍是追加式，优化效率开始触顶。",
        "K2 用 MuonClip 提升 token efficiency，用 rephrasing 让有限知识获得多种表面形式。",
        "K2.5 证明早期低比例视觉融合全面优于晚期高比例融合，联合预训练成为主线。",
        "K3 让视觉编码器从头接受 NTP，并把程序化多模态、Per-Head Muon 与 1M NoPE 合流。",
      ],
      source: "Kimi k1.5 Technical Report Appendix B；K2 Technical Report §2.1–§2.5；K2.5 Technical Report §4.2–§4.5；K3 Technical Report §3.1–§3.4",
    }],
  },
};
