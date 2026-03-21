import { Component, Input } from '@angular/core';

export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL';
export type StatusBarStatus = 'idle' | 'executing' | 'success' | 'error';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.css']
})
export class StatusBarComponent {
  @Input() status: StatusBarStatus = 'idle';
  @Input() queryType: QueryType | null = null;
  @Input() rowCount: number | null = null;
  @Input() executionTime: number | null = null;
  @Input() errorMessage: string | null = null;

  getQueryTypeColor(): string {
    const colors: Record<QueryType, string> = {
      'SELECT': 'color-08',
      'INSERT': 'color-10',
      'UPDATE': 'color-02',
      'DELETE': 'color-07',
      'DDL': 'color-06'
    };
    return this.queryType ? colors[this.queryType] : 'color-08';
  }

  getQueryTypeIcon(): string {
    const icons: Record<QueryType, string> = {
      'SELECT': 'po-icon-eye',
      'INSERT': 'po-icon-plus',
      'UPDATE': 'po-icon-edit',
      'DELETE': 'po-icon-delete',
      'DDL': 'po-icon-settings'
    };
    return this.queryType ? icons[this.queryType] : 'po-icon-eye';
  }

  getIdleStatusColor(): string {
    return 'color-11';
  }

  getErrorStatusColor(): string {
    return 'color-07';
  }
}
