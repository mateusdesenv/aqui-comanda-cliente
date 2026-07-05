import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListData, ApiQueryParams, ApiResponse } from './api-response.types';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  get<T>(path: string, params?: ApiQueryParams): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), { params: this.toParams(params) })
      .pipe(map((response) => response.data));
  }

  list<T>(path: string, params?: ApiQueryParams): Observable<T[]> {
    return this.get<ApiListData<T> | T[]>(path, params).pipe(
      map((data) => (Array.isArray(data) ? data : data.items)),
    );
  }

  post<T>(path: string, body?: unknown, params?: ApiQueryParams): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), body ?? {}, { params: this.toParams(params) })
      .pipe(map((response) => response.data));
  }

  put<T>(path: string, body?: unknown, params?: ApiQueryParams): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.url(path), body ?? {}, { params: this.toParams(params) })
      .pipe(map((response) => response.data));
  }

  patch<T>(path: string, body?: unknown, params?: ApiQueryParams): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(this.url(path), body ?? {}, { params: this.toParams(params) })
      .pipe(map((response) => response.data));
  }

  delete<T = void>(path: string, params?: ApiQueryParams): Observable<T> {
    return this.http
      .delete<ApiResponse<T> | null>(this.url(path), { params: this.toParams(params) })
      .pipe(map((response) => response?.data as T));
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }

  private toParams(params?: ApiQueryParams): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }

      httpParams = httpParams.set(key, String(value));
    });

    return httpParams;
  }
}
