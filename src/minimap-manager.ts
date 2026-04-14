import { HeadingInfo } from './types';
import { RSVPEngine } from './rsvp-engine';

/**
 * MinimapManager (Zen v2.0)
 * 
 * A high-fidelity, hierarchical navigation system.
 * Rebuilt from scratch to support sliding tooltips, structural mapping,
 * and smart orientation navigation.
 */
export class MinimapManager {
  private container: HTMLElement;
  private engine: RSVPEngine;
  private progressBar: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private points: HTMLElement[] = [];
  private headings: HeadingInfo[] = [];

  constructor(container: HTMLElement, engine: RSVPEngine) {
    this.container = container;
    this.engine = engine;
    this.init();
  }

  private init(): void {
    // 1. Progress track
    this.progressBar = this.container.createDiv({ cls: 'qr-minimap-progress' });
    
    // 2. Sliding Tooltip (created off-screen)
    this.tooltip = document.body.createDiv({ cls: 'qr-minimap-tooltip' });
  }

  /**
   * Renders the note hierarchy on the minimap SPINE
   */
  render(headings: HeadingInfo[], totalWords: number): void {
    // Fast clear
    this.points.forEach(p => p.remove());
    this.points = [];
    this.headings = headings;

    if (totalWords === 0) return;

    headings.forEach((h, index) => {
      const point = this.container.createDiv({ cls: 'qr-minimap-point' });
      const percentage = (h.wordIndex / totalWords) * 100;
      point.style.top = `${percentage}%`;
      
      // Structural hierarchy attributes
      point.setAttr('data-level', h.level);
      
      // Interactive events
      point.addEventListener('click', (e) => {
        e.stopPropagation();
        this.smartJump(h.wordIndex);
      });

      point.addEventListener('mouseenter', () => this.showTooltip(h.text, point));
      point.addEventListener('mouseleave', () => this.hideTooltip());

      this.points.push(point);
    });
  }

  /**
   * Jumps to word and provides a brief orientation pause
   */
  private smartJump(wordIndex: number): void {
    const wasPlaying = this.engine.getIsPlaying();
    if (wasPlaying) this.engine.pause();
    
    this.engine.jumpTo(wordIndex);
    
    // Resume after 400ms "Orientation Pause"
    if (wasPlaying) {
      setTimeout(() => {
        this.engine.play();
      }, 400);
    }
  }

  private showTooltip(text: string, pointEl: HTMLElement): void {
    if (!this.tooltip) return;
    
    this.tooltip.setText(text);
    
    // Vertical alignment
    const rect = pointEl.getBoundingClientRect();
    const tooltipHeight = this.tooltip.offsetHeight || 30;
    this.tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipHeight / 2)}px`;
    
    this.tooltip.classList.add('is-visible');
  }

  private hideTooltip(): void {
    if (this.tooltip) this.tooltip.classList.remove('is-visible');
  }

  private activeHeadingIndex: number = -1;

  /**
   * Frame-perfect progress update
   */
  update(currentIndex: number, totalWords: number): void {
    if (!this.progressBar || totalWords <= 0) {
      if (this.progressBar) this.progressBar.style.height = '0%';
      return;
    }
    
    // 1. Smoothly update progress bar
    const percentage = (currentIndex / totalWords) * 100;
    this.progressBar.style.height = `${percentage}%`;

    // 2. High-performance section highlight (Dirty Checking)
    // Find active heading from bottom up for efficiency
    let newIndex = -1;
    for (let i = this.headings.length - 1; i >= 0; i--) {
        if (currentIndex >= this.headings[i].wordIndex) {
            newIndex = i;
            break;
        }
    }

    if (newIndex !== this.activeHeadingIndex) {
        // Toggle OLD
        if (this.activeHeadingIndex !== -1 && this.points[this.activeHeadingIndex]) {
            this.points[this.activeHeadingIndex].classList.remove('is-active');
        }
        // Toggle NEW
        if (newIndex !== -1 && this.points[newIndex]) {
            this.points[newIndex].classList.add('is-active');
        }
        this.activeHeadingIndex = newIndex;
    }
  }

  destroy(): void {
    if (this.tooltip) this.tooltip.remove();
  }
}
