/**
 * FOOTER del sitio — link discreto a los laboratorios de cliente (#145 §1:
 * "footer de la home: link 'Client labs', no un banner"). La etiqueta es un
 * nombre propio bilingüe (2 palabras, dentro del gate de copy literal I5).
 */
export function footerHtml(): string {
  return `<footer class="site-footer">
  <a class="site-footer-link" href="/clients/">Client labs</a>
</footer>
`;
}
