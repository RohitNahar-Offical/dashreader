declare module 'obsidian' {
  export class Plugin {
    app: App;
    loadData(): Promise<any>;
    saveData(data: any): Promise<void>;
    registerView(type: string, factory: (leaf: WorkspaceLeaf) => View): void;
    addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement;
    addCommand(command: Command): void;
    addSettingTab(tab: PluginSettingTab): void;
    registerEvent(event: any): void;
  }

  export class ItemView extends View {
    constructor(leaf: WorkspaceLeaf);
    contentEl: HTMLElement;
    navigation: boolean;
    onClose(): Promise<void>;
    onOpen(): Promise<void>;
  }

  export class View {
    leaf: WorkspaceLeaf;
    app: App;
    constructor(leaf: WorkspaceLeaf);
    registerEvent(event: any): void;
    registerDomEvent(el: HTMLElement | Window | Document, type: string, callback: (e: any) => any): void;
  }

  export class WorkspaceLeaf {
    view: View;
    setViewState(state: any): Promise<void>;
  }

  export class App {
    workspace: Workspace;
  }

  export class Workspace {
    on(event: string, callback: (...args: any[]) => any): any;
    getActiveViewOfType<T>(type: { new (...args: any[]): T } | any): T | null;
    getLeavesOfType(type: string): WorkspaceLeaf[];
    revealLeaf(leaf: WorkspaceLeaf): Promise<void>;
    getLeaf(newLeaf: boolean | 'split' | 'tab'): WorkspaceLeaf;
    getRightLeaf(newLeaf: boolean): WorkspaceLeaf;
    getActiveFile(): TFile | null;
    onLayoutReady(callback: () => any): void;
  }

  export interface Command {
    id: string;
    name: string;
    callback?: () => void;
    editorCallback?: (editor: Editor) => void;
  }

  export class PluginSettingTab {
    constructor(app: App, plugin: Plugin);
    display(): void;
    containerEl: HTMLElement;
  }

  export class Setting {
    constructor(containerEl: HTMLElement);
    setName(name: string): this;
    setDesc(desc: string): this;
    addSlider(cb: (slider: SliderComponent) => any): this;
    addToggle(cb: (toggle: ToggleComponent) => any): this;
    addDropdown(cb: (dropdown: DropdownComponent) => any): this;
    addText(cb: (text: TextComponent) => any): this;
    addButton(cb: (button: ButtonComponent) => any): this;
    setHeading(): this;
    controlEl: HTMLElement;
  }

  export class ButtonComponent {
    setButtonText(text: string): this;
    setCta(): this;
    onClick(cb: () => void): this;
  }

  export class SliderComponent {
    setLimits(min: number, max: number, step: number): this;
    setValue(value: number): this;
    setDynamicTooltip(): this;
    onChange(cb: (value: number) => any): this;
  }

  export class ToggleComponent {
    setValue(value: boolean): this;
    onChange(cb: (value: boolean) => any): this;
  }

  export class DropdownComponent {
    addOption(key: string, value: string): this;
    addOptions(options: Record<string, string>): this;
    setValue(value: string): this;
    onChange(cb: (value: string) => any): this;
  }

  export class TextComponent {
    setPlaceholder(placeholder: string): this;
    setValue(value: string): this;
    onChange(cb: (value: string) => any): this;
  }

  export class Notice {
    constructor(message: string);
  }

  export interface Editor {
    getSelection(): string;
    getValue(): string;
    getCursor(type?: string): any;
    posToOffset(pos: any): number;
    somethingSelected(): boolean;
  }

  export class Menu {
    addItem(cb: (item: MenuItem) => any): this;
  }

  export interface MenuItem {
    setTitle(title: string): this;
    setIcon(icon: string): this;
    onClick(cb: () => void): this;
  }

  export class TFile {
    path: string;
    name: string;
  }

  export class MarkdownView extends View {
    editor: Editor;
  }
}

// Global extensions added by Obsidian
interface HTMLElement {
  empty(): void;
  createDiv(options?: { cls?: string; text?: string } | string): HTMLDivElement;
  createSpan(options?: { cls?: string; text?: string } | string): HTMLSpanElement;
  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: { cls?: string; text?: string; type?: string; placeholder?: string; value?: string } | string,
    callback?: (el: HTMLElementTagNameMap[K]) => void
  ): HTMLElementTagNameMap[K];
  setText(text: string): void;
  setAttr(name: string, value: string | number | boolean): void;
  isShown(): boolean;
  toggleClass(cls: string, value: boolean): void;
}
