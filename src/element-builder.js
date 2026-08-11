// src/element-builder.js — Synced from @ruledwdl/core
import { resolveAll, resolveStr, resolvePath } from './data-resolver.js';
import { matchAttr } from './layers-parser.js';
import { normalizeRegistryEntry } from './registry-compiler.js';

export function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildEl(node, attr, data, registry, opts = {}) {
  let base = {};
  for (const c of node.classes) {
    if (registry[c]) {
      const norm = normalizeRegistryEntry(registry[c]);
      base = { ...base, ...resolveAll(norm, data) };
    }
  }
  const matched = resolveAll(matchAttr(node, attr), data);
  let res = { ...base, ...matched };
  const refKey = resolveStr(res['attr-ref'] || '', data);
  if (refKey && registry[refKey]) {
    const normRef = normalizeRegistryEntry(registry[refKey]);
    const ref = resolveAll(normRef, data);
    res = { ...ref, ...matched };
  }
  const SKIP = new Set(['alpine', 'htmx', 'attr-ref', 'text', 'class']);
  const flat = { ...res, ...(res.alpine || {}), ...(res.htmx || {}) };
  if (!flat['wdl-comp']) {
    flat['wdl-comp'] = node.classes[0] || node.tag;
  }
  if (data && data._index !== undefined && flat['data-wdl-index'] === undefined) {
    flat['data-wdl-index'] = String(data._index);
  }
  const allCls = [
    ...(base.class || '').split(' '),
    ...(flat.class || '').split(' '),
    ...node.classes
  ].filter(Boolean);
  const uniq = [...new Set(allCls)];
  let a = '';
  if (uniq.length) a += ' class="' + uniq.join(' ') + '"';
  if (node.id) a += ' id="' + node.id + '"';
  for (const [k, v] of Object.entries(flat)) {
    if (SKIP.has(k) || v == null || v === '') continue;
    a += ' ' + k + '="' + esc(v) + '"';
  }
  const VOID = new Set([
    'img',
    'br',
    'hr',
    'input',
    'link',
    'meta',
    'area',
    'base',
    'col',
    'embed',
    'param',
    'source',
    'track',
    'wbr'
  ]);
  if (VOID.has(node.tag)) return '<' + node.tag + a + '>';
  const RAW_TEXT = new Set(['script', 'style']);

  let txt = '';
  if (res.text != null && res.text !== '') {
    if (RAW_TEXT.has(node.tag)) {
      txt = String(res.text);
    } else if (typeof opts.transformText === 'function') {
      txt = opts.transformText(String(res.text), node);
    } else {
      txt = esc(res.text);
    }
  }

  const ch = node.children.map(c => toHTML(c, attr, data, registry, opts)).join('');
  return '<' + node.tag + a + '>' + (ch || txt) + '</' + node.tag + '>';
}

export function toHTML(node, attr, data, registry, opts = {}) {
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
            registry,
            opts
          );
        })
        .join('');
    }
    return '';
  }
  return buildEl(node, attr, data, registry, opts);
}
