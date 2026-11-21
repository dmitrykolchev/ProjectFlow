// Scans all custom elements under src/components and writes docs/components.json.
// Meta comes from the component's .story.ts (title / category / description / propsDoc /
// slotsDoc / childrenDoc); API comes from the component file (@property, CustomEvent, slot).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const srcRoot = path.join(root, 'src', 'components');
const outFile = path.join(root, 'docs', 'components.json');

// Balanced object body starting at the first '{' after `key:`
function objBody(src, key) {
  const k = src.indexOf(key + ':');
  if (k < 0) return null;
  let i = src.indexOf('{', k);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(i + 1, j);
    }
  }
  return null;
}

// String literal value of `key: '...' | "..." | \`...\`` respecting escapes
function strVal(src, key) {
  const k = src.indexOf(key + ':');
  if (k < 0) return '';
  const rest = src.slice(k + key.length + 1);
  const m = rest.match(/^\s*([`'"])/);
  if (!m) return '';
  const q = m[1];
  let i = rest.indexOf(q) + 1;
  let out = '';
  while (i < rest.length) {
    const ch = rest[i];
    if (ch === '\\' && i + 1 < rest.length) {
      out += rest[i + 1];
      i += 2;
      continue;
    }
    if (ch === q) break;
    out += ch;
    i++;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// key: value pairs inside an object body, values are string literals
function pairs(body) {
  const out = [];
  const re = /(^|\n)\s*([A-Za-z_][\w-]*|'[^']*'|"[^"]*")\s*:\s*([`'"])/g;
  let m;
  while ((m = re.exec(body))) {
    const key = m[2].replace(/['"]/g, '');
    const q = m[3];
    let i = m.index + m[0].length;
    let val = '';
    while (i < body.length) {
      const ch = body[i];
      if (ch === '\\' && i + 1 < body.length) {
        val += body[i + 1];
        i += 2;
        continue;
      }
      if (ch === q) break;
      val += ch;
      i++;
    }
    out.push({ k: key, v: val.replace(/\s+/g, ' ').trim() });
    re.lastIndex = i;
  }
  return out;
}

function componentDirs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    const tag = e.name;
    if (fs.existsSync(path.join(p, `${tag}.ts`))) out.push({ group: path.basename(dir), tag, dir: p });
    for (const sub of fs.readdirSync(p, { withFileTypes: true })) {
      if (sub.isDirectory() && fs.existsSync(path.join(p, sub.name, `${sub.name}.ts`))) {
        out.push({ group: path.basename(dir), tag: sub.name, dir: path.join(p, sub.name) });
      }
    }
  }
  return out;
}

const items = [];
for (const g of fs.readdirSync(srcRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  for (const d of componentDirs(path.join(srcRoot, g.name))) {
    const src = fs.readFileSync(path.join(d.dir, `${d.tag}.ts`), 'utf8');
    const tag = (src.match(/@customElement\(\s*'([^']+)'\s*\)/) || [])[1] || d.tag;
    const cls = (src.match(/export class (\w+)/) || [])[1] || '';

    // Line-based parse: `@property({...}) name: Type = default;`
    const propsList = [];
    for (const line of src.split('\n')) {
      const m = line.match(/@property\(\{([^}]*)\}\)\s*(.*)$/);
      if (!m) continue;
      const opts = m[1];
      const rest = m[2];
      const name = (rest.match(/^(\w+)/) || [])[1];
      if (!name) continue;
      // assignment '=' is the last one not part of '=>' (function props carry arrow types)
      let eq = -1;
      for (let i = rest.length - 1; i >= 0; i--) {
        if (rest[i] === '=' && rest[i + 1] !== '>') { eq = i; break; }
      }
      const def = (eq >= 0 ? rest.slice(eq + 1) : '').replace(/\/\/.*$/, '').replace(/;\s*$/, '').trim();
      const tail = rest.slice(name.length);
      const ann = (eq >= 0 ? tail.slice(0, eq - name.length) : tail).replace(/;\s*$/, '').trim();
      const declared = (opts.match(/type:\s*(\w+)/) || [])[1];
      const attr = (opts.match(/attribute:\s*'([^']+)'/) || [])[1];
      // The TS annotation is richer than the lit runtime type (BankRequisite[] vs
      // Array), so docs prefer it; the explicit lit type is the fallback for props
      // declared without an annotation.
      const declaredType = ann.startsWith(':') ? ann.slice(1).trim() : '';
      const type = declaredType || declared || 'String';
      propsList.push({ name, type, attr, reflect: /reflect:\s*true/.test(opts), def });
    }

    // typed dispatches carry an optional generic: new CustomEvent<Detail>('name', ...)
    const events = [...new Set([...src.matchAll(/new CustomEvent(?:<[^>]*>)?\(\s*'([^']+)'/g)].map((m) => m[1]))];

    const storyPath = path.join(d.dir, `${d.tag}.story.ts`);
    const hasStory = fs.existsSync(storyPath);
    let title = '', category = '', desc = '', propsDoc = [], slotsDoc = [], childrenDoc = [];
    if (hasStory) {
      const s = fs.readFileSync(storyPath, 'utf8');
      title = strVal(s, 'title');
      category = strVal(s, 'category');
      desc = strVal(s, 'description');
      propsDoc = pairs(objBody(s, 'propsDoc') || '');
      slotsDoc = pairs(objBody(s, 'slotsDoc') || '');
      childrenDoc = pairs(objBody(s, 'childrenDoc') || '');
    }

    items.push({ group: d.group, tag, cls, hasStory, title, category, desc, propsList, events, propsDoc, slotsDoc, childrenDoc });
  }
}

items.sort((a, b) => a.group.localeCompare(b.group) || a.tag.localeCompare(b.tag));
fs.writeFileSync(outFile, JSON.stringify(items, null, 1) + '\n');
console.log('components:', items.length, 'with story:', items.filter((i) => i.hasStory).length,
  'with desc:', items.filter((i) => i.desc).length, 'with propsDoc:', items.filter((i) => i.propsDoc.length).length);
