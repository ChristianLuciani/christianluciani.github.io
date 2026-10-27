import { isCanvasVisible, watchCanvas } from "../app/canvasWatch";
import { tempoStep } from "../app/tempo";

export interface Point {
  x: number;
  y: number;
}

export function kochPoint(p1: Point, p2: Point) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  return {
    a: { x: p1.x + dx / 3, y: p1.y + dy / 3 },
    b: {
      x: p1.x + dx / 2 - (dy * Math.sqrt(3)) / 6,
      y: p1.y + dy / 2 + (dx * Math.sqrt(3)) / 6
    },
    c: { x: p1.x + (2 * dx) / 3, y: p1.y + (2 * dy) / 3 }
  };
}

export function kochSegments(pts: Point[], depth: number): Point[] {
  if (depth <= 0) return pts;

  const result: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const { a, b, c } = kochPoint(pts[i], pts[i + 1]);
    result.push(pts[i], a, b, c);
  }
  result.push(pts[pts.length - 1]);

  return kochSegments(result, depth - 1);
}

function drawKoch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  depth: number,
  angle: number,
  lineWidth: number
) {
  const pts: Point[] = [0, 1, 2].map((i) => ({
    x: cx + r * Math.cos(angle + (i * 2 * Math.PI) / 3),
    y: cy + r * Math.sin(angle + (i * 2 * Math.PI) / 3)
  }));
  pts.push(pts[0]);

  const segs = kochSegments(pts, depth);

  ctx.beginPath();
  ctx.moveTo(segs[0].x, segs[0].y);
  for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
  ctx.closePath();

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, "rgba(0,201,192,0.9)");
  g.addColorStop(0.5, "rgba(201,168,76,0.7)");
  g.addColorStop(1, "rgba(0,201,192,0.3)");

  ctx.strokeStyle = "rgba(0,201,192,0.8)";
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.stroke();
}

export interface KochArtOptions {
  /** Giro por frame (radianes). */
  speed?: number;
  /** Profundidad de la subdivisión (3 = copo clásico). */
  depth?: number;
  /** Grosor de trazo en px CSS. */
  lineWidth?: number;
}

/**
 * Copo de Koch animado como pieza visual (no es el loader): se dibuja dentro
 * del canvas del marco, respeta prefers-reduced-motion y sólo repinta cuando
 * el canvas está en viewport (watchCanvas).
 */
export function mountKochArt(
  canvas: HTMLCanvasElement,
  opts: KochArtOptions = {}
) {
  const context = canvas.getContext("2d");
  if (!context) return { stop() {} };
  const ctx = context;

  const speed = opts.speed ?? 0.008;
  const depth = opts.depth ?? 3;
  const lineWidth = opts.lineWidth ?? 1.2;
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let angle = 0;
  let raf = 0;
  let width = 0;
  let height = 0;

  function draw() {
    if (!width || !height) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const r = (Math.min(width, height) / 2) * 0.78;
    const lw = lineWidth * Math.min(window.devicePixelRatio || 1, 2);
    drawKoch(ctx, cx, cy, r, depth, angle, lw);
    drawKoch(ctx, cx, cy, r * 0.6, depth, -angle * 1.3, lw);
    drawKoch(ctx, cx, cy, r * 0.3, depth, angle * 2, lw);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    width = canvas.width;
    height = canvas.height;
    draw();
  }

  function frame() {
    if (!reduceMotion && isCanvasVisible(canvas.id)) {
      angle += speed * tempoStep();
      draw();
    }
    raf = window.requestAnimationFrame(frame);
  }

  watchCanvas(canvas, draw);
  const resizeObserver =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(canvas);
  resize();
  if (!reduceMotion) frame();

  return {
    stop() {
      window.cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
    }
  };
}
