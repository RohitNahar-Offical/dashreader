import * as obsidian from 'obsidian';
import { CSS_CLASSES } from './constants';
import { DOMRegistry, DOMElementKey } from './dom-registry';

/**
 * UI Utilities for Quick Reader
 * 
 * Provides consistent, modular components for the Zen interface.
 */

export interface ButtonConfig {
  icon: string;
  title: string;
  onClick: (e: MouseEvent) => void;
  cls?: string;
}

/**
 * Creates a premium icon button
 */
export function createIconButton(parent: HTMLElement, config: ButtonConfig): HTMLButtonElement {
  const btn = parent.createEl('button', {
    cls: `${CSS_CLASSES.iconBtn} ${config.cls || ''}`
  });
  
  if (typeof (obsidian as any).setIcon === 'function') {
    (obsidian as any).setIcon(btn, config.icon);
  } else {
    btn.setText(config.icon);
  }
  
  btn.setAttr('title', config.title);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    config.onClick(e);
  });
  
  return btn;
}

/**
 * Creates a playback toggle (integrated Play/Pause icon)
 */
export function createPlaybackToggle(parent: HTMLElement, onToggle: () => void, registry: DOMRegistry): HTMLButtonElement {
  const btn = parent.createEl('button', {
    cls: `qr-main-toggle ${CSS_CLASSES.btn}`
  });
  
  registry.register('playbackToggle', btn);
  
  if (typeof (obsidian as any).setIcon === 'function') {
    (obsidian as any).setIcon(btn, 'play');
  } else {
    btn.setText('PLAY');
  }
  
  btn.addEventListener('click', () => onToggle());
  
  return btn;
}

/**
 * Updates the playback toggle UI state
 */
export function updatePlaybackUI(registry: DOMRegistry, isPlaying: boolean): void {
  const btn = registry.get('playbackToggle');
  if (!btn) return;
  
  const icon = isPlaying ? 'pause' : 'play';
  if (typeof (obsidian as any).setIcon === 'function') {
    (obsidian as any).setIcon(btn, icon);
  } else {
    btn.setText(icon.toUpperCase());
  }
}

/**
 * Creates a slider control
 */
export function createSlider(
  parent: HTMLElement, 
  label: string, 
  value: number, 
  min: number, 
  max: number, 
  onChange: (val: number) => void
): { container: HTMLElement; slider: HTMLInputElement; valueEl: HTMLElement } {
  const container = parent.createDiv({ cls: CSS_CLASSES.controlGroup });
  container.createSpan({ text: label, cls: 'qr-label' });
  
  const slider = container.createEl('input', { type: 'range' });
  slider.setAttr('min', min);
  slider.setAttr('max', max);
  slider.setAttr('value', value);
  
  const valueEl = container.createSpan({ text: String(value), cls: CSS_CLASSES.valueDisplay });
  
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    valueEl.setText(String(val));
    onChange(val);
  });
  
  return { container, slider, valueEl };
}
