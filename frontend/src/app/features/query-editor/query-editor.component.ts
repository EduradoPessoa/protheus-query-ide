import { Component, EventEmitter, Output, OnDestroy, HostListener } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

enum KeyMod {
  CtrlCmd = 2048,
  Shift = 1024,
  Alt = 512
}

enum KeyCode {
  Enter = 3,
  Slash = 49,
  KeyS = 41,
  KeyT = 44,
  KeyW = 45,
  KeyH = 35,
  KeyF = 34,
  F5 = 63,
  Escape = 9
}

@Component({
  selector: 'app-query-editor',
  templateUrl: './query-editor.component.html',
  styleUrls: ['./query-editor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: QueryEditorComponent,
      multi: true
    }
  ]
})
export class QueryEditorComponent implements ControlValueAccessor, OnDestroy {
  @Output() executeQuery = new EventEmitter<string>();
  @Output() executeSelection = new EventEmitter<string>();
  @Output() saveFavorite = new EventEmitter<string>();
  @Output() newTab = new EventEmitter<void>();
  @Output() closeTab = new EventEmitter<void>();
  @Output() cancelExecution = new EventEmitter<void>();
  @Output() toggleHistory = new EventEmitter<void>();
  @Output() toggleFavorites = new EventEmitter<void>();

  sqlContent: string = '';
  private editorInstance: any = null;

  editorOptions = {
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

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.sqlContent = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onEditorInit(editor: any): void {
    this.editorInstance = editor;

    editor.onDidChangeModelContent(() => {
      this.onChange(this.sqlContent);
      this.onTouched();
    });

    this.setupKeyBindings(editor);
  }

  private setupKeyBindings(editor: any): void {
    if (!editor || !editor.addAction) return;

    editor.addAction({
      id: 'execute-full-query',
      label: 'Executar Query Completa',
      keybindings: [KeyMod.CtrlCmd | KeyCode.F5],
      run: () => {
        this.onExecuteFullQuery();
      }
    });

    editor.addAction({
      id: 'execute-selection',
      label: 'Executar Seleção',
      keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
      run: () => {
        this.onExecuteSelection();
      }
    });

    editor.addAction({
      id: 'toggle-comment',
      label: 'Comentar/Descomentar Linha',
      keybindings: [KeyMod.CtrlCmd | KeyCode.Slash],
      run: () => {
        this.toggleComment();
      }
    });

    editor.addAction({
      id: 'save-favorite',
      label: 'Salvar como Favorito',
      keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
      run: () => {
        this.saveFavorite.emit(this.sqlContent);
      }
    });

    editor.addAction({
      id: 'new-tab',
      label: 'Nova Aba de Query',
      keybindings: [KeyMod.CtrlCmd | KeyCode.KeyT],
      run: () => {
        this.newTab.emit();
      }
    });

    editor.addAction({
      id: 'close-tab',
      label: 'Fechar Aba Atual',
      keybindings: [KeyMod.CtrlCmd | KeyCode.KeyW],
      run: () => {
        this.closeTab.emit();
      }
    });

    editor.addAction({
      id: 'toggle-history',
      label: 'Alternar Painel de Histórico',
      keybindings: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyH],
      run: () => {
        this.toggleHistory.emit();
      }
    });

    editor.addAction({
      id: 'toggle-favorites',
      label: 'Alternar Painel de Favoritos',
      keybindings: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyF],
      run: () => {
        this.toggleFavorites.emit();
      }
    });

    editor.addCommand(KeyCode.Escape, () => {
      this.cancelExecution.emit();
    });
  }

  private onExecuteFullQuery(): void {
    const query = this.sqlContent.trim();
    if (query) {
      this.executeQuery.emit(query);
    }
  }

  private onExecuteSelection(): void {
    if (!this.editorInstance) return;

    const selection = this.editorInstance.getSelection();
    let selectedText = '';

    if (selection && !selection.isEmpty()) {
      selectedText = this.editorInstance.getModel()?.getValueInRange(selection) || '';
    }

    if (!selectedText.trim()) {
      selectedText = this.sqlContent;
    }

    if (selectedText.trim()) {
      this.executeSelection.emit(selectedText.trim());
    }
  }

  private toggleComment(): void {
    if (!this.editorInstance) return;

    const model = this.editorInstance.getModel();
    const selection = this.editorInstance.getSelection();

    if (!model || !selection) return;

    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;

    let shouldComment = true;
    for (let line = startLine; line <= endLine; line++) {
      const lineContent = model.getLineContent(line);
      if (lineContent.trim().startsWith('--')) {
        shouldComment = false;
        break;
      }
    }

    if (shouldComment) {
      this.addComment(model, startLine, endLine);
    } else {
      this.removeComment(model, startLine, endLine);
    }
  }

  private addComment(model: any, startLine: number, endLine: number): void {
    const lines = model.getValue().split('\n');
    for (let i = startLine - 1; i < endLine; i++) {
      if (lines[i].trim()) {
        lines[i] = '-- ' + lines[i];
      }
    }
    model.setValue(lines.join('\n'));
  }

  private removeComment(model: any, startLine: number, endLine: number): void {
    const lines = model.getValue().split('\n');
    for (let i = startLine - 1; i < endLine; i++) {
      if (lines[i].trim().startsWith('--')) {
        lines[i] = lines[i].replace(/^--\s*/, '');
      }
    }
    model.setValue(lines.join('\n'));
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent): void {
    if (event.key === 'F5' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.onExecuteFullQuery();
    }

    if (event.key === 'Escape') {
      this.cancelExecution.emit();
    }
  }

  onSqlContentChange(value: string): void {
    this.sqlContent = value;
    this.onChange(value);
  }

  ngOnDestroy(): void {
    if (this.editorInstance) {
      this.editorInstance.dispose();
      this.editorInstance = null;
    }
  }
}
