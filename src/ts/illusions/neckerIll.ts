import { tempoStep } from "../app/tempo";
export const id = "c-necker-ill";

export interface NeckerIllGeometry {
  cx: number;
  cy: number;
  s: number;
  off: number;
}

export function flipFactor(t: number) {
  return 0.5 + 0.5 * Math.sin(t * 0.012);
}

export function computeGeometry(width: number, height: number): NeckerIllGeometry {
  const cx = width / 2;
  const cy = height / 2;
  const s = Math.min(width, height) * 0.42;
  const off = s * 0.42;
  return { cx, cy, s, off };
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number
) {
  ctx.clearRect(0, 0, width, height);

  const { cx, cy, s, off } = computeGeometry(width, height);
  const f = flipFactor(t);

  // Back face
  ctx.strokeStyle = `rgba(0,201,192,${0.25 + f * 0.25})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - s / 2 + off, cy - s / 2 - off, s, s);

  // Front face
  ctx.strokeStyle = `rgba(0,201,192,${0.55 + (1 - f) * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);

  // Connecting edges
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
    ctx.strokeStyle = `rgba(201,168,76,${0.4 + f * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Perceptual flip highlight
  ctx.lineWidth = f * 3;
  ctx.strokeStyle = `rgba(201,168,76,${f * 0.7})`;
  if (f > 0.5) ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
  else ctx.strokeRect(cx - s / 2 + off, cy - s / 2 - off, s, s);
}

export function mountNeckerIll(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { stop() {} };

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

  const loop = () => {
    drawFrame(ctx, w, h, t);
    t += tempoStep();
    raf = window.requestAnimationFrame(loop);
  };
  raf = window.requestAnimationFrame(loop);

  return {
    stop() {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    }
  };
}

