/**
 * Entry del bundle del laboratorio de cliente (#145). Las páginas
 * /clients/<slug>/ lo cargan como módulo (ver CLIENT_SOURCE_ENTRY en
 * src/clients/page.ts). El sitio principal (src/main.ts) no depende de esto.
 */
import { bootLab } from "./lab.ts";

bootLab();
