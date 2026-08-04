import { element, svgElement } from "../../shared/dom/element.js";
import { MOTION } from "../../shared/design/tokens.js";
import "./cards.js?build=20260804-post26";
import { PIPELINES, PIPELINE_CARD_IDS, TABLE_ROWS, getCard, getPipelineGroup } from "./logic.js?build=20260804-post26";

const addText = (svg, x, y, text, className = "ptoe-svg-label", anchor = "middle") => {
  const node = svgElement("text", { x, y, class: className, "text-anchor": anchor }, text);
  svg.append(node);
  return node;
};

const fadeIn = (node) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.fast, easing: "ease-out" });
};

const MIRROR_TASKS = [
  ["代数", 1.2, 0.35], ["几何", 0.8, -0.15], ["代码", 1.4, -0.55], ["检索", -0.7, 0.45],
  ["事实", -1, 0.1], ["规划", 0.55, -0.35], ["格式", -1.3, 0.65], ["长链", 1, -0.05],
];
const MIRROR_SIGMA = 0.85;
const MIRROR_TAU = 0.15;
const MIRROR_ETA = 0.25;
const sigmoid = (value) => 1 / (1 + Math.exp(-value));
const signed = (value, digits = 2) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;

const calculateMirrorExperiment = (theta) => {
  const tasks = MIRROR_TASKS.map(([name, slope, bias]) => {
    const probability = sigmoid(slope * theta + bias);
    return { name, slope, probability, success: probability >= 0.5 };
  });
  const meanProbability = tasks.reduce((sum, task) => sum + task.probability, 0) / tasks.length;
  const taskLoss = -meanProbability;
  const kl = theta ** 2 / (2 * MIRROR_SIGMA ** 2);
  const klLoss = MIRROR_TAU * kl;
  const gradientTask = -tasks.reduce((sum, task) => sum + task.slope * task.probability * (1 - task.probability), 0) / tasks.length;
  const gradientKl = MIRROR_TAU * theta / MIRROR_SIGMA ** 2;
  const gradient = gradientTask + gradientKl;
  return { tasks, meanProbability, taskLoss, kl, klLoss, totalLoss: taskLoss + klLoss, gradient, correction: -MIRROR_ETA * gradient };
};

const buildDistributionVisual = (theta) => {
  const svg = svgElement("svg", { class: "ptoe-mirror-distribution", viewBox: "0 0 420 150", role: "img", "aria-label": `参考策略与参数 θ=${theta.toFixed(2)} 时的新策略分布` });
  const xScale = (value) => 28 + ((value + 3) / 6) * 364;
  const yScale = (value) => 122 - value * 190;
  const curve = (mean) => Array.from({ length: 81 }, (_, index) => {
    const x = -3 + index * 0.075;
    const density = Math.exp(-((x - mean) ** 2) / (2 * MIRROR_SIGMA ** 2)) / (MIRROR_SIGMA * Math.sqrt(2 * Math.PI));
    return `${index ? "L" : "M"}${xScale(x).toFixed(1)} ${yScale(density).toFixed(1)}`;
  }).join(" ");
  svg.append(
    svgElement("line", { x1: 28, y1: 122, x2: 392, y2: 122, class: "axis" }),
    svgElement("line", { x1: xScale(0), y1: 18, x2: xScale(0), y2: 122, class: "reference-marker" }),
    svgElement("path", { d: curve(0), class: "reference-curve" }),
    svgElement("path", { d: curve(theta), class: "policy-curve" }),
    svgElement("line", { x1: xScale(theta), y1: 18, x2: xScale(theta), y2: 122, class: "policy-marker" }),
  );
  addText(svg, 28, 15, "生成概率密度", "ptoe-svg-node", "start");
  addText(svg, 34, 142, "π₀ = 𝒩(0, 0.85²)", "ptoe-svg-value", "start");
  addText(svg, 386, 142, `πθ = 𝒩(${signed(theta)}, 0.85²)`, "ptoe-svg-push", "end");
  return svg;
};

const buildMirrorSnapshot = (theta) => {
  const result = calculateMirrorExperiment(theta);
  const snapshot = element("div", "ptoe-mirror-snapshot");
  const tasks = element("div", "ptoe-mirror-tasks");
  result.tasks.forEach((task) => {
    const item = element("div", `ptoe-mirror-task ${task.success ? "success" : "failure"}`);
    const heading = element("span", "ptoe-mirror-task-heading");
    heading.append(element("strong", "", task.name), element("b", "", `r=${task.success ? "1" : "0"}`));
    const track = element("i", "ptoe-mirror-probability");
    track.style.setProperty("--probability", `${task.probability * 100}%`);
    item.append(heading, track, element("small", "", `q=P成功=${task.probability.toFixed(2)}`));
    tasks.append(item);
  });
  const formula = element("div", "ptoe-mirror-formula");
  formula.append(
    element("code", "definition", "rⱼ∈{0,1}；qⱼ(θ)=E[rⱼ|θ]=P(rⱼ=1|θ)"),
    element("code", "general", "L(θ) = −⅛∑ⱼqⱼ(θ) + τ·KL(πθ ‖ π₀)"),
    element("code", "substitution", `= −${result.meanProbability.toFixed(3)} + ${MIRROR_TAU}×${result.kl.toFixed(3)}`),
    element("code", "total", `Ltask ${signed(result.taskLoss, 3)}　+　LKL ${result.klLoss.toFixed(3)}　=　L ${signed(result.totalLoss, 3)}`),
    element("code", "gradient", `∂L/∂θ = ${signed(result.gradient, 3)}　→　Δθ = −η∂L/∂θ = ${signed(result.correction, 3)}`),
  );
  const analysis = element("div", "ptoe-mirror-analysis");
  analysis.append(
    element("p", "", "rⱼ 是一次评测得到的离散 0/1；qⱼ 是在当前参数 θ 下对 rⱼ 的期望，因此随策略概率连续变化。训练优化 qⱼ，任务格同时显示阈值化后的 rⱼ。"),
    element("p", "", "反向传播读取总 loss 的斜率：若 reward 收益仍大于分布代价，θ 继续前进；若 KL 斜率占优，修正量便把参数推回参考策略附近。"),
  );
  const lower = element("div", "ptoe-mirror-lower");
  lower.append(buildDistributionVisual(theta), formula);
  snapshot.append(tasks, lower, analysis);
  return snapshot;
};

const buildMirrorDescentExperiment = (state, persist) => {
  const experiment = element("section", "ptoe-mirror-experiment");
  const controls = element("div", "ptoe-mirror-controls");
  const label = element("label", "", "参数改动 θ");
  const value = element("output", "", signed(state.mirrorTheta));
  const slider = element("input", "ptoe-mirror-slider");
  Object.assign(slider, { type: "range", min: "-2", max: "2", step: "0.01", value: String(state.mirrorTheta) });
  slider.setAttribute("aria-label", "调整策略参数 θ");
  const scale = element("div", "ptoe-mirror-scale");
  scale.append(element("span", "", "−2"), element("span", "reference", "参考参数 θ=0"), element("span", "", "+2"));
  const host = element("div", "ptoe-mirror-host");
  const update = () => {
    value.textContent = signed(state.mirrorTheta);
    slider.setAttribute("aria-valuetext", `θ=${signed(state.mirrorTheta)}`);
    host.replaceChildren(buildMirrorSnapshot(state.mirrorTheta));
  };
  slider.addEventListener("input", () => {
    state.mirrorTheta = Number(slider.value);
    persist();
    update();
  });
  slider.addEventListener("keydown", (event) => event.stopPropagation());
  label.append(value);
  controls.append(label, slider, scale);
  experiment.append(controls, host);
  update();
  return experiment;
};

const buildFlowVisual = (card) => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": `${card.title} 机制示意图` });
  const labels = card.visual?.nodes || [card.title];
  const width = Math.min(112, 350 / labels.length);
  labels.forEach((label, index) => {
    const x = 22 + index * (376 / labels.length);
    svg.append(svgElement("rect", { x, y: 46, width, height: 48, class: index === labels.length - 1 ? "active" : "" }));
    addText(svg, x + width / 2, 74, label, "ptoe-svg-node");
    if (index < labels.length - 1) {
      svg.append(svgElement("line", { x1: x + width, y1: 70, x2: x + 376 / labels.length, y2: 70, class: "arrow" }));
      addText(svg, x + width + 15, 65, "→", "ptoe-svg-arrow");
    }
  });
  if (card.visual?.caption) addText(svg, 210, 125, card.visual.caption, "ptoe-svg-caption");
  return svg;
};

