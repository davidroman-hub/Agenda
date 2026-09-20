/** Una mutación de texto: cambia `from` por `to` en `file` y espera que algún test de `tests` falle */
const m = (file, from, to, tests, label, extra = {}) => ({ file, from, to, tests, label, ...extra });

/** Una mutación con una función, para cambios que no son un simple reemplazo de texto */
const t = (file, transform, tests, label, extra = {}) => ({ file, transform, tests, label, ...extra });

module.exports = { m, t };
