// src/token-expander.js — Synced from @ruledwdl/core
// @wdl/core — token-expander.js
// Single-responsibility module for parsing and expanding prefix-$_{scoped-var}
// unbracketed placeholder syntax into standard Tailwind arbitrary utility classes.

/**
 * Resolves a scoped variable reference (e.g. "pad") against component local vars
 * and global __tokens__.vars dictionary.
 *
 * @param {string} varName - Local variable alias name (e.g. "pad")
 * @param {Object} localVars - Local component vars dictionary
 * @param {Object} globalVars - Global __tokens__.vars dictionary
 * @returns {string|null} Resolved CSS variable expression or raw value string
 */
export function resolveVariableValue(varName, localVars = {}, globalVars = {}) {
  let val = localVars[varName];

  // If missing locally, try global tokens directly
  if (val === undefined) {
    val = globalVars[varName];
    if (val !== undefined) {
      return `var(--${varName})`;
    }
    return null;
  }

  // If local var references a global user token ${user-token}
  if (typeof val === 'string' && val.startsWith('${') && val.endsWith('}')) {
    const userTokenKey = val.slice(2, -1).trim();
    return `var(--${userTokenKey})`;
  }

  return String(val);
}

/**
 * Expands all occurrences of prefix-$_{scoped-var} in a utility class string.
 * Example:
 *   "p-$_{pad} bg-$_{bg} rounded-$_{radius}"
 *   localVars: { pad: "${spacing-card}", bg: "#4f46e5", radius: "0.75rem" }
 *   Output: "p-[var(--spacing-card)] bg-[#4f46e5] rounded-[0.75rem]"
 *
 * @param {string} classString - Class utility string containing $_{...} placeholders
 * @param {Object} localVars - Local component vars
 * @param {Object} globalVars - Global __tokens__.vars
 * @returns {string} Fully expanded class utility string
 */
export function expandScopedVars(classString, localVars = {}, globalVars = {}) {
  if (!classString || typeof classString !== 'string') return '';
  if (!classString.includes('$_{')) return classString;

  // Regex matches: (optional prefix ending with -)$_{varName}
  // Group 1: prefix (e.g., "p-", "bg-", "text-", "rounded-")
  // Group 2: varName inside $_{varName}
  const regex = /([a-zA-Z0-9_@:-]+-)?\$_{([a-zA-Z0-9_-]+)}/g;

  return classString.replace(regex, (match, prefix, varName) => {
    const resolved = resolveVariableValue(varName, localVars, globalVars);
    if (resolved === null) return match; // Leave untouched if unresolvable

    const pfx = prefix || '';
    // Wrap in Tailwind arbitrary brackets [ ... ] if prefix exists
    if (pfx) {
      return `${pfx}[${resolved}]`;
    }
    return resolved;
  });
}
