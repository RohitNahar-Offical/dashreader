import { CSS_CLASSES } from './constants';

/**
 * Registry of valid DOM element keys for Quick Reader.
 * Enforces type safety across the UI orchestration.
 */
export type DOMElementKey = 
  | 'modal'
  | 'header'
  | 'stage'
  | 'deck'
  | 'breadcrumb'
  | 'display'
  | 'word'
  | 'wordFocus'
  | 'contextBefore'
  | 'contextAfter'
  | 'playbackToggle'
  | 'progressBar'
  | 'stats'
  | 'settings'
  | 'flowContainer';

/**
 * DOMRegistry
 * 
 * Centralized, typed storage for DOM element references.
 * Eliminates repeated querySelector calls and enforces consistent
 * update patterns.
 */
export class DOMRegistry {
  private elements: Map<DOMElementKey, HTMLElement> = new Map();

  /**
   * Register a DOM element
   */
  register(key: DOMElementKey, el: HTMLElement): void {
    this.elements.set(key, el);
  }

  /**
   * Retrieve a registered element
   */
  get(key: DOMElementKey): HTMLElement | undefined {
    return this.elements.get(key);
  }

  /**
   * Safe getter that throws if element is missing
   */
  getRequired(key: DOMElementKey): HTMLElement {
    const el = this.get(key);
    if (!el) throw new Error(`Required DOM element '${key}' not found in registry`);
    return el;
  }

  /**
   * Update the text content of a registered element
   */
  updateText(key: DOMElementKey, text: string): void {
    const el = this.get(key);
    if (el) el.setText(text);
  }

  /**
   * Toggle a CSS class on a registered element
   */
  toggleClass(key: DOMElementKey, cls: string, state?: boolean): void {
    const el = this.get(key);
    if (el) el.toggleClass(cls, state ?? !el.classList.contains(cls));
  }

  /**
   * Update multiple element texts in one call
   */
  batchUpdateText(updates: Partial<Record<DOMElementKey, string>>): void {
    Object.entries(updates).forEach(([key, text]) => {
      this.updateText(key as DOMElementKey, text!);
    });
  }

  /**
   * Clear the registry
   */
  clear(): void {
    this.elements.clear();
  }
}
