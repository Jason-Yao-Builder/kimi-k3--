export const calcRetention = (alpha, steps) => alpha ** steps * 100;

export const calcEffectiveWindow = (alpha, threshold = 0.2) => Math.ceil(
  Math.log(threshold) / Math.log(alpha),
);

export const blendToGray = (color, times) => {
  const amount = Math.min(1, Math.max(0, times * 0.15));
  return `color-mix(in srgb, ${color} ${(1 - amount) * 100}%, var(--muted))`;
};

export const applyErase = (cells, kRows, beta) => cells.map((cell, index) => (
  kRows.includes(Math.floor(index / 6)) ? { ...cell, opacity: cell.opacity * (1 - beta) } : { ...cell }
));

export const applyWrite = (cells, kRows, color, beta) => cells.map((cell, index) => (
  kRows.includes(Math.floor(index / 6)) ? { color, opacity: Math.max(cell.opacity, beta) } : { ...cell }
));

export const buildStepCells = (step, beta = 0.8) => {
  let cells = Array.from({ length: 36 }, () => ({ color: "var(--line)", opacity: 0.3 }));
  cells = applyWrite(cells, [0, 1], "var(--blue)", 0.72);
  cells = cells.map((cell, index) => Math.floor(index / 6) >= 2 && Math.floor(index / 6) <= 3 && index % 6 >= 2 && index % 6 <= 3
    ? { color: "var(--green)", opacity: 0.72 } : cell);
  cells = cells.map((cell, index) => Math.floor(index / 6) >= 4 && index % 6 >= 4
    ? { color: "var(--accent)", opacity: 0.68 } : cell);
  if (step === 2) cells = cells.map((cell, index) => index < 18 ? { ...cell, color: blendToGray(cell.color, 3) } : cell);
  if (step >= 3) cells = applyWrite(applyErase(cells, [0, 1], beta), [0, 1], "var(--blue)", beta);
  return cells;
};

export const TOKEN_ALPHA_PROFILES = {
  definition: [0.9998, 0.9995, 0.9992, 0.9997, 0.9989, 0.9996, 0.9991, 0.9994, 0.9988, 0.9997, 0.9993, 0.9996, 0.999, 0.9995, 0.9992, 0.9998],
  verb: [0.971, 0.982, 0.995, 0.978, 0.988, 0.999, 0.974, 0.992, 0.981, 0.997, 0.986, 0.976, 0.994, 0.989, 0.979, 0.996],
  punctuation: [0.92, 0.934, 0.946, 0.925, 0.939, 0.95, 0.928, 0.943, 0.932, 0.948, 0.923, 0.937, 0.944, 0.929, 0.941, 0.935],
};