const buildToolSynthesisVisual = () => {
  const figure = element("figure", "ptoe-tool-synthesis");
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", "三阶段工具数据合成管道：生成工具规格、任务与评分尺，再生成并筛选多轮轨迹");
  const makeBox = (title, lines = [], className = "") => {
    const box = element("div", `ptoe-tool-box ${className}`.trim());
    box.append(element("strong", "", title));
    lines.forEach(([text, code = false]) => box.append(element(code ? "code" : "small", "", text)));
    return box;
  };
  const makeStage = (number, title, className) => {
    const stage = element("section", `ptoe-tool-stage ${className}`);
    const heading = element("header", "ptoe-tool-stage-heading");
    heading.append(element("span", "", `阶段 ${number}`), element("strong", "", title));
    stage.append(heading);
    return stage;
  };

  const stageOne = makeStage("①", "Tool Spec Generation", "spec");
  const specFlow = element("div", "ptoe-tool-flow ptoe-tool-spec-flow");
  specFlow.append(
    makeBox("真实 MCP · 3000+", [["开源工具规格"]]),
    element("span", "ptoe-tool-operator", "+"),
    makeBox("LLM 合成 · 20000+", [["金融 → 股票/期货 → 具体工具"]], "synthetic"),
    element("span", "ptoe-tool-operator arrow", "→"),
    makeBox("工具库", [["get_stock_price", true], ["send_email", true], ["get_company_news", true]], "library"),
  );
  stageOne.append(specFlow);

  const stageTwo = makeStage("②", "Agent & Task Generation", "task");
  const taskFlow = element("div", "ptoe-tool-flow ptoe-tool-task-flow");
  taskFlow.append(
    makeBox("采样工具组合", [["get_stock_price +", true], ["get_company_news +", true], ["send_email", true]]),
    element("span", "ptoe-tool-operator arrow", "→"),
    makeBox("任务描述", [["“苹果近期有利空？”"], ["“跌破 150 发邮件”"]]),
    element("span", "ptoe-tool-operator", "+"),
    makeBox("Rubric checklist", [["□ 调用新闻 API"], ["□ 查股价"], ["□ 条件判断后发邮件"]], "rubric"),
  );
  stageTwo.append(taskFlow);

  const stageThree = makeStage("③", "Trajectory Generation · 三角色交互", "trajectory");
  const trajectoryLayout = element("div", "ptoe-tool-trajectory-layout");
  const timeline = element("div", "ptoe-tool-timeline");
  const roles = element("div", "ptoe-tool-roles");
  roles.append(element("strong", "user", "👤 User Sim"), element("strong", "agent", "🤖 Agent"), element("strong", "tool", "🔧 Tool Sim"));
  const events = [
    ["Turn 1", "User Sim → Agent", "“苹果利空？跌破 150 发邮件”", "user"],
    ["Turn 2", "Agent → Tool Sim", "get_company_news(AAPL)", "agent"],
    ["Turn 2 返回", "Tool Sim → Agent", '{"sentiment":"negative"}', "tool"],
    ["Turn 3", "Agent → Tool Sim", "get_stock_price(AAPL)", "agent"],
    ["Turn 3 返回", "Tool Sim → Agent", '{"price":148.5}', "tool"],
    ["Turn 4", "Agent → Tool Sim", "send_email(...) ", "agent"],
    ["Turn 4 返回", "Tool Sim → Agent", '{"status":"sent"}', "tool"],
  ];
  const eventList = element("div", "ptoe-tool-events");
  const bubbles = events.map(([turn, actor, content, type]) => {
    const bubble = element("div", `ptoe-tool-event ${type}`);
    bubble.append(element("span", "", turn), element("strong", "", actor), element("code", "", content));
    eventList.append(bubble);
    return bubble;
  });
  timeline.append(roles, eventList);
  const judge = element("aside", "ptoe-tool-judge");
  judge.append(element("strong", "", "LLM Judge"));
  const checks = ["调用新闻", "查股价", "条件判断", "发邮件"].map((label) => {
    const row = element("span", "", `□ ${label}　✓`);
    judge.append(row);
    return row;
  });
  judge.append(element("b", "", "4/4　keep"));
  trajectoryLayout.append(timeline, judge);
  stageThree.append(trajectoryLayout);

  const connectorOne = element("div", "ptoe-tool-connector", "↓　工具库馈入任务生成");
  const connectorTwo = element("div", "ptoe-tool-connector", "↓　任务 + Rubric 驱动交互");
  const notes = element("footer", "ptoe-tool-notes");
  notes.append(
    element("p", "", "轨迹接受条件：schema 格式合法 ∧ Rubric 逐条通过 ∧ Hack Detection 无报警"),
    element("p", "", "真实沙箱补充：合成轨迹为主体，真实代码执行作“锚点”校验合成质量"),
  );
  figure.append(stageOne, connectorOne, stageTwo, connectorTwo, stageThree, notes);

  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bubbles.forEach((bubble) => { bubble.style.opacity = "0"; });
    checks.forEach((check) => { check.style.opacity = "0.25"; });
    [stageOne, stageTwo, stageThree].forEach((stage, index) => stage.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: MOTION.fast, delay: index * Math.round(MOTION.fast * 2 / 3), easing: MOTION.easing, fill: "both" },
    ));
    const revealTrajectory = () => {
      bubbles.forEach((bubble, index) => bubble.animate(
        [{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: Math.round(MOTION.step * 0.6), delay: index * Math.round(MOTION.fast * 4 / 9), easing: MOTION.easing, fill: "both" },
      ));
      checks.forEach((check, index) => check.animate(
        [{ opacity: 0.25 }, { opacity: 1 }],
        { duration: Math.round(MOTION.step * 0.4), delay: bubbles.length * Math.round(MOTION.fast * 4 / 9) + index * Math.round(MOTION.fast / 3), fill: "both" },
      ));
    };
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        revealTrajectory();
      }, { threshold: 0.2 });
      observer.observe(stageThree);
    } else revealTrajectory();
  }
  return figure;
};

const buildTriptychVisual = (card) => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": `${card.title} 三个训练组件` });
  card.visual.items.forEach((item, index) => {
    const x = 12 + index * 138;
    svg.append(svgElement("rect", { x, y: 22, width: 126, height: 102, class: index === 1 ? "active" : "" }));
    addText(svg, x + 63, 45, item.title, "ptoe-svg-node");
    addText(svg, x + 63, 70, item.value, index === 0 ? "ptoe-svg-push" : "ptoe-svg-value");
    addText(svg, x + 63, 94, item.effect, "ptoe-svg-caption");
    if (index < 2) addText(svg, x + 132, 76, "+", "ptoe-svg-arrow");
  });
  addText(svg, 210, 142, card.visual.caption, "ptoe-svg-caption");
  return svg;
};

const buildTokenClipVisual = (card) => {
  const figure = element("figure", "ptoe-clip-visual");
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", "序列级 PPO 与 Per-token Clipping 对比：只冻结越界 token");
  const tokenValues = ["0.1", "0.3", "−0.1", "0.8", "0.2", "0.1", "0.3", "2.5", "0.1", "0.2"];
  const tokenLabels = ["t₁", "t₂", "t₃", "t₄", "t₅", "t₆", "t₇", "t₈", "t₉", "t₁₀"];
  const tokenRow = (mode) => {
    const row = element("div", `ptoe-clip-token-row ${mode}`);
    tokenValues.forEach((value, index) => {
      const token = element("span", "ptoe-clip-token");
      token.append(element("b", "", tokenLabels[index]), element("small", "", value));
      if (mode === "sequence") token.classList.add("frozen");
      if (mode === "per-token" && index === 3) token.classList.add("partial");
      if (mode === "per-token" && index === 7) token.classList.add("frozen");
      row.append(token);
    });
    return row;
  };
  const top = element("section", "ptoe-clip-section sequence");
  top.append(element("h3", "", "序列级 ratio：一个 token 越界，整条回答受罚"));
  top.append(element("p", "ptoe-clip-formula", "ratio = ∏ᵢ πnew(tᵢ) / πold(tᵢ)；只要 t₈ 偏移过大，整条 ratio 偏离 1"));
  top.append(tokenRow("sequence"));
  const sequenceNote = element("div", "ptoe-clip-note danger");
  sequenceNote.append(element("strong", "", "整条梯度归零"), element("span", "", "t₁–t₇、t₉–t₁₀ 本可学习，却被 t₈ 一起冻结"), element("b", "", "梯度浪费：9/10"));
  top.append(sequenceNote);
  const bottom = element("section", "ptoe-clip-section per-token");
  bottom.append(element("h3", "", "Per-token：每个位置独立检查，只冻结越界者"));
  bottom.append(element("p", "ptoe-clip-formula", "log-ratioₜ = log πnew(tₜ) − log πold(tₜ)；α ≤ log-ratioₜ ≤ β 时正常更新"));
  bottom.append(tokenRow("per-token"));
  const comparison = element("div", "ptoe-clip-comparison");
  comparison.append(element("p", "", "t₄：中度越界，∇ 部分保留"), element("p", "", "t₈：严重越界，∇ = 0，仅此一个"), element("strong", "", "有效梯度：Per-token 9/10　vs　序列级 1/10"));
  bottom.append(comparison);
  const rules = element("div", "ptoe-clip-rules");
  rules.append(element("div", "", "若 log-ratioₜ ∈ [α, β]：梯度正常"), element("div", "", "若超出边界：∇ = 0，仅冻结该 token"), element("div", "", "同样的 clip 约束，保留 9× 更多学习信号"));
  figure.append(top, element("div", "ptoe-clip-transition", "↓ 连续位置判断，避免误伤正常 token"), bottom, rules);
  return figure;
};

const buildVerifierVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "数学等价检查与代码测试提供客观奖励" });
  addText(svg, 105, 22, "数学", "ptoe-svg-node");
  svg.append(svgElement("rect", { x: 18, y: 38, width: 105, height: 42 }));
  addText(svg, 70, 63, "a²−4", "ptoe-svg-value");
  addText(svg, 142, 63, "→", "ptoe-svg-arrow");
  svg.append(svgElement("rect", { x: 162, y: 38, width: 104, height: 42, class: "active" }));
  addText(svg, 214, 57, "等价检查", "ptoe-svg-node");
  addText(svg, 214, 72, "(a+2)(a−2)", "ptoe-svg-caption");
  addText(svg, 300, 63, "→ ✓ reward=1", "ptoe-svg-pull");
  svg.append(svgElement("line", { x1: 18, y1: 91, x2: 402, y2: 91, class: "divider" }));
  addText(svg, 105, 112, "代码", "ptoe-svg-node");
  svg.append(svgElement("rect", { x: 18, y: 120, width: 105, height: 24 }));
  addText(svg, 70, 137, "def solve()", "ptoe-svg-value");
  addText(svg, 142, 137, "→", "ptoe-svg-arrow");
  svg.append(svgElement("rect", { x: 162, y: 120, width: 104, height: 24, class: "active" }));
  addText(svg, 214, 137, "运行 N 个测试", "ptoe-svg-node");
  addText(svg, 300, 137, "→ 全通过 ✓", "ptoe-svg-pull");
  return svg;
};

const buildCapabilityVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "从按模态分管道改为按能力混合文本与视觉" });
  addText(svg, 86, 20, "按模态分", "ptoe-svg-node");
  svg.append(svgElement("rect", { x: 18, y: 34, width: 136, height: 34 }));
  svg.append(svgElement("rect", { x: 18, y: 80, width: 136, height: 34 }));
  addText(svg, 86, 56, "文本 RL", "ptoe-svg-caption");
  addText(svg, 86, 102, "视觉 RL", "ptoe-svg-caption");
  addText(svg, 183, 78, "×　→　✓", "ptoe-svg-push");
  addText(svg, 306, 20, "按能力分", "ptoe-svg-node");
  ["知识", "推理", "代码", "智能体"].forEach((label, index) => {
    const x = 228 + (index % 2) * 92;
    const y = 34 + Math.floor(index / 2) * 52;
    svg.append(svgElement("rect", { x, y, width: 82, height: 42, class: "active" }));
    addText(svg, x + 41, y + 18, label, "ptoe-svg-node");
    addText(svg, x + 41, y + 34, "文 ●  视 ●", "ptoe-svg-value");
  });
  addText(svg, 306, 142, "视觉 RL → 文本推理也增益", "ptoe-svg-pull");
  return svg;
};

