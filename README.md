# Web Definition Language — CSR Engine (`@ruledwdl/csr`)

> An ultra-lightweight client-side rendering (CSR) extension for WDL components.

`@ruledwdl/csr` is an exported, minimal subset of the main [@ruledwdl/core](https://github.com/ruledweb/ruledwdl) engine. It is specifically built and packaged separately for **client-side component rendering** and dynamic DOM hydration in the browser.

By stripping out full-page composition, design token cascading, script bucket management, and Markdown parsing, `@ruledwdl/csr` provides a pure, synchronous rendering loop that maps JSON directly to HTML fragments. It is designed to be tiny, fast, and completely framework-agnostic.

---

## Features

- **Tiny Footprint:** Zero external dependencies (no markdown parsers, no DOM sanitizers). When minified, the bundle is less than **4.3kb**.
- **Pure Rendering:** Takes `REGISTRY`, `COMPONENTS`, and `DATA` JSON definitions and returns clean HTML strings.
- **WDL Layers Syntax v0.2.0:** Full support for Emmet-like component expressions including `<` parent step-back, `<*N` multi-level repeater, and `<@N` absolute depth reference.
- **Component Identifier Attributes:** Automatically emits `wdl-comp="{semantic-id}"` attributes on generated DOM elements for precise CSS/JS targeting.
- **Auto-Hydration:** Includes a built-in `hydrate()` function that scans the DOM for elements marked with the `wdl-csr` attribute and automatically renders the corresponding JSON payload into them.
- **BYOS (Bring Your Own Sanitization):** To guarantee the smallest possible bundle size, text content is treated as raw strings. The host application or backend API is strictly responsible for providing trusted/sanitized data payloads.

---

## Installation

Install via npm:

```bash
npm install @ruledwdl/csr
```

---

## Usage & Examples

We have provided three complete examples in the [`examples/`](./examples) directory:

1. **[Auto-Hydration (Browser/CDN)](./examples/01-auto-hydration-cdn/)**  
   Shows how to use the `wdl-csr` attribute and the global `window.WDL_CSR` payload to let the library automatically scan and mount components onto your page.

2. **[Manual Rendering (ESM)](./examples/02-manual-rendering-esm/)**  
   Shows how to import the `render()` function directly in the browser via an ES Module to manually construct and inject HTML strings.

3. **[Node.js Rendering](./examples/03-node-rendering/)**  
   Shows how to run the pure `render()` function in a backend Node.js or Edge environment without needing the full `@ruledwdl/core` layout composer.

---

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-or-later).
