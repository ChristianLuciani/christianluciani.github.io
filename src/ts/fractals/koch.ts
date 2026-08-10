export interface Point {
  x: number;
  y: number;
}

export const id = "fractal-logo";

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

export interface KochLogoMountOptions {
  loaderId?: string;
  heroId?: string;
  minimizeDelayMs?: number;
}

export function mountKochLogo(
  canvas: HTMLCanvasElement,
  opts: KochLogoMountOptions = {}
) {
  const loaderId = opts.loaderId ?? "loader";
  const heroId = opts.heroId ?? "hero";
  const minimizeDelayMs = opts.minimizeDelayMs ?? 1800;

  const ctx = canvas.getContext("2d")!;
  if (!ctx) return { stop() {} };

  let angle = 0;
  let minimized = false;
  let raf = 0;
  let timeout: number | undefined;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function centerInViewport(size: number) {
    canvas.width = size;
    canvas.height = size;
    canvas.style.position = "fixed";
    canvas.style.left = `${window.innerWidth / 2 - size / 2}px`;
    canvas.style.top = `${window.innerHeight / 2 - size / 2}px`;
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx * 0.78;

    drawKoch(ctx, cx, cy, r, 3, angle, minimized ? 0.5 : 1.2);
    drawKoch(ctx, cx, cy, r * 0.6, 3, -angle * 1.3, minimized ? 0.5 : 1.2);
    drawKoch(ctx, cx, cy, r * 0.3, 3, angle * 2, minimized ? 0.5 : 1.2);
  }

  function animate() {
    drawFrame();
    if (minimized) return;
    angle += 0.008;
    raf = window.requestAnimationFrame(animate);
  }

  function minimize() {
    minimized = true;
    window.cancelAnimationFrame(raf);

    canvas.width = 42;
    canvas.height = 42;
    canvas.classList.add("minimized");

    ctx.clearRect(0, 0, 42, 42);
    drawKoch(ctx, 21, 21, 16, 3, 0, 0.5);
    drawKoch(ctx, 21, 21, 10, 3, Math.PI / 6, 0.5);
    drawKoch(ctx, 21, 21, 5, 3, -Math.PI / 6, 0.5);
  }

  // initial state
  centerInViewport(120);
  if (!reduceMotion) animate();

  const onClick = () => {
    const hero = document.getElementById(heroId);
    hero?.scrollIntoView({ behavior: "smooth" });
  };
  canvas.addEventListener("click", onClick);

  const onResize = () => {
    if (minimized) return;
    centerInViewport(120);
  };
  window.addEventListener("resize", onResize, { passive: true });

  const onLoad = () => {
    timeout = window.setTimeout(() => {
      const loader = document.getElementById(loaderId);
      loader?.classList.add("hidden");
      minimize();
    }, minimizeDelayMs);
  };
  window.addEventListener("load", onLoad, { once: true });

  // If motion is reduced, skip animation but keep the loader behavior.
  if (reduceMotion) {
    drawFrame();
  }

  return {
    stop() {
      minimized = true;
      window.cancelAnimationFrame(raf);
      if (timeout) window.clearTimeout(timeout);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
    }
  };
}


