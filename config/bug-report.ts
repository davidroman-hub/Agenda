// Correo que recibe los reportes de bugs
export const BUG_REPORT_EMAIL = "jobroman83@gmail.com";

// URL del formulario de Formspree (https://formspree.io): se crea un formulario
// con BUG_REPORT_EMAIL y da una URL con la forma "https://formspree.io/f/xxxxxxxx".
// Es pública por diseño, no es un secreto.
// Si se vacía, el formulario abre la app de email (mailto) en su lugar.
export const FORMSPREE_ENDPOINT: string = "https://formspree.io/f/xnpnjvob";
