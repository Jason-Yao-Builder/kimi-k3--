// logic.js — residual-connections page

// ─── ResNet gradient math ────────────────────────────────────────────────────
// The top loss gradient is the shared control variable in both comparisons.
export const vanillaGrad = (topLoss, layer, totalLayers, factor = 0.25) =>
  topLoss * Math.pow(factor, totalLayers - layer - 1);

// ResNet: each step multiplies by (∂F/∂x + 1) instead of just ∂F/∂x
// Even when ∂F/∂x → 0, the +1 identity path keeps gradient alive
export const resnetGrad = (topLoss, layer, totalLayers, factor = 0.25) => {
  let g = topLoss;
  for (let i = totalLayers - 2; i >= layer; i--) g *= factor + 1;
  return g;
};

export const sigmoid = (value) => 1 / (1 + Math.exp(-value));
export const sigmoidDerivative = (value) => {
  const activation = sigmoid(value);
  return activation * (1 - activation);
};

export const TOTAL_LAYERS = 3;
export const LAYER_LABELS = ["第 1 层（浅层）", "第 2 层", "第 3 层（顶层）"];

// ─── DenseNet ────────────────────────────────────────────────────────────────
// x0 is the initial feature map (c0); every later x_l contributes k new channels.
export const denseInputChannels = (layer, c0, k) => c0 + k * Math.max(0, layer - 1);
export const denseOutputChannels = (layer, c0, k) => layer === 0 ? c0 : k;

// All (src→dest) connections in a dense block of size n
export const denseConnections = (n) => {
  const conns = [];
  for (let dest = 1; dest < n; dest++)
    for (let src = 0; src < dest; src++) conns.push({ src, dest });
  return conns;
};

// ─── Attention Residuals ─────────────────────────────────────────────────────
export const softmaxWeights = (logits) => {
  const mx = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - mx));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
};

// 4 historical candidates; emphasis (0-3) boosts one to show dynamic routing
export const attnResWeights = (emphasis) => {
  const base = [-1.2, 0.8, 1.4, 0.2];
  return softmaxWeights(base.map((v, i) => v + (i === emphasis ? 2.2 : 0)));
};

export const ATTNRES_LABELS = ["Embedding b₀=h₁", "Block 1 b₁", "Block 4 b₄", "Block 8 b₈"];
