import { Plugin, Notice, MarkdownView, Editor, Menu, MenuItem } from 'obsidian';
import { QuickReaderModal } from './quick-modal';
import { QuickReaderSettingTab } from './settings';
import { QuickReaderSettings, DEFAULT_SETTINGS, IQuickReader } from './types';

/**
 * Quick Reader Plugin
 * 
 * High-performance, distraction-free RSVP speed reading for Obsidian.
 */
export class QuickReaderPlugin extends Plugin implements IQuickReader {
  settings!: QuickReaderSettings;

  async onload() {
    await this.loadSettings();

    // 1. Ribbon Icon (Main entry point)
    this.addRibbonIcon('zap', 'Open Quick Reader', () => {
      this.openReader();
    });

    // 2. Command Palette: Read entire note
    this.addCommand({
      id: 'open-reader-note',
      name: 'Read entire note',
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
          this.openReader(view.editor.getValue());
        } else {
          new Notice('Please open a note first');
        }
      }
    });

    // 3. Command Palette: Read selection
    this.addCommand({
      id: 'open-reader-selection',
      name: 'Read selection',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.openReader(selection);
        } else {
          new Notice('Please select some text first');
        }
      }
    });

    // 4. Editor Context Menu
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          menu.addItem((item: MenuItem) => {
            item
              .setTitle('Read with Quick Reader')
              .setIcon('zap')
              .onClick(() => this.openReader(selection));
          });
        }
      })
    );

    // 5. Settings Tab
    this.addSettingTab(new QuickReaderSettingTab(this.app, this));
  }

  onunload() {
    // Cleanup handled by modal onClose
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Helper to open the modal with specific text
   */
  private openReader(text?: string): void {
    const modal = new QuickReaderModal(this.app, this);
    const activeFile = this.app.workspace.getActiveFile();
    const fileName = activeFile ? activeFile.basename : 'Selection';

    if (text) {
      modal.openWithText(text, fileName);
    } else {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        modal.openWithText(view.editor.getValue(), fileName);
      } else {
        new Notice('No text to read. Please open a note.');
      }
    }
  }
}

export default QuickReaderPlugin;
