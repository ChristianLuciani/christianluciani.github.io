/** CANVAS: Sierpinski (Sala 05 / Competencias) — fondo fractal estático (port de script inline). */

export const id = "c-comp";

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  let W = 0;
  let H = 0;

  function sierp(x: number, y: number, s: number, d: number) {
    if (d === 0 || s < 6) {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.577);
      ctx.lineTo(x + s * 0.5, y + s * 0.289);
      ctx.lineTo(x - s * 0.5, y + s * 0.289);
      ctx.closePath();
      ctx.strokeStyle = "rgba(0,201,192,.13)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      return;
    }
    const h = s * 0.577;
    sierp(x, y - h / 2, s / 2, d - 1);
    sierp(x + s / 4, y + h / 4, s / 2, d - 1);
    sierp(x - s / 4, y + h / 4, s / 2, d - 1);
  }

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    sierp(W * 0.84, H * 0.38, Math.min(W, H) * 0.52, 5);
  };
  const resize = () => {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    draw();
  };
  resize();
  window.addEventListener("resize", resize);
}
