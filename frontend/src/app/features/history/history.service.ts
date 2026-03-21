import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { HistoryRecord, PagedResult } from '../../core/models/history.model';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private readonly endpoint = '/history';

  constructor(private apiService: ApiService) {}

  getHistory(page: number, pageSize: number): Observable<PagedResult<HistoryRecord>> {
    return this.apiService.get<PagedResult<HistoryRecord>>(this.endpoint, { page, pageSize });
  }

  getHistoryById(id: string): Observable<HistoryRecord> {
    return this.apiService.get<HistoryRecord>(`${this.endpoint}/${id}`);
  }

  deleteHistory(id: string): Observable<void> {
    return this.apiService.delete<void>(`${this.endpoint}/${id}`);
  }
}