const buildZeroVisionVisual = () => {
  const figure = element("figure", "ptoe-zero-vision-visual");
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", "Zero-Vision SFT：先学程序框架，再填入视觉信号");
  const compare = element("section", "ptoe-zero-compare");
  compare.append(element("h3", "", "SFT 要教的东西，图片提供不了"));
  const compareGrid = element("div", "ptoe-zero-compare-grid");
  const noImage = element("div", "ptoe-zero-card no");
  noImage.append(element("strong", "", "× 直接加入真实图片"), element("p", "", "同时学习调用链逻辑 + 视觉内容"), element("p", "", "两件事耦合，信号相互干扰"), element("small", "", "视觉标注成本高，冷启动搜索空间大"));
  const zero = element("div", "ptoe-zero-card yes");
  zero.append(element("strong", "", "✓ Zero-Vision 的做法"), element("p", "", "SFT 只学任务 → 调用链映射"), element("p", "", "图片在 SFT 阶段是噪声，不是信号"), element("small", "", "把视觉理解留给后续 RL"));
  compareGrid.append(noImage, element("span", "ptoe-zero-divider", "图片在 SFT 阶段不提供额外信息"), zero);
  compare.append(compareGrid);
  const timeline = element("section", "ptoe-zero-timeline");
  timeline.append(element("h3", "", "两件事拆开学：每阶段目标单一"));
  const phases = element("div", "ptoe-zero-phases");
  const sftPhase = element("div", "ptoe-zero-phase sft");
  sftPhase.append(element("strong", "", "SFT 阶段"), element("p", "", "目标：任务描述 → 工具调用序列"), element("p", "", "数据：纯文本；图像只是字符串变量"), element("small", "", "获得 crop / ocr / parse 框架"));
  const rlPhase = element("div", "ptoe-zero-phase rl");
  rlPhase.append(element("strong", "", "RL 阶段"), element("p", "", "目标：视觉信号 → 正确操作"), element("p", "", "数据：真实图像 + reward"), element("small", "", "把真实像素填入已有框架"));
  phases.append(sftPhase, element("span", "ptoe-zero-phase-arrow", "→ 程序框架已就绪，视觉信号插入"), rlPhase);
  timeline.append(phases);
  const lower = element("div", "ptoe-zero-lower");
  const sample = element("section", "ptoe-zero-sample");
  sample.append(element("h3", "", "训练样本长什么样"));
  const code = element("pre", "ptoe-zero-code");
  code.textContent = '# 任务：识别发票中的金额\nimg = load_image("invoice.jpg")  # 字符串，不是真实图片\nregion = img.crop(x=120, y=340, w=200, h=40)\ntext = ocr(region)\namount = parse_currency(text)';
  sample.append(code, element("p", "ptoe-zero-callout", "模型学的是 crop → ocr → parse 操作序列；像素长什么样，模型此时完全不知道。"), element("p", "ptoe-zero-rl-sample", "RL：真实图像 token +“识别金额” → 调用已学会的链 → 工具返回结果 → reward 反馈"));
  const cards = element("section", "ptoe-zero-sidecards");
  cards.append(element("h3", "", "三条补充直觉"));
  const cardOne = element("div", "ptoe-zero-sidecard");
  cardOne.append(element("strong", "", "为什么不需要 Long-CoT SFT"), element("p", "", "代码调用链天然是长链行动结构，每步依赖上步输出；学会调用链就已经学会多步行动。"));
  const cardTwo = element("div", "ptoe-zero-sidecard");
  cardTwo.append(element("strong", "", "三类任务的代码化"), element("p", "ptoe-zero-code-line", "表格：parse_table(img, format)"), element("p", "ptoe-zero-code-line", "OCR：ocr(img.crop(x,y,w,h))"), element("p", "ptoe-zero-code-line", "理解：describe(img.crop(...))"));
  const cardThree = element("div", "ptoe-zero-sidecard good");
  cardThree.append(element("strong", "", "两阶段分工一句话"), element("p", "", "SFT：纯文本，学程序框架"), element("p", "", "RL：真实图像，学视觉填充"));
  cards.append(cardOne, cardTwo, cardThree);
  lower.append(sample, cards);
  figure.append(compare, timeline, lower, element("p", "ptoe-zero-source", "来源：Kimi K2.5 Technical Report §3（Zero-Vision SFT 与联合多模态 RL）"));
  return figure;
};

const buildK3SftVisual = () => {
  const figure = element("figure", "ptoe-k3-sft-visual");
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", "K3 冷启动用 QAT 解决精度错位，用 XTML 统一九专家轨迹语法");
  const problems = element("section", "ptoe-k3-problems");
  problems.append(element("h3", "", "两个问题，两条彼此独立的解法"));
  const problemGrid = element("div", "ptoe-k3-problem-grid");
  const precision = element("div", "ptoe-k3-problem-card");
  precision.append(element("strong", "", "问题 1 — 精度错位"), element("p", "", "训练：全精度权重"), element("p", "", "部署：MX FP4 量化"), element("p", "", "rollout 行为 ≠ 训练时行为"), element("b", "", "→ QAT 从 SFT 起模拟部署精度"));
  const syntax = element("div", "ptoe-k3-problem-card");
  syntax.append(element("strong", "", "问题 2 — 格式碎片化"), element("p", "", "九专家各有输出格式"), element("p", "", "思考、调用、观察与回答边界不统一"), element("p", "", "蒸馏合并时轨迹无法对齐"), element("b", "", "→ XTML 四标签统一所有轨迹"));
  problemGrid.append(precision, syntax);
  problems.append(problemGrid);
  const middle = element("div", "ptoe-k3-sft-split");
  const qat = element("section", "ptoe-k3-sft-panel qat");
  qat.append(element("h3", "", "QAT — 模拟部署精度，消除 mismatch"));
  const precisionTable = element("div", "ptoe-k3-precision-table");
  precisionTable.append(element("strong", "", "高精度保留"), element("p", "", "注意力投影、共享专家、路由器"), element("strong", "", "低精度前向模拟"), element("p", "", "MoE 专家权重 → simulate(MX FP4)"), element("p", "", "激活值 → simulate(MX FP8)"));
  qat.append(precisionTable, element("p", "ptoe-k3-sft-note", "高精度梯度更新 + 低精度前向模拟并不矛盾：目标是让参数适应量化误差，不是把梯度也量化。"));
  const xtml = element("section", "ptoe-k3-sft-panel xtml");
  xtml.append(element("h3", "", "XTML — 统一九专家的轨迹语言"));
  const tags = element("div", "ptoe-k3-xtml-tags");
  [["<think>", "先查邮件，再更新日历"], ["<tool_call>", "search_email(...)"], ["<tool_result>", "3 封未读"], ["<answer>", "已整理，日历已更新"]].forEach(([tag, text]) => {
    const row = element("div", "ptoe-k3-xtml-row");
    row.append(element("code", "", tag), element("span", "", text));
    tags.append(row);
  });
  xtml.append(tags, element("p", "ptoe-k3-sft-note", "同一序列在低精度下训练；RL rollout 不必切换数值方案或数据格式。"));
  middle.append(qat, xtml);
  const conclusion = element("section", "ptoe-k3-conclusion");
  conclusion.append(element("strong", "", "冷启动后，训练起点已带部署精度与行动语法。"), element("p", "", "RL 只需优化行为，不必补表示与精度错位。"), element("p", "", "下一步：单一策略无法同时覆盖三类任务与三档强度，于是分化九个专家。"));
  figure.append(problems, middle, conclusion);
  return figure;
};

const buildK3PolicyVisual = () => {
  const figure = element("figure", "ptoe-k3-policy-visual");
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", "K3 继承 K2.5 的 Per-token Clipping，把创新移到训练组织");
  const choice = element("section", "ptoe-k3-policy-choice");
  choice.append(element("h3", "", "当底层已经够稳，就冻结它"));
  const compare = element("div", "ptoe-k3-policy-compare");
  const replace = element("div", "replace");
  replace.append(element("strong", "", "如果替换优化器"), element("p", "", "重新引入大规模稳定性风险"), element("p", "", "长轨迹问题可能反弹"), element("small", "", "代价：重新调参、重新验证"));
  const inherit = element("div", "inherit");
  inherit.append(element("strong", "", "K3 的选择"), element("p", "", "policy optimization follows K2.5"), element("p", "", "per-token clip 继续作为底座"), element("small", "", "底层顺承，上层重构"));
  compare.append(replace, element("span", "", "底层算法顺承 → 训练组织重设计"), inherit);
  choice.append(compare);
  const lower = element("div", "ptoe-k3-policy-lower");
  const base = element("section", "ptoe-k3-policy-base");
  base.append(element("h3", "", "per-token clip 解决了什么"), element("p", "", "标准序列级 clip：一个位置越界，长轨迹的正常 token 也可能失去梯度。"), element("code", "", "sequence：clip(πθ / πold, 1−ε, 1+ε)"), element("p", "", "Per-token：每个位置单独检查，只冻结越界 token。"), element("code", "", "token t：clip(πθ(aₜ) / πold(aₜ), 1−ε, 1+ε)"), element("strong", "", "K3 直接继承，不再修改"));
  const moves = element("section", "ptoe-k3-policy-moves");
  moves.append(element("h3", "", "K3 把创新移到哪里"));
  [["任务分化", "三域 × 三强度 → 九个专家"], ["环境设计", "白盒 RL 环境 + 长程任务"], ["蒸馏合并", "MOPD：九位教师 → 一个学生"]].forEach(([title, text]) => {
    const card = element("div", "ptoe-k3-policy-move");
    card.append(element("strong", "", title), element("p", "", text));
    moves.append(card);
  });
  lower.append(base, moves);
  figure.append(choice, lower, element("p", "ptoe-k3-policy-next", "底层更新规则已定。下一个问题：单一模型为什么无法同时覆盖三类任务与三档强度？"));
  return figure;
};

