import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
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

  listAll<T>(path: string, params?: ApiQueryParams): Observable<T[]> {
    const pageSize = 100;
    const firstPageParams = { ...params, page: 1, limit: pageSize };

    return this.get<ApiListData<T> | T[]>(path, firstPageParams).pipe(
      switchMap((data) => {
        if (Array.isArray(data)) {
          return of(data);
        }

        const items = [...data.items];
        const totalPages = data.pagination?.totalPages ?? 1;

        if (totalPages <= 1) {
          return of(items);
        }

        const pageRequests = Array.from({ length: totalPages - 1 }, (_item, index) =>
          this.list<T>(path, { ...params, page: index + 2, limit: pageSize }),
        );

        return forkJoin(pageRequests).pipe(map((pages) => items.concat(...pages)));
      }),
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
