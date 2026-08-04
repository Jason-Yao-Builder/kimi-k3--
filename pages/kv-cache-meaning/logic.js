export const triangular = (value) => (value * (value + 1)) / 2;

export const noCacheTotal = (prefix, step) => {
  let total = 0;
  for (let index = 1; index <= step; index += 1) total += triangular(prefix + index);
  return total;
};

export const cacheTotal = (prefix, step) => step * prefix + (step * (step + 1)) / 2;

export const normalizedToken = (token) => token.toLowerCase().replace(/[^a-z]/g, "");