const buildExpertGridVisual = () => {
  const figure = element("figure", "ptoe-k3-experts-visual");
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", "三域三强度九专家课程与多教师在策略蒸馏流程");

  const conflict = element("section", "ptoe-k3-expert-conflict");
  conflict.append(element("h3", "", "同一个 reward 无法同时激励“简短直接”和“深度探索”"));
  const conflictGrid = element("div", "ptoe-k3-expert-conflict-grid");
  const mixed = element("div", "mixed");
  mixed.append(
    element("strong", "", "× 混训时的冲突"),
    element("p", "", "General Tasks-low：奖励简短回答"),
    element("p", "", "Coding Agents-max：奖励多轮修复迭代"),
    element("p", "", "两类梯度方向相反，在同一模型里互相抵消"),
    element("small", "", "结果：简单任务过度思考，难任务过早截断；退化原因也无法归因。"),
  );
  const split = element("div", "split");
  split.append(
    element("strong", "", "✓ 分化后"),
    element("p", "", "每个专家只接收一个方向的梯度"),
    element("p", "", "low 学会压缩，max 学会深探"),
    element("p", "", "每项能力退化都有明确归因"),
    element("small", "", "学生最后学习何时采用哪种行为。"),
  );
  conflictGrid.append(mixed, split);
  conflict.append(conflictGrid);

  const matrix = element("section", "ptoe-k3-expert-matrix-section");
  matrix.append(element("h3", "", "九个专家 = 三域 × 三强度"));
  const matrixGrid = element("div", "ptoe-k3-expert-matrix");
  ["任务域", "low", "high", "max"].forEach((label) => matrixGrid.append(element("strong", "header", label)));
  const rows = [
    ["General Tasks", "一次性回答\n直接输出", "中等推理\n结构化回答", "复杂分析\n多步验证"],
    ["General Agents", "简单工具调用\n单步完成", "多轮工具循环\n观察—行动", "跨应用 Agent\n百万 token 轨迹"],
    ["Coding Agents", "简单补全\n单轮", "调试修复\n2–3 轮", "编译—测试\n多轮执行"],
  ];
  rows.forEach((row) => row.forEach((text, index) => {
    const cell = element(index === 0 ? "strong" : "span", index === 0 ? "domain" : "expert", text);
    matrixGrid.append(cell);
  }));
  const axes = element("div", "ptoe-k3-expert-axes");
  axes.append(
    element("p", "", "域轴：轨迹结构不同，环境反馈机制不同"),
    element("p", "", "强度轴：budget(x, effort) = τeffort · b₀(x)，τmax > τhigh > τlow"),
  );
  matrix.append(matrixGrid, axes, element("strong", "ptoe-k3-expert-curriculum", "课程顺序：max → high → low　先学会充分解决，再压缩成低成本行为"));

  const lower = element("div", "ptoe-k3-expert-lower");
  const formulas = element("section", "ptoe-k3-expert-formulas");
  formulas.append(
    element("h3", "", "形式化表达"),
    element("code", "", "Eᵢⱼ = RL(base; domainᵢ, effortⱼ)\nbudget(x, effort) = τeffort · b₀(x)\nτmax > τhigh > τlow"),
    element("p", "", "b₀(x) 是冷启动模型对题目所需长度的估计。τ 把基准缩放成不同 effort 上限；Coding Agents 的基准预算天然更高。"),
  );
  const examples = element("section", "ptoe-k3-expert-examples");
  examples.append(element("h3", "", "同一条预算规则，落到两种任务"));
  const exampleA = element("div", "ptoe-k3-expert-example");
  exampleA.append(element("strong", "", "A｜“法国首都是哪里？”"), element("p", "", "General Tasks-low → 直接输出“巴黎”，无需推理链；超出预算触发长度惩罚。"));
  const exampleB = element("div", "ptoe-k3-expert-example");
  exampleB.append(element("strong", "", "B｜“修复这个依赖冲突”"), element("p", "", "Coding Agents-max → 读 package.json → 执行安装 → 定位冲突版本 → 降级依赖 → 重测通过。多轮执行是预期行为。"));
  examples.append(exampleA, exampleB);
  lower.append(formulas, examples);

  const mopd = element("section", "ptoe-k3-expert-mopd");
  mopd.append(element("h3", "", "MOPD：训完九个，再蒸馏回一个"));
  const flow = element("div", "ptoe-k3-mopd-flow");
  ["九个教师\ncheckpoint", "学生按当前策略\n生成轨迹", "逐 token 对比\n对应教师概率", "对数概率比\n成为 reward", "更新学生\n参数"].forEach((label, index, nodes) => {
    flow.append(element("div", "ptoe-k3-mopd-node", label));
    if (index < nodes.length - 1) flow.append(element("span", "ptoe-k3-mopd-arrow", "→"));
  });
  const mopdNotes = element("div", "ptoe-k3-mopd-notes");
  [["为什么是 on-policy", "学生走自己的轨迹，教师只在每个 token 上提供偏好信号；学生不必复刻教师的行动路径。"], ["dense reward 的作用", "标准 RL 常在整条链结束后才给信号；MOPD 每个 token 都有 reward，学习信号更密集。"]].forEach(([title, text]) => {
    const note = element("div", "ptoe-k3-mopd-note");
    note.append(element("strong", "", title), element("p", "", text));
    mopdNotes.append(note);
  });
  const mopdCore = element("div", "ptoe-k3-mopd-core");
  const mopdDiagram = buildMopdVisual();
  mopdDiagram.classList.add("ptoe-k3-mopd-diagram");
  mopdCore.append(mopdDiagram, mopdNotes);
  const mopdFormula = element("code", "ptoe-k3-mopd-formula", "r_opd(yₜ | e,x,y₍<t₎) = clip(sg(log(πteacher⁽ᵈ˒ᵉ⁾(yₜ | x,y₍<t₎) / πθ(yₜ | e,x,y₍<t₎))), −Rmax, Rmax)");
  const legend = element("div", "ptoe-k3-mopd-legend");
  [["sg", "教师概率固定，不参与反向传播"], ["clip", "限制极端 token 信号"], ["正 / 负", "教师更偏好该 token / 学生概率已更高"]].forEach(([term, meaning]) => legend.append(element("p", "", `${term}：${meaning}`)));
  mopd.append(flow, mopdCore, mopdFormula, legend);

  figure.append(conflict, mopd, matrix, lower, element("p", "ptoe-k3-expert-next", "九个专家要训出真正差异，前提是任务环境本身有不同的反馈结构。若仍是短问答，只会得到九个相似 checkpoint。→ 下一页：白盒 RL 环境与五类 Agentic 任务"));
  return figure;
};

