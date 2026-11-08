export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string };

export type MarkdownBlock =
  | { type: 'heading'; level: number; tokens: InlineToken[] }
  | { type: 'paragraph'; tokens: InlineToken[] }
  | { type: 'list'; ordered: boolean; items: InlineToken[][] }
  | { type: 'code'; text: string }
  | { type: 'quote'; tokens: InlineToken[] }
  | { type: 'hr' };

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
const LINK_PATTERN = /^\[([^\]]+)\]\(([^)\s]+)\)$/;
const SAFE_URL_PATTERN = /^https?:\/\//i;

function safeUrl(url: string): string | null {
  const trimmed = String(url || '').trim();
  return SAFE_URL_PATTERN.test(trimmed) ? trimmed : null;
}

/** Splits a line of inline markdown into text/strong/em/code/link tokens. */
export function parseInline(input: string): InlineToken[] {
  const text = String(input ?? '');
  if (!text) return [];

  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;

  const push = (token: InlineToken) => {
    const last = tokens[tokens.length - 1];
    if (token.type === 'text' && last && last.type === 'text') {
      last.text += token.text;
      return;
    }
    tokens.push(token);
  };

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];

    if (raw.startsWith('**') || raw.startsWith('__')) {
      push({ type: 'strong', text: raw.slice(2, -2) });
    } else if (raw.startsWith('`')) {
      push({ type: 'code', text: raw.slice(1, -1) });
    } else if (raw.startsWith('[')) {
      const link = raw.match(LINK_PATTERN);
      const url = link ? safeUrl(link[2]) : null;
      if (link && url) push({ type: 'link', text: link[1], url });
      else push({ type: 'text', text: raw });
    } else {
      push({ type: 'em', text: raw.slice(1, -1) });
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) push({ type: 'text', text: text.slice(lastIndex) });
  return tokens;
}

const HR_PATTERN = /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/;
const HEADING_PATTERN = /^\s{0,3}(#{1,4})\s+(.*)$/;
const FENCE_OPEN_PATTERN = /^\s{0,3}(```+|~~~+)/;
const FENCE_CLOSE_PATTERN = /^\s{0,3}(?:```+|~~~+)\s*$/;
const QUOTE_PATTERN = /^\s{0,3}>\s?(.*)$/;
const BULLET_PATTERN = /^\s*[-*+]\s+(.*)$/;
const ORDERED_PATTERN = /^\s*\d+[.)]\s+(.*)$/;

/**
 * Parses the small markdown subset Ledger AI returns (headings, paragraphs,
 * lists, fenced code, quotes, rules and inline emphasis) into blocks.
 * Rendering is done with React elements, never raw HTML.
 */
export function parseMarkdown(input: string): MarkdownBlock[] {
  const lines = String(input ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', tokens: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push({
      type: 'list',
      ordered: list.ordered,
      items: list.items.map((item) => parseInline(item)),
    });
    list = null;
  };

  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push({ type: 'quote', tokens: parseInline(quote.join(' ')) });
    quote = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/[ \t]+$/g, '');

    if (code) {
      if (FENCE_CLOSE_PATTERN.test(line)) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = null;
      } else {
        code.push(rawLine);
      }
      continue;
    }

    if (FENCE_OPEN_PATTERN.test(line)) {
      flushAll();
      code = [];
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      flushAll();
      blocks.push({
        type: 'heading',
        level: Math.min(heading[1].length, 3),
        tokens: parseInline(heading[2].trim()),
      });
      continue;
    }

    if (HR_PATTERN.test(line)) {
      flushAll();
      blocks.push({ type: 'hr' });
      continue;
    }

    const quoteLine = line.match(QUOTE_PATTERN);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    flushQuote();

    const bullet = line.match(BULLET_PATTERN);
    const ordered = line.match(ORDERED_PATTERN);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (list && list.ordered !== isOrdered) flushList();
      if (!list) list = { ordered: isOrdered, items: [] };
      list.items.push((bullet ? bullet[1] : ordered ? ordered[1] : '').trim());
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (code) blocks.push({ type: 'code', text: code.join('\n') });
  flushAll();

  return blocks;
}
