// src/wdl-dom-tree.js — Synced from @ruledwdl/core
// @wdl/core — wdl-dom-tree.js
// Single-responsibility WDL Layer State Machine & DOM Tree engine.
// Maintains an ordered state array of 5-element tuples [depth, operator, tag, semantic_id, repeator].
// Enforces strict WDL rules: single semantic_id per node (no .class1.class2) and allowed WDL operators.

const ALLOWED_OPS = new Set(['', '>', '+', '<']);

/**
 * Validates a WDL operator string.
 * Supports standard operators: "", ">", "+", "<", "<*N", "<@N".
 */
export function validateOperator(op) {
  if (op == null || op === '') return '';
  const str = String(op).trim();
  if (ALLOWED_OPS.has(str)) return str;
  if (/^<\*\d+$/.test(str)) return str; // <*N repeater
  if (/^<@\d+$/.test(str)) return str; // <@N depth reference
  throw new Error(`WDLDomTree: Invalid operator "${op}". Allowed operators are: "", ">", "+", "<", "<*N", "<@N".`);
}

/**
 * Validates semantic class ID.
 * Strictly enforces 1 semantic_id per node (forbids multiple dot selectors like class1.class2).
 */
export function validateSemanticId(sem) {
  if (!sem) return '';
  const str = String(sem).trim().replace(/^\./, '');
  if (str.includes('.')) {
    throw new Error(`WDLDomTree: Multiple dot selectors in "${sem}" are not allowed. WDL Layers strictly enforce one semantic_id per node (no .class1.class2).`);
  }
  return str;
}

/**
 * Normalizes a layer entry (tuple array, string token, or object) into a validated 5-element tuple.
 * [depth, operator, tag, semantic_id, repeator]
 */
export function normalizeTuple(entry) {
  if (Array.isArray(entry)) {
    let depth = 0;
    let op = '';
    let tag = 'div';
    let sem = '';
    let rep = null;

    if (typeof entry[0] === 'number') {
      // 5-element tuple: [depth, operator, tag, semantic_id, repeator]
      depth = Math.max(0, parseInt(entry[0], 10) || 0);
      op = validateOperator(entry[1]);
      tag = String(entry[2] || 'div').toLowerCase();
      sem = validateSemanticId(entry[3]);
      rep = entry[4] ? String(entry[4]) : null;
    } else {
      // 4-element tuple: [operator, tag, semantic_id, repeator]
      op = validateOperator(entry[0]);
      tag = String(entry[1] || 'div').toLowerCase();
      sem = validateSemanticId(entry[2]);
      rep = entry[3] ? String(entry[3]) : null;
    }
    return [depth, op, tag, sem, rep];
  }

  if (typeof entry === 'object' && entry !== null) {
    const depth = Math.max(0, parseInt(entry.depth, 10) || 0);
    const op = validateOperator(entry.op || entry.operator || '');
    const tag = String(entry.tag || entry.node || 'div').toLowerCase();
    const sem = validateSemanticId(entry.semantic_id || entry.class || '');
    const rep = entry.repeator || entry.loopKey || null;
    return [depth, op, tag, sem, rep];
  }

  if (typeof entry === 'string') {
    return parseStringTokenToTuple(entry);
  }

  return [0, '', 'div', '', null];
}

/**
 * Parses a single WDL string token (e.g. "> div.container*3" or "<@1 a.forgot") into a 5-element tuple.
 */
export function parseStringTokenToTuple(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string') return [0, '', 'div', '', null];

  let str = tokenStr.trim();
  let op = '';

  // Extract operator at beginning
  if (str.startsWith('<*')) {
    const match = str.match(/^<\*\d+/);
    if (match) { op = match[0]; str = str.slice(op.length).trim(); }
  } else if (str.startsWith('<@')) {
    const match = str.match(/^<@\d+/);
    if (match) { op = match[0]; str = str.slice(op.length).trim(); }
  } else if (str.startsWith('>')) {
    op = '>'; str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    op = '+'; str = str.slice(1).trim();
  } else if (str.startsWith('<')) {
    let count = 0;
    while (str.startsWith('<')) { count++; str = str.slice(1); }
    op = count > 1 ? `<*${count}` : '<';
    str = str.trim();
  }

  validateOperator(op);

  // Extract repeator multiplier / loop key (*3 or *posts)
  let rep = null;
  const multIdx = str.indexOf('*');
  if (multIdx !== -1) {
    rep = str.slice(multIdx + 1);
    str = str.slice(0, multIdx);
  }

  // Parse tag and class
  let tag = 'div';
  let sem = '';

  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2) {
      throw new Error(`WDLDomTree: Multiple dot selectors in "${str}" are not allowed. WDL Layers strictly enforce one semantic_id per node (no .class1.class2).`);
    }
    tag = parts[0] || 'div';
    sem = validateSemanticId(parts[1]);
  } else {
    tag = str || 'div';
  }

  return [0, op, tag.toLowerCase(), sem, rep];
}

