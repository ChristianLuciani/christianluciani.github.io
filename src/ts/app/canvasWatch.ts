/**
 * Canvas visibility — pausa los loops de animación cuando el canvas sale del
 * viewport (portado del bloque "_cvWatch" del script inline de Fase 1).
 * Sin dependencias de DOM a nivel de módulo: los tests en node no lo rompen.
 */

const visibility = new Map<string, boolean>();
const drawByCanvas = new Map<string, () => void>();

const observer: IntersectionObserver | null =
  typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver((entries) => {
        for (const e of entries) {
          visibility.set(e.target.id, e.isIntersecting);
          const draw = drawByCanvas.get(e.target.id);
          if (e.isIntersecting && draw) draw();
        }
      });

/** Registra un canvas + su draw para pausarlo cuando está off-screen. */
export function watchCanvas(canvas: HTMLCanvasElement, draw: () => void): void {
  drawByCanvas.set(canvas.id, draw);
  if (observer) observer.observe(canvas);
}

/** ¿Está el canvas visible? (false hasta que el observer reporte lo contrario). */
export function isCanvasVisible(id: string): boolean {
  return visibility.get(id) ?? false;
}
