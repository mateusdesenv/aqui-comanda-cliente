export type ComandaStatus = 'aberta' | 'fechada';
export type ProductCategory = 'Lanches' | 'Bebidas' | 'Porções' | 'Sobremesas';
export type MesaStatus = 'livre' | 'reservada' | 'inativa';
export type MapaMesaStatus = 'livre' | 'ocupada' | 'reservada' | 'inativa';

export type ComandaTipo = 'mesa' | 'avulsa';

export type PedidoStatus = 'aberto' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado';
export type PedidoPaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'outro';

export type NivelAcesso = 'admin' | 'colaborador';

export type TelaSistema =
  | 'mapa'
  | 'comandas'
  | 'mesas'
  | 'clientes'
  | 'pedidos'
  | 'caixa'
  | 'cardapio'
  | 'relatorios'
  | 'configuracoes'
  | 'colaboradores';

export interface PermissaoTela {
  tela: TelaSistema;
  leitura: boolean;
  escrita: boolean;
}

export interface TelaPermissaoConfig {
  tela: TelaSistema;
  label: string;
  path: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
  nivel: NivelAcesso;
  ativo: boolean;
  permissoes: PermissaoTela[];
  criadoEm: string;
  atualizadoEm?: string;
}

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
  pagamentoConfirmado: boolean;
  status: PedidoStatus;
  justificativaCancelamento?: string;
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

export const telasSistema: TelaPermissaoConfig[] = [
  { tela: 'mapa', label: 'Dashboard / Mapa', path: '/mapa' },
  { tela: 'comandas', label: 'Comandas', path: '/comandas' },
  { tela: 'mesas', label: 'Mesas', path: '/mesas' },
  { tela: 'clientes', label: 'Clientes', path: '/clientes' },
  { tela: 'pedidos', label: 'Pedidos', path: '/pedidos' },
  { tela: 'caixa', label: 'Caixa', path: '/caixa' },
  { tela: 'cardapio', label: 'Cardápio / Produtos', path: '/cardapio' },
  { tela: 'relatorios', label: 'Relatórios', path: '/relatorios' },
  { tela: 'configuracoes', label: 'Configurações', path: '/configuracoes' },
  { tela: 'colaboradores', label: 'Colaboradores', path: '/colaboradores' },
];