const buildK3EnvironmentVisual = () => {
  const figure = element("figure", "ptoe-k3-env-visual");
  figure.setAttribute("aria-label", "K3 五类 Agentic 任务环境");
  const summary = element("section", "ptoe-k3-env-summary");
  [["轨迹长度", "数十步 → 数千次工具调用"], ["验收方式", "规则、连续 reward、模型评判并用"], ["防投机机制", "公开 + 隐藏 verifier + hack detector"]].forEach(([title, text], index) => {
    const card = element("div", "ptoe-k3-env-summary-card");
    card.append(element("b", "", ["↔", "✓", "盾"][index]), element("strong", "", title), element("span", "", text));
    summary.append(card);
  });
  const tabs = element("div", "ptoe-k3-env-tabs");
  tabs.setAttribute("role", "tablist");
  const host = element("section", "ptoe-k3-env-host");
  host.setAttribute("role", "tabpanel");
  const makeCard = (title, lines, className = "") => {
    const card = element("div", `ptoe-k3-env-card ${className}`.trim());
    card.append(element("strong", "", title));
    lines.forEach((line) => card.append(element("p", "", line)));
    return card;
  };
  const makeSteps = (items) => {
    const steps = element("div", "ptoe-k3-env-steps");
    items.forEach((item, index) => {
      const row = element("div", "ptoe-k3-env-step");
      row.append(element("b", "", `Step ${index + 1}`), element("span", "", item));
      steps.append(row);
    });
    return steps;
  };
  const makeTwoColumns = (left, right, className = "") => {
    const layout = element("div", `ptoe-k3-env-columns ${className}`.trim());
    layout.append(left, right);
    return layout;
  };
  const renderVerifiable = () => {
    const left = element("section", "ptoe-k3-env-section");
    left.append(element("h3", "", "多步信息搜索与专业工作流"));
    left.append(makeCard("场景范围", ["多步信息搜索：规划路径，逐步收集证据", "专业工作流：投行、法律、数据分析", "视觉推理：Python sandbox 操作图像"], "blue"));
    left.append(makeSteps(["模型编写 Python 代码", "crop / zoom / transform 图像", "执行并观察输出，包括生成图像", "迭代直到得到 verifiable answer"]));
    const right = element("section", "ptoe-k3-env-section");
    right.append(element("h3", "", "案例：卫星图河流分析"));
    right.append(makeCard("任务", ["这张卫星图中河流改道前后的距离差是多少？"], "muted"));
    const code = element("pre", "ptoe-k3-env-code");
    code.textContent = "crop(image, river_region)\nedge_detection(cropped)\noverlay(before, after)\ndistance(px) → km_conversion\n输出：+2.3 km";
    right.append(code, makeCard("验收", ["与标准答案等价 → reward = 1"], "success"));
    return makeTwoColumns(left, right, "wide-left");
  };
  const renderKernel = () => {
    const left = element("section", "ptoe-k3-env-section");
    left.append(element("h3", "", "从单算子到融合 mega-kernel"));
    left.append(makeCard("任务与数据", ["矩阵乘、注意力 → 融合 mega-kernel", "CUDA / Triton / CuTe DSL / Gluon / TileLang", "真实 GitHub kernel 仓库"], "blue"));
    const reward = element("div", "ptoe-k3-kernel-reward");
    [["误差 > ε", "reward = 0", "fail"], ["接近专家", "reward ≈ 0.5", "mid"], ["接近 roofline", "reward → 1", "pass"]].forEach(([title, score, type]) => {
      const block = element("div", type);
      block.append(element("strong", "", title), element("span", "", score));
      reward.append(block);
    });
    left.append(reward, element("p", "ptoe-k3-env-emphasis", "先过正确性门槛，再竞争性能；接近硬件理论峰值才拿满分。"));
    const right = element("section", "ptoe-k3-env-section");
    right.append(element("h3", "", "Anti-hacking 四道防线"));
    right.append(makeCard("防投机机制", ["CUDA graph replay → 直接判负", "缓存输入绕过计算 → 判负", "降精度且误差 > ε → reward = 0", "持续更新 hack detector"], "danger"));
    right.append(makeCard("候选对比", ["A：正确，吞吐达专家 92% → ≈0.46", "B：graph replay 伪造吞吐 → 0", "C：误差 3e−3 > ε → 0"], "success"));
    return makeTwoColumns(left, right);
  };
  const renderAssistant = () => {
    const left = element("section", "ptoe-k3-env-section");
    left.append(element("h3", "", "跨应用、跨多天的真实工作流"));
    left.append(makeCard("应用生态", ["Gmail　Notion　Slack　Canvas"], "blue"));
    left.append(makeCard("任务场景", ["人力资源：排班与面试安排", "法律服务：合同审核与时间线", "金融：投资备忘录与风险提示"]));
    const metrics = element("div", "ptoe-k3-env-metrics");
    [["数千次", "工具调用"], ["百万", "context tokens"], ["多天", "模拟时间"]].forEach(([value, label]) => {
      const metric = element("div", "");
      metric.append(element("strong", "", value), element("span", "", label));
      metrics.append(metric);
    });
    left.append(metrics, makeTwoColumns(makeCard("确定性规则", ["检查关键步骤是否完成"], "success"), makeCard("LLM 评判", ["按事件评估完成质量"], "blue"), "compact"));
    const right = element("section", "ptoe-k3-env-section");
    right.append(element("h3", "", "案例：投资委员会材料准备"));
    right.append(makeCard("任务", ["帮我准备下周一的投资委员会材料｜跨度 5 天"], "muted"));
    right.append(makeSteps(["搜索财报与新闻", "Gmail 提取分析师报告", "Notion 创建备忘录初稿", "Slack 讨论并更新风险", "Canvas 生成展示并邮件确认"]));
    right.append(makeCard("双轨验收", ["6 个关键步骤全部完成", "材料完整、逻辑连贯"], "success"));
    return makeTwoColumns(left, right);
  };
  const renderAet = () => {
    const left = element("section", "ptoe-k3-env-section");
    left.append(element("h3", "", "只给目标与约束，不给参考轨迹"));
    left.append(makeTwoColumns(makeCard("传统方式", ["任务 + 参考轨迹 → 模仿"], "muted"), makeCard("AET", ["目标 + 约束 + verifier → 自主探索"], "blue"), "compact"));
    left.append(makeSteps(["任务分解：拆成子目标", "工具选择：规划可用工具", "执行与观察", "错误恢复：失败后重规划", "终止判断：何时真正完成"]));
    left.append(element("p", "ptoe-k3-env-warning", "reward 由 verifier 评估最终环境状态，不采信 agent 自报的“完成”。"));
    const right = element("section", "ptoe-k3-env-section");
    right.append(element("h3", "", "Anti-hacking + 案例"));
    right.append(makeCard("三层防线", ["公开 verifier：提供可见诊断", "隐藏 verifier：held-out 测试", "有限提交预算：超预算惩罚"], "danger"));
    right.append(makeCard("黑盒风险评估模块复制", ["公开用例反推逻辑 → 假设 → 测试 → 迭代", "公开 verifier：10/10", "隐藏 verifier：17/20", "reward = 0.85"], "success"));
    right.append(element("p", "ptoe-k3-env-caption", "Verifier 类型：黑盒系统复制 / 定量因子发现 / 税务审计"));
    return makeTwoColumns(left, right);
  };
  const renderWeb = () => {
    const left = element("section", "ptoe-k3-env-section");
    left.append(element("h3", "", "从一行描述到完整 Web 应用"));
    left.append(element("p", "ptoe-k3-env-progression", "一行描述 → 多段规格 → 完整应用"));
    const products = element("div", "ptoe-k3-env-products");
    ["静态网站", "交互游戏", "3D WebGL", "数据可视化", "SVG", "全栈应用"].forEach((label) => products.append(element("span", "", label)));
    left.append(products, makeCard("训练策略", ["React / Vue / 原生 HTML+CSS 多 scaffold 容器化", "目标：跨 scaffold 泛化"], "blue"));
    left.append(makeCard("Layer 1 — 确定性检查", ["构建成功、运行无报错、基础功能通过"], "blue"), makeCard("Layer 2 — 模型评判", ["源码质量、视觉输出、交互行为"], "blue"), makeCard("Reward 归零", ["构建失败 / 运行报错 / 伪造产物"], "danger"));
    const right = element("section", "ptoe-k3-env-section");
    right.append(element("h3", "", "案例：相机维修管理系统"));
    right.append(makeCard("Figure 10 Completion Curve", ["K3 1.000｜Opus 4.8 0.918", "GPT-5.5 0.893｜Kimi K2.6 0.560"], "blue"));
    right.append(makeSteps(["生成 HTML + CSS 基础布局", "添加 oracle 查询接口", "Three.js 渲染 3D 相机", "实现维修流程状态机", "完整测试并修复报错"]));
    right.append(makeCard("验收", ["构建成功，无运行时错误", "功能测试通过", "源码 B+，视觉 A−，交互 A", "reward = 0.82"], "success"));
    return makeTwoColumns(left, right);
  };
  const pages = [
    ["① 可验证问题", renderVerifiable],
    ["② GPU Kernel", renderKernel],
    ["③ 个人助理", renderAssistant],
    ["④ AET 自主执行", renderAet],
    ["⑤ Web 开发", renderWeb],
  ];
  const activate = (index) => {
    [...tabs.children].forEach((button, buttonIndex) => {
      button.classList.toggle("active", buttonIndex === index);
      button.setAttribute("aria-selected", String(buttonIndex === index));
    });
    host.replaceChildren(pages[index][1]());
    fadeIn(host);
  };
  pages.forEach(([label], index) => {
    const button = element("button", "", label);
    button.type = "button";
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => activate(index));
    tabs.append(button);
  });
  figure.append(summary, tabs, host, element("p", "ptoe-k3-env-footer", "这五类任务制造了九个专家之间真实的能力差异。百万 token 个人助理轨迹需要专门工程支撑 → 下一页：KV 分层写回与 microVM 快照"));
  activate(0);
  return figure;
};

const buildRmCompareVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "Classic RM 与 CoT RM 准确率对比" });
  addText(svg, 105, 20, "Classic RM", "ptoe-svg-node");
  svg.append(svgElement("rect", { x: 20, y: 34, width: 170, height: 72 }));
  addText(svg, 105, 55, "题目 + 标准答案 + 回答", "ptoe-svg-caption");
  addText(svg, 105, 78, "→ 直接输出 0.3", "ptoe-svg-push");
  addText(svg, 105, 100, "无显式判断过程", "ptoe-svg-caption");
  addText(svg, 105, 135, "84.4%", "ptoe-svg-push");
  addText(svg, 315, 20, "CoT RM", "ptoe-svg-node");
  svg.append(svgElement("rect", { x: 230, y: 34, width: 170, height: 72, class: "active" }));
  addText(svg, 315, 55, "输入相同", "ptoe-svg-caption");
  addText(svg, 315, 78, "→ 推导等价性 →", "ptoe-svg-value");
  addText(svg, 315, 100, "{correct: true}", "ptoe-svg-node");
  addText(svg, 315, 135, "98.5%", "ptoe-svg-pull");
  return svg;
};

const buildRubricVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "回答 A 与 B 经过三层 Rubric 比较并由客观奖励闭环校准" });
  [[18, "回答 A"], [18, "回答 B"]].forEach(([x, label], index) => {
    const y = 28 + index * 52;
    svg.append(svgElement("rect", { x, y, width: 76, height: 36 }));
    addText(svg, x + 38, y + 23, label, "ptoe-svg-node");
  });
  addText(svg, 112, 76, "→", "ptoe-svg-arrow");
  ["Core", "Anti-Hack", "Human"].forEach((label, index) => {
    const y = 18 + index * 38;
    svg.append(svgElement("rect", { x: 132, y, width: 102, height: 28, class: index === 1 ? "active" : "" }));
    addText(svg, 183, y + 19, label, "ptoe-svg-node");
  });
  addText(svg, 252, 76, "→", "ptoe-svg-arrow");
  svg.append(svgElement("rect", { x: 274, y: 39, width: 126, height: 58, class: "active" }));
  addText(svg, 337, 62, "B 更好", "ptoe-svg-value");
  addText(svg, 337, 82, "逐项理由可复查", "ptoe-svg-caption");
  svg.append(svgElement("path", { d: "M380 108 C360 142 168 145 126 117", class: "pull", fill: "none" }));
  addText(svg, 252, 136, "客观 verifier reward → 校准 critic", "ptoe-svg-pull");
  return svg;
};

