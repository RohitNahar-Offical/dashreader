import { App, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_SETTINGS, QuickReaderSettings, IQuickReader } from './types';

/**
 * QuickReaderSettingTab
 * 
 * Provides a clean, organized settings interface for Quick Reader.
 */
export class QuickReaderSettingTab extends PluginSettingTab {
  plugin: IQuickReader;

  constructor(app: App, plugin: IQuickReader) {
    super(app, plugin as any); // Cast for Obsidian base class compatibility
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'Quick Reader Settings' });

    new Setting(containerEl)
      .setName('Reading Speed (WPM)')
      .setDesc('Words per minute for the RSVP engine.')
      .addSlider(slider => slider
        .setLimits(100, 1500, 50)
        .setValue(this.plugin.settings.wpm)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.wpm = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Font Size')
      .setDesc('Size of the word display in the modal.')
      .addSlider(slider => slider
        .setLimits(24, 120, 4)
        .setValue(this.plugin.settings.fontSize)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.fontSize = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Visual Features' });

    new Setting(containerEl)
      .setName('Context Reveal (Expansion)')
      .setDesc('Automatically expand the paragraph context when paused.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableContextExpansion)
        .onChange(async (value) => {
          this.plugin.settings.enableContextExpansion = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show Minimap')
      .setDesc('Displays a vertical progress bar with heading points.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showMinimap)
        .onChange(async (value) => {
          this.plugin.settings.showMinimap = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show Breadcrumbs')
      .setDesc('Displays the heading hierarchy at the top.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showBreadcrumb)
        .onChange(async (value) => {
          this.plugin.settings.showBreadcrumb = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show Stats')
      .setDesc('Displays real-time reading statistics.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showStats)
        .onChange(async (value) => {
          this.plugin.settings.showStats = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Reset' });
    
    new Setting(containerEl)
      .setName('Reset to Defaults')
      .setDesc('Restore all settings to factory defaults.')
      .addButton(btn => btn
        .setButtonText('Reset')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
          await this.plugin.saveSettings();
          this.display();
        }));
  }
}
