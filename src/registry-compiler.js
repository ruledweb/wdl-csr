// src/registry-compiler.js — Synced from @ruledwdl/core
// @wdl/core — registry-compiler.js
// Single-responsibility compiler for WDL Registry Schema V2.0.
// Compiles __tokens__.vars to CSS custom properties, resolves `uses` token inheritance,
// and normalizes v2.0 structured entries (base, variants, states, breakpoints, containers, scopes)
// into flat class attribute objects.

import { expandScopedVars } from './token-expander.js';

/**
 * Compiles global theme tokens dictionary (__tokens__.vars) into a :root CSS custom property block.
 *
 * @param {Object} tokensVars - Dictionary of token name to value (e.g. { "color-primary": "#4f46e5" })
 * @returns {string} Compiled CSS block string
 */
export function compileGlobalTokens(tokensVars = {}) {
  if (!tokensVars || typeof tokensVars !== 'object') return '';
  const rules = [];
  for (const [key, val] of Object.entries(tokensVars)) {
    if (val != null && val !== '') {
      rules.push(`  --${key}: ${val};`);
    }
  }
  if (!rules.length) return '';
  return `:root {\n${rules.join('\n')}\n}`;
}

/**
 * Recursively resolves inheritance (`uses`) for a registry token key.
 *
 * @param {string} key - Component token key in registry
 * @param {Object} registry - Raw registry dictionary
 * @param {Set} visited - Cycle detection set
 * @returns {Object} Merged v2.0 component token object
 */
export function resolveTokenInheritance(key, registry = {}, visited = new Set()) {
  const raw = registry[key];
  if (!raw || typeof raw !== 'object') return raw || {};
  if (visited.has(key)) return raw; // Prevent cyclic inheritance
  visited.add(key);

  if (!Array.isArray(raw.uses) || !raw.uses.length) {
    return { ...raw };
  }

  // Merge parent entries in order
  let merged = {
    vars: {},
    base: '',
    variants: {},
    states: {},
    breakpoints: {},
    containers: {},
    scopes: {}
  };

  for (const parentKey of raw.uses) {
    const parentResolved = resolveTokenInheritance(parentKey, registry, visited);
    if (parentResolved && typeof parentResolved === 'object') {
      merged.vars = { ...merged.vars, ...(parentResolved.vars || {}) };
      merged.base = [merged.base, parentResolved.base].filter(Boolean).join(' ');
      merged.variants = { ...merged.variants, ...(parentResolved.variants || {}) };
      merged.states = { ...merged.states, ...(parentResolved.states || {}) };
      merged.breakpoints = { ...merged.breakpoints, ...(parentResolved.breakpoints || {}) };
      merged.containers = { ...merged.containers, ...(parentResolved.containers || {}) };
      merged.scopes = { ...merged.scopes, ...(parentResolved.scopes || {}) };
    }
  }

  // Merge child (current entry) on top of inherited parent
  return {
    ...merged,
    ...raw,
    vars: { ...merged.vars, ...(raw.vars || {}) },
    base: [merged.base, raw.base].filter(Boolean).join(' '),
    variants: { ...merged.variants, ...(raw.variants || {}) },
    states: { ...merged.states, ...(raw.states || {}) },
    breakpoints: { ...merged.breakpoints, ...(raw.breakpoints || {}) },
    containers: { ...merged.containers, ...(raw.containers || {}) },
    scopes: { ...merged.scopes, ...(raw.scopes || {}) }
  };
}

/**
 * Normalizes a single REGISTRY entry (v1.0 string/object or v2.0 structured object)
 * into a flat element attribute object { class: "..." }.
 *
 * @param {Object|string} entry - Raw registry entry
 * @param {Object} globalTokens - Global __tokens__.vars
 * @returns {Object} Normalized flat attribute object
 */
