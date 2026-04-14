/**
 * Interface for the main plugin class to break circular dependencies
 */
export interface IQuickReader {
  settings: QuickReaderSettings;
  saveSettings(): Promise<void>;
}

/**
 * QuickReaderSettings
 * 
 * Comprehensive settings for the Quick Reader plugin.
 * Refined and optimized for high-performance reading.
 */
export interface QuickReaderSettings {
  // Core Speed Settings
  wpm: number;
  chunkSize: number;
  
  // Visual Aesthetics
  fontSize: number;
  highlightColor: string;
  backgroundColor: string;
  fontColor: string;
  fontFamily: string;
  accentColor: string;
  
  // UI Features
  showContext: boolean;
  contextWords: number;
  showMinimap: boolean;
  showBreadcrumb: boolean;
  showProgress: boolean;
  showStats: boolean;
  showFlowText: boolean;
  flowTextOpacity: number;
  
  // Advanced RSVP Logic
  enableMicropause: boolean;
  micropausePunctuation: number;
  micropauseOtherPunctuation: number;
  micropauseLongWords: number;
  micropauseParagraph: number;
  micropauseNumbers: number;
  micropauseSectionMarkers: number;
  micropauseListBullets: number;
  micropauseCallouts: number;
  
  // Automation & Flows
  autoStart: boolean;
  autoStartDelay: number;
  enableSlowStart: boolean;
  enableAcceleration: boolean;
  accelerationDuration: number;
  accelerationTargetWpm: number;
  
  // Hotkeys
  hotkeyPlay: string;
  hotkeyRewind: string;
  hotkeyForward: string;
  hotkeyIncrementWpm: string;
  hotkeyDecrementWpm: string;
  hotkeyQuit: string;
  
  // Theme & Immersive Features
  enableContextExpansion: boolean;
  expansionHotkey: string;
}

export const DEFAULT_SETTINGS: QuickReaderSettings = {
  wpm: 400,
  chunkSize: 1,
  fontSize: 52, // Slightly larger base for Quick Reader
  highlightColor: '#4a9eff',
  backgroundColor: '#0f141e', // Deeper, more premium charcoal
  fontColor: '#f5f5f5',
  fontFamily: 'Outfit, Inter, sans-serif',
  accentColor: '#007aff',
  showContext: false,
  contextWords: 3,
  showMinimap: true,
  showBreadcrumb: true,
  showProgress: true,
  showStats: true,
  showFlowText: false,
  flowTextOpacity: 0.1,
  enableMicropause: true,
  micropausePunctuation: 2.2,
  micropauseOtherPunctuation: 1.4,
  micropauseLongWords: 1.3,
  micropauseParagraph: 2.2,
  micropauseNumbers: 1.6,
  micropauseSectionMarkers: 1.8,
  micropauseListBullets: 1.6,
  micropauseCallouts: 2.0,
  autoStart: false,
  autoStartDelay: 3,
  enableSlowStart: true,
  enableAcceleration: false,
  accelerationDuration: 30,
  accelerationTargetWpm: 600,
  hotkeyPlay: 'Space',
  hotkeyRewind: 'ArrowLeft',
  hotkeyForward: 'ArrowRight',
  hotkeyIncrementWpm: 'ArrowUp',
  hotkeyDecrementWpm: 'ArrowDown',
  hotkeyQuit: 'Escape',
  enableContextExpansion: true,
  expansionHotkey: 'KeyC'
};

export interface Paragraph {
  wordStartIndex: number;
  wordEndIndex: number;
  text: string;
}

export interface HeadingInfo {
  level: number;
  text: string;
  wordIndex: number;
  wordLength?: number;
  calloutType?: string;
}

export interface HeadingContext {
  breadcrumb: HeadingInfo[];
  current: HeadingInfo | null;
}

export interface WordChunk {
  text: string;
  index: number;
  delay: number;
  isEnd: boolean;
  headingContext?: HeadingContext;
  paragraph?: Paragraph;
  metadata?: {
    headingLevel?: number;
    calloutType?: string;
    showSeparator?: boolean;
    cleanText?: string;
  };
}
