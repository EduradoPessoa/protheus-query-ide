import { Component, EventEmitter, HostListener, OnInit, OnDestroy, Output } from '@angular/core';
import { PoNotificationService } from '@po-ui/ng-components';
import { QueryResult } from '../../core/models/query.model';

export interface QueryTab {
  id: string;
  name: string;
  sql: string;
  result: QueryResult | null;
  isExecuting: boolean;
  error: string | null;
}

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.css']
})
export class TabsComponent implements OnInit, OnDestroy {
  @Output() executeQuery = new EventEmitter<{ sql: string; tabId: string }>();
  @Output() executeSelection = new EventEmitter<{ sql: string; tabId: string }>();
  @Output() saveFavorite = new EventEmitter<{ sql: string; tabId: string }>();

  tabs: QueryTab[] = [];
  activeTabId: string = '';

  private tabCounter = 0;

  private editorOptions = {
    theme: 'vs',
    language: 'sql',
    fontSize: 14,
    minimap: { enabled: false },
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    roundedSelection: true,
    selectOnLineNumbers: true,
    cursorBlinking: 'smooth' as const,
    cursorStyle: 'line' as const,
    tabSize: 2,
    readOnly: false
  };

  private editorInstances: Map<string, any> = new Map();

  constructor(private notificationService: PoNotificationService) {}

  ngOnInit(): void {
    this.addTab();
  }

  ngOnDestroy(): void {
    this.disposeAllEditors();
  }

  addTab(): void {
    this.tabCounter++;
    const tab: QueryTab = {
      id: `tab-${Date.now()}-${this.tabCounter}`,
      name: `Query ${this.tabCounter}`,
      sql: '',
      result: null,
      isExecuting: false,
      error: null
    };
    this.tabs = [...this.tabs, tab];
    this.activeTabId = tab.id;
  }

  closeTab(tabId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.tabs.length <= 1) {
      this.notificationService.warning('Não é possível fechar a última aba.');
      return;
    }

    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    this.disposeEditor(tabId);
    this.tabs = this.tabs.filter(t => t.id !== tabId);

    if (this.activeTabId === tabId) {
      const newIndex = Math.min(index, this.tabs.length - 1);
      this.activeTabId = this.tabs[newIndex].id;
    }
  }

  activateTab(tabId: string): void {
    if (this.activeTabId !== tabId) {
      this.activeTabId = tabId;
    }
  }

  get activeTab(): QueryTab | null {
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  }

  get activeEditorOptions() {
    return { ...this.editorOptions };
  }

  onEditorInit(editor: any, tab: QueryTab): void {
    this.editorInstances.set(tab.id, editor);
    this.setupKeyBindings(editor, tab);
  }

  onSqlChange(sql: string, tab: QueryTab): void {
    tab.sql = sql;
  }

  onExecuteFullQuery(tab: QueryTab): void {
    if (!tab.sql.trim() || tab.isExecuting) return;
    this.executeQuery.emit({ sql: tab.sql.trim(), tabId: tab.id });
  }

  onExecuteSelection(tab: QueryTab): void {
    const editor = this.editorInstances.get(tab.id);
    if (!editor) {
      this.onExecuteFullQuery(tab);
      return;
    }

    const selection = editor.getSelection();
    let selectedText = '';

    if (selection && !selection.isEmpty()) {
      selectedText = editor.getModel()?.getValueInRange(selection) || '';
    }

    if (!selectedText.trim()) {
      selectedText = tab.sql;
    }

    if (selectedText.trim() && !tab.isExecuting) {
      this.executeSelection.emit({ sql: selectedText.trim(), tabId: tab.id });
    }
  }

  onSaveFavorite(tab: QueryTab): void {
    if (tab.sql.trim()) {
      this.saveFavorite.emit({ sql: tab.sql.trim(), tabId: tab.id });
    }
  }

  setResult(tabId: string, result: QueryResult): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.result = result;
      tab.isExecuting = false;
      tab.error = null;
    }
  }

  setError(tabId: string, error: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.error = error;
      tab.isExecuting = false;
    }
  }

  setExecuting(tabId: string, isExecuting: boolean): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.isExecuting = isExecuting;
      if (isExecuting) {
        tab.error = null;
      }
    }
  }

  cancelExecution(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.isExecuting = false;
    }
  }

  get hasResults(): boolean {
    const tab = this.activeTab;
    return !!tab && !!tab.result && tab.result.success && tab.result.queryType === 'SELECT';
  }

  get resultColumns(): string[] {
    const tab = this.activeTab;
    if (!tab?.result?.columns) return [];
    return tab.result.columns.map(c => c.name);
  }

  get resultRows(): any[][] {
    const tab = this.activeTab;
    if (!tab?.result?.rows) return [];
    return tab.result.rows;
  }

  trackByTabId(_index: number, tab: QueryTab): string {
    return tab.id;
  }

  private setupKeyBindings(editor: any, tab: QueryTab): void {
    if (!editor || !editor.addAction) return;

    editor.addAction({
      id: `execute-full-${tab.id}`,
      label: 'Executar Query Completa',
      keybindings: [2048 | 63],
      run: () => this.onExecuteFullQuery(tab)
    });

    editor.addAction({
      id: `execute-selection-${tab.id}`,
      label: 'Executar Seleção',
      keybindings: [2048 | 3],
      run: () => this.onExecuteSelection(tab)
    });

    editor.addAction({
      id: `save-favorite-${tab.id}`,
      label: 'Salvar como Favorito',
      keybindings: [2048 | 41],
      run: () => this.onSaveFavorite(tab)
    });

    editor.addAction({
      id: `new-tab-${tab.id}`,
      label: 'Nova Aba de Query',
      keybindings: [2048 | 44],
      run: () => this.addTab()
    });

    editor.addAction({
      id: `close-tab-${tab.id}`,
      label: 'Fechar Aba Atual',
      keybindings: [2048 | 45],
      run: () => this.closeTab(tab.id)
    });
  }

  private disposeEditor(tabId: string): void {
    const editor = this.editorInstances.get(tabId);
    if (editor) {
      editor.dispose();
      this.editorInstances.delete(tabId);
    }
  }

  private disposeAllEditors(): void {
    this.editorInstances.forEach(editor => editor.dispose());
    this.editorInstances.clear();
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent): void {
    const isCtrl = event.ctrlKey || event.metaKey;

    if (isCtrl && event.key === 't') {
      event.preventDefault();
      this.addTab();
    }

    if (isCtrl && event.key === 'w') {
      event.preventDefault();
      if (this.tabs.length > 1) {
        this.closeTab(this.activeTabId);
      }
    }
  }
}
