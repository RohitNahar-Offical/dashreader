/**
 * @file rsvp-modal.ts
 * @description Zen Mode Modal for DashReader speed reading
 */

import * as obsidian from 'obsidian';
import { RSVPEngine } from './rsvp-engine';
import { DashReaderSettings, WordChunk } from './types';
import { MarkdownParser } from './markdown-parser';
import { ViewState } from './view-state';
import { DOMRegistry } from './dom-registry';
import { BreadcrumbManager } from './breadcrumb-manager';
import { WordDisplay } from './word-display';
import { HotkeyHandler } from './hotkey-handler';
import { MinimapManager } from './minimap-manager';
import { TimeoutManager } from './services/timeout-manager';
import { StatsFormatter } from './services/stats-formatter';
import {
  createNumberControl,
  createToggleControl,
  createPlaybackStrip,
  createIconButton,
  updatePlayPauseButtons,
} from './ui-builders';
import {
  CSS_CLASSES,
  ICONS,
  INCREMENTS,
  LIMITS,
} from './constants';

// Use any-cast to bypass weird tsc import issues with Obsidian Modal in this environment
const ModalBase = (obsidian as any).Modal;

export class DashReaderModal extends ModalBase {
  private engine: RSVPEngine;
  private settings: DashReaderSettings;
  private state: ViewState;
  private dom: DOMRegistry;
  private breadcrumbManager!: BreadcrumbManager;
  private wordDisplay!: WordDisplay;
  private hotkeyHandler!: HotkeyHandler;
  private minimapManager!: MinimapManager;
  private timeoutManager: TimeoutManager;
  private statsFormatter: StatsFormatter;

  // DOM Elements
  private mainContainerEl!: HTMLElement;
  private wordEl!: HTMLElement;
  private contextBeforeEl!: HTMLElement;
  private contextAfterEl!: HTMLElement;
  private settingsEl!: HTMLElement;
  private progressEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private breadcrumbEl!: HTMLElement;
  private flowContainerEl!: HTMLElement;
  private flowWordSpans: HTMLElement[] = [];
  private lastFlowSpan: HTMLElement | null = null;
  private lastStatsUpdateTime: number = 0;

  private initialText: string | null = null;
  private initialSource: { fileName?: string; lineNumber?: number; cursorPosition?: number } | null = null;

  constructor(app: obsidian.App, settings: DashReaderSettings) {
    super(app);
    this.settings = settings;

    this.state = new ViewState({
      currentWpm: settings.wpm,
      currentChunkSize: settings.chunkSize,
      currentFontSize: settings.fontSize,
      wordsRead: 0,
      startTime: 0,
      showingControls: false,
      showingStats: settings.showStats
    });

    this.dom = new DOMRegistry();
    this.timeoutManager = new TimeoutManager();
    this.statsFormatter = new StatsFormatter();

    this.engine = new RSVPEngine(
      settings,
      (chunk: WordChunk) => this.onWordChange(chunk),
      () => this.onComplete(),
      this.timeoutManager
    );
  }

  public setSource(text: string, source?: { fileName?: string; lineNumber?: number; cursorPosition?: number }): this {
    this.initialText = text;
    this.initialSource = source || null;
    return this;
  }

  onOpen() {
    const { contentEl, modalEl } = (this as any);
    
    if (modalEl) modalEl.addClass('dashreader-zen-modal');
    if (contentEl) contentEl.addClass('dashreader-modal-content');

    this.mainContainerEl = (contentEl as HTMLElement).createDiv({ cls: CSS_CLASSES.container });
    this.buildUI();

    this.breadcrumbManager = new BreadcrumbManager(this.breadcrumbEl, this.engine, this.timeoutManager);
    this.wordDisplay = new WordDisplay(this.wordEl, this.settings);
    this.hotkeyHandler = new HotkeyHandler(this.settings, {
      onTogglePlay: () => this.togglePlay(),
      onRewind: () => this.engine.rewind(),
      onForward: () => this.engine.forward(),
      onIncrementWpm: () => this.changeValue('wpm', 10),
      onDecrementWpm: () => this.changeValue('wpm', -10),
      onQuit: () => this.close()
    });
    this.minimapManager = new MinimapManager(this.mainContainerEl, this.engine, this.timeoutManager, this.settings);

    this.wordDisplay.displayWelcomeMessage(
      ICONS.book,
      'Zen Mode Ready',
      'Press Shift+Space to start'
    );

    this.toggleContextDisplay();
    this.toggleMinimapDisplay();
    this.toggleBreadcrumbDisplay();
    this.toggleStatsDisplay();

    this.setupHotkeys();

    if (this.initialText) {
      this.loadText(this.initialText, this.initialSource || undefined);
    }
  }