/**
 * WDLDomTree — Layer State Machine for WDL Layer trees.
 */
export class WDLDomTree {
  constructor(input = null) {
    this.state = []; // Ordered array of [depth, operator, tag, semantic_id, repeator]
    if (input) this.load(input);
  }

  static from(input) {
    return new WDLDomTree(input);
  }

  // -------------------------------------------------------------
  // 1. INGESTION & STATE LOADING
  // -------------------------------------------------------------
  load(input) {
    if (!input) {
      this.state = [];
      return this;
    }

    if (input instanceof WDLDomTree) {
      this.state = input.toTuples();
      return this;
    }

    if (Array.isArray(input)) {
      this.state = input.map(normalizeTuple);
      return this;
    }

    if (typeof input === 'string') {
      // Split by layer tokens while preserving operator prefixes
      const tokens = input.trim().split(/\s+/).filter(Boolean);
      this.state = tokens.map(parseStringTokenToTuple);
      return this;
    }

    return this;
  }

  // -------------------------------------------------------------
  // 2. QUERY & INSPECTION API
  // -------------------------------------------------------------
  get length() {
    return this.state.length;
  }

  getAt(index) {
    if (index < 0 || index >= this.state.length) return null;
    return [...this.state[index]];
  }

  findIndexByClass(semanticId) {
    const target = validateSemanticId(semanticId);
    return this.state.findIndex(tuple => tuple[3] === target);
  }

  findIndexByTag(tag) {
    const target = String(tag).toLowerCase();
    return this.state.findIndex(tuple => tuple[2] === target);
  }

  // -------------------------------------------------------------
  // 3. MUTATION & STATE MANIPULATION API
  // -------------------------------------------------------------
  append(depth, operator, tag, semanticId, repeator = null) {
    const tuple = [
      Math.max(0, parseInt(depth, 10) || 0),
      validateOperator(operator),
      String(tag || 'div').toLowerCase(),
      validateSemanticId(semanticId),
      repeator ? String(repeator) : null,
    ];
    this.state.push(tuple);
    return this;
  }

  insertAt(index, entry) {
    const tuple = normalizeTuple(entry);
    const safeIdx = Math.max(0, Math.min(index, this.state.length));
    this.state.splice(safeIdx, 0, tuple);
    return this;
  }

  removeAt(index) {
    if (index >= 0 && index < this.state.length) {
      this.state.splice(index, 1);
    }
    return this;
  }

  reorder(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < this.state.length) {
      const [moved] = this.state.splice(fromIndex, 1);
      const safeTarget = Math.max(0, Math.min(toIndex, this.state.length));
      this.state.splice(safeTarget, 0, moved);
    }
    return this;
  }

  wrap(targetIndex, wrapperTag, wrapperSemanticId) {
    if (targetIndex < 0 || targetIndex >= this.state.length) return this;
    const target = this.state[targetIndex];
    const parentDepth = target[0];

    const wrapper = [parentDepth, target[1] || '+', String(wrapperTag || 'div').toLowerCase(), validateSemanticId(wrapperSemanticId), null];
    this.state.splice(targetIndex, 0, wrapper);

    // Indent target node as child of wrapper
    this.state[targetIndex + 1][0] = parentDepth + 1;
    this.state[targetIndex + 1][1] = '>';
    return this;
  }

  // -------------------------------------------------------------
  // 4. OUTPUT & SERIALIZATION API
  // -------------------------------------------------------------
  toTuples() {
    return this.state.map(tuple => [...tuple]);
  }

  toString() {
    return this.state.map(tuple => {
      const op = tuple[1] ? `${tuple[1]} ` : '';
      const tag = tuple[2] || 'div';
      const sem = tuple[3] ? `.${tuple[3]}` : '';
      const rep = tuple[4] ? (tuple[4].startsWith('*') ? tuple[4] : `*${tuple[4]}`) : '';
      return `${op}${tag}${sem}${rep}`;
    }).join(' ');
  }
}
