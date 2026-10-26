import { escapeHtml } from '../../scripts/lib/format.mjs';

class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

/** Mark a string as trusted HTML so `html` does not escape it. */
export const raw = (value) => new Raw(String(value));

function render(value) {
  if (value == null || value === false) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}

/**
 * Tagged template for HTML. Interpolated values are escaped unless wrapped in
 * raw() or produced by another html`` call; arrays are joined.
 */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new Raw(out);
}
