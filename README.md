# Kimi K1.5 → K3：大模型技术演进交互解析

基于 Kimi 四篇原始技术报告构建的交互式技术解析项目。
费曼式逐层推导——从设计者面对的问题出发，走到每一个技术决策的必然性。

---

## 为什么做这个

读技术报告最难的是理解"为什么要这么设计"。

K2 引入 MLA，因为长上下文的 KV cache 撑爆了显存。
K2.5 做 Zero-Vision SFT，因为视觉 CoT 标注数据根本收集不到。
K3 用九个专家模型，因为单模型覆盖太多任务时梯度互相拉扯。

每个技术决策背后都有一个具体的工程痛点。这个项目把这条因果链从头到尾走一遍。

---

## 覆盖内容

**架构演进**
- KV Cache：从"为什么需要"到 MHA → MQA → GQA → MLA 的逐步推导
- KDA + NoPE：RoPE 的外推上限是什么，K3 如何从根本上绕开它
- MoE：专家路由、负载均衡、K2 → K3 专家数量扩张三倍意味着什么

**预训练**
- 数据工程：质量清洗 → 采样预算 → 合成扩增的完整管线
- 知识图谱驱动合成：用图谱相邻节点自动生成跨概念推理题
- 序列课程：从 4K 到 128K 上下文长度的分阶段训练策略

**后训练**
- Long-CoT RL：Mirror Descent、KL 约束、为什么不需要 value network
- 工具调用扩域：K2 三阶段合成管线，把可验证奖励从数学扩展到智能体
- 多模态 RL：按能力分域，视觉训练意外带动文本 benchmark 同步提升
- 长度控制演进：长度惩罚 → 硬截断 → Toggle → Reasoning Effort RL
- MOPD：九个领域专家联合蒸馏一个学生模型

---

## 一个贯穿四代的观察

Tier 1 模型能力仍处于快速提升阶段。架构、数据、训练方法，任何一个维度的突破都能在细分能力上带来可观的边际提升。

| 版本 | 核心突破 | 解决的问题 |
|------|----------|------------|
| K1.5 | Long-CoT RL 管线 | 让模型自己学会推理 |
| K2   | MLA + MoE 架构 | 长上下文显存瓶颈 + 模型容量 |
| K2.5 | 联合多模态 RL | 视觉能力冷启动 |
| K3   | MOPD + NoPE + KG 合成 | 多任务能力上限 + 外推上限 + 数据覆盖边界 |

这条线还没收敛。注意力机制的演进未完成，CoT 的 token 效率问题仍在探索，数据边界还在扩张。

---

## 本地运行

```bash
cd v2.1test
npm start
# 浏览器打开 http://localhost:4194
```

无第三方依赖。`npm start` 调用系统 Python 静态服务器。

---

## 工程说明

开工前先读 `AGENTS.md`。以下为维护者参考。

## 最重要的路径规则

**项目内部的所有引用和调用只能使用相对路径。**

- 允许：`./app/main.js`、`../../shared/dom/element.js`
- 允许：`./assets/image.png`
- 禁止：`/Users/name/Desktop/...`
- 禁止：`/src/main.js` 这类站点根路径
- 禁止：依赖 CDN 或远程运行时

整个 `html 演示/` 文件夹移动、改名或归档后，内部关系必须继续成立。新增代码、主题、演示和 PPT 导入结果都必须遵守这条规则。

## 启动

```bash
cd v2.1test
npm start
```

浏览器访问 `http://localhost:4194`。项目没有第三方依赖，`npm start` 只是调用系统 Python 静态服务器。

协议检查：

```bash
npm run check
```

## 显示设置

点击顶栏的 `Aa` 可以切换“跟随系统 / 日间 / 夜间”主题，以及“小 / 中 / 大”三级字号。选择会保存在当前浏览器；默认跟随系统主题并使用中字号。

窄屏设备会将 1280 × 720 的逻辑演示画布等比缩放到 16:9 舞台，避免密集页面在移动端重新排版或裁切。

## 设计系统

- `themes/default/tokens.css`：字体角色、最小字号、语义颜色、间距、描边、圆角、控件、符号和动画变量。
- `shared/styles/base.css`：全局界面骨架与通用面板、表格、控件、标签、公式、图例样式。
- `shared/design/tokens.js`：需要在 JS 中读取的动画和图表常量。
- `pages/*/styles.css`：仅保留页面专属布局、SVG 坐标关系和领域视觉编码。

