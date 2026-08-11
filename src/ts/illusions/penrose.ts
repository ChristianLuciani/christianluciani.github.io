/** CANVAS: Triángulo de Penrose pulsante (Sala 04 sidebar) — port de script inline. */
import { isCanvasVisible, watchCanvas } from "../app/canvasWatch";

export const id = "c-penrose";

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
    const s = Math.min(W, H) * 0.32 * (1 + Math.sin(t * 0.015) * 0.03);
    const thick = s * 0.22;

    const pts: [number, number][] = [
      [cx, cy - s * 1.15],
      [cx + s, cy + s * 0.6],
      [cx - s, cy + s * 0.6]
    ];

    const grd = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
    grd.addColorStop(0, "rgba(0,201,192,.75)");
    grd.addColorStop(0.5, "rgba(201,168,76,.75)");
    grd.addColorStop(1, "rgba(0,201,192,.4)");

    ctx.lineWidth = thick;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = grd;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.closePath();
    ctx.stroke();

    // Impossible overlap illusion
    ctx.fillStyle = "#0b1120";
    ctx.beginPath();
    ctx.arc(pts[2][0] + thick * 0.4, pts[2][1] - thick * 0.1, thick * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,201,192,.75)";
    ctx.lineWidth = thick * 0.8;
    ctx.beginPath();
    ctx.moveTo(pts[2][0] - thick * 0.3, pts[2][1] - thick * 0.5);
    ctx.lineTo(pts[0][0] - thick * 0.15, pts[0][1] + thick * 0.6);
    ctx.stroke();

    t++;
    if (isCanvasVisible(id)) requestAnimationFrame(draw);
  }
  watchCanvas(canvas, draw);
  draw();
}
