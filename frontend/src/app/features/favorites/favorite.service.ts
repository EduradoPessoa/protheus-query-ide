import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { FavoriteRecord } from '../../core/models/favorite.model';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private readonly endpoint = '/favorites';

  constructor(private apiService: ApiService) {}

  getFavorites(): Observable<FavoriteRecord[]> {
    return this.apiService.get<FavoriteRecord[]>(this.endpoint);
  }

  createFavorite(favorite: Omit<FavoriteRecord, 'id'>): Observable<FavoriteRecord> {
    return this.apiService.post<FavoriteRecord>(this.endpoint, favorite);
  }

  updateFavorite(id: string, favorite: Partial<FavoriteRecord>): Observable<FavoriteRecord> {
    return this.apiService.put<FavoriteRecord>(`${this.endpoint}/${id}`, favorite);
  }

  deleteFavorite(id: string): Observable<void> {
    return this.apiService.delete<void>(`${this.endpoint}/${id}`);
  }
}
