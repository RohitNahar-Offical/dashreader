import * as obsidian from 'obsidian';
import { QuickReaderSettings, WordChunk, IQuickReader } from './types';
import { RSVPEngine } from './rsvp-engine';
import { DOMRegistry } from './dom-registry';
import { WordDisplay } from './word-display';
import { BreadcrumbManager } from './breadcrumb-manager';
import { MinimapManager } from './minimap-manager';
import { MarkdownParser } from './markdown-parser';
import { CSS_CLASSES } from './constants';
import { createIconButton, createPlaybackToggle, updatePlaybackUI } from './ui-builders';

// Hybrid import to bypass TypeScript/Obsidian API resolution issues in current build env
const ModalBase = (obsidian as any).Modal;

/**
 * QuickReaderModal
 * 
 * The central Zen interface for Quick Reader.
 * Orchestrates all components (Engine, Display, Minimap, Breadcrumbs) into
 * a single glassmorphic, immersive experience.
 */
export class QuickReaderModal extends ModalBase {
  private engine: RSVPEngine;
  private plugin: IQuickReader;
  private settings: QuickReaderSettings;
  private dom: DOMRegistry = new DOMRegistry();
  private lastBreadcrumbId: string = '__INIT__';
  
  private wordDisplay!: WordDisplay;
  private breadcrumbManager!: BreadcrumbManager;
  private minimapManager!: MinimapManager;

  constructor(app: obsidian.App, plugin: IQuickReader) {
    super(app);
    this.plugin = plugin;
    this.settings = plugin.settings;
    this.modalEl.classList.add(CSS_CLASSES.modal);
    this.contentEl.classList.add(CSS_CLASSES.modalContent);
    this.containerEl.addClass('qr-backdrop-blur');

    this.engine = new RSVPEngine(this.settings, (chunk) => this.onWordChange(chunk));
  }

  onOpen() {
    this.buildUI();
    this.setupHotkeys();
    
    // If we already have text (e.g. from openWithText), render initial state
    if (this.engine.getTotalWords() > 0) {
      this.renderInitialState();
    }
  }

  onClose() {
    this.engine.pause();
    this.dom.clear();
    this.contentEl.empty();
  }

  private buildUI(): void {
    const container = this.contentEl.createDiv({ cls: CSS_CLASSES.container });
    this.dom.register('modal', container);

    // 1. Header (Breadcrumbs & Actions)
    const header = container.createDiv({ cls: CSS_CLASSES.header });
    this.dom.register('header', header);
    
    const breadcrumbEl = header.createDiv({ cls: CSS_CLASSES.breadcrumb });
    if (!this.settings.showBreadcrumb) {
      breadcrumbEl.classList.add('qr-hidden');
    }
    this.breadcrumbManager = new BreadcrumbManager(breadcrumbEl, this.engine);
    this.dom.register('breadcrumb', breadcrumbEl);

    const actions = header.createDiv({ cls: CSS_CLASSES.headerActions });
    this.buildHeaderActions(actions);

    // 2. Stage (Reading Zone)
    const stage = container.createDiv({ cls: CSS_CLASSES.stage });
    this.dom.register('stage', stage);

    const display = stage.createDiv({ cls: CSS_CLASSES.display });
    this.wordDisplay = new WordDisplay(display, this.settings);
    this.dom.register('display', display);

    // Expansion container (hidden during play)
    const expansion = stage.createDiv({ cls: 'qr-expansion qr-hidden' });
    this.dom.register('flowContainer', expansion);

    // 3. Minimap (Vertical Nav)
    const minimapContainer = stage.createDiv({ cls: 'qr-minimap-container' });
    if (!this.settings.showMinimap) {
      minimapContainer.classList.add('qr-hidden');
    }
    this.minimapManager = new MinimapManager(minimapContainer, this.engine);

    // 4. Deck (Controls & Stats)
    const deck = container.createDiv({ cls: CSS_CLASSES.deck });
    this.dom.register('deck', deck);
    
    const playback = deck.createDiv({ cls: CSS_CLASSES.playbackStrip });
    createPlaybackToggle(playback, () => this.engine.toggle(), this.dom);
    
    const stats = deck.createDiv({ cls: CSS_CLASSES.liveStats });
    this.dom.register('stats', stats);
  }

  private buildHeaderActions(container: HTMLElement): void {
    createIconButton(container, {
      icon: 'settings',
      title: 'Settings',
      onClick: () => {
        this.close();
        const setting = (this.app as any).setting;
        if (setting) {
          setting.open();
          setting.openTabById('quick-reader');
        }
      }
    });
    
    createIconButton(container, {
      icon: 'x',
      title: 'Close',
      onClick: () => this.close()
    });
  }

