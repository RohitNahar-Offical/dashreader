import { Plugin, Notice, MarkdownView, Menu, Editor, MenuItem } from 'obsidian';
import { DashReaderModal } from './src/rsvp-modal';
import { DashReaderSettingTab } from './src/settings';
import { DashReaderSettings } from './src/types';
import { validateSettings } from './src/services/settings-validator';

export default class DashReaderPlugin extends Plugin {
  settings: DashReaderSettings;

  async onload() {
    await this.loadSettings();

    // Add ribbon icon - Now opens Zen Modal
    this.addRibbonIcon('zap', 'Open DashReader (Zen Mode)', () => {
      this.openReader();
    });

    // Command: Open DashReader
    this.addCommand({
      id: 'open',
      name: 'Open speed reader (Zen Mode)',
      callback: () => {
        this.openReader();
      }
    });

    // Command: Read selected text
    this.addCommand({
      id: 'read-selection',
      name: 'Read selected text',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.openReader(selection);
        } else {
          new Notice('Please select some text first');
        }
      }
    });

    // Command: Read entire note
    this.addCommand({
      id: 'read-note',
      name: 'Read entire note',
      callback: () => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView | null;
        if (activeView) {
          const content = activeView.editor.getValue();
          this.openReader(content);
        } else {
          new Notice('No active note found');
        }
      }
    });

    // Context menu
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          menu.addItem((item: MenuItem) => {
            item
              .setTitle('Read with DashReader')
              .setIcon('zap')
              .onClick(() => {
                this.openReader(selection);
              });
          });
        }
      })
    );

    // Settings tab
    this.addSettingTab(new DashReaderSettingTab(this.app, this));
  }

  onunload() {
    // Cleanup
  }

  async loadSettings() {
    const rawSettings = await this.loadData() as Partial<DashReaderSettings> | null;
    this.settings = validateSettings(rawSettings);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Opens the DashReader Zen Modal
   * @param text Optional text content to load
   */
  private openReader(text?: string): void {
    const modal = new DashReaderModal(this.app, this.settings);
    if (text) {
      const activeFile = this.app.workspace.getActiveFile();
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView | null;
      
      modal.setSource(text, {
        fileName: activeFile?.name,
        cursorPosition: activeView?.editor.getCursor() ? activeView.editor.posToOffset(activeView.editor.getCursor()) : undefined
      });
    }
    modal.open();
  }
}
