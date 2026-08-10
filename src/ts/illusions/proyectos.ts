/** CANVAS: Proyectos — fractal de fondo (campo tipo Mandelbrot) — port de script inline. */

export const id = "c-proyectos";

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  let W = 0;
  let H = 0;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    // Mandelbrot-like dot field (simplified)
    const step = 24;
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        const cx = (x / W) * 3.5 - 2.5;
        const cy = (y / H) * 2 - 1;
        let zx = 0;
        let zy = 0;
        let iter = 0;
        const max = 18;
        while (zx * zx + zy * zy < 4 && iter < max) {
          const tmp = zx * zx - zy * zy + cx;
          zy = 2 * zx * zy + cy;
          zx = tmp;
          iter++;
        }
        if (iter < max) {
          const a = (iter / max) * 0.07;
          ctx.fillStyle = iter % 2 ? `rgba(0,201,192,${a})` : `rgba(201,168,76,${a})`;
          ctx.fillRect(x, y, step - 2, step - 2);
        }
      }
    }
  };
  const resize = () => {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    draw();
  };
  resize();
  window.addEventListener("resize", resize);
}