  onClose() {
    this.engine.stop();
    this.timeoutManager.clearAll();
    this.dom.clear();
    if ((this as any).contentEl) (this as any).contentEl.empty();
  }

  private buildUI(): void {
    if (!this.mainContainerEl) return;
    this.mainContainerEl.empty();
    this.dom.clear();

    this.buildHeader();
    this.buildStage();
    this.buildDeck();
    this.buildInlineSettings();
    this.buildProgressBar();
  }

  private buildHeader(): void {
    const header = this.mainContainerEl.createDiv({ cls: 'dashreader-header' });
    this.dom.register('headerEl', header);

    // Header Actions (Left side as requested)
    const actions = header.createDiv({ cls: 'dashreader-header-actions' });
    this.buildHeaderActions(actions);
    
    // Breadcrumb (Center/Right)
    this.breadcrumbEl = header.createDiv({ cls: 'dashreader-breadcrumb' });
    this.dom.register('breadcrumbEl', this.breadcrumbEl);
  }

  private buildStage(): void {
    const stage = this.mainContainerEl.createDiv({ cls: 'dashreader-stage' });
    this.dom.register('stageEl', stage);

    this.flowContainerEl = stage.createDiv({ cls: CSS_CLASSES.flowContainer });
    this.dom.register('flowContainerEl', this.flowContainerEl);

    const displayArea = stage.createDiv({ cls: CSS_CLASSES.display });
    this.dom.register('displayArea', displayArea);

    this.contextBeforeEl = displayArea.createSpan({ cls: CSS_CLASSES.contextBefore });
    this.dom.register('contextBeforeEl', this.contextBeforeEl);

    this.wordEl = displayArea.createDiv({ cls: CSS_CLASSES.word });
    this.wordEl.style.fontSize = `${this.settings.fontSize}px`;
    this.wordEl.style.fontFamily = this.settings.fontFamily;
    this.wordEl.style.color = this.settings.fontColor;
    this.dom.register('wordEl', this.wordEl);

    this.contextAfterEl = displayArea.createSpan({ cls: CSS_CLASSES.contextAfter });
    this.dom.register('contextAfterEl', this.contextAfterEl);
  }

  private buildDeck(): void {
    const deck = this.mainContainerEl.createDiv({ cls: 'dashreader-deck' });
    this.dom.register('deckEl', deck);

    const playGroup = deck.createDiv({ cls: 'dashreader-playback-group' });
    this.buildPlaybackControls(playGroup);

    // Live Metrics Display
    this.statsEl = deck.createDiv({ cls: 'dashreader-live-stats' });
    this.dom.register('statsEl', this.statsEl);

    const adjusterDeck = deck.createDiv({ cls: 'dashreader-adjuster-deck' });
    this.buildAdjusters(adjusterDeck);
  }

  private buildAdjusters(container: HTMLElement): void {
    const wpmUnit = container.createDiv({ cls: 'dashreader-adjuster-unit' });
    wpmUnit.createDiv({ text: 'WPM', cls: 'dashreader-adjuster-label' });
    createNumberControl(wpmUnit, {
      label: '',
      value: this.settings.wpm,
      onIncrement: () => this.changeValue('wpm', INCREMENTS.wpm),
      onDecrement: () => this.changeValue('wpm', -INCREMENTS.wpm),
      registryKey: 'wpmValue'
    }, this.dom);

    const sizeUnit = container.createDiv({ cls: 'dashreader-adjuster-unit' });
    sizeUnit.createDiv({ text: 'Size', cls: 'dashreader-adjuster-label' });
    createNumberControl(sizeUnit, {
      label: '',
      value: this.settings.fontSize,
      onIncrement: () => this.changeValue('fontSize', INCREMENTS.fontSize),
      onDecrement: () => this.changeValue('fontSize', -INCREMENTS.fontSize),
      registryKey: 'fontValue'
    }, this.dom);
  }

