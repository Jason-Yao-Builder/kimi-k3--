const LAYERS = 93;
const HEADS = 96;
const HEAD_DIMENSION = 128;
const KV_TENSORS = 2;
const BF16_BYTES = 2;
const HBM_BANDWIDTH_GBS = 3350;
const CAPACITY_GB = 640;

export const calcKvStats = (tokenCount) => {
  const kvBytes = tokenCount * LAYERS * HEADS * HEAD_DIMENSION * KV_TENSORS * BF16_BYTES;
  const kvGb = kvBytes / 1e9;
  return {
    kvGb,
    decodeMs: (kvGb / HBM_BANDWIDTH_GBS) * 1000,
    overCapacity: kvGb > CAPACITY_GB,
  };
};

export const logSliderToTokens = (sliderValue) => Math.round(
  Math.exp(Math.log(1000) + (Number(sliderValue) / 100) * Math.log(1000)),
);

export const tokensToLogSlider = (tokenCount) => (
  ((Math.log(tokenCount) - Math.log(1000)) / Math.log(1000)) * 100
);

export const capacityTokens = Math.floor((CAPACITY_GB * 1e9) / (LAYERS * HEADS * HEAD_DIMENSION * KV_TENSORS * BF16_BYTES));
