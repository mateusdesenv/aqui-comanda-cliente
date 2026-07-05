import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PrintComandaPayload {
  comandaId?: string;
  comandaNumero?: string | number;
  mesaNumero?: string | number;
  clienteNome?: string;
  clienteAvulsoNome?: string;
  openedAt?: string;
  printedAt?: string;
  items: PrintComandaItem[];
  subtotal?: number;
  total: number;
  observacoes?: string;
}

export interface PrintComandaItem {
  produtoId?: string;
  nome: string;
  quantidade: number;
  valorUnitario?: number;
  valorTotal?: number;
  observacao?: string;
  categoria?: string;
}

export interface PrintResponse {
  success: boolean;
  message: string;
  simulated?: boolean;
  printerQueue?: string;
  mode?: string;
}

@Injectable({ providedIn: 'root' })
export class PrinterComandaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.printerApiUrl.replace(/\/$/, '');

  printComanda(payload: PrintComandaPayload): Observable<PrintResponse> {
    return this.http.post<PrintResponse>(`${this.baseUrl}/api/printer/comanda`, payload);
  }
}
