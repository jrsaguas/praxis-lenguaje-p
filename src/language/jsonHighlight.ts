export function highlightJsonSyntax(source: string): string {
  const escape = (value: string) => value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  })[character] ?? character);
  const pattern = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|\b(?:true|false|null)\b|[{}[\]:,]/g;
  let html = "";
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    html += escape(source.slice(cursor, index));
    let className = "json-punctuation";
    if (token.startsWith('"')) {
      const tail = source.slice(index + token.length);
      className = /^\s*:/.test(tail) ? "json-key" : "json-string";
    } else if (/^-?\d/.test(token)) {
      className = "json-number";
    } else if (/^(true|false|null)$/.test(token)) {
      className = "json-literal";
    }
    html += '<span class="' + className + '">' + escape(token) + "</span>";
    cursor = index + token.length;
  }
  return html + escape(source.slice(cursor));
}
