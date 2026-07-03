export type ComandaStatus = 'aberta' | 'finalizada';
export type ProductCategory = 'Lanches' | 'Bebidas' | 'Porções' | 'Sobremesas';
export type ProdutoTamanho = 'mini' | 'muito_pequeno' | 'pequeno' | 'medio' | 'grande';
export type MesaStatus = 'livre' | 'reservada' | 'inativa';
export type MapaMesaStatus = 'livre' | 'ocupada' | 'reservada' | 'inativa';

export type ComandaTipo = 'mesa' | 'avulsa';

export type PedidoStatus = 'aberto' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado';
export type PedidoPaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'outro';
export type TipoEntradaCaixa = 'comanda';
export type CaixaDateFilter = 'todas' | 'hoje' | 'ultimos_7' | 'ultimos_30';
export type StatusCaixa = 'aberto' | 'fechado';

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


export interface EnderecoCep {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

export interface EnderecoFilial {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
}

export interface Filial {
  id: string;
  nome: string;
  descricao?: string;
  endereco: EnderecoFilial;
  colaboradoresIds: string[];
  ativa: boolean;
  criadaEm: string;
  atualizadaEm?: string;
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
  tamanho?: ProdutoTamanho;
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
  cepEntrega?: string;
  enderecoEntrega: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
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

export interface EntradaCaixa {
  id: string;
  tipo: TipoEntradaCaixa;
  origemId: string;
  origemDescricao: string;
  clienteId?: string;
  clienteNome?: string;
  mesaId?: string | null;
  mesaNumero?: number | string | null;
  valor: number;
  formaPagamento?: string;
  sessaoCaixaId?: string;
  criadaEm: string;
  comandaFinalizadaEm?: string;
}

export interface SessaoCaixa {
  id: string;
  status: StatusCaixa;
  abertoEm: string;
  fechadoEm?: string;
  abertoPorId?: string;
  abertoPorNome?: string;
  fechadoPorId?: string;
  fechadoPorNome?: string;
  observacaoAbertura?: string;
  observacaoFechamento?: string;
  totalEntradas: number;
  quantidadeEntradas: number;
}

export interface Comanda {
  id: string;
  mesaId?: string;
  mesaLiberadaEm?: string;
  clienteId?: string;
  clienteNome?: string;
  clienteManual?: boolean;
  tipo?: ComandaTipo;
  status: ComandaStatus;
  paga: boolean;
  finalizadaEm?: string;
  totalFinalizado?: number;
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
  tamanho: ProdutoTamanho;
  preco: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemComanda {
  id: string;
  productId: string;
  nome: string;
  tamanho?: ProdutoTamanho;
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
  cep?: string;
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
  mesaLiberacaoPendente?: boolean;
}

export const productCategories: ProductCategory[] = ['Lanches', 'Bebidas', 'Porções', 'Sobremesas'];

export const produtoTamanhos: Array<{ id: ProdutoTamanho; label: string; ordem: number }> = [
  { id: 'mini', label: 'Mini', ordem: 1 },
  { id: 'muito_pequeno', label: 'Muito pequeno', ordem: 2 },
  { id: 'pequeno', label: 'Pequeno', ordem: 3 },
  { id: 'medio', label: 'Médio', ordem: 4 },
  { id: 'grande', label: 'Grande', ordem: 5 },
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
  { tela: 'configuracoes', label: 'Configurações', path: '/configuracoes/personalizacoes' },
  { tela: 'colaboradores', label: 'Colaboradores', path: '/colaboradores' },
];
