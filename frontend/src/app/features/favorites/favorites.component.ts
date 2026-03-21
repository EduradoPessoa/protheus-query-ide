import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FavoriteRecord } from '../../core/models/favorite.model';
import { FavoriteService } from './favorite.service';
import { PoDialogService, PoListViewAction, PoNotificationService } from '@po-ui/ng-components';

@Component({
  selector: 'app-favorites',
  template: `
    <div class="pq-favorites-panel">
      <po-input
        name="favFilter"
        p-placeholder="Filtrar favoritos..."
        p-icon="po-icon-search"
        [(ngModel)]="filterText"
        (ngModelChange)="applyFilter()">
      </po-input>

      <po-list-view
        [p-items]="filteredFavorites"
        [p-actions]="favoriteActions"
        p-property-title="nome">

        <ng-template p-list-view-content-template let-item>
          <div class="pq-favorite-item">
            <div class="pq-favorite-item-desc" *ngIf="item.desc">{{ item.desc }}</div>
            <div class="pq-favorite-item-meta">
              <span class="pq-favorite-item-banco">{{ item.banco }}</span>
              <span class="pq-favorite-item-separator">&bull;</span>
              <span class="pq-favorite-item-date">Atualizado em {{ formatDate(item.dtAlt || item.dtCri) }}</span>
            </div>
          </div>
        </ng-template>

      </po-list-view>

      <div *ngIf="filteredFavorites.length === 0 && !isLoading" class="pq-favorites-empty">
        <po-icon p-icon="po-icon-star" class="pq-favorites-empty-icon"></po-icon>
        <p>Você ainda não salvou nenhuma query favorita.</p>
      </div>
    </div>
  `,
  styles: [`
    .pq-favorites-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .pq-favorites-panel po-input {
      margin-bottom: 8px;
    }

    .pq-favorites-panel po-list-view {
      flex: 1;
      overflow-y: auto;
    }

    .pq-favorites-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      color: var(--color-neutral-light-70);
      text-align: center;
    }

    .pq-favorites-empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .pq-favorites-empty p {
      margin: 0;
      font-size: 13px;
    }

    .pq-favorite-item {
      padding: 2px 0;
      width: 100%;
    }

    .pq-favorite-item-desc {
      font-size: 12px;
      color: var(--color-neutral-light-60);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pq-favorite-item-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-neutral-light-70);
    }

    .pq-favorite-item-banco {
      font-weight: 500;
    }

    .pq-favorite-item-separator {
      opacity: 0.5;
    }

    .pq-favorite-item-date {
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class FavoritesComponent implements OnInit {
  @Input() favorites: FavoriteRecord[] = [];

  @Output() openQuery = new EventEmitter<FavoriteRecord>();
  @Output() editQuery = new EventEmitter<FavoriteRecord>();

  filterText = '';
  filteredFavorites: FavoriteRecord[] = [];
  isLoading = false;

  favoriteActions: PoListViewAction[] = [
    {
      label: 'Abrir',
      icon: 'po-icon-edit',
      action: (item: FavoriteRecord) => this.openFavorite(item)
    },
    {
      label: 'Editar',
      icon: 'po-icon-settings',
      action: (item: FavoriteRecord) => this.editFavorite(item)
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      action: (item: FavoriteRecord) => this.confirmDelete(item)
    }
  ];

  constructor(
    private favoriteService: FavoriteService,
    private dialogService: PoDialogService,
    private notificationService: PoNotificationService
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.favoriteService.getFavorites().subscribe({
      next: (records) => {
        this.favorites = records;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.error('Erro ao carregar favoritos.');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    const term = this.filterText.trim().toLowerCase();
    if (term) {
      this.filteredFavorites = this.favorites.filter(f =>
        f.nome.toLowerCase().includes(term) ||
        (f.desc?.toLowerCase().includes(term) ?? false) ||
        f.banco.toLowerCase().includes(term)
      );
    } else {
      this.filteredFavorites = [...this.favorites];
    }
  }

  openFavorite(favorite: FavoriteRecord): void {
    this.openQuery.emit(favorite);
  }

  editFavorite(favorite: FavoriteRecord): void {
    this.editQuery.emit(favorite);
  }

  confirmDelete(favorite: FavoriteRecord): void {
    this.dialogService.confirm({
      title: 'Excluir favorito',
      message: `Deseja excluir o favorito "${favorite.nome}"? Esta ação não pode ser desfeita.`,
      confirm: () => this.deleteFavorite(favorite),
      cancel: () => {}
    });
  }

  deleteFavorite(favorite: FavoriteRecord): void {
    this.favoriteService.deleteFavorite(favorite.id).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(f => f.id !== favorite.id);
        this.applyFilter();
        this.notificationService.success(`Favorito "${favorite.nome}" excluído.`);
      },
      error: () => {
        this.notificationService.error('Erro ao excluir favorito.');
      }
    });
  }

  formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  }
}
