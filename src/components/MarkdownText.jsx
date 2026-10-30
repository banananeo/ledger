import React, { useMemo } from 'react';
import { parseMarkdown } from '../utils/markdown.ts';
import './MarkdownText.css';

function InlineContent({ tokens }) {
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'strong':
        return (
          <strong className="md-strong" key={index}>
            {token.text}
          </strong>
        );
      case 'em':
        return (
          <em className="md-em" key={index}>
            {token.text}
          </em>
        );
      case 'code':
        return (
          <code className="md-inline-code" key={index}>
            {token.text}
          </code>
        );
      case 'link':
        return (
          <a className="md-link" key={index} href={token.url} target="_blank" rel="noopener noreferrer">
            {token.text}
          </a>
        );
      case 'text':
      default:
        return <React.Fragment key={index}>{token.text}</React.Fragment>;
    }
  });
}

function MarkdownBlockView({ block }) {
  switch (block.type) {
    case 'heading': {
      const HeadingTag = `h${block.level}`;
      return (
        <HeadingTag className={`md-heading md-h${block.level}`}>
          <InlineContent tokens={block.tokens} />
        </HeadingTag>
      );
    }
    case 'paragraph':
      return (
        <p className="md-p">
          <InlineContent tokens={block.tokens} />
        </p>
      );
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={block.ordered ? 'md-ol' : 'md-ul'}>
          {block.items.map((item, index) => (
            <li className="md-li" key={index}>
              <InlineContent tokens={item} />
            </li>
          ))}
        </ListTag>
      );
    }
    case 'code':
      return (
        <pre className="md-pre">
          <code className="md-code">{block.text}</code>
        </pre>
      );
    case 'quote':
      return (
        <blockquote className="md-quote">
          <InlineContent tokens={block.tokens} />
        </blockquote>
      );
    case 'hr':
      return <hr className="md-hr" />;
    default:
      return null;
  }
}

/**
 * Renders the small markdown subset returned by Ledger AI as real elements.
 * Output is always React-escaped: no dangerouslySetInnerHTML.
 */
function MarkdownText({ text, className = '' }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);

  if (!blocks.length) return null;

  return (
    <div className={`md-text${className ? ` ${className}` : ''}`}>
      {blocks.map((block, index) => (
        <MarkdownBlockView key={index} block={block} />
      ))}
    </div>
  );
}

export default MarkdownText;
