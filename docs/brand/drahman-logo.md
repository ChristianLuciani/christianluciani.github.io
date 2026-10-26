# Logo de Drahma (showcase) — asset vendorizado

**Qué:** el logo que acompaña la tarjeta de *Drahma* en la sala de proyectos.
**Origen:** `https://raw.githubusercontent.com/DRAHMAN-ORG/drahman-org/main/assets/images/logo.png`
(2 374 172 B, `cache-control: max-age=300`) — hotlink en producción hasta #84.
**Local:** `public/assets/images/drahman-logo.png` (10 804 B, PNG 88×88).

## Por qué se vendorizó

El hotlink costaba **2.3 MB por visita** con 5 minutos de caché, para un logo que se muestra
a 44 px de alto. Vendorizar un derivado a 88 px (2× para pantallas densas) elimina la
dependencia de `raw.githubusercontent` y baja el peso ~219×. Es la resolución que el ADR
`docs/cdn-decision.md` dejó declarada como deuda (el hotlink no es parte de la decisión de
jsDelivr).

## Cómo se regeneró

```bash
magick "https://raw.githubusercontent.com/DRAHMAN-ORG/drahman-org/main/assets/images/logo.png" \
  -resize x88 -strip public/assets/images/drahman-logo.png
```

2026-10-26 · ImageMagick. Si el logo de origen cambia, se repite el comando y se revisa el
diff del PNG en el PR.