const buildGrmVisual = () => {
  const figure = element("figure", "ptoe-grm-visual");
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", "K2.5 视觉 Reward：统一 GRM 读图读文并产生连续信号");
  const problem = element("section", "ptoe-grm-problem");
  problem.append(element("h3", "", "视觉任务的 reward 为什么难算"));
  const problemGrid = element("div", "ptoe-grm-problem-grid");
  const textProblem = element("div", "ptoe-grm-problem-card text");
  textProblem.append(element("strong", "", "文本任务"), element("p", "", "数学：规则验证 → 0 / 1"), element("p", "", "代码：执行验证 → 0 / 1"), element("small", "", "reward 来源：确定性验证器"));
  const visionProblem = element("div", "ptoe-grm-problem-card vision");
  visionProblem.append(element("strong", "", "视觉任务"), element("p", "", "“图中的猫在窗台左侧” → 需要看图"), element("p", "", "纯文本 RM 无法理解图片"), element("small", "", "需要同时读图读文的 reward model"));
  problemGrid.append(textProblem, element("span", "ptoe-grm-problem-divider"), visionProblem);
  problem.append(problemGrid);
  const split = element("div", "ptoe-grm-split");
  const inputPanel = element("section", "ptoe-grm-panel");
  inputPanel.append(element("h3", "", "GRM = 同时接收图文的统一 VLM"));
  const inputSvg = svgElement("svg", { class: "ptoe-grm-svg", viewBox: "0 0 520 230", role: "img", "aria-label": "图像 patch 与模型输出文本融合进入 GRM，再按任务输出三种 reward" });
  inputSvg.append(svgElement("rect", { x: 12, y: 28, width: 132, height: 42, class: "reference" }), svgElement("rect", { x: 12, y: 150, width: 132, height: 42, class: "reference" }));
  addText(inputSvg, 78, 53, "图像 patch", "ptoe-svg-node");
  addText(inputSvg, 78, 175, "输出文本", "ptoe-svg-node");
  inputSvg.append(svgElement("path", { d: "M144 49 H190 V108 H230", class: "pull", fill: "none" }), svgElement("path", { d: "M144 171 H190 V122 H230", class: "pull", fill: "none" }), svgElement("path", { d: "M215 108 L230 108 L220 101 M230 108 L220 115", class: "pull", fill: "none" }));
  inputSvg.append(svgElement("rect", { x: 230, y: 72, width: 120, height: 72, rx: 12, class: "active" }));
  addText(inputSvg, 290, 101, "GRM（VLM）", "ptoe-svg-value");
  addText(inputSvg, 290, 122, "融合读图 + 读文", "ptoe-svg-caption");
  const outputs = [["Grounding", "IoU", "0.68"], ["OCR", "1−编辑距离/长度", "0.90"], ["开放问答", "K2 LLM verifier", "0.80"]];
  outputs.forEach(([title, formula, score], index) => {
    const y = 18 + index * 70;
    inputSvg.append(svgElement("path", { d: `M350 108 H380 V${y + 22} H392`, class: "arrow", fill: "none" }), svgElement("rect", { x: 392, y, width: 116, height: 48, rx: 6, class: index === 2 ? "active" : "" }));
    addText(inputSvg, 450, y + 18, title, "ptoe-svg-node");
    addText(inputSvg, 450, y + 33, `${formula} → ${score}`, index === 2 ? "ptoe-svg-value" : "ptoe-svg-caption");
  });
  inputPanel.append(inputSvg, element("p", "ptoe-grm-caption", "同一个 GRM 处理三种视觉任务；reward 类型随任务自动切换，0.80 是开放问答样例，不是前两项的平均。"));
  const signalPanel = element("section", "ptoe-grm-panel");
  signalPanel.append(element("h3", "", "为什么 reward 必须是连续的"));
  const signalSvg = svgElement("svg", { class: "ptoe-grm-svg", viewBox: "0 0 460 230", role: "img", "aria-label": "二值 reward 与连续 reward 对比" });
  addText(signalSvg, 18, 24, "二值 reward", "ptoe-svg-node", "start");
  signalSvg.append(svgElement("rect", { x: 18, y: 38, width: 190, height: 30, class: "active" }), svgElement("rect", { x: 18, y: 76, width: 190, height: 30, class: "danger" }));
  addText(signalSvg, 30, 58, "0–10px → 1", "ptoe-svg-node", "start");
  addText(signalSvg, 30, 96, "10–500px → 0", "ptoe-svg-node", "start");
  addText(signalSvg, 18, 125, "差 5px 和差 500px，惩罚完全相同；梯度无法区分", "ptoe-svg-push", "start");
  addText(signalSvg, 18, 155, "↓ 连续 reward 让模型知道：方向对了，还不够", "ptoe-svg-arrow", "start");
  addText(signalSvg, 18, 184, "连续 reward", "ptoe-svg-node", "start");
  signalSvg.append(svgElement("path", { d: "M18 218 C95 190 150 198 210 208 S340 230 430 216", fill: "none", stroke: "var(--green)", "stroke-width": 4 }));
  [[62, 201, "差 5px → 0.95"], [190, 211, "差 50px → 0.70"], [330, 222, "差 200px → 0.30"]].forEach(([x, y, label], index) => {
    signalSvg.append(svgElement("circle", { cx: x, cy: y, r: 5, class: index === 1 ? "warning" : index === 2 ? "danger" : "active" }));
    addText(signalSvg, x, y - 9, label, "ptoe-svg-caption");
  });
  signalPanel.append(signalSvg, element("p", "ptoe-grm-takeaway", "接近目标的答案得到部分信用 → 梯度推动模型朝正确方向继续移动"));
  split.append(inputPanel, signalPanel);
  figure.append(problem, split, element("p", "ptoe-grm-source", "来源：Kimi K2.5 Technical Report §3（joint multimodal RL 与 visual reward design）"));
  return figure;
};

const buildAgenticGrmVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "Agentic GRM 的 Read Rubric Score Scorepad 四步协议" });
  [
    ["① Read", "完整读完"], ["② Rubric", "动态立尺"], ["③ Score", "逐项判定"], ["④ Scorepad", "结构汇总"],
  ].forEach(([title, note], index) => {
    const x = 10 + index * 103;
    svg.append(svgElement("rect", { x, y: 28, width: 88, height: 62, class: index === 3 ? "active" : "" }));
    addText(svg, x + 44, 54, title, "ptoe-svg-node");
    addText(svg, x + 44, 75, note, "ptoe-svg-caption");
    if (index < 3) addText(svg, x + 96, 63, "→", "ptoe-svg-arrow");
  });
  svg.append(svgElement("line", { x1: 20, y1: 116, x2: 285, y2: 116, class: "divider" }));
  svg.append(svgElement("line", { x1: 300, y1: 101, x2: 300, y2: 134, class: "push" }));
  addText(svg, 204, 108, "参考长度 σ·ℓ₀", "ptoe-svg-caption");
  addText(svg, 350, 121, "超长 → penalty", "ptoe-svg-push");
  addText(svg, 210, 146, "先审质量，再独立审成本", "ptoe-svg-pull");
  return svg;
};

const buildLengthPenaltyVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "正确与错误回答的长度奖励曲线" });
  svg.append(svgElement("line", { x1: 52, y1: 18, x2: 52, y2: 128, class: "divider" }));
  svg.append(svgElement("line", { x1: 40, y1: 74, x2: 396, y2: 74, class: "divider" }));
  svg.append(svgElement("path", { d: "M58 30 L374 120", fill: "none", stroke: "var(--blue)", "stroke-width": 3 }));
  svg.append(svgElement("path", { d: "M58 74 L216 74 L374 124", fill: "none", stroke: "var(--accent)", "stroke-width": 3 }));
  addText(svg, 82, 26, "正确：短答奖励", "ptoe-svg-pull", "start");
  addText(svg, 250, 102, "错误：只惩罚长答", "ptoe-svg-push", "start");
  addText(svg, 18, 34, "+", "ptoe-svg-value");
  addText(svg, 18, 122, "−", "ptoe-svg-push");
  addText(svg, 58, 145, "短", "ptoe-svg-caption");
  addText(svg, 380, 145, "长", "ptoe-svg-caption");
  addText(svg, 216, 68, "λ=0", "ptoe-svg-node");
  return svg;
};

const buildBudgetVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "不同长度轨迹与硬 token 上限" });
  svg.append(svgElement("line", { x1: 310, y1: 14, x2: 310, y2: 120, class: "push" }));
  addText(svg, 310, 12, "任务上限 B", "ptoe-svg-push");
  [["提前完成", 210, "✓ reward=1"], ["边界前完成", 294, "✓"], ["仍未完成", 370, "截断 → 0"]].forEach(([label, end, result], index) => {
    const y = 36 + index * 38;
    addText(svg, 18, y + 5, label, "ptoe-svg-node", "start");
    svg.append(svgElement("rect", { x: 96, y: y - 9, width: Number(end) - 96, height: 18, class: index === 2 ? "danger" : "active" }));
    addText(svg, 382, y + 5, result, index === 2 ? "ptoe-svg-push" : "ptoe-svg-pull", "end");
  });
  addText(svg, 210, 142, "数学 8K　/　代码 12K　/　工具 20K（教学示意）", "ptoe-svg-caption");
  return svg;
};

const buildToggleVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "Budget-Limited 与 Standard Scaling 的条件切换" });
  svg.append(svgElement("line", { x1: 44, y1: 16, x2: 44, y2: 126, class: "divider" }));
  svg.append(svgElement("line", { x1: 44, y1: 126, x2: 396, y2: 126, class: "divider" }));
  svg.append(svgElement("path", { d: "M50 108 L50 42 L135 42 L135 108 L220 108 L220 42 L300 42 L300 108 L390 108", fill: "none", stroke: "var(--accent)", "stroke-width": 3 }));
  svg.append(svgElement("path", { d: "M50 94 C105 76 145 62 195 70 C248 78 300 58 390 68", fill: "none", stroke: "var(--blue)", "stroke-width": 2 }));
  svg.append(svgElement("line", { x1: 44, y1: 74, x2: 396, y2: 74, stroke: "var(--green)", "stroke-dasharray": "5 5" }));
  addText(svg, 14, 46, "ON", "ptoe-svg-push");
  addText(svg, 14, 112, "OFF", "ptoe-svg-value");
  addText(svg, 382, 70, "λ", "ptoe-svg-pull");
  addText(svg, 92, 34, "压缩", "ptoe-svg-push");
  addText(svg, 177, 119, "放开", "ptoe-svg-value");
  addText(svg, 260, 34, "再压缩", "ptoe-svg-push");
  addText(svg, 220, 146, "准确率跌破 λ → 预算立即关闭", "ptoe-svg-caption");
  return svg;
};

const buildTauVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "按题基准长度乘以不同推理强度 tau 并逐阶段退火" });
  [["max", 350, "宽松"], ["high", 276, "平衡"], ["low", 198, "严格"]].forEach(([label, end, note], index) => {
    const y = 30 + index * 36;
    addText(svg, 18, y + 5, label, "ptoe-svg-node", "start");
    svg.append(svgElement("line", { x1: 82, y1: y, x2: end, y2: y, stroke: index === 0 ? "var(--blue)" : "var(--accent)", "stroke-width": 5 }));
    [0.35, 0.58, 0.82].forEach((ratio) => svg.append(svgElement("circle", { cx: 82 + (Number(end) - 82) * ratio, cy: y, r: 4, class: "student" })));
    addText(svg, Number(end) + 14, y + 5, note, "ptoe-svg-caption", "start");
  });
  svg.append(svgElement("path", { d: "M74 132 L190 132 L190 124 L284 124 L284 116 L374 116", fill: "none", stroke: "var(--green)", "stroke-width": 3 }));
  addText(svg, 210, 148, "课程：max → high → low　Coding τ > General τ", "ptoe-svg-pull");
  return svg;
};

const buildValueFreeVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "先走错再回退并最终答对的整链奖励" });
  const points = [[30,72,"开始"],[112,38,"错误假设"],[202,92,"发现矛盾"],[292,50,"回退修正"],[390,72,"答对"]];
  points.forEach(([x,y,label],index)=>{
    if(index) svg.append(svgElement("line",{x1:points[index-1][0]+20,y1:points[index-1][1],x2:Number(x)-20,y2:y,class:"divider"}));
    svg.append(svgElement("circle",{cx:x,cy:y,r:18,class:index===4?"student":"",fill:index===4?undefined:"var(--surface)",stroke:index===4?undefined:"var(--line-strong)","stroke-width":2}));
    addText(svg,x,y+4,String(index+1),"ptoe-svg-node");
    addText(svg,x,y+32,label,index===1?"ptoe-svg-push":"ptoe-svg-caption");
  });
  addText(svg,205,18,"不在中间节点打分", "ptoe-svg-value");
  svg.append(svgElement("line",{x1:30,y1:130,x2:390,y2:130,stroke:"var(--blue)","stroke-width":3}));
  addText(svg,210,145,"最终 reward=1 → 整条探索—纠错链被鼓励", "ptoe-svg-pull");
  return svg;
};

