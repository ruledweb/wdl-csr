import { resolveAll, resolveStr, resolvePath } from './data-resolver.js';
import { matchAttr } from './layers-parser.js';

export function buildEl(node, attr, data, registry) {
  let base = {};
  for (const c of node.classes) {
    if (registry[c]) base = { ...base, ...resolveAll(registry[c], data) };
  }
  const matched = resolveAll(matchAttr(node, attr), data);
  let res = { ...base, ...matched };
  const refKey = resolveStr(res['attr-ref'] || '', data);
  if (refKey && registry[refKey]) {
    const ref = resolveAll(registry[refKey], data);
    res = { ...ref, ...matched };
  }
  const SKIP = new Set(['alpine', 'htmx', 'attr-ref', 'text', 'class']);
  const flat = { ...res, ...(res.alpine || {}), ...(res.htmx || {}) };
  const allCls = [
    ...(base.class || '').split(' '),
    ...(flat.class || '').split(' '),
    ...node.classes
  ].filter(Boolean);
  const uniq = [...new Set(allCls)];
  let a = '';
  if (uniq.length) a += ' class="' + uniq.join(' ') + '"';
  if (node.id) a += ' id="' + node.id + '"';
  
  // Minimal escape for attributes only, to prevent breaking HTML syntax
  const escAttr = (s) => String(s).replace(/"/g, '&quot;');
  
  for (const [k, v] of Object.entries(flat)) {
    if (SKIP.has(k) || v == null || v === '') continue;
    a += ' ' + k + '="' + escAttr(v) + '"';
  }
  
  const VOID = new Set([
    'img', 'br', 'hr', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'
  ]);
  if (VOID.has(node.tag)) return '<' + node.tag + a + '>';
  
  // Raw text passthrough. No markdown parsing, no sanitization. 
  // It is the developer's responsibility to sanitize inputs before providing them to this library.
  const txt = res.text ? String(res.text) : '';
  const ch = node.children.map(c => toHTML(c, attr, data, registry)).join('');
  return '<' + node.tag + a + '>' + (ch || txt) + '</' + node.tag + '>';
}

export function toHTML(node, attr, data, registry) {
  if (node.loopKey) {
    const items = resolvePath(data, node.loopKey);
    if (Array.isArray(items) && items.length > 0) {
      return items
        .map((item, idx) => {
          const sd = { ...data, ...item, _index: idx };
          return buildEl(
            { ...node, loopKey: null, children: [...node.children] },
            attr,
            sd,
            registry
          );
        })
        .join('');
    }
    return '';
  }
  
  if (node.repeat && node.repeat > 1) {
    let out = '';
    for (let idx = 0; idx < node.repeat; idx++) {
      const sd = { ...data, _index: idx };
      out += buildEl(
        { ...node, repeat: null, children: [...node.children] },
        attr,
        sd,
        registry
      );
    }
    return out;
  }
  
  return buildEl(node, attr, data, registry);
}
