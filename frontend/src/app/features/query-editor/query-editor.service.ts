import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { ApiService } from '../../core/http/api.service';
import { QueryRequest, QueryResult } from '../../core/models/query.model';

export type QueryType = 'SELECT' | 'DML' | 'DDL';

@Injectable({
  providedIn: 'root'
})
export class QueryEditorService {
  private readonly isExecutingSubject = new BehaviorSubject<boolean>(false);
  private readonly currentResultSubject = new BehaviorSubject<QueryResult | null>(null);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly cancelSubject = new Subject<void>();

  readonly isExecuting$ = this.isExecutingSubject.asObservable();
  readonly currentResult$ = this.currentResultSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor(private apiService: ApiService) {}

  executeQuery(request: QueryRequest): Observable<QueryResult> {
    this.setExecuting(true);
    this.clearError();
    this.clearResult();

    const queryType = this.detectQueryType(request.sql);

    return this.apiService.post<QueryResult>('/query/execute', request).pipe(
      tap(result => {
        this.currentResultSubject.next(result);
      }),
      catchError(error => {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao executar query';
        this.errorSubject.next(errorMessage);
        throw error;
      }),
      finalize(() => {
        this.setExecuting(false);
      })
    );
  }

  cancelExecution(): void {
    this.cancelSubject.next();
    this.setExecuting(false);
  }

  clearResult(): void {
    this.currentResultSubject.next(null);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  detectQueryType(sql: string): QueryType {
    const trimmedSql = sql.trim().toUpperCase();

    if (trimmedSql.startsWith('SELECT') || 
        trimmedSql.startsWith('WITH') ||
        trimmedSql.startsWith('SHOW') ||
        trimmedSql.startsWith('DESCRIBE') ||
        trimmedSql.startsWith('DESC')) {
      return 'SELECT';
    }

    if (trimmedSql.startsWith('INSERT') || 
        trimmedSql.startsWith('UPDATE') || 
        trimmedSql.startsWith('DELETE') ||
        trimmedSql.startsWith('MERGE')) {
      return 'DML';
    }

    if (trimmedSql.startsWith('CREATE') || 
        trimmedSql.startsWith('ALTER') || 
        trimmedSql.startsWith('DROP') ||
        trimmedSql.startsWith('TRUNCATE') ||
        trimmedSql.startsWith('RENAME') ||
        trimmedSql.startsWith('GRANT') ||
        trimmedSql.startsWith('REVOKE')) {
      return 'DDL';
    }

    return 'SELECT';
  }

  get currentResult(): QueryResult | null {
    return this.currentResultSubject.value;
  }

  get error(): string | null {
    return this.errorSubject.value;
  }

  get isExecuting(): boolean {
    return this.isExecutingSubject.value;
  }

  private setExecuting(value: boolean): void {
    this.isExecutingSubject.next(value);
  }
}
