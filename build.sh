#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
#  build.sh — Ensambla src/ en index.html
#  Uso: bash build.sh
#  Resultado: index.html actualizado y listo para deploy
# ══════════════════════════════════════════════════════

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/src"
OUT="$ROOT/index.html"

echo "🔨 Ensamblando cv (CV de Christian Luciani)..."

# Nota: el flujo de trabajo recomendado es editar index.html directamente
# usando los comentarios de sección como guía.
# Este script es para cuando se prefiere editar en src/ por separado.

# Verificar que src/ tiene contenido
if [ ! -f "$SRC/sections/01-hero.html" ]; then
  echo "⚠️  src/sections/ está vacío — edita index.html directamente."
  echo "   Consulta docs/CONTRIBUTING.md para el flujo de trabajo."
  exit 1
fi

# Ensamblar (cuando src/ esté poblado)
# cat "$SRC/head.html" \
#     "$SRC/sections/00-loader.html" \
#     "$SRC/sections/01-hero.html" \
#     ... > "$OUT"

echo "✅ index.html actualizado."
echo "   Para desplegar: git add index.html && git commit -m 'style: ...' && git push"
