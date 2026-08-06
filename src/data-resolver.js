// src/renderer/data-resolver.js

export function resolvePath(obj, path) {
  return path.split('.').reduce((a, k) => (a != null ? a[k] : ''), obj) ?? '';
}

export function resolveStr(str, data) {
  if (typeof str !== 'string') return str;
  return str.replace(/\$\{([\w.]+)\}/g, (_, p) => resolvePath(data, p));
}

export function resolveAll(obj, data) {
  if (obj == null) return obj;
  if (typeof obj === 'function') return '';
  if (typeof obj === 'string') return resolveStr(obj, data);
  if (Array.isArray(obj)) return obj.map(v => resolveAll(v, data));
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, resolveAll(v, data)])
    );
  }
  return obj;
}
