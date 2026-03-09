const MAX_TRIMMED_HTML_BYTES = 150 * 1024;

export function trimHtml(html: string): string {
  let output = html;

  output = output.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  output = output.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  output = output.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  output = output.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  output = output.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{200,}/gi, 'data:image/*;base64,[trimmed]');
  output = output.replace(/https?:\/\/[^\s"'<>]{200,}/gi, '[long-url-trimmed]');

  output = output.replace(/\s+/g, ' ').trim();

  if (output.length > MAX_TRIMMED_HTML_BYTES) {
    output = output.slice(0, MAX_TRIMMED_HTML_BYTES);
  }

  return output;
}

