import { parseLayers } from './layers-parser.js';
import { toHTML } from './element-builder.js';

/**
 * Pure, synchronous rendering function for components.
 */
export function render(REG, COMPS, DAT) {
  return COMPS.map(comp => {
    if (comp._raw_html != null) return comp._raw_html;
    return parseLayers(comp.layers || 'div')
      .map(n => toHTML(n, comp.attr || {}, DAT, REG))
      .join('');
  }).join('');
}

/**
 * Client-side auto-mounter. 
 * Looks for any element with `data-wdl-csr` containing a JSON payload
 * and hydrates the DOM with the compiled output.
 */
export function hydrate(globalPayloads = null) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  // Use provided payloads or fallback to a global window object
  const payloads = globalPayloads || window.WDL_CSR || {};
  
  // Find all elements with the custom wdl-csr attribute
  const targets = document.querySelectorAll('[wdl-csr]');
  
  targets.forEach(target => {
    try {
      const compId = target.getAttribute('wdl-csr');
      if (!compId) return;
      
      const payload = payloads[compId];
      if (!payload) {
        console.warn(`WDL CSR: No payload found for component ID "${compId}"`);
        return;
      }
      
      const { REGISTRY = {}, COMPONENTS = [], DATA = {} } = payload;
      
      // Render without sanitization (trusted input assumed)
      target.innerHTML = render(REGISTRY, COMPONENTS, DATA);
    } catch (err) {
      console.error('WDL CSR Error: Failed to render target.', target, err);
    }
  });
}