const buildLong2ShortVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "Long2Short 四种蒸馏方法由弱到强" });
  [["① Merge","权重平均","零样本"],["② Shortest RS","最短正确","正样本"],["③ DPO","短 ≻ 长","正 + 负"],["④ RL","缩小预算","on-policy"]].forEach(([title,action,signal],index)=>{
    const x=8+index*103;
    svg.append(svgElement("rect",{x,y:30,width:90,height:78,class:index===3?"active":""}));
    addText(svg,x+45,52,title,"ptoe-svg-node");
    addText(svg,x+45,76,action,index===3?"ptoe-svg-value":"ptoe-svg-caption");
    addText(svg,x+45,98,signal,"ptoe-svg-caption");
    if(index<3) addText(svg,x+97,72,"→","ptoe-svg-arrow");
  });
  svg.append(svgElement("line",{x1:36,y1:128,x2:384,y2:128,stroke:"var(--accent)","stroke-width":3}));
  addText(svg,210,146,"压缩监督由弱 → 强　训练成本同时上升","ptoe-svg-push");
  return svg;
};

const buildPtxVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "RL batch 中混入少量 PTX SFT 锚点" });
  addText(svg,18,20,"一个训练 batch","ptoe-svg-node","start");
  for(let index=0;index<32;index+=1){
    const x=20+(index%8)*34;
    const y=34+Math.floor(index/8)*24;
    const anchor=index===7||index===24;
    svg.append(svgElement("rect",{x,y,width:26,height:16,class:anchor?"reference":"active"}));
  }
  addText(svg,312,50,"30 × RL","ptoe-svg-push","start");
  addText(svg,312,76,"2 × SFT 锚点","ptoe-svg-value","start");
  svg.append(svgElement("line",{x1:292,y1:92,x2:390,y2:92,class:"divider"}));
  addText(svg,312,116,"LRL + α·LPTX","ptoe-svg-node","start");
  addText(svg,304,138,"α 小：只防遗忘","ptoe-svg-caption","start");
  return svg;
};

const buildMopdVisual = () => {
  const svg = svgElement("svg", { class: "ptoe-detail-visual", viewBox: "0 0 420 150", role: "img", "aria-label": "九位教师为学生自己的 token 轨迹提供稠密奖励" });
  for(let index=0;index<9;index+=1){
    const x=14+(index%3)*34;
    const y=18+Math.floor(index/3)*28;
    svg.append(svgElement("rect",{x,y,width:27,height:20,class:index===8?"active":""}));
    addText(svg,x+13.5,y+14,`T${index+1}`,"ptoe-svg-caption");
  }
  addText(svg,64,116,"9 teachers","ptoe-svg-node");
  addText(svg,138,72,"→","ptoe-svg-arrow");
  ["y₁","y₂","y₃","y₄","y₅"].forEach((label,index)=>{
    const x=166+index*45;
    svg.append(svgElement("rect",{x,y:62,width:32,height:28,class:index===2?"active":""}));
    addText(svg,x+16,81,label,"ptoe-svg-node");
    addText(svg,x+16,50,index===1?"−":"+",index===1?"ptoe-svg-push":"ptoe-svg-pull");
  });
  addText(svg,278,112,"学生自己的 on-policy 轨迹","ptoe-svg-value");
  svg.append(svgElement("line",{x1:166,y1:130,x2:378,y2:130,stroke:"var(--green)","stroke-width":3}));
  addText(svg,272,146,"每 token 稠密反馈；整链后统一更新","ptoe-svg-pull");
  return svg;
};

const buildEagleVisual = () => {
  const figure = element("figure", "ptoe-k3-draft-visual");
  figure.setAttribute("aria-label", "K3 后训练最后一步：把 MTP draft 层重新对齐 MOPD 后的主模型");

  const position = element("section", "ptoe-k3-draft-position");
  position.append(element("h3", "", "这是 K3 后训练的最后一步"));
  const timeline = element("div", "ptoe-k3-draft-timeline");
  ["SFT 冷启动", "9 Experts RL", "MOPD 蒸馏", "Draft FT\n当前", "部署"].forEach((label, index, nodes) => {
    timeline.append(element("div", `ptoe-k3-draft-node${index === 3 ? " current" : ""}`, label));
    if (index < nodes.length - 1) timeline.append(element("span", "ptoe-k3-draft-arrow", "→"));
  });
  position.append(timeline, element("p", "ptoe-k3-draft-position-note", "主模型冻结，只更新 MTP draft 层；让 draft 分布重新贴近后训练后的主模型。"));

  const middle = element("div", "ptoe-k3-draft-middle");
  const mismatch = element("section", "ptoe-k3-draft-mismatch");
  mismatch.append(element("h3", "", "MOPD 之后主模型变了，MTP 层没有跟上"));
  [
    ["01", "预训练结束时", "MTP 层与主模型在同一分布下训练，偏差小；draft 猜测大多会被接受。", "pretraining"],
    ["02", "MOPD 蒸馏之后", "主模型吸收九个专家行为，分布改变；MTP 仍停在预训练分布，acceptance rate 下降。", "misaligned"],
    ["03", "Draft FT 之后", "只微调 MTP 层，主模型冻结；两者重新对齐，推测解码的收益恢复。", "aligned"],
  ].forEach(([step, title, text, className]) => {
    const row = element("div", `ptoe-k3-draft-step ${className}`);
    row.append(element("b", "", step), element("strong", "", title), element("p", "", text));
    mismatch.append(row);
  });
  mismatch.append(element("p", "ptoe-k3-draft-safety", "主模型输出分布全程不变。候选被拒绝时回退到主模型分布，因此推测解码不改变生成质量。"));

  const speed = element("section", "ptoe-k3-draft-speed");
  speed.append(element("h3", "", "推测解码怎么省时间"));
  const comparison = svgElement("svg", { class: "ptoe-detail-visual ptoe-k3-draft-comparison", viewBox: "0 0 420 150", role: "img", "aria-label": "串行生成读取四次主模型权重，推测解码只需一次并行验证" });
  addText(comparison, 96, 18, "普通串行", "ptoe-svg-node");
  [0, 1, 2, 3].forEach((index) => {
    const x = 18 + index * 46;
    comparison.append(svgElement("rect", { x, y: 38, width: 34, height: 30 }));
    addText(comparison, x + 17, 58, `y${index + 1}`, "ptoe-svg-node");
    addText(comparison, x + 17, 82, "读权重", "ptoe-svg-caption");
  });
  addText(comparison, 96, 108, "4× 主模型读取", "ptoe-svg-push");
  comparison.append(svgElement("line", { x1: 210, y1: 20, x2: 210, y2: 126, class: "divider" }));
  addText(comparison, 314, 18, "EAGLE-3", "ptoe-svg-node");
  [0, 1, 2, 3].forEach((index) => {
    const x = 228 + index * 44;
    comparison.append(svgElement("rect", { x, y: 38, width: 32, height: 30, class: "reference" }));
    addText(comparison, x + 16, 58, `ŷ${index + 1}`, "ptoe-svg-value");
  });
  comparison.append(svgElement("rect", { x: 228, y: 78, width: 164, height: 34, class: "active" }));
  addText(comparison, 310, 100, "主模型 1× 并行验证", "ptoe-svg-node");
  addText(comparison, 310, 132, "p↑ → 接受更多 → 权重少读", "ptoe-svg-pull");
  speed.append(comparison, element("p", "ptoe-k3-draft-speed-note", "acceptance rate p 越高，一次验证保留的 token 越多。连续接受长度的教学上限约为 1 / (1−p)。"));
  middle.append(mismatch, speed);

  const lower = element("div", "ptoe-k3-draft-lower");
  const loss = element("section", "ptoe-k3-draft-loss");
  loss.append(
    element("h3", "", "为什么用 ℒ_LK，而不是只优化 KL"),
    element("p", "", "KL 衡量两个分布的整体差异，却不直接等于候选被接受的概率。这里真正要恢复的是 acceptance rate。"),
    element("code", "muted", "KL　D_KL(q ‖ p) = ∑ₓ q(x) log(q(x) / p(x))\n　　不直接优化接受率"),
    element("code", "primary", "ℒ_LK = −log ∑ₓ∈V min(p(x), q(x))\n　　 ∑ min(p,q) 正是 acceptance rate"),
    element("strong", "", "最小化 ℒ_LK，就是直接最大化主模型接受 draft 候选的概率。"),
  );
  const training = element("section", "ptoe-k3-draft-training");
  training.append(element("h3", "", "只改 draft，不动主模型"));
  const params = element("div", "ptoe-k3-draft-params");
  [["✓", "MTP draft 层参数"], ["✓", "feature-fusion projection（W_E3）"], ["×", "主模型所有参数：冻结"]].forEach(([mark, text], index) => {
    const row = element("p", index === 2 ? "frozen" : "trainable");
    row.append(element("b", "", mark), document.createTextNode(text));
    params.append(row);
  });
  training.append(
    params,
    element("p", "ptoe-k3-draft-unroll", "7 步 unroll：第 1 步读取主模型第 1 / 4 / final AttnRes 特征；第 2–7 步只使用 draft 自己此前的输出。"),
    element("p", "ptoe-k3-draft-reason", "这样模拟推理时 draft 独立运行，避免训练与推理的输入来源错位。"),
    element("p", "ptoe-k3-draft-qat", "QAT 配置延续：MoE 专家权重 MXFP4，激活 MXFP8，非专家模块保持高精度。"),
  );
  lower.append(loss, training);

  figure.append(position, middle, lower, element("p", "ptoe-k3-draft-close", "完整闭环：SFT 冷启动 → 9 Experts RL → MOPD 合一 → Draft FT 降低推理延迟 → 部署。MTP 机制参见“预训练 → MTP”。"));
  return figure;
};