中字号的全局最小字号为 `11px`，小/中/大分别按 `90% / 100% / 112%` 等比缩放。可见 HTML 与 SVG 文本必须使用 `--text-xs` 至 `--text-display` 或 `--fixed-font-*`；公式、代码、数值和图表标签使用 `--font-mono`，正文和操作文本使用 `--font-sans`。

全局层管理跨页面一致的规则，页面层管理内容、公式、数据、SVG 几何和领域交互。只有至少两个页面共享且语义一致的模式才进入 `shared`。

## 编辑模式

点右上角“编辑”或按 `E` 进入编辑模式：

- 单击组件选中，拖动组件改变位置，拖右下角控制点改变大小。
- 双击标题或正文直接修改文字。
- 工具栏支持新增文本、复制、删除、恢复自动布局、调整层级、撤销和重做。
- 方向键微调位置；按住 `Shift` 时加快。`Cmd/Ctrl + D` 复制，`Delete` 删除。
- 修改自动保存在当前浏览器的 `localStorage`，刷新后继续生效，不会覆盖 `deck.js`。

编辑后的几何位置使用画布百分比保存，演示缩放后仍保持相对位置。新增文本和文字修改属于浏览器本地草稿；需要固化到源码时，再将最终内容写回对应页面的 `page.js`。

## 依赖边界

```text
app → deck → pages → shared
app → core
core ✕ pages
shared ✕ pages
```

- 每个页面文件夹独立维护 `page.js`、`component.js`、`logic.js`、`styles.css` 和 `assets/`。
- 页面可以调用 `shared`，但不能修改、注册或反向注入共享组件。
- `deck.js` 只组合页面顺序、渲染器和样式清单。
- `core` 只负责导航、输入协议、状态持久化和编辑器，不认识具体页面。
- 页面状态由引擎按 `slideId:blockId` 隔离。

## 内容模型

```text
Deck
└─ Slide：一个有进入、退出和连接关系的场景节点
   └─ Block：文本、图片、公式、图表或互动组件
      └─ Track：一层局部切换容器
         └─ Block：普通组件，不允许继续嵌套 Track
```

最小 Slide：

```js
{
  id: "mechanism",
  section: "方案",
  role: "新方案",
  title: "先汇总，再查询",
  layout: "canvas",
  tags: ["candidate"],
  edges: [
    { type: "next", target: "result" },
    { type: "branch", target: "prerequisite" }
  ],
  blocks: []
}
```

### Edge

- `next`：主路径的下一节点
- `branch`：临时进入补充节点，并记录返回位置
- `return`：返回最近一次分支来源
- 标签隐藏的是主路径节点，不删除内容；仍可从侧栏手动查看

### Block

共享组件由 `shared/components/registry.js` 提供。当前包括：

- `hero`、`text`、`image`
- `formula`、`matrix`、`comparison`
- `case`、`simulation`、`actions`
- `track`
- 页面专用组件由各自的 `page.js` 导出，不进入共享注册表

新增组件需要完成三件事：

1. 在页面文件夹实现组件和逻辑。
2. 从 `page.js` 导出 `slide`、`renderers` 和 `style`。
3. 组件只通过传入的 `context` 修改状态或导航。

## 输入归属

```text
点击局部 Track 后按左右键
├─ Track 仍有下一项：切换局部内容并保持焦点
└─ Track 已到边界：不动作

垂直滚轮或上下方向键
└─ 整页接管
```

点击非 Track 区域会清除局部选择，此时左右键不执行任何动作。首期只允许一层局部 Track，避免焦点、尺寸和返回路径失控。

## 目录

```text
v2.1test/
├─ index.html
├─ app/                  启动与全局样式装配
├─ core/                 引擎、导航、状态和编辑器
├─ shared/               全局可复用组件、DOM 工具和基础样式
├─ pages/                每页独立的定义、组件、逻辑、样式与资产
├─ deck.js               页面顺序与关系装配
├─ themes/               设计变量
├─ qa/                   验证截图与 v1 参考归档
└─ tools/                协议检查与导入器边界
```

## PPT 模板适配边界

未来导入器不直接生成一次性 HTML，而是输出 `theme.json`、`layouts.json`、`deck.js`、`assets/` 和 `import-report`。文本、图片、基础形状优先转成可编辑 Block；复杂图表、SmartArt 和原生动画无法可靠转换时使用静态资产兜底，并在报告中明确标记。所有输出继续使用相对路径。

## 当前边界

- 这是播放与组合框架，不是可视化拖拽编辑器。
- 首期不处理协作、多窗口演讲者视图和导出 PDF。
- 首期不承诺任意 PPTX 的像素级自动复刻。
- 示例技术内容用于验证组件，不代表完整报告。
