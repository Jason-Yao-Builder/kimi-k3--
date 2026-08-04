import { renderResidualConnections } from "./component.js";

export const residualConnectionsPage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "residual-connections": renderResidualConnections },
  slide: {
    id: "residual-connections",
    section: "模型架构",
    role: "2.2",
    title: "残差连接：从 ResNet 到 Attention Residuals",
    layout: "residual-connections",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "residual-connections" },
      { number: "2.2", label: "残差连接", target: "residual-connections", current: true },
    ],
    edges: [],
    blocks: [{
      type: "residual-connections",
      id: "residual-connections-lab",
      claims: [
        "ResNet（He et al., 2016）：深层网络存在梯度消失与 degradation 问题；xₗ₊₁ = F(xₗ) + xₗ 保障梯度流，但第 l 层只能看到 l-1 层的聚合状态。",
        "DenseNet（Huang et al., 2017）：将 skip connection 推至极端，每层 concat 所有前层输出，实现特征复用；代价是 channel 线性增长，显存与计算随之成为瓶颈。",
        "Attention Residuals（Kimi K3）：把 residual stream 从固定累加器改为可学习的深度检索器，用 pseudo-query 对历史层表示做 softmax 加权读取。",
      ],
      source: "He et al. CVPR 2016；Huang et al. CVPR 2017；Kimi K3 Technical Report §2.2",
    }],
  },
};
