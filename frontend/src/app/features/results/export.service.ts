import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../core/http/api.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly baseUrl: string;

  constructor(
    private api: ApiService,
    private http: HttpClient
  ) {
    this.baseUrl = environment.apiUrl;
  }

  exportXlsx(executionId: string): Observable<Blob> {
    return this.export(executionId, 'xlsx');
  }

  exportCsv(executionId: string): Observable<Blob> {
    return this.export(executionId, 'csv');
  }

  private export(executionId: string, format: 'xlsx' | 'csv'): Observable<Blob> {
    const url = `${this.baseUrl}/export`;
    return this.http.post(url, { executionId, format }, { responseType: 'blob' }).pipe(
      tap(blob => this.download(blob, `result.${format}`))
    );
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
