// src/layers-parser.js — WDL Layers syntax parser

export function parseLayers(raw) {
  const str = String(raw).replace(/[()]/g, "");
  const bad = str.match(/[{}\[\]^]/);
  if (bad) {
    const ch = bad[0];
    const hint =
      ch === '{' || ch === '}'
        ? 'Inline text `{...}` is not supported. Reference DATA with ${key} or set text via attr object.'
        : ch === '[' || ch === ']'
        ? 'Inline attributes `[name=value]` are not supported. Put attributes in attr object.'
        : 'Climb-up `^` is not supported. Use `<` for de-indentation / subset instead.';
    throw new Error(`parseLayers: unsupported character "${ch}" in "${str}". ${hint}`);
  }

  const root = { tag: "__root__", classes: [], children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];

  let i = 0;

  function parseElementToken() {
    let isComponent = false;
    if (str[i] === "@") {
      isComponent = true;
      i++;
    }
    let tag = "";
    while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) {
      tag += str[i];
      i++;
    }
    const idM = tag.match(/#([\w-]+)/);
    let id = idM ? idM[1] : null;

    const classes = [];
    while (i < str.length && str[i] === ".") {
      if (classes.length >= 1) {
        let errToken = (isComponent ? "@" : "") + tag + "." + classes[0] + ".";
        i++;
        while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) {
          errToken += str[i];
          i++;
        }
        throw new Error(
          `parseLayers: Multiple dot selectors in "${errToken}" are not allowed. ` +
          `WDL Layers strictly enforce one semantic_id per element (e.g. "tag.semantic_id"). ` +
          `For additional CSS classes, use REGISTRY tokens or the attr object (e.g. attr['.${classes[0]}'].class).`
        );
      }
      i++;
      let cls = "";
      while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) {
        cls += str[i];
        i++;
      }
      if (cls) classes.push(cls);
    }

    let repeat = 1;
    let loopKey = null;
    if (i < str.length && str[i] === "*") {
      i++;
      let mult = "";
      while (i < str.length && /[a-zA-Z0-9_.]/.test(str[i])) {
        mult += str[i];
        i++;
      }
      if (/^\d+$/.test(mult)) {
        repeat = parseInt(mult, 10);
      } else if (mult) {
        loopKey = mult;
      }
    }

    const n = {
      tag: (isComponent ? "@" : "") + (tag || "div"),
      classes,
      children: [],
    };
    if (id) n.id = id;
    if (loopKey) n.loopKey = loopKey;
    if (repeat > 1) n.repeat = repeat;

    return n;
  }

  while (i < str.length) {
    const ch = str[i];
    if (ch === ">") {
      const parent = top();
      const last = parent.children[parent.children.length - 1];
      if (last) stack.push(last);
      i++;
    } else if (ch === "+") {
      i++;
    } else if (ch === "<") {
      while (i < str.length && str[i] === "<") {
        if (stack.length > 1) stack.pop();
        i++;
      }
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      const el = parseElementToken();
      top().children.push(el);
    }
  }

  return root.children;
}

export function matchAttr(node, attr) {
  for (const c of node.classes) {
    if (attr['.' + c]) return attr['.' + c];
  }
  return attr[node.tag] || {};
}