  private setupHotkeys(): void {
    // Playback Toggle (Standard Space)
    this.scope.register([], ' ', (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.engine.toggle();
      return false;
    });

    this.scope.register([], 'Escape', () => this.close());
    
    this.scope.register([], 'ArrowLeft', (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.engine.jumpTo(this.engine.getCurrentIndex() - 10);
    });
    this.scope.register([], 'ArrowRight', (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.engine.jumpTo(this.engine.getCurrentIndex() + 10);
    });
    this.scope.register([], 'ArrowUp', (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.adjustWPM(25);
    });
    this.scope.register([], 'ArrowDown', (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.adjustWPM(-25);
    });
    
    // Expansion Hotkey
    this.scope.register([], 'KeyC', () => this.toggleExpansion());
  }

  private adjustWPM(delta: number): void {
    this.settings.wpm = Math.max(50, Math.min(2000, this.settings.wpm + delta));
    this.engine.updateSettings(this.settings);
    this.plugin.saveSettings();
    this.updateStats();
    
    // If we are on dashboard, re-render it to show new WPM pill
    if (this.engine.getCurrentIndex() === 0 && !this.engine.getIsPlaying()) {
      this.renderInitialState();
    }
  }

  private toggleExpansion(): void {
    if (this.engine.getIsPlaying()) return;
    this.dom.toggleClass('flowContainer', CSS_CLASSES.hidden);
    this.dom.toggleClass('display', CSS_CLASSES.hidden);
  }

  private onWordChange(chunk: WordChunk): void {
    // Safeguard: Do not mask the Dashboard/Ready screen during initial load
    if (chunk.index === 0 && !this.engine.getIsPlaying()) {
      this.updateStats(); // Keep stats updated though
      return;
    }

    if (this.engine.getIsPlaying()) {
      this.dom.toggleClass('flowContainer', CSS_CLASSES.hidden, true);
      this.dom.toggleClass('display', CSS_CLASSES.hidden, false);
      this.wordDisplay.render(chunk);
    } else if (this.settings.enableContextExpansion) {
      this.renderExpandedContext(chunk);
    }

    if (chunk.headingContext) {
      const breadcrumbId = chunk.headingContext.breadcrumb.map(h => h.text).join('|');
      if (breadcrumbId !== this.lastBreadcrumbId) {
        this.breadcrumbManager.update(chunk.headingContext.breadcrumb, this.noteTitle);
        this.lastBreadcrumbId = breadcrumbId;
      }
    }
    
    this.minimapManager.update(chunk.index, this.engine.getTotalWords());
    updatePlaybackUI(this.dom, this.engine.getIsPlaying());
    
    this.updateStats();
  }

  private updateStats(): void {
    const stats = `Word ${this.engine.getCurrentIndex() + 1}/${this.engine.getTotalWords()} • ${this.settings.wpm} WPM`;
    this.dom.updateText('stats', stats);
  }

  private renderExpandedContext(chunk: WordChunk): void {
    const expansion = this.dom.getRequired('flowContainer');
    const display = this.dom.getRequired('display');
    
    if (!chunk.paragraph) {
      this.wordDisplay.render(chunk);
      return;
    }

    display.classList.add(CSS_CLASSES.hidden);
    expansion.classList.remove(CSS_CLASSES.hidden);
    expansion.empty();

    const words = chunk.paragraph.text.split(' ');
    const relativeIndex = chunk.index - chunk.paragraph.wordStartIndex;

    words.forEach((word, i) => {
      const span = expansion.createSpan({ text: word + ' ', cls: 'qr-expansion-word' });
      if (i === relativeIndex) {
        span.classList.add('qr-active-word');
      }
    });
  }

  private noteTitle: string = '';

  public openWithText(text: string, fileName: string = 'Note'): void {
    this.noteTitle = fileName;
    const { words, headings, paragraphs } = MarkdownParser.parse(text);
    this.engine.loadText(words, headings, paragraphs);
    this.open();
    this.renderInitialState();
  }

  private renderInitialState(): void {
    if (!this.wordDisplay) return;

    const display = this.dom.getRequired('display');
    const flow = this.dom.getRequired('flowContainer');

    // Reset visibility
    display.classList.remove(CSS_CLASSES.hidden);
    flow.classList.add(CSS_CLASSES.hidden);
    
    this.breadcrumbManager.update([], this.noteTitle);
    this.minimapManager.render(this.engine.getHeadings(), this.engine.getTotalWords());
    
    const words = this.engine.getWords();
    const previewText = words.slice(0, 25).join(' ');
    
    this.wordDisplay.showReady(this.noteTitle, this.engine.getTotalWords(), this.settings.wpm, previewText);
    this.updateStats();
    
    // Forced visibility pass
    setTimeout(() => {
      display.classList.remove(CSS_CLASSES.hidden);
      display.style.display = 'flex';
      flow.classList.add(CSS_CLASSES.hidden);
    }, 50);
  }
}