  private buildHeaderActions(container: HTMLElement): void {
    // Settings icon in top-left
    const settingsBtn = createIconButton(container, {
      icon: ICONS.settings,
      title: 'Settings (S)',
      onClick: () => this.togglePanel('settings'),
      className: 'dashreader-icon-btn'
    });
    this.dom.register('settingsBtn', settingsBtn);

    container.createDiv({ cls: 'dashreader-header-divider' });

    this.dom.register('contextBtn', createIconButton(container, {
      icon: ICONS.context,
      title: 'Context Preview (C)',
      onClick: () => {
        this.settings.showContext = !this.settings.showContext;
        this.toggleContextDisplay();
      },
      className: `dashreader-icon-btn ${this.settings.showContext ? 'active' : ''}`
    }));

    this.dom.register('minimapBtn', createIconButton(container, {
      icon: ICONS.minimap,
      title: 'Minimap (M)',
      onClick: () => {
        this.settings.showMinimap = !this.settings.showMinimap;
        this.toggleMinimapDisplay();
      },
      className: `dashreader-icon-btn ${this.settings.showMinimap ? 'active' : ''}`
    }));

    this.dom.register('statsBtn', createIconButton(container, {
      icon: ICONS.stats,
      title: 'Reading Stats (T)',
      onClick: () => {
        this.settings.showStats = !this.settings.showStats;
        this.toggleStatsDisplay();
      },
      className: `dashreader-icon-btn ${this.settings.showStats ? 'active' : ''}`
    }));
  }

  private buildPlaybackControls(container: HTMLElement): void {
    createPlaybackStrip(container, {
      onPlay: () => this.togglePlay(),
      onPause: () => this.engine.pause(),
      onRewind: () => this.engine.rewind(),
    }, this.dom);
  }

  private buildProgressBar(): void {
    this.progressEl = this.mainContainerEl.createDiv({ cls: 'dashreader-progress-line' });
    const progressBar = this.progressEl.createDiv({ cls: 'dashreader-progress-fill' });
    progressBar.style.width = '0%';
    this.dom.register('progressBar', progressBar);
  }

  private buildInlineSettings(): void {
    this.settingsEl = this.mainContainerEl.createDiv({
      cls: `${CSS_CLASSES.settings} ${CSS_CLASSES.hidden}`,
    });
    this.dom.register('settingsEl', this.settingsEl);
    this.settingsEl.createEl('h3', { text: 'Zen Settings', cls: 'dashreader-sidebar-title' });

    const toggles = [
      { label: 'Slow Start', key: 'enableSlowStart' },
      { label: 'Micropause', key: 'enableMicropause' },
      { label: 'Flow Mode', key: 'showFlowText', onChange: () => this.updateSettings(this.settings) },
    ];

    toggles.forEach(t => {
      createToggleControl(this.settingsEl, {
        label: t.label,
        checked: (this.settings as any)[t.key],
        onChange: (checked) => {
          (this.settings as any)[t.key] = checked;
          if (t.onChange) t.onChange();
          if (t.key === 'enableSlowStart' || t.key === 'enableMicropause') {
            this.engine.updateSettings(this.settings);
          }
        },
      });
    });
  }

  private toggleContextDisplay(): void {
    const show = this.settings.showContext;
    this.dom.toggleClass('contextBeforeEl', CSS_CLASSES.hidden, !show);
    this.dom.toggleClass('contextAfterEl', CSS_CLASSES.hidden, !show);
    this.dom.toggleClass('contextBtn', 'active', show);
  }

  private toggleMinimapDisplay(): void {
    const show = this.settings.showMinimap;
    if (this.minimapManager) {
      if (show) this.minimapManager.render();
    }
    this.dom.toggleClass('minimapBtn', 'active', show);
  }

  private toggleBreadcrumbDisplay(): void {
    const show = this.settings.showBreadcrumb;
    if (this.breadcrumbEl) {
      if (show) this.breadcrumbEl.classList.remove(CSS_CLASSES.hidden);
      else this.breadcrumbEl.classList.add(CSS_CLASSES.hidden);
    }
  }

  private toggleStatsDisplay(): void {
    const show = this.settings.showStats;
    this.dom.toggleClass('statsBtn', 'active', show);
  }

  private changeValue(type: 'wpm' | 'chunkSize' | 'fontSize', delta: number): void {
    switch (type) {
      case 'wpm': {
        const newWpm = this.engine.getWpm() + delta;
        this.engine.setWpm(newWpm);
        this.settings.wpm = this.engine.getWpm();
        this.dom.updateMultipleText({
          wpmValue: String(this.settings.wpm),
        });
        break;
      }
      case 'fontSize': {
        const newSize = Math.max(LIMITS.fontSize.min, Math.min(LIMITS.fontSize.max, this.settings.fontSize + delta));
        this.settings.fontSize = newSize;
        this.wordEl.style.fontSize = `${newSize}px`;
        this.dom.updateText('fontValue', newSize);
        break;
      }
    }
  }

  private togglePanel(panel: 'settings'): void {
    this.state.toggle('showingControls');
    const showing = this.state.get('showingControls');
    this.dom.toggleClass('settingsEl', CSS_CLASSES.hidden, !showing);
  }

