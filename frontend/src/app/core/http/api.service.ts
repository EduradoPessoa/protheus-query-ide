import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiError {
  code?: string;
  message: string;
  dbError?: string;
  errorDetail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.post<T>(url, body).pipe(
      catchError(this.handleError)
    );
  }

  get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, String(params[key]));
      });
    }
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.get<T>(url, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.put<T>(url, body).pipe(
      catchError(this.handleError)
    );
  }

  patch<T>(endpoint: string, body: unknown): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.patch<T>(url, body).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.delete<T>(url).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: unknown): Observable<never> {
    let errorMessage: string;

    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as ApiError).message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'Erro inesperado. Tente novamente.';
    }

    return throwError(() => new Error(errorMessage));
  }
}
