import { WordChunk, QuickReaderSettings, HeadingInfo, HeadingContext, Paragraph } from './types';
import { ENGINE_CONSTANTS } from './constants';

/**
 * RSVPEngine
 * 
 * Core logic for Rapid Serial Visual Presentation.
 * Decoupled from the DOM to ensure maximum performance and testability.
 */
export class RSVPEngine {
  private words: string[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private timer: number | null = null;
  private settings: QuickReaderSettings;
  private onWordChange: (chunk: WordChunk) => void;
  private headings: HeadingInfo[] = [];
  private paragraphs: Paragraph[] = [];
  
  // Acceleration & Timers
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPausedTime: number = 0;

  constructor(settings: QuickReaderSettings, onWordChange: (chunk: WordChunk) => void) {
    this.settings = settings;
    this.onWordChange = onWordChange;
  }

  updateSettings(settings: QuickReaderSettings): void {
    this.settings = settings;
  }

  /**
   * Loads text into the engine and parses structure
   */
  loadText(words: string[], headings: HeadingInfo[] = [], paragraphs: Paragraph[] = []): void {
    this.words = words;
    this.headings = headings;
    this.paragraphs = paragraphs;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.startTime = 0;
    this.totalPausedTime = 0;
  }

  getWords(): string[] {
    return this.words;
  }

  /**
   * Starts playback
   */
  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = Date.now() - this.totalPausedTime;
    this.scheduleNextWord();
  }

  /**
   * Pauses playback
   */
  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.pauseTime = Date.now();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Toggle play/pause
   */
  toggle(): void {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  /**
   * Jump to specific index or heading
   */
  jumpTo(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, this.words.length - 1));
    this.notifyWord();
    
    // Reset timer if playing to prevent loop doubling and immediately sync to new position
    if (this.isPlaying) {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNextWord();
    }
  }

  /**
   * Main scheduling loop
   */
  private scheduleNextWord(): void {
    if (this.timer) clearTimeout(this.timer); // Defensive clear
    
    if (!this.isPlaying || this.currentIndex >= this.words.length) {
      this.isPlaying = false;
      return;
    }

    const delay = this.calculateDelay();
    this.notifyWord();
    
    this.timer = window.setTimeout(() => {
      this.currentIndex++;
      this.scheduleNextWord();
    }, delay);
  }

  /**
   * calculates delay based on WPM, word length, and punctuation
   */
  private calculateDelay(): number {
    const wpm = Math.max(10, this.settings.wpm); // Prevent Div by Zero
    let currentWpm = wpm;

    // Acceleration Logic
    if (this.settings.enableAcceleration && this.isPlaying) {
      const elapsed = this.getElapsedTime();
      if (elapsed < this.settings.accelerationDuration) {
        const progress = elapsed / this.settings.accelerationDuration;
        currentWpm = this.settings.wpm + (this.settings.accelerationTargetWpm - this.settings.wpm) * progress;
      } else {
        currentWpm = this.settings.accelerationTargetWpm;
      }
    }

    const baseDelay = 60000 / currentWpm;
    const currentWord = this.words[this.currentIndex];
    
    if (!this.settings.enableMicropause) return baseDelay;

    let multiplier = 1.0;

    // Punctuation Factor
    if (/[.!?]$/.test(currentWord)) {
      multiplier *= this.settings.micropausePunctuation;
    } else if (/[,;:]$/.test(currentWord)) {
      multiplier *= this.settings.micropauseOtherPunctuation;
    }

    // Long Word Factor
    if (currentWord.length > 8) {
      multiplier *= this.settings.micropauseLongWords;
    }

    // Heading/Structure Factor
    const isHeadingWord = this.headings.some(h => 
      this.currentIndex >= h.wordIndex && 
      this.currentIndex < h.wordIndex + (h.wordLength || 0)
    );
    if (isHeadingWord) {
      multiplier *= this.settings.micropauseSectionMarkers;
    }

    return baseDelay * multiplier;
  }

  /**
   * Notifies the UI about a word change
   */
  private notifyWord(): void {
    const text = this.words[this.currentIndex];
    const isEnd = this.currentIndex >= this.words.length - 1;
    
    const breadcrumb = this.getHeadingBreadcrumb(this.currentIndex);
    const paragraph = this.paragraphs.find(p => 
      this.currentIndex >= p.wordStartIndex && this.currentIndex <= p.wordEndIndex
    );

    const activeHeading = this.headings.find(h => 
      this.currentIndex >= h.wordIndex && 
      this.currentIndex < h.wordIndex + (h.wordLength || 0)
    );

    this.onWordChange({
      text,
      index: this.currentIndex,
      delay: this.calculateDelay(),
      isEnd,
      headingContext: {
        breadcrumb,
        current: breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null
      },
      paragraph,
      metadata: {
        headingLevel: activeHeading?.level,
        calloutType: activeHeading?.calloutType
      }
    });
  }

  private getHeadingBreadcrumb(wordIndex: number): HeadingInfo[] {
    const path: HeadingInfo[] = [];
    const activeHeadings = this.headings.filter(h => h.wordIndex <= wordIndex);
    
    for (const h of activeHeadings) {
      // Maintain hierarchy (remove deeper or same-level headings)
      while (path.length > 0 && path[path.length - 1].level >= h.level && h.level !== 0) {
        path.pop();
      }
      path.push(h);
    }
    return path;
  }

  // Getters
  getCurrentIndex(): number { return this.currentIndex; }
  getTotalWords(): number { return this.words.length; }
  getIsPlaying(): boolean { return this.isPlaying; }
  getHeadings(): HeadingInfo[] { return this.headings; }
  
  getElapsedTime(): number {
    if (this.startTime === 0) return 0;
    const now = this.isPlaying ? Date.now() : this.pauseTime;
    return Math.floor((now - this.startTime - this.totalPausedTime) / 1000);
  }

  getRemainingTime(): number {
    const total = this.words.length;
    if (total === 0) return 0;
    const remaining = total - this.currentIndex;
    const baseWpm = Math.max(10, this.settings.wpm);
    return Math.ceil(remaining / (baseWpm / 60));
  }
}
