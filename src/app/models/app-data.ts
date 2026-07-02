export type ComandaStatus = 'aberta' | 'fechada';
export type ProductCategory = 'Lanches' | 'Bebidas' | 'Porções' | 'Sobremesas';
export type MesaStatus = 'livre' | 'reservada' | 'inativa';
export type MapaMesaStatus = 'livre' | 'ocupada' | 'reservada' | 'inativa';

export interface Comanda {
  id: string;
  mesaId: string;
  status: ComandaStatus;
  itens: ItemComanda[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumoComandas {
  livres: number;
  ocupadas: number;
  totalEmConsumo: number;
  totalMesas: number;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  categoria: ProductCategory;
  preco: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemComanda {
  id: string;
  productId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Mesa {
  id: string;
  numero: number;
  nome?: string;
  status: MesaStatus;
  capacidade?: number;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapaMesaCard {
  mesa: Mesa;
  status: MapaMesaStatus;
  total: number;
}

export const productCategories: ProductCategory[] = [
  'Lanches',
  'Bebidas',
  'Porções',
  'Sobremesas',
];
