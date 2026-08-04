# v2test：页面隔离架构实验

由 `v1_test` 复制并重构，验证页面独立维护、共享组件复用和全局引擎统一调度。

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
cd v2test
npm start
```

浏览器访问 `http://localhost:4190`。项目没有第三方依赖，`npm start` 只是调用系统 Python 静态服务器。

协议检查：

```bash
npm run check
```

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
v2test/
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
