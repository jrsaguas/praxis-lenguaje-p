const praxisKeywords = new Set([
  "agent", "run", "with", "let", "role", "goal", "memory", "cycle", "tool",
  "evidence", "policy", "parallel", "guard", "input", "output", "permission",
  "limit", "requires", "test", "source", "claim", "confidence", "condition",
  "on", "allow", "deny", "steps", "mode", "contract", "required", "true", "false"
]);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[character] ?? character);
}

function wrap(className: string, token: string): string {
  return '<span class="' + className + '">' + escapeHtml(token) + '</span>';
}

export function highlightPraxis(source: string): string {
  const tokenPattern = /\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_-]*|[{}\[\]():,=]/g;
  let html = "";
  let cursor = 0;

  for (const match of source.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    html += escapeHtml(source.slice(cursor, index));

    if (token.startsWith("//")) {
      html += wrap("tok-comment", token);
    } else if (token.startsWith('"')) {
      html += wrap("tok-string", token);
    } else if (/^-?\d/.test(token)) {
      html += wrap("tok-number", token);
    } else if (/^[A-Za-z_]/.test(token)) {
      if (praxisKeywords.has(token)) {
        html += wrap("tok-keyword", token);
      } else if (/^\s*\(/.test(source.slice(index + token.length))) {
        html += wrap("tok-function", token);
      } else {
        html += wrap("tok-identifier", token);
      }
    } else {
      html += wrap("tok-symbol", token);
    }

    cursor = index + token.length;
  }

  return html + escapeHtml(source.slice(cursor));
}

function highlightGrammarLine(line: string): string {
  const rule = line.match(/^(\s*)([a-z][A-Za-z0-9_]*)\s*(::=)(.*)$/);
  const prefix = rule
    ? escapeHtml(rule[1]) + wrap("tok-grammar-rule", rule[2]) + wrap("tok-grammar-operator", "::=") + " "
    : "";
  const body = rule ? rule[4] : line;
  const tokens = /"(?:\\.|[^"\\])*"|[A-Z][A-Z0-9_]*|::=|[|*?()[\]{}=,:]|[a-z][A-Za-z0-9_]*/g;
  let html = "";
  let cursor = 0;

  for (const match of body.matchAll(tokens)) {
    const token = match[0];
    const index = match.index ?? 0;
    html += escapeHtml(body.slice(cursor, index));

    if (token.startsWith('"')) {
      html += wrap("tok-string", token);
    } else if (/^[A-Z][A-Z0-9_]*$/.test(token)) {
      html += wrap("tok-grammar-terminal", token);
    } else if (/^(::=|[|*?()[\]{}=,:])$/.test(token)) {
      html += wrap("tok-grammar-operator", token);
    } else {
      html += wrap("tok-grammar-reference", token);
    }

    cursor = index + token.length;
  }

  return prefix + html + escapeHtml(body.slice(cursor));
}

export function highlightGrammar(source: string): string {
  return source.split("\n").map(highlightGrammarLine).join("\n");
}
