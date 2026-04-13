import { Plugin, WorkspaceLeaf, Notice, MarkdownView, Menu, Editor, MenuItem } from 'obsidian';
import { DashReaderView, VIEW_TYPE_DASHREADER } from './src/rsvp-view';
import { DashReaderSettingTab } from './src/settings';
import { DashReaderSettings } from './src/types';
import { validateSettings } from './src/services/settings-validator';

export default class DashReaderPlugin extends Plugin {
  settings: DashReaderSettings;

  async onload() {
    await this.loadSettings();

    // Register the view
    this.registerView(
      VIEW_TYPE_DASHREADER,
      (leaf: WorkspaceLeaf) => new DashReaderView(leaf, this.settings)
    );

    // Add ribbon icon
    this.addRibbonIcon('zap', 'Open speed reader', () => {
      void this.activateView();
    });

    // Command: Open DashReader
    this.addCommand({
      id: 'open',
      name: 'Open speed reader',
      callback: () => {
        void this.activateView();
      }
    });

    // Command: Read selected text
    this.addCommand({
      id: 'read-selection',
      name: 'Read selected text',
      editorCallback: async (editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          const leaf = await this.activateView();
          if (leaf) {
            const view = leaf.view as DashReaderView;
            view.loadText(selection);
          }
        } else {
          new Notice('Please select some text first');
        }
      }
    });

    // Command: Read entire note
    this.addCommand({
      id: 'read-note',
      name: 'Read entire note',
      callback: async () => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView | null;
        if (activeView) {
          const content = activeView.editor.getValue();
          const leaf = await this.activateView();
          if (leaf) {
            const view = leaf.view as DashReaderView;
            view.loadText(content);
          }
        } else {
          new Notice('No active note found');
        }
      }
    });

    // Command: Toggle Play/Pause
    this.addCommand({
      id: 'toggle-play-pause',
      name: 'Toggle play/pause',
      callback: () => {
        // This command is handled by the view itself
        new Notice('Use Shift+Space key when speed reader is active');
      }
    });

    // Command: Stop All
    this.addCommand({
      id: 'stop-all',
      name: 'Stop speed reader',
      callback: () => {
        const view = this.getView();
        if (view) {
          view.stop();
          new Notice('Reading stopped');
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
              .setTitle('Read with speed reader')
              .setIcon('zap')
              .onClick(async () => {
                const leaf = await this.activateView();
                if (leaf) {
                  const view = leaf.view as DashReaderView;
                  view.loadText(selection);
                }
              });
          });
        }
      })
    );

    // Settings tab
    this.addSettingTab(new DashReaderSettingTab(this.app, this));

    // Update view when settings change
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        const view = this.getView();
        if (view) {
          view.updateSettings(this.settings);
        }
      })
    );
  }

  onunload() {
    // Don't detach leaves here - let Obsidian restore them at original positions during updates
  }

  private getView(): DashReaderView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHREADER);
    if (leaves.length > 0) {
      return leaves[0].view as unknown as DashReaderView;
    }
    return null;
  }

  async loadSettings() {
    const rawSettings = await this.loadData() as Partial<DashReaderSettings> | null;
    this.settings = validateSettings(rawSettings);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Update view if it exists
    const view = this.getView();
    if (view) {
      view.updateSettings(this.settings);
    }
  }

  async activateView(): Promise<WorkspaceLeaf | null> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_DASHREADER);

    if (leaves.length > 0) {
      // View already exists, use it
      leaf = leaves[0];
    } else {
      // Create new view in right panel
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_DASHREADER,
          active: true,
        });
      }
    }

    if (leaf) {
      await workspace.revealLeaf(leaf);
    }
    return leaf;
  }
}
