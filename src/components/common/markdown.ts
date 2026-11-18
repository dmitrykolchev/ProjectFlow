import { html, TemplateResult } from 'lit';

export interface MarkdownCell {
  text: string;
  align: 'left' | 'center' | 'right';
}

export interface MarkdownBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'quote' | 'ul' | 'ol' | 'checklist' | 'code' | 'table';
  text?: string;
  lang?: string;
  items?: { text: string; checked?: boolean }[];
  header?: MarkdownCell[];
  rows?: MarkdownCell[][];
}

/** GFM pipe-table row: `| a | b |` — cells split on pipes, outer pipes stripped. */
function splitTableRow(trimmed: string): string[] {
  let body = trimmed;
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|')) body = body.slice(0, -1);
  return body.split('|').map((cell) => cell.trim());
}

/** Separator row `|---|:-:|` marks a table; per-cell colons set the alignment. */
function isTableSeparator(trimmed: string): boolean {
  if (!trimmed.startsWith('|') || trimmed.length < 3) return false;
  const cells = splitTableRow(trimmed);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function cellAlignsFromSeparator(trimmed: string): MarkdownCell['align'][] {
  return splitTableRow(trimmed).map((cell) => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    return 'left';
  });
}

/**
 * Split raw markdown into top-level blocks: headings, paragraphs, quotes,
 * bullet / numbered lists, checklists, fenced code and GFM pipe tables.
 * Inline markup is left intact for `renderInlineMarkdown`.
 */
export function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  const lines = (raw || '').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    if (/^- \[[xX ]\] /.test(trimmed)) {
      const items: { text: string; checked: boolean }[] = [];
      while (i < lines.length && /^- \[[xX ]\] /.test(lines[i].trim())) {
        const cur = lines[i].trim();
        items.push({ checked: cur[3].toLowerCase() === 'x', text: cur.slice(6) });
        i += 1;
      }
      blocks.push({ type: 'checklist', items });
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      const items: { text: string }[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim()) && !/^- \[[xX ]\] /.test(lines[i].trim())) {
        items.push({ text: lines[i].trim().slice(2) });
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\. /.test(trimmed)) {
      const items: { text: string }[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push({ text: lines[i].trim().replace(/^\d+\. /, '') });
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) {
      const aligns = cellAlignsFromSeparator(lines[i + 1].trim());
      const headerCells = splitTableRow(trimmed);
      const header: MarkdownCell[] = headerCells.map((text, cIdx) => ({
        text,
        align: aligns[cIdx] || 'left',
      }));
      i += 2;
      const rows: MarkdownCell[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = splitTableRow(lines[i].trim());
        rows.push(cells.map((text, cIdx) => ({ text, align: aligns[cIdx] || 'left' })));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*] /.test(lines[i].trim()) &&
      !/^\d+\. /.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') });
  }

  return blocks;
}

/** Inline markdown: `code` spans and **bold** runs become elements, the rest stays text. */
export function renderInlineMarkdown(text: string): (string | TemplateResult)[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return html`<code>${part.slice(1, -1)}</code>`;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return html`<strong>${part.slice(2, -2)}</strong>`;
    }
    return part;
  });
}
