export type ComandaStatus = 'aberta' | 'fechada';
export type ProductCategory = 'Lanches' | 'Bebidas' | 'Porções' | 'Sobremesas';
export type MesaStatus = 'livre' | 'reservada' | 'inativa';
export type MapaMesaStatus = 'livre' | 'ocupada' | 'reservada' | 'inativa';

export type ComandaTipo = 'mesa' | 'avulsa';


export type PedidoStatus = 'aberto' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado';
export type PedidoPaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'outro';

export interface ItemPedido {
  id: string;
  productId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  codigo: string;
  clienteId?: string;
  clienteNome: string;
  telefone?: string;
  enderecoEntrega: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  observacoesEntrega?: string;
  itens: ItemPedido[];
  total: number;
  formaPagamento?: PedidoPaymentMethod;
  trocoPara?: number;
  observacoesPedido?: string;
  status: PedidoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Comanda {
  id: string;
  mesaId?: string;
  clienteId?: string;
  clienteNome?: string;
  tipo?: ComandaTipo;
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


export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  endereco?: string;
  createdAt: string;
  updatedAt: string;
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
  totalComandas: number;
}

export const productCategories: ProductCategory[] = [
  'Lanches',
  'Bebidas',
  'Porções',
  'Sobremesas',
];