  private setupHotkeys(): void {
    const { scope } = (this as any);
    if (scope) {
      scope.register(['Shift'], ' ', (e: KeyboardEvent) => {
        e.preventDefault();
        this.togglePlay();
      });
    }
  }

  private togglePlay(): void {
    if (this.engine.getIsPlaying()) {
      this.engine.pause();
      updatePlayPauseButtons(this.dom, false);
    } else {
      if (this.state.get('startTime') === 0) {
        this.state.set('startTime', Date.now());
      }
      this.engine.play();
      updatePlayPauseButtons(this.dom, true);
    }
  }

  private onWordChange(chunk: WordChunk): void {
    const meta = chunk.metadata;
    this.wordDisplay.displayWord(
      meta?.cleanText || chunk.text,
      meta?.headingLevel || 0,
      !!meta?.showSeparator,
      meta?.calloutType
    );

    if (chunk.headingContext && this.breadcrumbManager) {
      this.breadcrumbManager.updateBreadcrumb(chunk.headingContext);
    }

    if (this.minimapManager) {
      this.minimapManager.updateCurrentPosition(chunk.index);
    }

    if (this.settings.showContext && this.contextBeforeEl && this.contextAfterEl) {
      const context = this.engine.getContext(this.settings.contextWords);
      this.contextBeforeEl.setText(context.before.join(' '));
      this.contextAfterEl.setText(context.after.join(' '));
    }

    const progress = this.engine.getProgress();
    this.dom.updateStyle('progressBar', 'width', `${progress}%`);

    this.updateFlowHighlight(chunk.index);

    const now = Date.now();
    if (now - this.lastStatsUpdateTime > 200) {
      this.state.increment('wordsRead');
      this.updateStats();
      this.lastStatsUpdateTime = now;
    }
  }

  private updateFlowHighlight(currentIndex: number): void {
    if (!this.settings.showFlowText || !this.flowContainerEl || this.flowWordSpans.length === 0) return;
    if (this.lastFlowSpan) this.lastFlowSpan.classList.remove(CSS_CLASSES.flowCurrent);
    const currentSpan = this.flowWordSpans[currentIndex];
    if (currentSpan) {
      currentSpan.classList.add(CSS_CLASSES.flowCurrent);
      this.lastFlowSpan = currentSpan;
      const containerHeight = this.flowContainerEl.clientHeight;
      const wordOffsetTop = currentSpan.offsetTop;
      this.flowContainerEl.scrollTo({ top: wordOffsetTop - (containerHeight / 2), behavior: 'smooth' });
    }
  }

  private onComplete(): void {
    updatePlayPauseButtons(this.dom, false);
  }

  private updateStats(): void {
    if (!this.statsEl) return;
    
    const statsText = this.statsFormatter.formatReadingStats({
      wordsRead: this.state.get('wordsRead'),
      totalWords: this.engine.getTotalWords(),
      elapsedTime: this.engine.getElapsedTime(),
      currentWpm: this.engine.getCurrentWpmPublic(),
      remainingTime: this.engine.getRemainingTime()
    });
    
    this.statsEl.setText(statsText);
  }

  public loadText(text: string, source?: { fileName?: string; lineNumber?: number; cursorPosition?: number }): void {
    const plainText = MarkdownParser.parseToPlainText(text);
    if (!plainText || plainText.trim().length < 5) {
      new obsidian.Notice('No readable text found in selection/note');
      return;
    }

    this.engine.setText(plainText, undefined, source?.cursorPosition);
    this.state.update({ wordsRead: 0, startTime: 0 });

    this.wordEl.empty();
    if (this.minimapManager) this.minimapManager.render();
    this.populateFlowBackground();

    if (this.settings.autoStart) {
      this.timeoutManager.setTimeout(() => {
        this.engine.play();
        updatePlayPauseButtons(this.dom, true);
      }, this.settings.autoStartDelay * 1000);
    }
  }

  private populateFlowBackground(): void {
    if (!this.flowContainerEl) return;
    this.flowContainerEl.empty();
    this.flowWordSpans = [];

    if (!this.settings.showFlowText) return;

    const words = this.engine.getWords();
    words.forEach((word: string, index: number) => {
      const span = this.flowContainerEl.createSpan({ text: word + ' ', cls: CSS_CLASSES.flowWord });
      span.addEventListener('click', () => this.engine.jumpTo(index));
      this.flowWordSpans[index] = span;
    });
  }

  public updateSettings(settings: DashReaderSettings): void {
    this.settings = settings;
    if (this.wordEl) {
      this.wordEl.style.fontSize = `${settings.fontSize}px`;
    }
    this.engine.updateSettings(settings);
  }

  // Helper for closing
  public close(): void {
    (this as any).close();
  }
}
