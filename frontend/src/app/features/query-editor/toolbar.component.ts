import { Component, EventEmitter, Output } from '@angular/core';
import { PoSelectOption, PoToolbarAction } from '@po-ui/ng-components';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent {
  @Output() execute = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() saveFavorite = new EventEmitter<void>();
  @Output() newQuery = new EventEmitter<void>();
  @Output() clearEditor = new EventEmitter<void>();
  @Output() databaseChange = new EventEmitter<string>();
  @Output() companyChange = new EventEmitter<string>();

  title = 'ProtheusQuery IDE';
  isExecuting = false;

  selectedDatabase = 'sqlserver';
  selectedCompany = '01';

  databaseOptions: PoSelectOption[] = [
    { label: 'SQL Server', value: 'sqlserver' },
    { label: 'PostgreSQL', value: 'postgresql' },
    { label: 'Oracle', value: 'oracle' }
  ];

  companyOptions: PoSelectOption[] = [
    { label: 'Empresa 01', value: '01' },
    { label: 'Empresa 02', value: '02' },
    { label: 'Empresa 03', value: '03' }
  ];

  get toolbarActions(): PoToolbarAction[] {
    const actions: PoToolbarAction[] = [
      {
        label: 'Executar',
        icon: 'po-icon-play',
        shortcut: 'F5',
        action: () => this.onExecute(),
        separator: false
      },
      {
        label: 'Salvar Favorito',
        icon: 'po-icon-star',
        shortcut: 'Ctrl+S',
        action: () => this.onSaveFavorite(),
        separator: false
      },
      {
        label: 'Nova query',
        icon: 'po-icon-plus',
        shortcut: 'Ctrl+T',
        action: () => this.onNewQuery(),
        separator: false
      },
      {
        label: 'Limpar',
        icon: 'po-icon-delete',
        action: () => this.onClearEditor(),
        separator: false
      }
    ];

    if (this.isExecuting) {
      actions.splice(1, 0, {
        label: 'Cancelar',
        icon: 'po-icon-close',
        shortcut: 'Esc',
        action: () => this.onCancel(),
        separator: false
      });
    }

    return actions;
  }

  get toolbarItems(): PoSelectOption[] {
    return [];
  }

  onExecute(): void {
    this.execute.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSaveFavorite(): void {
    this.saveFavorite.emit();
  }

  onNewQuery(): void {
    this.newQuery.emit();
  }

  onClearEditor(): void {
    this.clearEditor.emit();
  }

  onDatabaseChange(value: string): void {
    this.selectedDatabase = value;
    this.databaseChange.emit(value);
  }

  onCompanyChange(value: string): void {
    this.selectedCompany = value;
    this.companyChange.emit(value);
  }

  setExecuting(value: boolean): void {
    this.isExecuting = value;
  }
}
