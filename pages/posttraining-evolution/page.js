import { renderPosttrainingEvolution } from "./component.js?build=20260804-post26";

export const posttrainingEvolutionPage = {
  style: new URL("./styles.css?build=20260804-post26", import.meta.url).href,
  renderers: { "posttraining-evolution": renderPosttrainingEvolution },
  slide: {
    id: "posttraining-evolution",
    section: "后训练",
    role: "4.1",
    title: "后训练演进：K1.5 → K2 → K2.5 → K3",
    layout: "posttraining-evolution",
    hierarchyHeader: true,
    tags: ["posttraining", "evolution"],
    edges: [],
    path: [
      { number: "4", label: "后训练", target: "posttraining-evolution" },
      { number: "4.1", label: "四代演进", target: "posttraining-evolution", current: true },
    ],
    blocks: [{
      id: "posttraining-evolution-lab",
      type: "posttraining-evolution",
      claims: [
        "K1.5 建立长链 RL 范式：不用 value network，让最终正确的探索—纠错链整体获得奖励。",
        "K2 把后训练扩到工具与主观任务，用合成环境和 Self-Critique 补齐稀缺 reward。",
        "K2.5 联合文本与视觉 RL，并用 Per-token Clip、Toggle 修正长轨迹和长度过拟合。",
        "K3 将三域×三强度训练成九位教师，再通过 MOPD 蒸馏回一个可部署模型。",
      ],
      source: "Kimi K1.5 Technical Report §2；K2 §4–§5；K2.5 §3–§4；K3 §4",
    }],
  },
};
