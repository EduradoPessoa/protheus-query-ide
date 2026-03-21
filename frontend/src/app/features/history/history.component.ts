import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { HistoryRecord } from '../../core/models/history.model';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-history',
  template: `
    <div class="pq-history-panel">
      <po-input
        name="historyFilter"
        p-placeholder="Filtrar histórico..."
        p-icon="po-icon-search"
        [(ngModel)]="filterText"
        (ngModelChange)="applyFilter()">
      </po-input>

      <po-list-view
        [p-items]="filteredRecords"
        [p-show-more]="hasMore"
        [p-template]="historyItemTpl"
        (p-show-more)="loadMore()"
        (p-select)="onItemSelect($event)">
      </po-list-view>

      <div *ngIf="filteredRecords.length === 0 && !isLoading" class="pq-history-empty">
        <po-icon p-icon="po-icon-clock" class="pq-history-empty-icon"></po-icon>
        <p>Nenhuma query executada nesta sessão.</p>
      </div>

      <ng-template #historyItemTpl let-item>
        <div class="pq-history-item">
          <div class="pq-history-item-header">
            <span class="pq-history-item-time">
              {{ item.dtExec | date:'HH:mm:ss' }}
            </span>
            <po-tag
              [p-label]="item.tipo"
              [p-color]="getTypeColor(item.tipo)"
              [p-icon]="getTypeIcon(item.tipo)">
            </po-tag>
          </div>
          <div class="pq-history-item-meta">
            <span>{{ item.rows }} linhas</span>
            <span class="pq-history-item-separator">&bull;</span>
            <span>{{ item.tempo }}ms</span>
            <span *ngIf="item.status === 'E'" class="pq-history-item-error">
              <po-tag p-label="ERRO" p-color="color-07"></po-tag>
            </span>
          </div>
          <div class="pq-history-item-sql">{{ truncateSql(item.sql) }}</div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .pq-history-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .pq-history-panel po-input {
      margin-bottom: 8px;
    }

    .pq-history-panel po-list-view {
      flex: 1;
      overflow-y: auto;
    }

    .pq-history-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      color: var(--color-neutral-light-70);
      text-align: center;
    }

    .pq-history-empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .pq-history-empty p {
      margin: 0;
      font-size: 13px;
    }

    .pq-history-item {
      padding: 4px 0;
      cursor: pointer;
      width: 100%;
    }

    .pq-history-item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .pq-history-item-time {
      font-weight: 600;
      font-size: 13px;
      color: var(--color-neutral-dark-70);
      font-variant-numeric: tabular-nums;
    }

    .pq-history-item-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-neutral-light-70);
      margin-bottom: 4px;
    }

    .pq-history-item-separator {
      opacity: 0.5;
    }

    .pq-history-item-sql {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: var(--color-neutral-light-60);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }

    .pq-history-item-error {
      margin-left: auto;
    }
  `]
})
export class HistoryComponent implements OnInit, OnChanges {
  @Input() records: HistoryRecord[] = [];

  @Output() loadQuery = new EventEmitter<HistoryRecord>();

  filterText = '';
  filteredRecords: HistoryRecord[] = [];
  hasMore = false;
  isLoading = false;
  private displayCount = PAGE_SIZE;

  ngOnInit(): void {
    this.applyFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['records']) {
      this.applyFilter();
    }
  }

  applyFilter(): void {
    const term = this.filterText.trim().toLowerCase();

    let pool: HistoryRecord[];
    if (term) {
      pool = this.records.filter(r =>
        r.sql.toLowerCase().includes(term) ||
        r.tipo.toLowerCase().includes(term) ||
        r.banco.toLowerCase().includes(term)
      );
    } else {
      pool = this.records;
    }

    this.filteredRecords = pool.slice(0, this.displayCount);
    this.hasMore = pool.length > this.displayCount;
  }

  loadMore(): void {
    this.displayCount += PAGE_SIZE;
    this.applyFilter();
  }

  onItemSelect(record: HistoryRecord): void {
    this.loadQuery.emit(record);
  }

  getTypeColor(tipo: string): string {
    const colors: Record<string, string> = {
      'SELECT': 'color-08',
      'DML': 'color-10',
      'DDL': 'color-06'
    };
    return colors[tipo] ?? 'color-08';
  }

  getTypeIcon(tipo: string): string {
    const icons: Record<string, string> = {
      'SELECT': 'po-icon-eye',
      'DML': 'po-icon-edit',
      'DDL': 'po-icon-settings'
    };
    return icons[tipo] ?? 'po-icon-eye';
  }

  truncateSql(sql: string): string {
    const firstLine = sql.split('\n')[0].trim();
    return firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
  }
}
