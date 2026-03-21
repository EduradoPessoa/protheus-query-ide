import { Component, Input } from '@angular/core';

import { PoTableColumn, PoTableComponent } from '@po-ui/ng-components';

@Component({
  selector: 'app-result-grid',
  templateUrl: './result-grid.component.html',
  styleUrls: ['./result-grid.component.css']
})
export class ResultGridComponent {
  @Input() columns: PoTableColumn[] = [];
  @Input() rows: Array<Record<string, unknown>> = [];
  @Input() loading: boolean = false;

  get processedRows(): Array<Record<string, unknown>> {
    return this.rows.map(row => {
      const processed: Record<string, unknown> = {};
      for (const key in row) {
        processed[key] = this.formatValue(row[key]);
      }
      return processed;
    });
  }

  get rowCount(): number {
    return this.rows.length;
  }

  private formatValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return '—';
    }
    return value;
  }
}
