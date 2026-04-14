import { HeadingInfo } from './types';
import { RSVPEngine } from './rsvp-engine';
import { Menu } from 'obsidian';

/**
 * BreadcrumbManager (Zen v4.0 - Identity Rooted)
 * 
 * Manages an interactive navigation trail starting with the document's identity.
 * Rebuilt to ensure "Reading Note..." is eliminated in favor of permanent context.
 */
export class BreadcrumbManager {
  private container: HTMLElement;
  private engine: RSVPEngine;

  private readonly CALLOUT_ICONS: Record<string, string> = {
    note: '📝', abstract: '📄', info: 'ℹ️', tip: '💡',
    success: '✅', question: '❓', warning: '⚠️', failure: '❌',
    danger: '⚡', bug: '🐛', example: '📋', quote: '💬'
  };

  constructor(container: HTMLElement, engine: RSVPEngine) {
    this.container = container;
    this.engine = engine;
  }

  /**
   * Updates the interactive breadcrumb trail, always starting with the Note Title
   */
  update(breadcrumb: HeadingInfo[], noteTitle: string): void {
    this.container.empty();

    // 1. Root Identity (The File Name)
    const rootPill = this.container.createSpan({
      cls: `qr-breadcrumb-pill qr-breadcrumb-root ${breadcrumb.length === 0 ? 'is-active' : ''}`
    });
    rootPill.createSpan({ text: '📄 ', cls: 'qr-breadcrumb-icon' });
    rootPill.createSpan({ text: noteTitle, cls: 'qr-breadcrumb-text' });

    rootPill.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.jumpTo(0);
    });

    // 2. Hierarchical Path
    breadcrumb.forEach((heading, index) => {
      this.container.createSpan({ text: ' › ', cls: 'qr-breadcrumb-separator' });

      const pill = this.container.createSpan({
        cls: `qr-breadcrumb-pill ${index === breadcrumb.length - 1 ? 'is-active' : ''}`
      });

      const icon = heading.calloutType ? (this.CALLOUT_ICONS[heading.calloutType.toLowerCase()] || '📌') : '';
      if (icon) {
        pill.createSpan({ text: icon, cls: 'qr-breadcrumb-icon' });
      }
      
      pill.createSpan({ text: heading.text, cls: 'qr-breadcrumb-text' });

      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.engine.jumpTo(heading.wordIndex);
      });
    });

    // 3. Outline Dropdown
    const dropdown = this.container.createSpan({ 
      cls: 'qr-breadcrumb-dropdown',
      text: ' ▼' 
    });
    
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showOutline(dropdown);
    });
  }

  /**
   * Shows a hierarchical document outline
   */
  private showOutline(anchor: HTMLElement): void {
    const allHeadings = this.engine.getHeadings();
    if (allHeadings.length === 0) return;

    const menu = new Menu();
    
    allHeadings.forEach(h => {
      const indentation = '  '.repeat(Math.max(0, h.level - 1));
      const icon = h.calloutType ? (this.CALLOUT_ICONS[h.calloutType.toLowerCase()] || '📌') : '';
      
      menu.addItem(item => {
        item.setTitle(`${indentation}${icon} ${h.text}`)
            .onClick(() => this.engine.jumpTo(h.wordIndex));
      });
    });

    const rect = anchor.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom + 5 });
  }

  clear(): void {
    this.container.empty();
  }
}
