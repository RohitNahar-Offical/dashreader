/**
 * Premium Visual Color Picker
 * Ported from Colorful Folders Plugin
 */

interface HSV {
  h: number;
  s: number;
  v: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts HSV to RGB
 */
function hsvToRgb(h: number, s: number, v: number): RGB {
  h /= 360;
  s /= 100;
  v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * Converts RGB to HSV
 */
function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

/**
 * Converts Hex string to RGB object
 */
function hexToRgbObj(hex: string): RGB {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return {
    r: parseInt(hex.substring(0, 2), 16) || 0,
    g: parseInt(hex.substring(2, 4), 16) || 0,
    b: parseInt(hex.substring(4, 6), 16) || 0
  };
}

/**
 * Converts RGB to Hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

export interface ColorPicker {
  setHex(hex: string): void;
  getHex(): string;
}

/**
 * Creates a premium drag-and-drop visual color picker.
 */
export function createVisualColorPicker(
  container: HTMLElement,
  initialHex: string,
  onChange: (hex: string) => void
): ColorPicker {
  // Parse initial color
  const initRgb = hexToRgbObj(initialHex || '#4a9eff');
  let hsv = rgbToHsv(initRgb.r, initRgb.g, initRgb.b);

  // Wrapper
  const wrap = container.createDiv({ cls: 'dashreader-vcp' });
  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    background: 'var(--background-secondary)',
    border: '1px solid var(--background-modifier-border)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    width: '100%'
  });

  // Top part: saturation/value board
  const board = wrap.createDiv({ cls: 'dashreader-vcp-board' });
  Object.assign(board.style, {
    height: '150px',
    borderRadius: '8px',
    position: 'relative',
    cursor: 'crosshair',
    background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, transparent), hsl(${hsv.h}, 100%, 50%)`,
    overflow: 'hidden'
  });

  const thumb = board.createDiv({ cls: 'dashreader-vcp-thumb' });
  Object.assign(thumb.style, {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid #fff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.2), 0 2px 5px rgba(0,0,0,0.3)',
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: '2'
  });

  // Bottom part: Sliders and Input
  const controls = wrap.createDiv();
  Object.assign(controls.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  });

  const buildSlider = (gradient: string, value: number, onInput: (v: number) => void): HTMLInputElement => {
    const slider = controls.createEl('input', { type: 'range' });
    slider.min = '0';
    slider.max = '360';
    slider.value = value.toString();
    Object.assign(slider.style, {
      width: '100%',
      height: '10px',
      borderRadius: '5px',
      outline: 'none',
      appearance: 'none',
      background: gradient,
      border: '1px solid rgba(0,0,0,0.1)'
    });

    slider.addEventListener('input', () => onInput(parseInt(slider.value)));
    return slider;
  };

  const hueGrad = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
  const hueSlider = buildSlider(hueGrad, hsv.h, (v) => {
    hsv.h = v;
    syncFromHSV();
  });

  const inputRow = controls.createDiv();
  Object.assign(inputRow.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  const preview = inputRow.createDiv();
  Object.assign(preview.style, {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid var(--background-modifier-border)',
    flexShrink: '0'
  });

  const hexInput = inputRow.createEl('input', { type: 'text' });
  hexInput.placeholder = '#hex';
  Object.assign(hexInput.style, {
    flex: '1',
    height: '32px',
    padding: '0 8px',
    borderRadius: '6px',
    border: '1px solid var(--background-modifier-border)',
    fontSize: '0.9em',
    fontFamily: 'monospace',
    background: 'var(--background-primary)',
    color: 'var(--text-normal)'
  });

  function syncFromHSV() {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    board.style.background = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, transparent), hsl(${hsv.h}, 100%, 50%)`;

    const bw = board.offsetWidth || 200;
    const bh = board.offsetHeight || 150;
    thumb.style.left = `${(hsv.s / 100) * bw}px`;
    thumb.style.top = `${(1 - hsv.v / 100) * bh}px`;

    preview.style.backgroundColor = hex;
    hexInput.value = hex;

    onChange(hex);
  }

  function syncFromHex(hex: string) {
    const rgb = hexToRgbObj(hex);
    hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    hueSlider.value = hsv.h.toString();
    syncFromHSV();
  }

  function handleBoardPointer(e: PointerEvent) {
    const rect = board.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    hsv.s = Math.round((x / rect.width) * 100);
    hsv.v = Math.round((1 - y / rect.height) * 100);
    syncFromHSV();
  }

  board.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    board.setPointerCapture(e.pointerId);
    handleBoardPointer(e);
  });

  board.addEventListener('pointermove', (e) => {
    if (board.hasPointerCapture(e.pointerId)) handleBoardPointer(e);
  });

  board.addEventListener('pointerup', (e) => {
    board.releasePointerCapture(e.pointerId);
  });

  hexInput.addEventListener('change', () => {
    let val = hexInput.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      syncFromHex(val);
    }
  });

  // Initial sync
  setTimeout(() => syncFromHSV(), 10);

  return {
    setHex(hex: string) { syncFromHex(hex); },
    getHex() { return hexInput.value; }
  };
}
