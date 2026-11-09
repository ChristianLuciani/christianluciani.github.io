/**
 * FOOTER del sitio — link discreto a los laboratorios de cliente (#145 §1:
 * "footer de la home: link 'Client labs', no un banner"). La etiqueta sale del
 * pack de copy (`footer.clientLabs`, ES/EN) como todo el chrome del sitio:
 * en el render por defecto (lang=es) publica la versión ES y el toggle i18n
 * la lleva a EN con el resto del dictionary.
 */
import { t } from "../content/copy.ts";

export function footerHtml(): string {
  return `<footer class="site-footer">
  <a class="site-footer-link" href="/clients/">${t("footer.clientLabs")}</a>
</footer>
`;
}
