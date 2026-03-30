import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

const CANVAS_W = 800;
const CANVAS_H = 480;
const R = 60;
const RED = '#e53935';
const GREEN = '#43a047';
const BG = '#fafafa';

interface Vec2 {
  x: number;
  y: number;
}

function distSq(dx: number, dy: number): number {
  return dx * dx + dy * dy;
}

function canvasPointFromEvent(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
): Vec2 {
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

function insideCircle(p: Vec2, c: Vec2, r: number): boolean {
  return distSq(p.x - c.x, p.y - c.y) <= r * r;
}

/** 后绘制的圆在上层：重叠时优先拖第二个圆 */
function pickCircle(p: Vec2, a: Vec2, b: Vec2, r: number): 0 | 1 | null {
  const inA = insideCircle(p, a, r);
  const inB = insideCircle(p, b, r);
  if (inB && inA) {
    return 1;
  }
  if (inB) {
    return 1;
  }
  if (inA) {
    return 0;
  }
  return null;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  c1: Vec2,
  c2: Vec2,
): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.beginPath();
  ctx.arc(c1.x, c1.y, R, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(c2.x, c2.y, R, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c1.x, c1.y, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(c2.x, c2.y, R, 0, Math.PI * 2);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.restore();
}

export function App(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [c1, setC1] = useState<Vec2>({ x: 220, y: CANVAS_H / 2 });
  const [c2, setC2] = useState<Vec2>({ x: 580, y: CANVAS_H / 2 });
  const dragRef = useRef<0 | 1 | null>(null);

  const paint = useCallback(() => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const ctx = el.getContext('2d');
    if (!ctx) {
      return;
    }
    drawScene(ctx, c1, c2);
  }, [c1, c2]);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    el.width = CANVAS_W;
    el.height = CANVAS_H;
  }, []);

  useLayoutEffect(() => {
    paint();
  }, [paint]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const p = canvasPointFromEvent(e.nativeEvent, el);
    const which = pickCircle(p, c1, c2, R);
    if (which === null) {
      return;
    }
    dragRef.current = which;
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const which = dragRef.current;
    if (which === null) {
      return;
    }
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const p = canvasPointFromEvent(e.nativeEvent, el);
    const nx = Math.min(Math.max(R, p.x), CANVAS_W - R);
    const ny = Math.min(Math.max(R, p.y), CANVAS_H - R);
    if (which === 0) {
      setC1({ x: nx, y: ny });
    } else {
      setC2({ x: nx, y: ny });
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (dragRef.current === null) {
      return;
    }
    const el = canvasRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div className="page">
      <h1>Canvas 双圆拖拽与相交区域填色</h1>
      <p className="hint">
        两个圆为红色；重叠时相交部分显示为绿色。两圆均可拖动；重叠时后绘制的圆优先被拖住。
      </p>
      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>
    </div>
  );
}
