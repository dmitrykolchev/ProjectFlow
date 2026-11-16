// Developer tooling: runtime introspection of Lit custom element properties.
// Reads `elementProperties` (populated by @property decorators) and default values
// from a non-connected instance created via document.createElement.

export interface PropMeta {
  prop: string;
  /** HTML attribute name, null = property-only binding (.prop="${...}") */
  attribute: string | null;
  type: string;
  defaultValue: string;
  reflect: boolean;
}

function typeLabel(type: Function | undefined): string {
  if (!type) return 'any';
  switch (type) {
    case String:
      return 'string';
    case Number:
      return 'number';
    case Boolean:
      return 'boolean';
    case Object:
      return 'object';
    case Array:
      return 'array';
    case Function:
      return 'function';
    default:
      return (type as { name?: string }).name || 'any';
  }
}

function formatDefault(value: unknown): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return '[]';
  if (typeof value === 'function') return '() => {}';
  if (typeof value === 'object') return '{}';
  return String(value);
}

export function getComponentProps(tag: string): PropMeta[] {
  const ctor = customElements.get(tag) as
    | (CustomElementConstructor & { elementProperties?: Map<string, Record<string, unknown>> })
    | undefined;
  if (!ctor || !(ctor.elementProperties instanceof Map)) return [];

  let instance: Record<string, unknown> | null = null;
  try {
    instance = document.createElement(tag) as unknown as Record<string, unknown>;
  } catch {
    instance = null;
  }

  const rows: PropMeta[] = [];
  for (const [prop, opt] of ctor.elementProperties) {
    // Lit derives the default attribute name from the property name (lowercased);
    // `attribute: false` opts out of attribute binding entirely.
    const attribute =
      typeof opt.attribute === 'string'
        ? opt.attribute
        : opt.attribute === false
          ? null
          : prop.toLowerCase();
    // plain @property() carries Lit's default String converter; label by the
    // declared type first, only fall back to "converter" when no type is given
    const typeOf = typeLabel(opt.type as Function | undefined);
    const type = typeOf === 'any' && opt.converter ? 'converter' : typeOf;
    const defaultValue = instance && prop in instance ? formatDefault(instance[prop]) : '';
    rows.push({ prop, attribute, type, defaultValue, reflect: opt.reflect === true });
  }
  return rows;
}

/** HTML snippet for the playground editor: tag + every attribute-mappable property. */
export function buildSnippet(tag: string): string {
  const props = getComponentProps(tag);
  const parts: string[] = [];
  for (const p of props) {
    if (p.attribute === null || p.defaultValue === '') continue;
    // In HTML the mere presence of a boolean attribute means true, so only
    // true-valued booleans are emitted as bare attributes; false ones are omitted.
    if (p.type === 'boolean') {
      if (p.defaultValue === 'true') parts.push(p.attribute);
      continue;
    }
    // Objects/arrays/functions cannot be expressed as HTML attributes.
    if (p.type === 'object' || p.type === 'array' || p.type === 'function' || p.type === 'converter') {
      continue;
    }
    const value = p.type === 'string' ? p.defaultValue.slice(1, -1) : p.defaultValue;
    parts.push(`${p.attribute}="${value}"`);
  }

  if (parts.length === 0) return `<${tag}></${tag}>`;
  return `<${tag}\n${parts.map((part) => `  ${part}`).join('\n')}\n></${tag}>`;
}

interface LitTemplate {
  strings?: readonly string[];
  values?: readonly unknown[];
}

function collectSlots(tpl: unknown, out: string[]) {
  if (!tpl || typeof tpl !== 'object') return;
  const t = tpl as LitTemplate;
  if (!Array.isArray(t.strings)) return;
  for (const chunk of t.strings) {
    const re = /<slot(?=[\s>])([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk))) {
      const nameMatch = /(?:^|\s)name="([^"]+)"/.exec(m[1]);
      const name = nameMatch ? nameMatch[1] : '(default)';
      if (!out.includes(name)) out.push(name);
    }
  }
  if (Array.isArray(t.values)) {
    for (const v of t.values) {
      if (Array.isArray(v)) collectSlots(v, out);
      else collectSlots(v, out);
    }
  }
}

/** Slot names declared in the render template of a Lit custom element. */
export function getComponentSlots(tag: string): string[] {
  const ctor = customElements.get(tag) as CustomElementConstructor | undefined;
  if (!ctor) return [];
  try {
    const el = document.createElement(tag) as unknown as { render(): LitTemplate };
    const out: string[] = [];
    collectSlots(el.render(), out);
    return out;
  } catch {
    return [];
  }
}
