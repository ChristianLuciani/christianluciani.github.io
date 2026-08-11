/** CANVAS: Patrón de interferencia de doble fuente (Sala 03 / Experiencia) — port de script inline. */
import { isCanvasVisible, watchCanvas } from "../app/canvasWatch";

export const id = "c-exp";

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
    const s1x = W * 0.78;
    const s1y = H * 0.3;
    const s2x = W * 0.88;
    const s2y = H * 0.7;
    const step = 20;
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        const d1 = Math.sqrt((x - s1x) ** 2 + (y - s1y) ** 2);
        const d2 = Math.sqrt((x - s2x) ** 2 + (y - s2y) ** 2);
        const ph = ((d1 - d2) / 42 + t * 0.004) % 1;
        const iv = 0.5 + 0.5 * Math.cos(ph * Math.PI * 2);
        ctx.globalAlpha = iv * 0.055;
        ctx.fillStyle = iv > 0.5 ? "#00c9c0" : "#c9a84c";
        ctx.fillRect(x, y, step - 1, step - 1);
      }
    }
    ctx.globalAlpha = 1;
    t++;
    if (isCanvasVisible(id)) requestAnimationFrame(draw);
  }
  watchCanvas(canvas, draw);
  draw();
}
