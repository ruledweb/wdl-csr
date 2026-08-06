import { render } from '../../src/index.js';

// 1. Setup WDL JSON Definition
const REGISTRY = {};
const COMPONENTS = [
  { 
    layers: 'div.server-box > h1 + p', 
    attr: { 
      '.server-box': { 'class': 'backend-container' },
      'h1': { text: 'Hello from Node!' },
      'p': { text: 'Data binding works: ${label}' } 
    } 
  }
];
const DATA = { label: 'Backend Render Success' };

// 2. Render Component
console.log("Starting WDL Render in Node.js...\n");
const htmlString = render(REGISTRY, COMPONENTS, DATA);

// 3. Output Result
console.log("--- Generated HTML ---");
console.log(htmlString);
console.log("----------------------");
