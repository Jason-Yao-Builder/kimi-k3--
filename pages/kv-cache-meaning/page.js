import { renderKvCacheDemo } from "./component.js";

export const kvCacheMeaningPage = {
  style: new URL("./styles.css", import.meta.url).href,
  renderers: { "kv-cache-demo": renderKvCacheDemo },
  slide: {
    id: "kv-cache",
    section: "KDA",
    role: "KV Cache",
    title: "KV Cache 的意义——以空间换时间",
    layout: "kv-cache",
    hierarchyHeader: true,
    path: [
      { number: "2", label: "模型架构", target: "kv-cache" },
      { number: "2.1", label: "KDA", target: "kv-cache" },
      { number: "2.1.2", label: "KV Cache 的工作方式", target: "kv-cache", current: true },
    ],
    edges: [{ type: "next", target: "kv-cache-cost" }],
    blocks: [{
      type: "kv-cache-demo",
      id: "kv-cache-lab",
      prefixLength: 5,
      minPrefixLength: 5,
      maxPrefixLength: 10,
      maxNewTokens: 4,
      claims: [
        "新 token 的 Query 与前文 Key 计算权重，再汇总 Value，将上下文的语义信息融合进当前 token。",
        "不缓存时，每一步都重算更长的完整前缀；缓存后只计算新增 token。",
        "对 attention 部分：单步计算由 O(n²) 降为 O(n)，代价是 O(n) 的 KV 存储。",
      ],
      sentences: [
        { id: "river", label: "河岸", text: "The boat reached the bank.", cues: ["boat", "reached"], meaning: "河岸语义" },
        { id: "finance", label: "银行", text: "She deposited money at the bank.", cues: ["deposited", "money"], meaning: "金融机构语义" },
      ],
      source: "Kimi K3 Technical Report §2.1；Attention Is All You Need",
    }],
  },
};
