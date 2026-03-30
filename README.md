# Canvas 双圆拖拽与相交区域填色

## 简介

用 HTML5 Canvas 画两个可拖动的红色圆；当两圆重叠时，仅**相交区域**用绿色填充，演示 `clip` 与坐标换算。

## 快速开始

### 环境要求

Node.js 18+，本机已安装 PNPM。

### 运行

```bash
cd typescript-vite-react-canvas-two-draggable-circles-intersection-demo
pnpm install
pnpm dev
```

浏览器会打开开发页面；在画布上按住圆心附近拖动即可。

## 概念讲解

### 第一部分：把指针坐标换算成画布像素坐标

画布在 CSS 里可能被缩放，内部 `width`/`height` 与显示尺寸不一致。用 `getBoundingClientRect()` 与画布实际像素宽高做比例换算，才能保证「点在哪、圆就在哪」。

```ts
function canvasPointFromEvent(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || 1;
  const rh = rect.height || 1;
  const sx = canvas.width / rw;
  const sy = canvas.height / rh;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}
```

这段代码把屏幕上的 `clientX/clientY` 转成与 `arc`、`fillRect` 一致的坐标系。

### 第二部分：相交区域只填绿色

**整体顺序是三步，不要漏掉前两步**：先把**整个**圆 1 涂红，再把**整个**圆 2 涂红，最后才做带裁剪的绿色这一步。很多人只看第三步，会疑惑：「第二个圆在窗口外面那半截去哪了？」——那半截**不用在这一步画**，早在第二步整圆涂红时就已经画好了。

带 `clip` 的第三步在干什么：

1. `save()` 保存当前状态。
2. `beginPath` 画第一个圆并 `clip()`，之后绘制内容只出现在第一个圆内。
3. 再 `beginPath` 画第二个圆并 `fill()`，颜色为绿色。路径仍然是**完整的**第二个圆，但当前裁剪区是第一个圆，所以**只有两圆重叠处的像素会真的被改色**；圆 2 落在圆 1 外面的部分，这次填充就像被裁掉一样，不会画到画布上（也不需要单独处理——它们已经是红色的了）。
4. `restore()` 取消裁剪。

```ts
ctx.save();
ctx.beginPath();
ctx.arc(c1.x, c1.y, R, 0, Math.PI * 2);
ctx.clip();
ctx.beginPath();
ctx.arc(c2.x, c2.y, R, 0, Math.PI * 2);
ctx.fillStyle = GREEN;
ctx.fill();
ctx.restore();
```

绿色画在红色之上，重叠处被绿色盖住，所以交叉区域看起来是绿色；圆 2 **非交叉**的那一段，保持第二步留下的红色不变。

### 第三部分：重叠时拖哪一个圆

后绘制的圆在视觉上盖住先绘制的圆。若在指针下两个圆都包含该点，则优先让**第二个圆**进入拖动，与绘制顺序一致。

## 完整示例

核心绘制与拖动逻辑在 `src/App.tsx` 中，结构如下：

- 常量 `CANVAS_W`、`CANVAS_H`、`R` 定义画布尺寸与半径。
- `drawScene`：清屏、浅灰背景、两个红圆、再用 clip 画绿色相交。
- `pickCircle`：根据点是否在圆内以及重叠时的优先级，返回 `0`、`1` 或 `null`。
- `onPointerDown` / `onPointerMove` / `onPointerUp`：用 `setPointerCapture` 保证移出画布仍能拖动；移动时用 `Math.min`/`Math.max` 把圆心限制在画布内，避免圆被拖出可视区域。

逐行阅读 `App.tsx` 即可对照上述步骤。

## 注意事项

- 若修改画布逻辑分辨率，务必同步调整坐标换算里的 `canvas.width` / `canvas.height`，否则拖动会偏移。
- 触摸设备上已设置 `touch-action: none` 与指针事件，避免页面滚动抢走手势。

## 完整讲解（中文）

这个 Demo 要做三件事：第一，在画布上画两个一样大的红圆；第二，用鼠标或手指把圆拖着走；第三，当两个圆叠在一起时，叠在一起的那一块变成绿色。

画红圆很简单，就是 `arc` 画圆再 `fill`，颜色设成红色。难点在于「只有交叉的那一块是绿色」。如果先画两个红圆再画一个大方块，是做不到「只改交叉」的。

做法可以概括成：**先各画一整个红圆，再用裁剪只给重叠处叠一层绿**。具体说，先用 **裁剪（clip）**：把第一个圆当作「窗口」，只有窗口里的东西能画出来；再在这个窗口里对第二个圆的路径 `fill` 绿色。你虽然在描述「整个圆 2」，但真正能上色的只有同时在圆 1 里的那一块，也就是交叉区域。那圆 2 在窗口外「剩下」的那部分呢？**不用在这一步管**——它已经在前面「整圆涂红」那一步画成红色了；这一绿色步只是在交叉处把底下的红换成（盖住成）绿。画完记得 `restore`，不然后面的绘制还会被裁剪影响。

拖动时，浏览器给你的坐标是屏幕上的位置，而画布可能被 CSS 放大缩小，所以要把坐标换算成画布像素坐标，否则你会觉得「鼠标没点在圆上」。换算公式就是用 `client` 减去画布左边、上边的距离，再按「画布真实像素宽 / 显示宽」的比例缩放。

两个圆叠在一起时，你点下去可能落在两个圆里。后画的那一层在上面，所以优先拖**第二个圆**，这样和眼睛看到的一样。

按上面的顺序读代码，就能把整个 Demo 串起来。
