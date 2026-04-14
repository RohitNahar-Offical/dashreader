import { HeadingInfo, Paragraph } from './types';

/**
 * MarkdownParser (Zen v5.0 - Structure First)
 * 
 * Rebuilt from scratch to ensure zero marker leakage.
 * Uses a clean multi-pass strategy:
 * 1. Extraction: Identify headings and callouts.
 * 2. Cleanup: Strip syntax while preserving word flow.
 * 3. Mapping: Align structure to word indices.
 */
export class MarkdownParser {
  static parse(markdown: string): { words: string[]; headings: HeadingInfo[]; paragraphs: Paragraph[] } {
    const headings: HeadingInfo[] = [];
    const paragraphs: Paragraph[] = [];
    const cleanWords: string[] = [];

    // 1. Initial cleanup (Frontmatter, block comments)
    let cleanMarkdown = markdown.replace(/^---[\s\S]*?---\n?/m, '');
    cleanMarkdown = cleanMarkdown.replace(/%%[\s\S]*?%%/g, '');

    const lines = cleanMarkdown.split('\n');
    let currentWordIndex = 0;
    
    let currentParaStartIndex: number | null = null;
    let paraBuffer: string[] = [];

    for (let line of lines) {
      const trimmed = line.trim();
      
      // -- Structural Detection --
      // Headings
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        this.saveParagraph(paragraphs, currentParaStartIndex, currentWordIndex, paraBuffer);
        currentParaStartIndex = null;
        paraBuffer = [];

        const level = headingMatch[1].length;
        const text = this.cleanLine(headingMatch[2]);
        const headingWords = text.split(/\s+/).filter(w => w.length > 0);
        
        headings.push({
          level,
          text: headingWords.join(' '),
          wordIndex: currentWordIndex,
          wordLength: headingWords.length
        });

        headingWords.forEach(w => {
          cleanWords.push(w);
          currentWordIndex++;
        });
        continue;
      }

      // Callouts
      const calloutMatch = trimmed.match(/^>\s*\[!([\w-]+)\]\s*(.*)$/);
      if (calloutMatch) {
        this.saveParagraph(paragraphs, currentParaStartIndex, currentWordIndex, paraBuffer);
        currentParaStartIndex = null;
        paraBuffer = [];

        const type = calloutMatch[1];
        const title = calloutMatch[2].trim() || type;
        const text = this.cleanLine(title);
        const callWords = text.split(/\s+/).filter(w => w.length > 0);

        headings.push({
          level: 0,
          text: callWords.join(' '),
          wordIndex: currentWordIndex,
          wordLength: callWords.length,
          calloutType: type
        });

        callWords.forEach(w => {
          cleanWords.push(w);
          currentWordIndex++;
        });
        continue;
      }

      // -- Content Extraction --
      if (trimmed === '') {
        this.saveParagraph(paragraphs, currentParaStartIndex, currentWordIndex, paraBuffer);
        currentParaStartIndex = null;
        paraBuffer = [];
        continue;
      }

      const cleanLineText = this.cleanLine(line);
      const wordsOnLine = cleanLineText.split(/\s+/).filter(w => w.length > 0);
      
      if (wordsOnLine.length > 0) {
        if (currentParaStartIndex === null) currentParaStartIndex = currentWordIndex;
        wordsOnLine.forEach(w => {
          cleanWords.push(w);
          paraBuffer.push(w);
          currentWordIndex++;
        });
      }
    }

    // Final para close
    this.saveParagraph(paragraphs, currentParaStartIndex, currentWordIndex, paraBuffer);

    return {
      words: cleanWords,
      headings,
      paragraphs
    };
  }

  private static saveParagraph(paras: Paragraph[], start: number | null, current: number, buffer: string[]): void {
    if (start !== null && buffer.length > 0) {
      paras.push({
        wordStartIndex: start,
        wordEndIndex: current - 1,
        text: buffer.join(' ')
      });
    }
  }

  /**
   * Cleans a single line of text from Markdown syntax
   */
  private static cleanLine(line: string): string {
    let t = line;
    
    // Frontmatter/Comments should be pre-filtered if possible, but handle inline
    t = t.replace(/%%[\s\S]*?%%/g, '');
    
    // Links/Images
    t = t.replace(/!\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, '$3');
    t = t.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_m, link, _p, alias) => alias || link);
    t = t.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Formatting
    t = t.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
    t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
    t = t.replace(/__([^_]+)__/g, '$1');
    t = t.replace(/\*([^*\n]+)\*/g, '$1');
    t = t.replace(/_([^_\n]+)_/g, '$1');
    t = t.replace(/~~([^~]+)~~/g, '$1');
    t = t.replace(/==([^=]+)==/g, '$1');
    t = t.replace(/`([^`]+)`/g, '$1');
    
    // Obsidian Decorations & Technical Noise
    t = t.replace(/<[^>]+>/g, ''); // Strip all HTML tags
    t = t.replace(/\[\^[^\]]+\]/g, ''); // Strip footnote references [^1]
    t = t.replace(/\$[^$]+\$/g, '[MATH]'); // Inline math protection
    
    t = t.replace(/^>\s*/gm, '');
    t = t.replace(/^[\s]*[-*+]\s+\[.\]\s*/gm, '');
    t = t.replace(/^[\s]*[-*+]\s+/gm, '');
    t = t.replace(/^[\s]*\d+\.\s+/gm, '');
    t = t.replace(/(?:^|\s)(#[a-zA-Z0-9_/-]+)/g, ''); // Tags
    t = t.replace(/\s+\^[a-zA-Z0-9-]+$/gm, ''); // Block IDs
    
    return t.trim();
  }
}
