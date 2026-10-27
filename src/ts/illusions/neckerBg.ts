import { tempoStep } from "../app/tempo";
export const id = "c-necker";

export interface NeckerBgConfig {
  size?: number;
  backgroundRgb?: [number, number, number];
}

export interface GridCell {
  x: number;
  y: number;
  phase: number;
}

export function computeGrid(
  width: number,
  height: number,
  size: number
): GridCell[] {
  const gap = size * 1.5;
  const cols = Math.ceil(width / gap) + 2;
  const rows = Math.ceil(height / gap) + 2;

  const cells: GridCell[] = [];
  for (let r = -1; r < rows; r++) {
    for (let cc = -1; cc < cols; cc++) {
      const x = cc * gap + (r % 2 === 0 ? 0 : gap * 0.5);
      const y = r * gap * 0.82;
      const phase = (r * 7 + cc * 3) * 0.8;
      cells.push({ x, y, phase });
    }
  }
  return cells;
}

function drawNecker(
  ctx: CanvasRenderingContext2D,
  t: number,
  cx: number,
  cy: number,
  s: number,
  phase: number
) {
  const off = s * 0.42;
  const f = 0.5 + 0.5 * Math.sin(phase + t * 0.006);
  const a = 0.14 + 0.1 * f;

  // back face
  ctx.strokeStyle = `rgba(0,201,192,${a * 0.55})`;
  ctx.lineWidth = 0.6;
  ctx.strokeRect(cx - s / 2 + off, cy - s / 2 - off, s, s);

  // front face
  ctx.strokeStyle = `rgba(0,201,192,${a})`;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);

  // connecting edges in gold
  const corners: Array<[number, number]> = [
    [cx - s / 2, cy - s / 2],
    [cx + s / 2, cy - s / 2],
    [cx + s / 2, cy + s / 2],
    [cx - s / 2, cy + s / 2]
  ];
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + off, y - off);
    ctx.strokeStyle = `rgba(201,168,76,${a * 0.8})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

function applyVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  [r, g, b]: [number, number, number]
) {
  const gH = ctx.createLinearGradient(0, 0, width, 0);
  gH.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gH.addColorStop(0.08, `rgba(${r},${g},${b},0)`);
  gH.addColorStop(0.92, `rgba(${r},${g},${b},0)`);
  gH.addColorStop(1, `rgba(${r},${g},${b},1)`);
  ctx.fillStyle = gH;
  ctx.fillRect(0, 0, width, height);

  const gV = ctx.createLinearGradient(0, 0, 0, height);
  gV.addColorStop(0, `rgba(${r},${g},${b},0.7)`);
  gV.addColorStop(0.12, `rgba(${r},${g},${b},0)`);
  gV.addColorStop(0.88, `rgba(${r},${g},${b},0)`);
  gV.addColorStop(1, `rgba(${r},${g},${b},0.7)`);
  ctx.fillStyle = gV;
  ctx.fillRect(0, 0, width, height);
}

export function mountNeckerBg(
  canvas: HTMLCanvasElement,
  config: NeckerBgConfig = {}
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { stop() {} };

  const size = config.size ?? 72;
  const background = config.backgroundRgb ?? [11, 17, 32]; // var(--deep)

  let w = 0;
  let h = 0;
  let t = 0;
  let raf = 0;

  const resize = () => {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const cells = () => computeGrid(w, h, size);

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const cell of cells()) {
      drawNecker(ctx, t, cell.x, cell.y, size, cell.phase);
    }
    applyVignette(ctx, w, h, background);
    t += tempoStep();
    raf = window.requestAnimationFrame(draw);
  };
  raf = window.requestAnimationFrame(draw);

  return {
    stop() {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    }
  };
}

