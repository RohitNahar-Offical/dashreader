import { QuickReaderSettings, WordChunk } from './types';

/**
 * WordDisplay
 * 
 * Manages the high-performance rendering of words in the Zen stage.
 * Implements ORP (Optimal Recognition Point) logic for maximum speed.
 */
export class WordDisplay {
  private container: HTMLElement;
  private settings: QuickReaderSettings;
  
  constructor(container: HTMLElement, settings: QuickReaderSettings) {
    this.container = container;
    this.settings = settings;
    this.applyBaseStyles();
  }

  private applyBaseStyles(): void {
    this.container.style.fontSize = `${this.settings.fontSize}px`;
    this.container.style.fontFamily = this.settings.fontFamily;
    this.container.style.color = this.settings.fontColor;
  }

  /**
   * Main rendering method for the current word chunk
   */
  render(chunk: WordChunk): void {
    this.container.empty();
    
    // Apply structural styling (v3.0)
    const isHeading = chunk.metadata?.headingLevel !== undefined && chunk.metadata.headingLevel > 0;
    this.container.toggleClass('is-heading', isHeading);
    if (isHeading) {
      this.container.setAttribute('data-level', String(chunk.metadata?.headingLevel));
    } else {
      this.container.removeAttribute('data-level');
    }

    const words = chunk.text.split(' ');
    
    if (words.length === 1) {
      this.renderSingleWord(words[0]);
    } else {
      this.renderMultiWord(words);
    }
  }

  /**
   * Renders a single word with ORP highlighting
   */
  private renderSingleWord(word: string): void {
    if (!word) return;

    // Calculate Responsive Scaling for long words
    const baseSize = this.settings.fontSize;
    if (word.length > 13) {
      const scaleFactor = Math.max(0.6, 1 - (word.length - 13) * 0.05);
      this.container.style.fontSize = `${baseSize * scaleFactor}px`;
    } else {
      this.container.style.fontSize = `${baseSize}px`;
    }

    const orpIndex = this.calculateORP(word);
    
    // 1. Left Wing (Pushes anchor to center)
    const leftText = word.substring(0, orpIndex);
    const leftWing = this.container.createDiv({ cls: 'qr-word-left-wing' });
    leftWing.setText(leftText || '');

    // 2. ORP Anchor (The Fixed Center Point)
    const orpChar = word.charAt(orpIndex);
    this.container.createDiv({ text: orpChar, cls: 'qr-word-orp' });

    // 3. Right Wing (Balances the layout)
    const rightText = word.substring(orpIndex + 1);
    const rightWing = this.container.createDiv({ cls: 'qr-word-right-wing' });
    rightWing.setText(rightText || '');
  }

  private renderMultiWord(words: string[]): void {
    this.container.setText(words.join(' '));
  }

  /**
   * Optimal Recognition Point calculation
   * Usually 25% to 35% into the word
   */
  private calculateORP(word: string): number {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  }

  /**
   * Update display settings
   */
  updateSettings(settings: QuickReaderSettings): void {
    this.settings = settings;
    this.applyBaseStyles();
  }

  showReady(fileName: string, totalWords: number, wpm: number, contentSnippet: string): void {
    this.container.empty();
    const readyContainer = this.container.createDiv({ cls: 'qr-dashboard' });
    
    // 1. Header: Document Identity
    const header = readyContainer.createDiv({ cls: 'qr-db-header' });
    header.createEl('h1', { text: fileName, cls: 'qr-db-title' });
    
    const meta = header.createDiv({ cls: 'qr-db-meta' });
    const minutes = Math.ceil(totalWords / wpm);
    this.createPill(meta, 'book-open', `${totalWords} words`);
    this.createPill(meta, 'clock', `${minutes} min read`);
    this.createPill(meta, 'zap', `${wpm} WPM`);

    // 2. Content Snapshot
    const preview = readyContainer.createDiv({ cls: 'qr-db-preview' });
    preview.createDiv({ cls: 'qr-db-preview-label', text: 'DOCUMENT PREVIEW' });
    preview.createDiv({ cls: 'qr-db-preview-text', text: contentSnippet + '...' });

    // 3. Command Center (Shortcuts)
    const shortcuts = readyContainer.createDiv({ cls: 'qr-db-shortcuts' });
    this.createShortcut(shortcuts, 'Space', 'Play / Pause');
    this.createShortcut(shortcuts, '↑ / ↓', 'Speed +/- 25');
    this.createShortcut(shortcuts, '← / →', 'Seek 10 Words');
    this.createShortcut(shortcuts, 'C', 'Toggle Context');
    this.createShortcut(shortcuts, 'Esc', 'Close Reader');

    // 4. Primary CTA
    const cta = readyContainer.createDiv({ cls: 'qr-db-cta' });
    cta.createDiv({ text: 'PRESS SPACE TO START', cls: 'qr-db-pulse-text' });
  }

  private createPill(parent: HTMLElement, icon: string, text: string): void {
    const pill = parent.createDiv({ cls: 'qr-db-pill' });
    pill.createSpan({ text: icon === 'book-open' ? '📖' : icon === 'clock' ? '⏱️' : '⚡', cls: 'qr-db-pill-icon' });
    pill.createSpan({ text: text });
  }

  private createShortcut(parent: HTMLElement, key: string, label: string): void {
    const item = parent.createDiv({ cls: 'qr-db-shortcut-item' });
    item.createSpan({ text: key, cls: 'qr-db-key' });
    item.createSpan({ text: label, cls: 'qr-db-label' });
  }

  clear(): void {
    this.container.empty();
  }
}
