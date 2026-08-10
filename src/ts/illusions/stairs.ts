/** CANVAS: Escalera de Penrose (Sala 02 / Drahma showcase) — port de script inline. */
import { isCanvasVisible, watchCanvas } from "../app/canvasWatch";

export const id = "c-stairs-ill";

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

  function draw() {
    if (!isCanvasVisible(id)) return;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const n = 12;
    const r = Math.min(W, H) * 0.36;
    const step = (t * 0.004) % (Math.PI * 2 / n);

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + step;
      const na = ((i + 1) / n) * Math.PI * 2 + step;
      const x1 = cx + Math.cos(a) * r;
      const y1 = cy + Math.sin(a) * r * 0.52;
      const x2 = cx + Math.cos(na) * r;
      const y2 = cy + Math.sin(na) * r * 0.52;
      const riseNow = (i / n) * 32;
      const riseNext = ((i + 1) / n) * 32;

      // Tread
      const hue = 180 + i * 6;
      ctx.strokeStyle = `hsl(${hue},65%,${28 + i * 2}%)`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x1, y1 - riseNow);
      ctx.lineTo(x2, y2 - riseNext);
      ctx.stroke();

      // Riser
      ctx.strokeStyle = "rgba(0,201,192,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1 - riseNow);
      ctx.lineTo(x1, y1 - riseNow - 8);
      ctx.stroke();
    }
    t++;
    if (isCanvasVisible(id)) requestAnimationFrame(draw);
  }
  watchCanvas(canvas, draw);
  draw();
}
