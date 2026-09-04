export type Role = 'PROGRAMADOR' | 'OPERADOR' | 'ESCRITORIO' | 'ESTOQUE' | 'FINANCEIRO';

export type FioTipo = 
  | 'ALGODAO'
  | 'POLIESTER'
  | 'MONOFILAMENTO'
  | 'ETIQUETA TORCAO_S'
  | 'ETIQUETA TORCAO_Z'
  | 'NYLON'
  | 'ELASTANO';

export type MachineCode = 'MAQUINA 1' | 'MAQUINA 2' | 'MAQUINA 3' | 'MAQUINA 4';

export interface DeviceConfig {
  type: 'PROGRAMADOR' | 'MAQUINA';
  machineId?: string;
  isBound: boolean;
}

export interface User {
  role: Role;
  machine?: string;
}

export interface FioCliente {
  id: string;
  clienteId: string;
  tipoFio: FioTipo;
  tituloFio: string; // ex. 75/36
  cor: string;
  observacao: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cliente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ie: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
  contato: string;
  telefone: string;
  email: string;
  observacoesComerciais: string;
  valorCobrado: number;
  tipoCobranca: 'ROLO' | 'METRO';
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
  updatedAt: string;
}

export interface Especificacao {
  id: string;
  clienteId: string;
  fioClienteId: string;
  tipoFio: FioTipo;
  tituloFio: string;
  totalFios: number;
  faca: number;
  avanco: number;
  pente: number;
  abertura: number;
  largura: number;
  isDesenho: boolean;
  composicao: { fio: string; quantidade: number }[];
  specKey: string; // CLIENTE_ID|TITULO_FIO|TOTAL_FIOS
  createdAt: string;
  updatedAt: string;
}

export interface OP {
  id: string;
  codigo: string;
  clienteId: string;
  tipoFio: FioTipo;
  tituloFio: string;
  totalFios: number;
  especificacaoId: string;
  maquina: MachineCode;
  urgencia: 'BAIXA' | 'MEDIA' | 'ALTA';
  rolete: string;
  qtdRolos: number;
  unidadeProducao: 'METROS' | 'VOLTAS';
  metros?: number;
  voltas?: number;
  // Snapshot da especificação
  faca: number;
  avanco: number;
  pente: number;
  abertura: number;
  largura: number;
  isDesenho: boolean;
  composicao: { fio: string; quantidade: number }[];
  gramatura: number;
  pesoEstimadoKg: number;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'PARADA';
  createdAt: string;
  updatedAt: string;
  fim?: string;
}

export interface Rolo {
  id: string;
  opId: string;
  sequencia: number;
  numeroRolo: string | number;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'PARADO';
  portadasTotal: number;
  pesoEstimadoKg: number;
  pesoRealKg?: number;
  iniciadoEm?: string;
  finalizadoEm?: string;
  createdAt: string;
  updatedAt: string;
  operadores: { operadorId: string; portadas: number; data?: string }[];
  faltaRoleteTempo: number; // em minutos
  faltaRoleteInicio?: string;
}

export interface Operador {
  id: string;
  nome: string;
  maquinasAutorizadas: MachineCode[];
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
  updatedAt: string;
}

export type EventoTipo = 
  | 'INICIO_PRODUCAO'
  | 'TROCA_OPERADOR'
  | 'FALTA_ROLETE'
  | 'RETOMADA_PRODUCAO'
  | 'TIRAR_ROLO'
  | 'FINALIZAR_ROLO';

export interface EventoProducao {
  id: string;
  opId: string;
  roloId: string;
  operadorId: string;
  machineCode: MachineCode;
  tipoEvento: EventoTipo;
  portadasNoEvento: number;
  timestampInicio: string;
  timestampFim?: string;
  duracaoSegundos?: number;
  observacao?: string;
  createdAt: string;
}

export interface Entrada {
  id: string;
  clienteId: string;
  tipoLancamento: 'CAIXAS' | 'ROLETES';
  tipoFio: FioTipo;
  tituloFio: string;
  nfNumero: string;
  dataLancamento: string;
  quantidade: number;
  pesoBruto: number;
  pesoLiquido: number;
  observacao?: string;
  isRetroativo: boolean;
  createdAt: string;
}

export interface Saida {
  id: string;
  clienteId: string;
  tipoLancamento: 'CAIXAS' | 'ROLETES';
  opId?: string;
  roloId?: string;
  tipoFio: FioTipo;
  tituloFio: string;
  nfNumero: string;
  dataLancamento: string;
  quantidade: number;
  pesoLiquido: number;
  valorCobrado: number;
  isRetroativo: boolean;
  createdAt: string;
  observacao?: string;
  // Para Rolos
  metros?: number;
  voltas?: number;
}

export interface MovimentoRolete {
  id: string;
  clienteId: string;
  tipoMovimento: 'RECEBIMENTO' | 'USO' | 'DEVOLUCAO';
  quantidade: number;
  dataMovimento: string;
  observacao?: string;
  createdAt: string;
}