const buildVisual = (card) => {
  if (card.visual?.type === "tool-synthesis") return buildToolSynthesisVisual();
  if (card.visual?.type === "triptych") return buildTriptychVisual(card);
  if (card.visual?.type === "token-clip") return buildTokenClipVisual(card);
  if (card.visual?.type === "zero-vision") return buildZeroVisionVisual();
  if (card.visual?.type === "k3-sft") return buildK3SftVisual();
  if (card.visual?.type === "k3-policy") return buildK3PolicyVisual();
  if (card.visual?.type === "k3-environment") return buildK3EnvironmentVisual();
  if (card.visual?.type === "verifier") return buildVerifierVisual();
  if (card.visual?.type === "capability") return buildCapabilityVisual();
  if (card.visual?.type === "expert-grid") return buildExpertGridVisual();
  if (card.visual?.type === "rm-compare") return buildRmCompareVisual();
  if (card.visual?.type === "rubric") return buildRubricVisual();
  if (card.visual?.type === "grm") return buildGrmVisual();
  if (card.visual?.type === "agentic-grm") return buildAgenticGrmVisual();
  if (card.visual?.type === "length-penalty") return buildLengthPenaltyVisual();
  if (card.visual?.type === "budget") return buildBudgetVisual();
  if (card.visual?.type === "toggle") return buildToggleVisual();
  if (card.visual?.type === "tau") return buildTauVisual();
  if (card.visual?.type === "value-free") return buildValueFreeVisual();
  if (card.visual?.type === "long2short") return buildLong2ShortVisual();
  if (card.visual?.type === "ptx") return buildPtxVisual();
  if (card.visual?.type === "mopd") return buildMopdVisual();
  if (card.visual?.type === "eagle") return buildEagleVisual();
  return buildFlowVisual(card);
};

const buildPipeline = (state, selectGroup) => {
  const map = element("section", "ptoe-map ptoe-pipeline-map");
  PIPELINES.forEach((pipeline) => {
    const row = element("section", `ptoe-pipeline-row ${pipeline.id}`);
    const heading = element("header", "ptoe-pipeline-version");
    heading.append(element("strong", "", pipeline.label), element("small", "", pipeline.subtitle));
    const flow = element("div", "ptoe-pipeline-flow");
    pipeline.stages.forEach((stage) => {
      const stageNode = element("section", "ptoe-pipeline-stage");
      stageNode.style.setProperty("--stage-weight", stage.weight);
      stageNode.append(element("strong", "ptoe-pipeline-stage-label", stage.label));
      const modules = element("div", "ptoe-pipeline-modules");
      if (stage.note) modules.append(element("span", "ptoe-pipeline-note", stage.note));
      (stage.groups || []).forEach((group) => {
        const selected = group.cards.some(([id]) => id === state.selectedLabel);
        const button = element("button", `ptoe-pipeline-module ${selected ? "selected" : ""}`, group.label);
        button.type = "button";
        button.dataset.group = group.id;
        button.setAttribute("aria-pressed", String(selected));
        button.addEventListener("click", () => selectGroup(group));
        modules.append(button);
      });
      stageNode.append(modules);
      flow.append(stageNode);
    });
    row.append(heading, flow);
    map.append(row);
  });
  return map;
};

const buildEmptyDetail = (id) => {
  const side = element("aside", "ptoe-detail ptoe-empty-detail");
  side.append(
    element("span", "ptoe-empty-number", "—"),
    element("h2", "", id ? "该机制卡片尚未进入本轮" : "从左侧选择一个机制"),
    element("p", "", id ? "当前先校验已完成卡片的内容与版面，再继续生成这一张。" : "每张卡会依次回答：为什么要改、机制如何工作、公式怎样落到案例。"),
  );
  return side;
};

const buildFormulaPanel = (card) => {
  const panel = element("section", "ptoe-formula-panel");
  const formulas = element("div", "ptoe-formulas");
  card.formulas.forEach((formula) => formulas.append(element("code", "", formula)));
  panel.append(formulas, element("p", "ptoe-case", card.example));
  const deep = element("div", "ptoe-deep-dive");
  card.deepDive.forEach((item) => deep.append(element("p", "", item)));
  panel.append(deep);
  return panel;
};

const buildDetail = (id, state, persist, rerender, selectCard) => {
  const card = getCard(id);
  if (!card) return buildEmptyDetail(id);
  const group = getPipelineGroup(id);
  const singleView = ["reward-k25", "rl-k25", "sft-k25", "sft-k3", "rl-k3", "domain-k3", "env-k3", "rl-k3-eagle"].includes(id);
  const detailTab = singleView ? "mechanism" : state.detailTab;
  const side = element("aside", `ptoe-detail${singleView ? " ptoe-detail-single" : ""}`);
  const top = element("section", "ptoe-detail-top");
  const heading = element("header", "ptoe-detail-heading");
  const title = element("div", "ptoe-detail-title");
  title.append(element("small", "", group?.label || "训练模块"), element("h2", "", card.title));
  heading.append(element("span", "ptoe-version-badge", card.version), title);
  top.append(heading);
  if (group?.cards.length > 1) {
    const solutions = element("div", "segment-control ptoe-solution-tabs");
    group.cards.forEach(([cardId, label]) => {
      const button = element("button", cardId === id ? "active" : "", label);
      button.type = "button";
      button.addEventListener("click", () => selectCard(cardId, true));
      solutions.append(button);
    });
    top.append(solutions);
  }
  const tabs = element("div", "segment-control ptoe-detail-tabs");
  if (!singleView) {
    [["story", "① 背景"], ["mechanism", "② 可视化"], ["formula", "③ 公式 · 案例"]].forEach(([tabId, label]) => {
      const button = element("button", detailTab === tabId ? "active" : "", label);
      button.type = "button";
      button.addEventListener("click", () => {
        state.detailTab = tabId;
        persist();
        rerender();
      });
      tabs.append(button);
    });
  }
  const page = element("section", `ptoe-detail-page ${detailTab}`);
  if (detailTab === "story") {
    const list = element("ol", "ptoe-story-points");
    card.problem.forEach((item) => list.append(element("li", "", item)));
    page.append(element("span", "ptoe-story-label", "身处这一代，先看它遇到的墙"), list, element("p", "ptoe-story-bridge", card.bridge));
  } else if (detailTab === "mechanism") {
    if (id === "rl-k15") {
      page.append(buildMirrorDescentExperiment(state, persist));
    } else {
      page.append(buildVisual(card));
      if (!singleView) {
        const list = element("ul", "ptoe-mechanism-points");
        card.mechanism.forEach((item) => list.append(element("li", "", item)));
        page.append(list);
      }
      if (card.mechanismNext) page.append(element("p", "ptoe-next-step", `下一步：${card.mechanismNext}`));
    }
  } else {
    page.append(buildFormulaPanel(card));
    if (card.next) page.append(element("p", "ptoe-next-step", `下一步：${card.next}`));
  }
  side.append(top, element("p", "ptoe-oneliner", card.oneliner));
  if (tabs.childNodes.length) side.append(tabs);
  side.append(page, element("p", "ptoe-detail-source", `来源：${card.source}`));
  return side;
};

const buildSegments = (state, selectView) => {
  const segments = element("div", "segment-control ptoe-segments");
  [["pipeline", "训练管线"], ["table", "参数总览"]].forEach(([id, label]) => {
    const button = element("button", state.leftView === id ? "active" : "", label);
    button.type = "button";
    button.addEventListener("click", () => selectView(id));
    segments.append(button);
  });
  return segments;
};

const buildTable = (segments) => {
  const view = element("section", "ptoe-table-view");
  const heading = element("header", "ptoe-table-heading");
  heading.append(segments, element("h2", "", "四代后训练参数总览"), element("p", "", "从激发推理，到扩域、统一，再到专家分化与蒸馏。"));
  const table = element("div", "ptoe-comparison-table");
  ["维度", "K1.5", "K2", "K2.5", "K3"].forEach((item, index) => table.append(element("strong", index === 4 ? "featured" : "", item)));
  TABLE_ROWS.forEach((row) => row.forEach((item, index) => table.append(element(index === 0 ? "strong" : "span", index === 4 ? "featured" : "", item))));
  view.append(heading, table, element("p", "ptoe-table-source", "来源：K1.5 §2；K2 §4–§5；K2.5 §3–§4；K3 §4。"));
  return view;
};

export const renderPosttrainingEvolution = (block, context) => {
  const stored = context.getValue(block.id, {});
  const validLabels = new Set(PIPELINE_CARD_IDS);
  const state = {
    leftView: stored.leftView === "table" ? "table" : "pipeline",
    selectedLabel: validLabels.has(stored.selectedLabel) ? stored.selectedLabel : "rl-k15",
    detailTab: ["story", "mechanism", "formula"].includes(stored.detailTab) ? stored.detailTab : "story",
    mirrorTheta: Math.min(2, Math.max(-2, Number(stored.mirrorTheta) || 0)),
  };
  const root = element("article", "block posttraining-evolution");
  root.dataset.track = block.id;
  root.tabIndex = 0;
  root.addEventListener("focusin", () => context.activateTrack(block.id));
  const claims = element("ul", "ptoe-claims");
  block.claims.forEach((claim) => claims.append(element("li", "", claim)));
  const viewport = element("div", "ptoe-viewport");
  const persist = () => {
    context.setValue(block.id, { ...state });
    context.persist();
  };
  const selectView = (id) => {
    state.leftView = id;
    persist();
    render();
  };
  const selectCard = (id, preserveTab = false) => {
    state.selectedLabel = id;
    if (!preserveTab) state.detailTab = "story";
    persist();
    render();
  };
  const selectGroup = (group) => {
    const ids = group.cards.map(([id]) => id);
    selectCard(ids.includes(state.selectedLabel) ? state.selectedLabel : ids[0]);
  };
  const render = () => {
    const segments = buildSegments(state, selectView);
    if (state.leftView === "table") {
      viewport.replaceChildren(buildTable(segments));
      return;
    }
    const main = element("section", "ptoe-main");
    const left = element("section", "ptoe-left");
    const toolbar = element("div", "ptoe-left-toolbar");
    toolbar.append(segments);
    const map = buildPipeline(state, selectGroup);
    left.append(toolbar, map);
    const detail = buildDetail(state.selectedLabel, state, persist, render, selectCard);
    main.append(left, detail);
    viewport.replaceChildren(main);
    fadeIn(map);
    fadeIn(detail);
  };
  root.trackNavigate = (direction) => {
    if (state.leftView === "table") return false;
    const ids = PIPELINE_CARD_IDS;
    const current = ids.indexOf(state.selectedLabel);
    const next = current + direction;
    if (next < 0 || next >= ids.length) return false;
    selectCard(ids[next]);
    root.focus({ preventScroll: true });
    return true;
  };
  render();
  root.append(claims, viewport, element("p", "ptoe-source", `来源：${block.source}`));
  return root;
};
