export const SCORES = [
  [0.67, 0.50, 0.06, 0.49],
  [0.74, 0.87, 0.15, 0.11],
  [0.08, 0.73, 0.67, 0.51],
  [0.99, 0.57, 0.17, 0.53],
  [0.90, 0.33, 0.02, 0.74],
  [0.60, 0.72, 0.52, 0.19],
  [0.45, 0.32, 0.92, 0.20],
  [0.78, 0.45, 0.29, 0.09],
];

export const EXPERT_LABELS = ["E₁", "E₂", "E₃", "E₄"];
export const TARGET_LOAD = 2;

const argmax = (values) => values.reduce(
  (best, value, index) => (value > values[best] ? index : best),
  0,
);

export const calcAlpha = (scores) => scores.map((row) => (
  [...row].sort((a, b) => b - a)[1]
));

export const calcMargins = (scores, alpha) => scores.map((row, tokenIndex) => (
  row.map((score) => score - alpha[tokenIndex])
));

export const calcQBBiasDetails = (margins, q) => {
  const expertCount = margins[0].length;
  const raw = Array.from({ length: expertCount }, (_, expertIndex) => {
    const sorted = margins.map((row) => row[expertIndex]).sort((a, b) => b - a);
    return -sorted[q];
  });
  const mean = raw.reduce((sum, value) => sum + value, 0) / expertCount;
  return { raw, mean, biases: raw.map((value) => value - mean) };
};

export const calcQBBias = (margins, q) => calcQBBiasDetails(margins, q).biases;

export const calcNewRouting = (scores, biases = []) => scores.map((row) => (
  argmax(row.map((score, expertIndex) => score + (biases[expertIndex] || 0)))
));

export const calcLoads = (routing, expertCount = 4) => Array.from(
  { length: expertCount },
  (_, expertIndex) => routing.filter((value) => value === expertIndex).length,
);

export const calcMatchScore = (scores, routing) => routing.reduce(
  (sum, expertIndex, tokenIndex) => sum + scores[tokenIndex][expertIndex],
  0,
);

export const signSgdStep = (scores, biases, gamma, q) => {
  const currentRouting = calcNewRouting(scores, biases);
  const currentLoads = calcLoads(currentRouting, biases.length);
  const nextBiases = biases.map((bias, expertIndex) => (
    bias + gamma * Math.sign(q - currentLoads[expertIndex])
  ));
  const routing = calcNewRouting(scores, nextBiases);
  return { biases: nextBiases, routing, loads: calcLoads(routing, biases.length) };
};

export const imbalanceRatio = (loads, q = TARGET_LOAD) => Math.max(...loads) / q;

export const formatSigned = (value, digits = 2) => {
  const rounded = Math.abs(value) < 10 ** (-digits) / 2 ? 0 : value;
  return `${rounded >= 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
};
