export function escapeHtml(raw: string) {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatInlineMarkdown(text: string) {
  let escaped = escapeHtml(text);

  // **粗体**
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *斜体*
  escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return escaped;
}

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      closeList();
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      closeList();
      htmlParts.push(`<h3>${formatInlineMarkdown(h3Match[1].trim())}</h3>`);
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      closeList();
      htmlParts.push(`<h2>${formatInlineMarkdown(h2Match[1].trim())}</h2>`);
      continue;
    }

    const listMatch = line.match(/^-\s+(.+)/);
    if (listMatch) {
      if (!inList) {
        inList = true;
        htmlParts.push('<ul>');
      }
      htmlParts.push(`<li>${formatInlineMarkdown(listMatch[1].trim())}</li>`);
      continue;
    }

    closeList();
    htmlParts.push(`<p>${formatInlineMarkdown(line)}</p>`);
  }

  closeList();

  return htmlParts.join('');
}
