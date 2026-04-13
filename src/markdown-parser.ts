/**
 * Parses Markdown to remove syntax and keep only the text
 */
export class MarkdownParser {

  static parseToPlainText(markdown: string): string {
    let text = markdown;

    // 1. Remove YAML frontmatter FIRST (usually at the beginning)
    text = text.replace(/^---[\s\S]*?---\n?/m, '');

    // 2. Protect code block content with temporary markers
    // This prevents # comments in code from being treated as headings
    const codeBlocks: string[] = [];
    text = text.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_match, code: string) => {
      const index = codeBlocks.length;
      codeBlocks.push(code);
      return `___CODE_BLOCK_${index}___`;
    });

    // 3. Remove inline code but keep content
    text = text.replace(/`([^`]+)`/g, '$1');

    // 4. Remove images ![alt](url) BEFORE links
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

    // 5. Remove links [text](url) -> keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 6. Remove wikilinks [[link]] or [[link|alias]] -> keep alias or link
    text = text.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_match, link: string, _pipe: string | undefined, alias: string | undefined) => {
      return alias || link;
    });

    // 7. Remove bold/italic (in order: **, __, *, _)
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1'); // bold+italic ***
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // bold **
    text = text.replace(/__([^_]+)__/g, '$1'); // bold __
    text = text.replace(/\*([^*\n]+)\*/g, '$1'); // italic *
    text = text.replace(/_([^_\n]+)_/g, '$1'); // italic _

    // 8. Remove strikethrough ~~text~~
    text = text.replace(/~~([^~]+)~~/g, '$1');

    // 9. Remove highlights ==text==
    text = text.replace(/==([^=]+)==/g, '$1');

    // 10. Mark headings with their level (#, ##, etc.)
    // # Title → [H1]Title, ## Title → [H2]Title, etc. (no space after marker)
    text = text.replace(/^(#{1,6})\s+(.+)$/gm, (_match: string, hashes: string, content: string) => {
      const level = hashes.length;
      return `[H${level}]${content}`;
    });

    // 11. Mark Obsidian callouts as pseudo-headings
    // > [!type] Title → [CALLOUT:type]Title
    // Keeps content of following lines (handled by next step)
    text = text.replace(/^>\s*\[!([\w-]+)\]\s*(.*)$/gm, (_match: string, type: string, title: string) => {
      // If no title, use type as title
      const displayTitle = title.trim() || type;
      return `[CALLOUT:${type}]${displayTitle}`;
    });

    // 12. Remove blockquotes > (keep content)
    text = text.replace(/^>\s*/gm, '');

    // 13. Remove lists - * + (keep content)
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');

    // 14. Remove dividers ---, ***, ___
    text = text.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '');

    // 15. Remove Obsidian tags/hashtags #tag (but not inside words)
    text = text.replace(/(?:^|\s)(#[a-zA-Z0-9_/-]+)/g, '');

    // 16. Remove footnotes [^1]
    text = text.replace(/\[\^[^\]]+\]/g, '');

    // 17. Remove footnote references
    text = text.replace(/^\[\^[^\]]+\]:.*$/gm, '');

    // 18. Remove Obsidian backlinks (backlinks sections)
    text = text.replace(/^---\s*Backlinks?\s*---[\s\S]*$/m, '');
    text = text.replace(/^##?\s*Backlinks?[\s\S]*$/m, '');

    // 19. Remove HTML comments <!-- -->
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // 20. Remove HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // 21. Remove multiple empty lines (keep max 2 line breaks)
    text = text.replace(/\n{3,}/g, '\n\n');

    // 22. Remove extra spaces on each line
    text = text.replace(/^[ \t]+/gm, '');
    text = text.replace(/[ \t]+$/gm, '');

    // 23. Restore code block content
    text = text.replace(/___CODE_BLOCK_(\d+)___/g, (_match: string, index: string) => {
      return codeBlocks[parseInt(index)] || '';
    });

    // 24. Final trim
    text = text.trim();

    return text;
  }

  /**
   * Parses selected text taking Obsidian context into account
   */
  static parseSelection(text: string): string {
    return this.parseToPlainText(text);
  }
}
