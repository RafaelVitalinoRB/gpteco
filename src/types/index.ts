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
  // Planejamento Operacional
  fiosPorPortada?: number;
  portadasPrevistas?: number;
  observacoesProducao?: string;
  maquinaPreparacao?: string;
  quantidade_planejada?: number;
  quantidade_produzida?: number;
  quantidade_pendente?: number;
  // Inteligência de Matéria-Prima & Simulação (Sprint 3.4)
  loteMateriaPrimaId?: string;
  loteNumero?: string;
  reservaTecnicaPercentual?: number;
  pesoDisponivelMateriaPrimaKg?: number;
  pesoUtilizavelKg?: number;
  pesoMedioConeKg?: number;
  totalConesDisponiveis?: number;
  metragemMaximaEstimada?: number;
  rolosCompletosEstimados?: number;
  saldoPrevistoKg?: number;
  status: 'PENDENTE' | 'PREPARANDO' | 'EM_ANDAMENTO' | 'AGUARDANDO_PESAGEM' | 'FINALIZADA' | 'PARADA' | 'CANCELADA';
  createdAt: string;
  updatedAt: string;
  fim?: string;
}

export interface Embalagem {
  id: string;
  nome: string;
  conesPadrao: number;
  ativa: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

export type ClassificacaoMateriaPrima = 
  | 'MATERIAL_NOVO' 
  | 'SALDO_CLIENTE' 
  | 'RETORNO_PRODUCAO' 
  | 'OUTRO';

export interface LoteMateriaPrima {
  id: string;
  entradaId?: string;
  numeroNf: string;
  dataEntrada: string;
  clienteId: string | number;
  clienteNome: string;
  fioId?: string | number;
  fioNome: string;
  tipo?: string;
  cor: string;
  lote: string;
  tipoEmbalagem: string;
  quantidadeEmbalagens: number;
  conesPorEmbalagem: number;
  totalCones: number;
  pesoLiquido: number;
  pesoDisponivelKg: number;
  pesoMedioConeKg: number;
  classificacao: ClassificacaoMateriaPrima;
  criadoEm: string;
  atualizadoEm: string;
}

export type RoloStatus = 
  | 'PENDENTE' 
  | 'EM_PRODUCAO'
  | 'AGUARDANDO_REVISAO'
  | 'RETIRADA_EM_ANDAMENTO'
  | 'AGUARDANDO_PESAGEM'
  | 'EM_CONFERENCIA_ESCRITORIO'
  | 'PESADO'
  | 'EM_ESTOQUE'
  | 'ROMANEADO'
  | 'EXPEDIDO'
  | 'PENDENTE_FATURAMENTO'
  | 'LIBERADO_FINANCEIRO'
  | 'FATURADO'
  | 'CANCELADO'
  | 'EM_ANDAMENTO' 
  | 'FINALIZADO' 
  | 'PARADO';

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  logotipo: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  celular: string;
  email: string;
  site?: string;
  atualizadoEm?: string;
}

export interface Rolo {
  id: string;
  opId: string;
  sequencia: number;
  numeroRolo: string | number;
  status: RoloStatus;
  portadasTotal: number;
  pesoEstimadoKg: number;
  pesoRealKg?: number;
  pesoBrutoKg?: number;
  taraKg?: number;
  iniciadoEm?: string;
  finalizadoEm?: string;
  createdAt: string;
  updatedAt: string;
  operadores: { operadorId: string; portadas: number; data?: string }[];
  faltaRoleteTempo: number; // em minutos
  faltaRoleteInicio?: string;
  opCodigo?: string;
  clienteNome?: string;
  maquina?: string;
  operadorNome?: string;
  observacoes?: string;
}

export type FaseOcorrencia = 'PRODUCAO' | 'RETIRADA';

export interface RoloOcorrencia {
  id?: string;
  rolo_id?: string | number;
  numero_rolo: string;
  fase_ocorrencia: FaseOcorrencia;
  ocorrencia: string;
  portada?: number;
  horario?: string;
  operador_id?: string;
  operador_nome?: string;
  criado_em?: string;
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
  | 'PRODUCAO_INICIADA'
  | 'PRODUCAO_CONCLUIDA'
  | 'REVISAO_REALIZADA'
  | 'RETIRADA_INICIADA'
  | 'RETIRADA_CONCLUIDA'
  | 'AGUARDANDO_PESAGEM'
  | 'OCORRENCIA_PRODUCAO'
  | 'OCORRENCIA_RETIRADA'
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
