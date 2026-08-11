/** CANVAS: Serpientes Rotantes (Sala 04 / Física) — ilusión estática (port de script inline). */

export const id = "c-fisica";

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  let W = 0;
  let H = 0;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.82;
    const cy = H * 0.3;
    const rings = 9;
    const ringW = 18;

    for (let r = rings; r > 0; r--) {
      const rad = r * (Math.min(W * 0.35, H * 0.35) / rings);
      if (rad <= ringW) continue; // skip tiny rings
      const seg = Math.round((2 * Math.PI * rad) / 14);
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const na = ((i + 1) / seg) * Math.PI * 2;
        const innerRad = Math.max(0.5, rad - ringW);
        if (innerRad >= rad) continue;
        const cols = [
          "rgba(0,201,192,.09)",
          "rgba(0,201,192,.22)",
          "rgba(201,168,76,.22)",
          "rgba(201,168,76,.07)"
        ];
        ctx.beginPath();
        ctx.arc(cx, cy, rad, a, na);
        ctx.arc(cx, cy, innerRad, na, a, true);
        ctx.closePath();
        ctx.fillStyle = cols[i % 4];
        ctx.fill();
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
