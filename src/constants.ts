/**
 * CSS Class Constants
 * 
 * Centralized registry of all CSS classes used in the Quick Reader UI.
 */
export const CSS_CLASSES = {
  // Main Container
  container: 'quick-reader-container',
  modal: 'quick-reader-zen-modal',
  modalContent: 'quick-reader-modal-content',
  
  // Layout Zones
  header: 'qr-header',
  stage: 'qr-stage',
  deck: 'qr-deck',
  
  // Header Elements
  breadcrumb: 'qr-breadcrumb',
  breadcrumbItem: 'qr-breadcrumb-item',
  headerActions: 'qr-header-actions',
  
  // Stage Elements
  display: 'qr-display',
  word: 'qr-word',
  wordFocus: 'qr-word-focus',
  contextBefore: 'qr-context-before',
  contextAfter: 'qr-context-after',
  flowContainer: 'qr-flow-container',
  flowWord: 'qr-flow-word',
  
  // Deck Elements
  controls: 'qr-controls',
  playbackStrip: 'qr-playback-strip',
  liveStats: 'qr-live-stats',
  progressBar: 'qr-progress-bar',
  
  // Components
  btn: 'qr-btn',
  iconBtn: 'qr-icon-btn',
  controlGroup: 'qr-control-group',
  valueDisplay: 'qr-value-display',
  
  // States
  hidden: 'qr-hidden',
  active: 'qr-active',
  loading: 'qr-loading',
  playing: 'qr-playing',
  paused: 'qr-paused'
};

/**
 * Lucide Icons Registry
 */
export const ICONS = {
  play: 'play',
  pause: 'pause',
  rewind: 'rewind',
  forward: 'fast-forward',
  stop: 'square',
  settings: 'settings',
  context: 'eye',
  minimap: 'layers',
  stats: 'bar-chart-2',
  close: 'x',
  maximize: 'maximize',
  minimize: 'minimize',
  copy: 'copy',
  check: 'check'
};

/**
 * Engine Constants
 */
export const ENGINE_CONSTANTS = {
  DEFAULT_CHUNK_SIZE: 1,
  MIN_WPM: 100,
  MAX_WPM: 1500,
  WPM_STEP: 50,
  FAST_WPM_STEP: 100,
  MAX_CONTEXT_WORDS: 10
};
