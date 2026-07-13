export type ComandaStatus = 'aberta' | 'finalizada';
export type ProductCategory = string;
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
  | 'dashboard'
  | 'mapa'
  | 'comandas'
  | 'mesas'
  | 'clientes'
  | 'pedidos'
  | 'caixa'
  | 'cardapio'
  | 'estoque'
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
  codigo?: string;
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
  cpf?: string;
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
  codigo?: string;
  nome: string;
  descricao: string;
  categoria: ProductCategory;
  tamanho: ProdutoTamanho;
  preco: number;
  stockQuantity: number;
  costPrice: number;
  controlaEstoque?: boolean;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProdutoCategoria {
  id: string;
  titulo: ProductCategory;
  icone: string;
  imagem?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockEntry {
  id: string;
  date: string;
  notes?: string;
  supplierName?: string;
  totalCost: number;
  items: StockEntryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockEntryItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ItemComanda {
  id: string;
  productId: string;
  nome: string;
  tamanho?: ProdutoTamanho;
  quantidade: number;
  precoUnitario: number;
  unitCost?: number;
  totalCost?: number;
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

export const defaultProductCategories: ProdutoCategoria[] = [
  { id: 'default-bebidas', titulo: 'Bebidas', icone: 'cards', imagem: 'assets/category-icons/bebidas.webp' },
  { id: 'default-sinuca', titulo: 'Sinuca', icone: 'table', imagem: 'assets/category-icons/sinuca.webp' },
  { id: 'default-petiscos', titulo: 'Petiscos', icone: 'receipt', imagem: 'assets/category-icons/petiscos.webp' },
  { id: 'default-lanches', titulo: 'Lanches', icone: 'cards', imagem: 'assets/category-icons/lanches.webp' },
  { id: 'default-drinks', titulo: 'Drinks', icone: 'bell', imagem: 'assets/category-icons/drinks.webp' },
  { id: 'default-cervejas', titulo: 'Cervejas', icone: 'register', imagem: 'assets/category-icons/cervejas.webp' },
  { id: 'default-chopp', titulo: 'Chopp', icone: 'dollar', imagem: 'assets/category-icons/chopp.webp' },
  { id: 'default-extras', titulo: 'Extras', icone: 'file', imagem: 'assets/category-icons/extras.webp' },
  { id: 'default-destilados', titulo: 'Destilados', icone: 'shield', imagem: 'assets/category-icons/destilados.webp' },
  { id: 'default-porcoes', titulo: 'Porções', icone: 'receipt', imagem: 'assets/category-icons/porcoes.webp' },
  { id: 'default-sobremesas', titulo: 'Sobremesas', icone: 'check', imagem: 'assets/category-icons/sobremesas.webp' },
];

export const productCategories: ProductCategory[] = defaultProductCategories.map((category) => category.titulo);

export const produtoTamanhos: Array<{ id: ProdutoTamanho; label: string; ordem: number }> = [
  { id: 'mini', label: 'Mini', ordem: 1 },
  { id: 'muito_pequeno', label: 'Muito pequeno', ordem: 2 },
  { id: 'pequeno', label: 'Pequeno', ordem: 3 },
  { id: 'medio', label: 'Médio', ordem: 4 },
  { id: 'grande', label: 'Grande', ordem: 5 },
];

export const telasSistema: TelaPermissaoConfig[] = [
  { tela: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { tela: 'mapa', label: 'Mapa de Comandas', path: '/mapa' },
  { tela: 'comandas', label: 'Comandas', path: '/comandas' },
  { tela: 'mesas', label: 'Mesas', path: '/mesas' },
  { tela: 'clientes', label: 'Clientes', path: '/clientes' },
  { tela: 'pedidos', label: 'Pedidos', path: '/pedidos' },
  { tela: 'caixa', label: 'Caixa', path: '/caixa' },
  { tela: 'cardapio', label: 'Cardápio / Produtos', path: '/cardapio/produtos' },
  { tela: 'estoque', label: 'Entrada de Estoque', path: '/estoque/entradas' },
  { tela: 'relatorios', label: 'Relatórios', path: '/relatorios' },
  { tela: 'configuracoes', label: 'Configurações', path: '/configuracoes/personalizacoes' },
  { tela: 'colaboradores', label: 'Colaboradores', path: '/colaboradores' },
];
