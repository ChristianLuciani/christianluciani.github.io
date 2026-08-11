/** HERO — cuadrícula de cubos isométricos imposibles (port de script inline). */
import { isCanvasVisible, watchCanvas } from "../app/canvasWatch";

export const id = "hero-canvas";

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  let W = 0;
  let H = 0;
  let t = 0;

  const resize = () => {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  function cube(cx: number, cy: number, s: number, a: number, ph: number) {
    const h = s * 0.866;
    ctx.globalAlpha = a * (0.35 + 0.65 * Math.abs(Math.sin(ph + t * 0.0015)));
    ctx.lineWidth = 0.6;
    // Top face
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.667);
    ctx.lineTo(cx + s * 0.5, cy - h * 0.333);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - s * 0.5, cy - h * 0.333);
    ctx.closePath();
    ctx.strokeStyle = "#00c9c0";
    ctx.stroke();
    // Right face
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + s * 0.5, cy - h * 0.333);
    ctx.lineTo(cx + s * 0.5, cy + h * 0.333);
    ctx.lineTo(cx, cy + h * 0.667);
    ctx.closePath();
    ctx.strokeStyle = "#c9a84c";
    ctx.stroke();
    // Left face
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - s * 0.5, cy - h * 0.333);
    ctx.lineTo(cx - s * 0.5, cy + h * 0.333);
    ctx.lineTo(cx, cy + h * 0.667);
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,201,192,.45)";
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!isCanvasVisible(id)) return;
    ctx.clearRect(0, 0, W, H);
    const s = 50;
    const h = s * 0.866;
    const cols = Math.ceil(W / (s * 1.5)) + 2;
    const rows = Math.ceil(H / h) + 2;
    for (let r = -1; r < rows; r++)
      for (let cc = -1; cc < cols; cc++)
        cube(cc * s * 1.5 + (r % 2 ? s * 0.75 : 0), r * h, s, 0.5, (r * cols + cc) * 1.9);
    t++;
    if (isCanvasVisible(id)) requestAnimationFrame(draw);
  }
  watchCanvas(canvas, draw);
  draw();
}