export function normalizeRegistryEntry(entry, globalTokens = {}) {
  if (!entry) return {};

  // Case 1: Legacy v1.0 String (e.g. "p-4 bg-white")
  if (typeof entry === 'string') {
    return { class: entry };
  }

  // Case 2: Detect V2.0 Structured Entry
  const isV2 = typeof entry === 'object' && (
    'base' in entry ||
    'variants' in entry ||
    'states' in entry ||
    'breakpoints' in entry ||
    'containers' in entry ||
    'scopes' in entry ||
    'uses' in entry ||
    'vars' in entry
  );

  // Case 3: Legacy v1.0 Flat Attribute Object (e.g. { class: "p-4", text: "${title}" })
  if (!isV2) {
    return { ...entry };
  }

  // Case 4: V2.0 Structured Entry Compilation
  const localVars = entry.vars || {};
  const classes = [];

  // Base utilities
  if (entry.base) {
    classes.push(expandScopedVars(entry.base, localVars, globalTokens));
  }

  // Default Variant (or variants map)
  if (entry.variants && typeof entry.variants === 'object') {
    const variantName = entry.defaultVariant || Object.keys(entry.variants)[0];
    if (variantName && entry.variants[variantName]) {
      classes.push(expandScopedVars(entry.variants[variantName], localVars, globalTokens));
    }
  }

  // States (e.g. hover, focus)
  if (entry.states && typeof entry.states === 'object') {
    for (const [state, cls] of Object.entries(entry.states)) {
      if (cls) {
        const expanded = expandScopedVars(cls, localVars, globalTokens);
        // Prefix with state if not already prefixed (e.g., hover:bg-[#...])
        const formatted = expanded.split(' ').map(c => (c.includes(':') ? c : `${state}:${c}`)).join(' ');
        classes.push(formatted);
      }
    }
  }

  // Breakpoints (e.g. md, lg)
  if (entry.breakpoints && typeof entry.breakpoints === 'object') {
    for (const [bp, cls] of Object.entries(entry.breakpoints)) {
      if (cls) {
        const expanded = expandScopedVars(cls, localVars, globalTokens);
        const formatted = expanded.split(' ').map(c => (c.includes(':') ? c : `${bp}:${c}`)).join(' ');
        classes.push(formatted);
      }
    }
  }

  // Containers (e.g. @sm, @md)
  if (entry.containers && typeof entry.containers === 'object') {
    for (const [cont, cls] of Object.entries(entry.containers)) {
      if (cls) {
        const expanded = expandScopedVars(cls, localVars, globalTokens);
        const formatted = expanded.split(' ').map(c => (c.includes(':') ? c : `${cont}:${c}`)).join(' ');
        classes.push(formatted);
      }
    }
  }

  const finalClass = classes.filter(Boolean).join(' ');

  // Preserve non-V2 extra attributes (e.g. text, attr-ref, x-data)
  const SKIP_V2_KEYS = new Set(['base', 'variants', 'defaultVariant', 'states', 'breakpoints', 'containers', 'scopes', 'uses', 'vars']);
  const extraAttrs = {};
  for (const [k, v] of Object.entries(entry)) {
    if (!SKIP_V2_KEYS.has(k)) {
      extraAttrs[k] = v;
    }
  }

  return {
    class: finalClass,
    ...extraAttrs
  };
}

/**
 * Normalizes an entire REGISTRY object:
 * 1. Extracts __tokens__.vars and generates theme CSS.
 * 2. Resolves token inheritance (uses).
 * 3. Normalizes entries into flat class attribute objects.
 *
 * @param {Object} rawRegistry - Incoming raw REGISTRY object
 * @returns {Object} { normalizedRegistry, themeCss }
 */
export function normalizeRegistry(rawRegistry = {}) {
  if (!rawRegistry || typeof rawRegistry !== 'object') {
    return { normalizedRegistry: {}, themeCss: '' };
  }

  const globalTokens = rawRegistry.__tokens__?.vars || {};
  const themeCss = compileGlobalTokens(globalTokens);

  const normalizedRegistry = {};

  for (const key of Object.keys(rawRegistry)) {
    if (key === '__tokens__' || key === '$version') continue;
    const resolvedEntry = resolveTokenInheritance(key, rawRegistry);
    normalizedRegistry[key] = normalizeRegistryEntry(resolvedEntry, globalTokens);
  }

  return { normalizedRegistry, themeCss };
}
