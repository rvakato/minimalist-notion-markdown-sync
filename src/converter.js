/**
 * Converts Notion block objects into Markdown strings.
 * Images are left as placeholders here; imageHandler rewrites them afterwards.
 */

/**
 * Render rich text array to Markdown inline syntax.
 * @param {Array} richText - Notion rich_text array
 * @returns {string}
 */
export function richTextToMarkdown(richText = []) {
  return richText
    .map((span) => {
      let text = span.plain_text;

      // Escape pipe characters inside table cells before wrapping
      text = text.replace(/\|/g, '\\|');

      if (span.type === 'equation') {
        return `$${span.equation.expression}$`;
      }

      const { annotations, href } = span;
      if (annotations.code)          text = `\`${text}\``;
      if (annotations.bold)          text = `**${text}**`;
      if (annotations.italic)        text = `*${text}*`;
      if (annotations.strikethrough) text = `~~${text}~~`;
      if (href)                      text = `[${text}](${href})`;

      return text;
    })
    .join('');
}

/**
 * Convert a single Notion block to a Markdown string.
 * @param {Object} block - Notion block object (may include .children)
 * @param {number} depth - Nesting depth for indented list items
 * @returns {string}
 */
export function blockToMarkdown(block, depth = 0) {
  const indent = '  '.repeat(depth);

  switch (block.type) {
    case 'paragraph':
      return richTextToMarkdown(block.paragraph.rich_text) || '';

    case 'heading_1':
      return `# ${richTextToMarkdown(block.heading_1.rich_text)}`;

    case 'heading_2':
      return `## ${richTextToMarkdown(block.heading_2.rich_text)}`;

    case 'heading_3':
      return `### ${richTextToMarkdown(block.heading_3.rich_text)}`;

    case 'bulleted_list_item': {
      const content = `${indent}- ${richTextToMarkdown(block.bulleted_list_item.rich_text)}`;
      const children = renderChildren(block.children, depth + 1);
      return children ? `${content}\n${children}` : content;
    }

    case 'numbered_list_item': {
      const content = `${indent}1. ${richTextToMarkdown(block.numbered_list_item.rich_text)}`;
      const children = renderChildren(block.children, depth + 1);
      return children ? `${content}\n${children}` : content;
    }

    case 'to_do': {
      const checked = block.to_do.checked ? '[x]' : '[ ]';
      return `${indent}- ${checked} ${richTextToMarkdown(block.to_do.rich_text)}`;
    }

    case 'toggle': {
      const summary = richTextToMarkdown(block.toggle.rich_text);
      const children = renderChildren(block.children, 0);
      return `<details>\n<summary>${summary}</summary>\n\n${children}\n</details>`;
    }

    case 'code': {
      const lang = block.code.language || '';
      const code = block.code.rich_text.map((t) => t.plain_text).join('');
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case 'equation':
      return `$$\n${block.equation.expression}\n$$`;

    case 'quote': {
      const text = richTextToMarkdown(block.quote.rich_text);
      return text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    }

    case 'callout': {
      const emoji = block.callout.icon?.emoji ?? '';
      const text = richTextToMarkdown(block.callout.rich_text);
      return `> ${emoji} ${text}`;
    }

    case 'divider':
      return '---';

    case 'table': {
      return renderTable(block);
    }

    case 'image': {
      const url =
        block.image.type === 'external'
          ? block.image.external.url
          : block.image.file.url;
      const caption = richTextToMarkdown(block.image.caption);
      // Placeholder URL; imageHandler will rewrite this to a local path
      return `![${caption}](${url})`;
    }

    case 'file': {
      const url =
        block.file.type === 'external'
          ? block.file.external.url
          : block.file.file.url;
      const name = richTextToMarkdown(block.file.caption) || 'file';
      return `[${name}](${url})`;
    }

    case 'child_page':
      return `[${block.child_page.title}](./${block.id}.md)`;

    case 'column_list':
      return renderChildren(block.children, depth);

    case 'column':
      return renderChildren(block.children, depth);

    default:
      return '';
  }
}

/**
 * Render a table block, including its rows.
 * Notion delivers table rows as children of the table block.
 * @param {Object} tableBlock
 * @returns {string}
 */
function renderTable(tableBlock) {
  const rows = (tableBlock.children || []).filter(
    (b) => b.type === 'table_row'
  );
  if (rows.length === 0) return '';

  const renderRow = (row) =>
    '| ' +
    row.table_row.cells
      .map((cell) => richTextToMarkdown(cell))
      .join(' | ') +
    ' |';

  const headerRow = renderRow(rows[0]);
  const colCount = rows[0].table_row.cells.length;
  const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
  const bodyRows = rows.slice(1).map(renderRow);

  return [headerRow, separator, ...bodyRows].join('\n');
}

/**
 * Render an array of child blocks, joining with blank lines.
 * @param {Array} children
 * @param {number} depth
 * @returns {string}
 */
function renderChildren(children = [], depth = 0) {
  return children
    .map((child) => blockToMarkdown(child, depth))
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Convert a full array of top-level blocks to a Markdown document string.
 * @param {Array} blocks
 * @returns {string}
 */
export function blocksToMarkdown(blocks) {
  return renderChildren(blocks, 0);
}
