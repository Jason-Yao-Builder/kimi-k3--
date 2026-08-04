export const ARCH_PARAMS = {
  d: 7168,
  l: 3584,
  m: 3072,
  N: 896,
  K: 16,
  sharedExperts: 2,
};

export const calcActivatedWeights = () => {
  const { d, l, m, K, sharedExperts } = ARCH_PARAMS;
  const wDown = d * l;
  const routedExperts = K * 3 * l * m;
  const wUp = l * d;
  const shared = sharedExperts * 3 * d * m;
  return {
    wDown,
    routedExperts,
    wUp,
    shared,
    total: wDown + routedExperts + wUp + shared,
  };
};

export const calcSituGlu = (a, b, beta1 = 4, beta2 = 25) => {
  const sigmoid = 1 / (1 + Math.exp(-a));
  return beta1 * Math.tanh(a / beta1) * sigmoid * beta2 * Math.tanh(b / beta2);
};

export const QB_EXAMPLE = {
  scores: [
    [0.67, 0.50, 0.06, 0.49],
    [0.74, 0.87, 0.15, 0.11],
    [0.08, 0.73, 0.67, 0.51],
    [0.99, 0.57, 0.17, 0.53],
  ],
  biases: [-0.14, -0.03, 0.11, 0.07],
  before: [4, 3, 1, 0],
  after: [2, 2, 2, 2],
};

export const formatMillions = (value) => `${(value / 1e6).toFixed(1)}M`;
