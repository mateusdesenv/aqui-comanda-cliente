import { Injectable } from '@angular/core';
import { EnderecoCep } from '../models/app-data';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  formatCep(value: string): string {
    const digits = this.getCepDigits(value).slice(0, 8);

    if (digits.length <= 5) {
      return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  getCepDigits(value: string): string {
    return (value ?? '').replace(/\D/g, '');
  }

  isCepComplete(value: string): boolean {
    return this.getCepDigits(value).length === 8;
  }

  async buscarCep(value: string): Promise<EnderecoCep> {
    const digits = this.getCepDigits(value);

    if (digits.length !== 8) {
      throw new Error('CEP inválido.');
    }

    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);

    if (!response.ok) {
      throw new Error('Não foi possível buscar o endereço agora.');
    }

    const data = (await response.json()) as ViaCepResponse;

    if (data.erro) {
      throw new Error('CEP não encontrado. Preencha o endereço manualmente.');
    }

    return {
      cep: this.formatCep(data.cep ?? digits),
      rua: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      estado: data.uf ?? '',
      complemento: data.complemento || undefined,
    };
  }
}
