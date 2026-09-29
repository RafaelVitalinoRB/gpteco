import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export type TipoLayout = 
  | 'LAYOUT_TECELAGEM' 
  | 'LAYOUT_REMESSA_INDUSTRIAL' 
  | 'LAYOUT_ENTRADA_MP' 
  | 'LAYOUT_UNIVERSAL'
  | 'LAYOUT_DESCONHECIDO'
  // Compatibilidade retroativa
  | 'ALAMO' 
  | 'BAT' 
  | 'RB_SOUZA';

export type StatusImportacao = 'Lida' | 'Homologada' | 'Importada' | 'Cancelada';

export interface InconsistenciaItem {
  tipo: 
    | 'CLIENTE_NAO_ENCONTRADO' 
    | 'FIO_NAO_ENCONTRADO' 
    | 'NF_AUSENTE' 
    | 'DATA_INVALIDA' 
    | 'CAIXAS_INVALIDAS' 
    | 'PESO_INVALIDO' 
    | 'COR_AUSENTE' 
    | 'DUPLICIDADE'
    | 'AVISO';
  mensagem: string;
  impeditivo: boolean; // se true: erro impeditivo (Inconsistência); se false: pendência de cadastro (Pendente)
  acaoSugerida?: string;
}

export type StatusRegistro = 'VALIDO' | 'PENDENTE' | 'INCONSISTENTE' | 'ALERTA' | 'ERRO';

export interface RegistroPlanilhaLido {
  linhaOriginal: number;
  clienteNome: string;
  clienteId?: number | string | null;
  clienteValido: boolean;
  numeroNf: string;
  data: string;
  dataOriginal: string;
  fio: string;
  fioId?: number | string | null;
  fioTitulo?: string;
  fioTipo?: string;
  tipoFio?: string;
  cor: string;
  fioValido: boolean;
  fioAprendido?: boolean;
  quantidadeCaixas: number;
  pesoKg: number;
  lote?: string;
  observacao?: string;
  status: 'VALIDO' | 'PENDENTE' | 'INCONSISTENTE';
  acaoSugerida: string;
  inconsistencias: InconsistenciaItem[];
}

export interface DetalhesConfiabilidade {
  layoutPts: number;
  colunasPts: number;
  clientePts: number;
  fiosPts: number;
  inconsistenciasPts: number;
  total: number;
  nivel: 'EXCELENTE' | 'BOM' | 'MODERADO' | 'BAIXO';
  descricao: string;
}

export interface RegraAprendizado {
  id: string;
  tipo: 'FIO' | 'CLIENTE';
  de: string; // termo lido na planilha (ex: '15048' ou 'ALAMO LTDA')
  para: string; // termo canônico associado (ex: '150/48' ou 'ALAMO')
  fioId?: number | string | null;
  fioTipo?: string;
  clienteId?: number | string | null;
  criadoEm: string;
  vezesUsado: number;
}

export interface ItemFilaImportacao {
  id: string;
  nomeArquivo: string;
  clienteNome: string;
  layoutDetectado: TipoLayout;
  layoutNome: string;
  totalRegistros: number;
  totalCaixas: number;
  totalPesoKg: number;
  indiceConfiabilidade: number;
  status: StatusImportacao;
  dataLeitura: string;
  observacoes?: string;
  resultadoOriginal?: ResultadoLeituraPlanilha;
}

export interface ResultadoLeituraPlanilha {
  id: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  formato: 'XLSX' | 'XLS' | 'CSV';
  layoutDetectado: TipoLayout;
  layoutNome: string;
  layoutConfianca: number; // 0 - 100%
  layoutDesconhecido?: boolean;
  indiceConfiabilidade: number; // 0 - 100%
  detalhesConfiabilidade: DetalhesConfiabilidade;
  clienteGeralIdentificado: string;
  clienteGeralId?: number | null;
  totalLinhasLidas: number;
  totalValidos: number;
  totalPendentes: number;
  totalComInconsistencias: number;
  totalNovosFios: number;
  totalCaixas: number;
  totalPesoKg: number;
  observacoesImportacao?: string;
  registros: RegistroPlanilhaLido[];
  lidoEm: string;
  resumoInconsistencias: {
    clientesNaoEncontrados: number;
    fiosNaoEncontrados: number;
    dadosIncompletos: number;
  };
}

export interface HistoricoImportacao {
  id: string;
  nomeArquivo: string;
  layoutDetectado: TipoLayout;
  layoutNome: string;
  clienteNome: string;
  dataHora: string;
  totalLinhas: number;
  totalValidos: number;
  totalPendentes?: number;
  totalInconsistencias: number;
  totalNovosFios?: number;
  totalCaixas: number;
  totalPesoKg: number;
  indiceConfiabilidade?: number;
  observacoesImportacao?: string;
  status: StatusImportacao;
  usuario: string;
  resultadoCompleto?: ResultadoLeituraPlanilha;
}

export interface DiagnosticoComparacaoSistema {
  totalLinhasAnalisadas: number;
  // Clientes
  clientesIdentificados: {
    nome: string;
    cadastrado: boolean;
    id?: number | string;
    cnpj?: string;
  }[];
  // Fios
  fiosIdentificados: {
    termoLido: string;
    catalogado: boolean;
    id?: number | string;
    titulo?: string;
    tipo?: string;
  }[];
  novosFiosContagem: number;
  // Duplicidades internas
  duplicidadesInternas: {
    nf: string;
    fio: string;
    cor: string;
    linhas: number[];
  }[];
  // Registros já no sistema
  registrosExistentesNoSistema: {
    nf: string;
    fio?: string;
    data?: string;
    clienteNome?: string;
  }[];
  diagnosticoGeral: 'PRONTO_PARA_IMPORTAR' | 'REQUER_ATENCAO' | 'COM_IMPEDIMENTOS';
}

const STORAGE_HISTORICO_KEY = 'texlog_importacoes_historico_v1';
const STORAGE_APRENDIZADO_KEY = 'texlog_aprendizado_regras_v1';
const STORAGE_FILA_KEY = 'texlog_fila_importacao_v1';

// ==========================================
// Aprendizado do Leitor (Associações Memorizadas)
// ==========================================

export function getRegrasAprendizado(): RegraAprendizado[] {
  try {
    const raw = localStorage.getItem(STORAGE_APRENDIZADO_KEY);
    if (!raw) {
      // Regras pré-cadastradas para o ambiente inicial de exemplo
      const regrasIniciais: RegraAprendizado[] = [
        {
          id: 'reg_15048',
          tipo: 'FIO',
          de: '15048',
          para: '150/48',
          fioId: 37,
          fioTipo: 'Poliéster',
          criadoEm: new Date().toISOString(),
          vezesUsado: 12
        },
        {
          id: 'reg_16748',
          tipo: 'FIO',
          de: '16748',
          para: '167/48',
          fioId: 42,
          fioTipo: 'Poliéster',
          criadoEm: new Date().toISOString(),
          vezesUsado: 8
        },
        {
          id: 'reg_alamo_ind',
          tipo: 'CLIENTE',
          de: 'ALAMO IND',
          para: 'ALAMO',
          criadoEm: new Date().toISOString(),
          vezesUsado: 5
        }
      ];
      localStorage.setItem(STORAGE_APRENDIZADO_KEY, JSON.stringify(regrasIniciais));
      return regrasIniciais;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler regras de aprendizado:', err);
    return [];
  }
}

export function salvarRegraAprendizado(
  dados: Omit<RegraAprendizado, 'id' | 'criadoEm' | 'vezesUsado'>
): RegraAprendizado {
  const regras = getRegrasAprendizado();
  const normDe = normalizar(dados.de);
  
  // Atualiza se já existir para o mesmo termo e tipo
  const existenteIndex = regras.findIndex(
    r => r.tipo === dados.tipo && normalizar(r.de) === normDe
  );

  const novaRegra: RegraAprendizado = {
    id: existenteIndex >= 0 ? regras[existenteIndex].id : `reg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    tipo: dados.tipo,
    de: dados.de.trim(),
    para: dados.para.trim(),
    fioId: dados.fioId,
    fioTipo: dados.fioTipo,
    clienteId: dados.clienteId,
    criadoEm: new Date().toISOString(),
    vezesUsado: existenteIndex >= 0 ? regras[existenteIndex].vezesUsado + 1 : 1
  };

  if (existenteIndex >= 0) {
    regras[existenteIndex] = novaRegra;
  } else {
    regras.unshift(novaRegra);
  }

  localStorage.setItem(STORAGE_APRENDIZADO_KEY, JSON.stringify(regras));
  window.dispatchEvent(new CustomEvent('texlog_aprendizado_atualizado', { detail: novaRegra }));
  return novaRegra;
}

export function removerRegraAprendizado(id: string): void {
  const regras = getRegrasAprendizado().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_APRENDIZADO_KEY, JSON.stringify(regras));
  window.dispatchEvent(new CustomEvent('texlog_aprendizado_atualizado', { detail: { removidoId: id } }));
}

export function buscarRegraAprendizado(termo: string, tipo: 'FIO' | 'CLIENTE'): RegraAprendizado | undefined {
  if (!termo) return undefined;
  const regras = getRegrasAprendizado();
  const norm = normalizar(termo);

  return regras.find(r => {
    if (r.tipo !== tipo) return false;
    const rDe = normalizar(r.de);
    return rDe === norm || norm.includes(rDe) || rDe.includes(norm);
  });
}

// ==========================================
// Fila de Importação (Visual / Preparatória)
// ==========================================

export function getFilaImportacao(): ItemFilaImportacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_FILA_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler fila de importação:', err);
    return [];
  }
}

export function salvarItemFilaImportacao(
  item: Omit<ItemFilaImportacao, 'id'> & { id?: string }
): ItemFilaImportacao {
  const fila = getFilaImportacao();
  const novoItem: ItemFilaImportacao = {
    ...item,
    id: item.id || `fila_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  };

  const index = fila.findIndex(f => f.id === novoItem.id || f.nomeArquivo === novoItem.nomeArquivo);
  if (index >= 0) {
    fila[index] = novoItem;
  } else {
    fila.unshift(novoItem);
  }

  localStorage.setItem(STORAGE_FILA_KEY, JSON.stringify(fila));
  window.dispatchEvent(new CustomEvent('texlog_fila_atualizada', { detail: novoItem }));
  return novoItem;
}

export function atualizarStatusFila(id: string, status: StatusImportacao): void {
  const fila = getFilaImportacao();
  const item = fila.find(f => f.id === id);
  if (item) {
    item.status = status;
    localStorage.setItem(STORAGE_FILA_KEY, JSON.stringify(fila));
    window.dispatchEvent(new CustomEvent('texlog_fila_atualizada', { detail: item }));
  }
}

export function removerItemFila(id: string): void {
  const fila = getFilaImportacao().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_FILA_KEY, JSON.stringify(fila));
  window.dispatchEvent(new CustomEvent('texlog_fila_atualizada', { detail: { id, removido: true } }));
}

// ==========================================
// Cálculo do Índice de Confiabilidade (0 - 100%)
// ==========================================

export function calcularIndiceConfiabilidade(params: {
  layoutDetectado: TipoLayout;
  layoutConfianca: number;
  colunasEncontradas: { nf: boolean; caixas: boolean; peso: boolean; fio: boolean };
  clienteIdentificado: boolean;
  clienteCadastrado: boolean;
  totalLinhas: number;
  totalFiosValidos: number;
  totalInconsistenciasImpeditivas: number;
}): { indice: number; detalhes: DetalhesConfiabilidade } {
  const {
    layoutDetectado,
    layoutConfianca,
    colunasEncontradas,
    clienteIdentificado,
    clienteCadastrado,
    totalLinhas,
    totalFiosValidos,
    totalInconsistenciasImpeditivas
  } = params;

  // 1. Reconhecimento do Layout (até 25 pontos)
  let layoutPts = 0;
  if (layoutDetectado === 'LAYOUT_DESCONHECIDO') {
    layoutPts = 8;
  } else if (layoutDetectado === 'LAYOUT_UNIVERSAL') {
    layoutPts = 18;
  } else {
    // Layout específico reconhecido com alta correspondência
    layoutPts = Math.min(25, Math.round((layoutConfianca / 100) * 25));
  }

  // 2. Reconhecimento das Colunas Essenciais (até 20 pontos, 5 pts por coluna)
  let colunasPts = 0;
  if (colunasEncontradas.nf) colunasPts += 5;
  if (colunasEncontradas.caixas) colunasPts += 5;
  if (colunasEncontradas.peso) colunasPts += 5;
  if (colunasEncontradas.fio) colunasPts += 5;

  // 3. Identificação do Cliente (até 20 pontos)
  let clientePts = 0;
  if (clienteCadastrado) {
    clientePts = 20;
  } else if (clienteIdentificado) {
    clientePts = 12; // localizado na planilha, mas ainda não cadastrado no banco
  } else {
    clientePts = 2;
  }

  // 4. Validação dos Fios (até 25 pontos)
  let fiosPts = 0;
  if (totalLinhas > 0) {
    const proporcaoFios = totalFiosValidos / totalLinhas;
    fiosPts = Math.round(proporcaoFios * 25);
  } else {
    fiosPts = 15;
  }

  // 5. Inconsistências Encontradas (até 10 pontos)
  let inconsistenciasPts = 0;
  if (totalLinhas > 0) {
    const taxaErros = totalInconsistenciasImpeditivas / totalLinhas;
    if (taxaErros === 0) {
      inconsistenciasPts = 10;
    } else if (taxaErros <= 0.05) {
      inconsistenciasPts = 7;
    } else if (taxaErros <= 0.20) {
      inconsistenciasPts = 4;
    } else {
      inconsistenciasPts = 0;
    }
  } else {
    inconsistenciasPts = 10;
  }

  const total = Math.max(10, Math.min(100, layoutPts + colunasPts + clientePts + fiosPts + inconsistenciasPts));

  let nivel: 'EXCELENTE' | 'BOM' | 'MODERADO' | 'BAIXO' = 'EXCELENTE';
  let descricao = 'Alta precisão: layout e dados perfeitamente mapeados.';

  if (total >= 90) {
    nivel = 'EXCELENTE';
    descricao = 'Alta confiabilidade: estrutura conhecida e dados consistentes.';
  } else if (total >= 75) {
    nivel = 'BOM';
    descricao = 'Boa confiabilidade: alguns fios ou cadastros necessitam homologação.';
  } else if (total >= 55) {
    nivel = 'MODERADO';
    descricao = 'Confiabilidade moderada: pendências cadastrais identificadas.';
  } else {
    nivel = 'BAIXO';
    descricao = 'Baixa confiabilidade: layout desconhecido ou divergências estruturais.';
  }

  return {
    indice: total,
    detalhes: {
      layoutPts,
      colunasPts,
      clientePts,
      fiosPts,
      inconsistenciasPts,
      total,
      nivel,
      descricao
    }
  };
}

// Normaliza texto para comparações insensíveis a acentos e maiúsculas
export function normalizar(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// Converte formatos variados de datas do Excel/CSV para YYYY-MM-DD
export function formatarDataExcel(valor: any): { dataIso: string; dataFormatada: string } {
  if (!valor) {
    const hoje = new Date().toISOString().split('T')[0];
    return { dataIso: hoje, dataFormatada: hoje };
  }

  // 1. Se for número de série de data do Excel (ex: 45321)
  if (typeof valor === 'number' && valor > 20000 && valor < 80000) {
    const dateObj = new Date(Math.round((valor - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      const iso = dateObj.toISOString().split('T')[0];
      const dia = String(dateObj.getDate()).padStart(2, '0');
      const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
      const ano = dateObj.getFullYear();
      return { dataIso: iso, dataFormatada: `${dia}/${mes}/${ano}` };
    }
  }

  const str = String(valor).trim();

  // 2. Se já for DD/MM/AAAA ou DD-MM-AAAA
  const brMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (brMatch) {
    const dia = brMatch[1].padStart(2, '0');
    const mes = brMatch[2].padStart(2, '0');
    let ano = brMatch[3];
    if (ano.length === 2) ano = '20' + ano;
    const iso = `${ano}-${mes}-${dia}`;
    return { dataIso: iso, dataFormatada: `${dia}/${mes}/${ano}` };
  }

  // 3. Se for AAAA-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const ano = isoMatch[1];
    const mes = isoMatch[2].padStart(2, '0');
    const dia = isoMatch[3].padStart(2, '0');
    return { dataIso: `${ano}-${mes}-${dia}`, dataFormatada: `${dia}/${mes}/${ano}` };
  }

  // Fallback padrão
  const fallback = new Date().toISOString().split('T')[0];
  return { dataIso: fallback, dataFormatada: str };
}

// Limpa e converte valores numéricos (moeda, separadores de milhar, etc.)
export function parseNumero(valor: any): number {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;

  let str = String(valor).trim();
  str = str.replace(/[R$\s]/g, '');

  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Lê e analisa a planilha detectando primeiramente o Layout estrutural e,
 * de forma desacoplada, o Cliente identificado.
 */
export async function analisarPlanilha(
  file: File | ArrayBuffer,
  nomeArquivo: string
): Promise<ResultadoLeituraPlanilha> {
  let arrayBuffer: ArrayBuffer;
  let tamanhoBytes = 0;

  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
    tamanhoBytes = file.size;
  } else {
    arrayBuffer = file;
    tamanhoBytes = arrayBuffer.byteLength;
  }

  const extMatch = nomeArquivo.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';
  const formato: 'XLSX' | 'XLS' | 'CSV' = ext === 'csv' ? 'CSV' : ext === 'xls' ? 'XLS' : 'XLSX';

  // 1. Carregar Workbook via SheetJS
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('O arquivo não contém nenhuma planilha legível.');
  }

  const sheetName = sheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  // 2. Carregar cadastros do Supabase para validação cruzada
  const [clientesDbRes, titulosDbRes] = await Promise.all([
    supabase.from('clientes').select('id, nome, razao_social, nome_fantasia, cnpj'),
    supabase.from('titulos_fio').select('id, cliente_id, titulo, tipo, cor')
  ]);

  const clientesDb = clientesDbRes.data || [];
  const titulosDb = titulosDbRes.data || [];

  // 3. Algoritmo Desacoplado: 1º Detecta Layout Estrutural, 2º Identifica Cliente
  const {
    layoutDetectado,
    layoutNome,
    layoutConfianca,
    clientePadraoIdentificado,
    headerRowIndex,
    mapeamentoColunas
  } = detectarLayoutECliente(rows, sheetName, nomeArquivo, clientesDb);

  // 4. Ler e Processar Cada Linha de Dados
  const registros: RegistroPlanilhaLido[] = [];
  let totalCaixas = 0;
  let totalPesoKg = 0;
  let countClientesNaoEncontrados = 0;
  let countFiosNaoEncontrados = 0;
  let countDadosIncompletos = 0;
  let totalFiosValidos = 0;
  let totalImpeditivos = 0;
  const fiosNovosSet = new Set<string>();

  for (let rIndex = headerRowIndex + 1; rIndex < rows.length; rIndex++) {
    const row = rows[rIndex];
    if (!row || row.length === 0) continue;

    const textoLinha = row.map(c => String(c).trim()).join(' ').toUpperCase();
    if (!textoLinha || textoLinha.replace(/\s+/g, '').length === 0) continue;
    if (textoLinha.startsWith('TOTAL') || textoLinha.startsWith('SOMA') || textoLinha.includes('TOTAL GERAL')) {
      continue;
    }

    const col = (key: string) => {
      const idx = mapeamentoColunas[key];
      return idx !== undefined && idx !== -1 ? row[idx] : '';
    };

    let rawCliente = col('cliente') || clientePadraoIdentificado || '';
    let rawNf = String(col('nf') || '').trim();
    let rawData = col('data');
    let rawFio = String(col('fio') || '').trim();
    let rawTipo = String(col('tipo') || '').trim();
    let rawCor = String(col('cor') || '').trim();
    let rawCaixas = col('caixas');
    let rawPeso = col('peso');
    let rawLote = String(col('lote') || '').trim();
    let rawObs = String(col('observacao') || '').trim();

    if (!rawNf && !rawFio && !rawCaixas && !rawPeso) continue;

    const { dataIso, dataFormatada } = formatarDataExcel(rawData);
    const caixas = Math.round(parseNumero(rawCaixas));
    const pesoKg = parseNumero(rawPeso);

    const inconsistencias: InconsistenciaItem[] = [];

    // --- Verificação de Aprendizado do Leitor (Cliente Memorizado) ---
    const regraClienteAprendido = buscarRegraAprendizado(rawCliente, 'CLIENTE');
    if (regraClienteAprendido) {
      rawCliente = regraClienteAprendido.para;
    }

    // --- Validação 1: Cliente ---
    let clienteId: number | string | null = null;
    let clienteValido = false;
    let clienteNomeFinal = rawCliente;

    if (rawCliente) {
      const normClienteBusca = normalizar(rawCliente);
      const clienteMatch = clientesDb.find(c => {
        const nNome = normalizar(c.nome);
        const nRazao = normalizar(c.razao_social);
        const nFantasia = normalizar(c.nome_fantasia);
        return (
          (nNome && (nNome === normClienteBusca || normClienteBusca.includes(nNome) || nNome.includes(normClienteBusca))) ||
          (nRazao && (nRazao === normClienteBusca || normClienteBusca.includes(nRazao) || nRazao.includes(normClienteBusca))) ||
          (nFantasia && (nFantasia === normClienteBusca || normClienteBusca.includes(nFantasia) || nFantasia.includes(normClienteBusca)))
        );
      });

      if (clienteMatch) {
        clienteId = clienteMatch.id;
        clienteValido = true;
        clienteNomeFinal = clienteMatch.nome_fantasia || clienteMatch.razao_social || clienteMatch.nome;
      } else {
        inconsistencias.push({
          tipo: 'CLIENTE_NAO_ENCONTRADO',
          mensagem: `Cliente "${rawCliente}" não cadastrado no Supabase`,
          impeditivo: false, // pendência cadastral, não impeditivo fatal
          acaoSugerida: 'Criar novo cadastro de cliente.'
        });
        countClientesNaoEncontrados++;
      }
    } else {
      inconsistencias.push({
        tipo: 'CLIENTE_NAO_ENCONTRADO',
        mensagem: 'Nome do cliente não identificado',
        impeditivo: false,
        acaoSugerida: 'Criar novo cadastro de cliente.'
      });
      countClientesNaoEncontrados++;
    }

    // --- Verificação de Aprendizado do Leitor (Fio Memorizado) ---
    let fioId: number | string | null = null;
    let fioTitulo: string | undefined = undefined;
    let fioTipo: string | undefined = undefined;
    let fioValido = false;
    let fioAprendido = false;

    const regraFioAprendido = buscarRegraAprendizado(rawFio, 'FIO');
    if (regraFioAprendido) {
      fioAprendido = true;
      fioValido = true;
      fioTitulo = regraFioAprendido.para;
      fioId = regraFioAprendido.fioId || 37;
      fioTipo = regraFioAprendido.fioTipo || rawTipo || 'Poliéster';
      totalFiosValidos++;
    }

    // --- Validação 2: Fio / Título no banco ---
    if (!rawFio) {
      inconsistencias.push({
        tipo: 'FIO_NAO_ENCONTRADO',
        mensagem: 'Fio/Título não informado',
        impeditivo: true,
        acaoSugerida: 'Revisar dados na planilha original.'
      });
      countDadosIncompletos++;
      totalImpeditivos++;
    } else if (!fioAprendido) {
      const normFioBusca = normalizar(rawFio);
      const fioMatch = titulosDb.find(f => {
        const nTitulo = normalizar(f.titulo);
        const matchTitulo = nTitulo && (normFioBusca.includes(nTitulo) || nTitulo.includes(normFioBusca));
        if (clienteId && f.cliente_id && String(f.cliente_id) === String(clienteId)) {
          return matchTitulo;
        }
        return matchTitulo;
      });

      if (fioMatch) {
        fioId = fioMatch.id;
        fioTitulo = fioMatch.titulo;
        fioTipo = fioMatch.tipo || rawTipo || 'Poliéster';
        fioValido = true;
        totalFiosValidos++;
        if (!rawTipo && fioMatch.tipo) rawTipo = fioMatch.tipo;
      } else {
        // Tentar inferir tipo se presente no texto (ex: 150/48 - Poliéster)
        if (rawFio.toUpperCase().includes('POLI')) rawTipo = rawTipo || 'Poliéster';
        else if (rawFio.toUpperCase().includes('ALGOD')) rawTipo = rawTipo || 'Algodão';
        else if (rawFio.toUpperCase().includes('POLIAM') || rawFio.toUpperCase().includes('NYLON')) rawTipo = rawTipo || 'Poliamida';

        inconsistencias.push({
          tipo: 'FIO_NAO_ENCONTRADO',
          mensagem: `Fio "${rawFio}" novo (não catalogado em titulos_fio)`,
          impeditivo: false, // Novo fio é pendência técnica, não erro fatal impeditivo
          acaoSugerida: 'Criar cadastro técnico de fio.'
        });
        countFiosNaoEncontrados++;
        fiosNovosSet.add(rawFio);
      }
    }

    // --- Validação 3: Nota Fiscal ---
    if (!rawNf) {
      inconsistencias.push({
        tipo: 'NF_AUSENTE',
        mensagem: 'Número da Nota Fiscal ausente nesta linha',
        impeditivo: true,
        acaoSugerida: 'Preencher número da NF na planilha.'
      });
      countDadosIncompletos++;
      totalImpeditivos++;
    }

    // --- Validação 4: Cor ---
    if (!rawCor) {
      inconsistencias.push({
        tipo: 'COR_AUSENTE',
        mensagem: 'Cor do fio não especificada',
        impeditivo: false,
        acaoSugerida: 'Informar cor durante a homologação.'
      });
    }

    // --- Validação 5: Caixas ---
    if (caixas <= 0) {
      inconsistencias.push({
        tipo: 'CAIXAS_INVALIDAS',
        mensagem: `Quantidade de caixas inválida (${rawCaixas || 0})`,
        impeditivo: true,
        acaoSugerida: 'Revisar dados na planilha original.'
      });
      countDadosIncompletos++;
      totalImpeditivos++;
    }

    // --- Validação 6: Peso (kg) ---
    if (pesoKg <= 0) {
      inconsistencias.push({
        tipo: 'PESO_INVALIDO',
        mensagem: `Peso líquido inválido (${rawPeso || 0} kg)`,
        impeditivo: true,
        acaoSugerida: 'Revisar dados na planilha original.'
      });
      countDadosIncompletos++;
      totalImpeditivos++;
    }

    // Determina status da linha:
    // INCONSISTENTE: erro impeditivo fatal (NF ausente, peso <= 0, caixas <= 0)
    // PENDENTE: sem erro impeditivo, mas com novo fio ou novo cliente para homologar
    // VALIDO: 100% catalogado e validado
    const temImpeditivo = inconsistencias.some(i => i.impeditivo);
    let statusLinha: 'VALIDO' | 'PENDENTE' | 'INCONSISTENTE';
    if (temImpeditivo) {
      statusLinha = 'INCONSISTENTE';
    } else if (inconsistencias.length > 0) {
      statusLinha = 'PENDENTE';
    } else {
      statusLinha = 'VALIDO';
    }

    // Determina a Ação Sugerida Geral para a Linha
    let acaoSugeridaLinha = 'Utilizar cadastro existente.';
    if (statusLinha === 'VALIDO') {
      acaoSugeridaLinha = 'Utilizar cadastro existente.';
    } else if (inconsistencias.some(i => i.tipo === 'NF_AUSENTE' || i.tipo === 'CAIXAS_INVALIDAS' || i.tipo === 'PESO_INVALIDO')) {
      acaoSugeridaLinha = 'Revisar dados na planilha original.';
    } else if (inconsistencias.some(i => i.tipo === 'FIO_NAO_ENCONTRADO')) {
      acaoSugeridaLinha = 'Criar cadastro técnico de fio.';
    } else if (inconsistencias.some(i => i.tipo === 'CLIENTE_NAO_ENCONTRADO')) {
      acaoSugeridaLinha = 'Criar novo cadastro de cliente.';
    }

    totalCaixas += caixas;
    totalPesoKg += pesoKg;

    registros.push({
      linhaOriginal: rIndex + 1,
      clienteNome: clienteNomeFinal,
      clienteId,
      clienteValido,
      numeroNf: rawNf,
      data: dataIso,
      dataOriginal: dataFormatada,
      fio: rawFio,
      fioId,
      fioTitulo: fioTitulo || rawFio,
      fioTipo: fioTipo || rawTipo || 'Poliéster',
      tipoFio: rawTipo,
      cor: rawCor.toUpperCase(),
      fioValido,
      fioAprendido,
      quantidadeCaixas: caixas,
      pesoKg,
      lote: rawLote,
      observacao: rawObs,
      status: statusLinha,
      acaoSugerida: acaoSugeridaLinha,
      inconsistencias
    });
  }

  const totalLinhasLidas = registros.length;
  const totalValidos = registros.filter(r => r.status === 'VALIDO').length;
  const totalPendentes = registros.filter(r => r.status === 'PENDENTE').length;
  const totalComInconsistencias = registros.filter(r => r.status === 'INCONSISTENTE').length;

  let clienteGeralId: number | null = null;
  if (clientePadraoIdentificado) {
    const match = clientesDb.find(c => {
      const n = normalizar(clientePadraoIdentificado);
      return (
        normalizar(c.nome) === n ||
        normalizar(c.razao_social) === n ||
        normalizar(c.nome_fantasia) === n
      );
    });
    if (match) clienteGeralId = match.id;
  }

  // Calcula o Índice de Confiabilidade considerando os 5 pilares exigidos
  const confiancaCalc = calcularIndiceConfiabilidade({
    layoutDetectado,
    layoutConfianca,
    colunasEncontradas: {
      nf: mapeamentoColunas['nf'] !== undefined && mapeamentoColunas['nf'] !== -1,
      caixas: mapeamentoColunas['caixas'] !== undefined && mapeamentoColunas['caixas'] !== -1,
      peso: mapeamentoColunas['peso'] !== undefined && mapeamentoColunas['peso'] !== -1,
      fio: mapeamentoColunas['fio'] !== undefined && mapeamentoColunas['fio'] !== -1,
    },
    clienteIdentificado: !!clientePadraoIdentificado,
    clienteCadastrado: !!clienteGeralId,
    totalLinhas: totalLinhasLidas,
    totalFiosValidos,
    totalInconsistenciasImpeditivas: totalImpeditivos
  });

  return {
    id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    nomeArquivo,
    tamanhoBytes,
    formato,
    layoutDetectado,
    layoutNome,
    layoutConfianca,
    layoutDesconhecido: layoutDetectado === 'LAYOUT_DESCONHECIDO',
    indiceConfiabilidade: confiancaCalc.indice,
    detalhesConfiabilidade: confiancaCalc.detalhes,
    clienteGeralIdentificado: clientePadraoIdentificado || (registros[0]?.clienteNome || 'Diversos'),
    clienteGeralId,
    totalLinhasLidas,
    totalValidos,
    totalPendentes,
    totalComInconsistencias,
    totalNovosFios: fiosNovosSet.size,
    totalCaixas,
    totalPesoKg: Number(totalPesoKg.toFixed(2)),
    registros,
    lidoEm: new Date().toISOString(),
    resumoInconsistencias: {
      clientesNaoEncontrados: countClientesNaoEncontrados,
      fiosNaoEncontrados: countFiosNaoEncontrados,
      dadosIncompletos: countDadosIncompletos
    }
  };
}

/**
 * Arquitetura de Reconhecimento em 2 Camadas:
 * 1ª Camada: Reconhece o LAYOUT estrutural das colunas (Tecelagem, Remessa Industrial, Entrada MP ou Padrão)
 * 2ª Camada: Identifica o CLIENTE através de cabeçalhos, títulos ou coluna dedicada.
 */
function detectarLayoutECliente(
  rows: any[][],
  sheetName: string,
  nomeArquivo: string,
  clientesDb: any[]
): {
  layoutDetectado: TipoLayout;
  layoutNome: string;
  layoutConfianca: number;
  clientePadraoIdentificado: string;
  headerRowIndex: number;
  mapeamentoColunas: Record<string, number>;
} {
  const normSheet = normalizar(sheetName);
  const normArquivo = normalizar(nomeArquivo);

  // Procura por cabeçalho nas primeiras 10 linhas
  let melhorHeaderIndex = 0;
  let melhorCorrespondencia = 0;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;

    const rowStrings = row.map(c => normalizar(c));
    const score = calcularScoreCabecalho(rowStrings);

    if (score > melhorCorrespondencia) {
      melhorCorrespondencia = score;
      melhorHeaderIndex = i;
    }
  }

  const headerRow = rows[melhorHeaderIndex] || [];
  const headerCols = headerRow.map(c => normalizar(c));

  // --- 1ª CAMADA: RECONHECIMENTO DE LAYOUT POR ESTRUTURA DE COLUNAS ---
  // Layout Tecelagem: NF, DATA, ARTIGO/FIO, COR, CAIXAS, PESO (KG), LOTE
  const temColunaArtigoOuFio = headerCols.some(c => c.includes('ARTIGO') || c.includes('FIO') || c.includes('TITULO'));
  const temColunaNf = headerCols.some(c => c.includes('NF') || c.includes('NOTA'));
  const temColunaData = headerCols.some(c => c.includes('DATA') || c.includes('EMISSAO') || c.includes('ENTRADA'));
  const temColunaPeso = headerCols.some(c => c.includes('PESO') || c.includes('KG') || c.includes('LIQUIDO'));
  const temColunaCaixa = headerCols.some(c => c.includes('CAIXA') || c.includes('CX') || c.includes('VOL') || c.includes('QTD'));
  const temColunaLote = headerCols.some(c => c.includes('LOTE'));
  const temColunaProduto = headerCols.some(c => c.includes('PRODUTO') || c.includes('DISCRIMINACAO'));
  const temColunaCliente = headerCols.some(c => c.includes('CLIENTE') || c.includes('DESTINATARIO') || c.includes('FORNECEDOR'));

  let layoutDetectado: TipoLayout = 'LAYOUT_UNIVERSAL';
  let layoutNome = 'Layout Padrão Têxtil';
  let layoutConfianca = 85;
  let mapeamentoFinal: Record<string, number> = {};

  // Se o cabeçalho não tiver quase nenhuma correspondência (score < 2) ou nome do arquivo indicar teste desconhecido
  if (melhorCorrespondencia < 2 && !temColunaArtigoOuFio && !temColunaPeso) {
    layoutDetectado = 'LAYOUT_DESCONHECIDO';
    layoutNome = 'Layout Desconhecido';
    layoutConfianca = 38;
    // Permite continuar no modo de leitura genérica/universal flexível
    mapeamentoFinal = mapearColunasUniversal(headerCols);
  }
  // Critério Layout Tecelagem (foco em Artigo/Fio + Caixas + Peso + Lote)
  else if (headerCols.some(c => c.includes('ARTIGO')) || (temColunaLote && temColunaArtigoOuFio && !temColunaCliente)) {
    layoutDetectado = 'LAYOUT_TECELAGEM';
    layoutNome = 'Layout Tecelagem';
    layoutConfianca = 96;
    mapeamentoFinal = mapearColunasTecelagem(headerCols);
  }
  // Critério Layout Remessa Industrial (foco em Nota Fiscal + Emissão + Destinatário + Produto/Fio + Qtd Caixas + Peso Líquido)
  else if (temColunaProduto && (headerCols.some(c => c.includes('EMISSAO')) || temColunaCliente)) {
    layoutDetectado = 'LAYOUT_REMESSA_INDUSTRIAL';
    layoutNome = 'Layout Remessa Industrial';
    layoutConfianca = 94;
    mapeamentoFinal = mapearColunasRemessaIndustrial(headerCols);
  }
  // Critério Layout Entrada Matéria-Prima (foco em Cliente + Data + NF + Fio/Título + Tipo + Caixas + Peso)
  else if (temColunaCliente && temColunaArtigoOuFio && (headerCols.some(c => c.includes('TIPO')) || headerCols.some(c => c.includes('OBS')))) {
    layoutDetectado = 'LAYOUT_ENTRADA_MP';
    layoutNome = 'Layout Entrada Matéria-Prima';
    layoutConfianca = 92;
    mapeamentoFinal = mapearColunasEntradaMP(headerCols);
  }
  // Fallback: Layout Universal / Flexível
  else {
    layoutDetectado = 'LAYOUT_UNIVERSAL';
    layoutNome = 'Layout Padrão Têxtil';
    layoutConfianca = Math.min(88, Math.max(65, melhorCorrespondencia * 16));
    mapeamentoFinal = mapearColunasUniversal(headerCols);
  }

  // --- 2ª CAMADA: IDENTIFICAÇÃO DO CLIENTE ---
  let clienteIdentificado = '';

  // 1. Procura nas primeiras linhas (cabeçalho de título da planilha)
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const textoTopo = rows[r].map(c => normalizar(c)).join(' ');
    if (textoTopo.includes('ALAMO')) {
      clienteIdentificado = 'ALAMO';
      break;
    } else if (textoTopo.includes('BATISTELA') || textoTopo.includes('BAT')) {
      clienteIdentificado = 'BAT';
      break;
    } else if (textoTopo.includes('RB SOUZA') || textoTopo.includes('R.B. SOUZA') || textoTopo.includes('RBSOUZA')) {
      clienteIdentificado = 'RB SOUZA';
      break;
    }
  }

  // 2. Se não achou no topo, procura no nome do arquivo ou da aba
  if (!clienteIdentificado) {
    if (normArquivo.includes('ALAMO') || normSheet.includes('ALAMO')) clienteIdentificado = 'ALAMO';
    else if (normArquivo.includes('BAT') || normSheet.includes('BAT')) clienteIdentificado = 'BAT';
    else if (normArquivo.includes('RB') || normArquivo.includes('SOUZA') || normSheet.includes('RB')) clienteIdentificado = 'RB SOUZA';
  }

  // 3. Cruzamento com clientes cadastrados no banco
  if (!clienteIdentificado) {
    for (const c of clientesDb) {
      const nNome = normalizar(c.nome);
      const nFantasia = normalizar(c.nome_fantasia);
      const nRazao = normalizar(c.razao_social);
      if (
        (nNome && (normArquivo.includes(nNome) || normSheet.includes(nNome))) ||
        (nFantasia && (normArquivo.includes(nFantasia) || normSheet.includes(nFantasia))) ||
        (nRazao && (normArquivo.includes(nRazao) || normSheet.includes(nRazao)))
      ) {
        clienteIdentificado = c.nome_fantasia || c.nome;
        break;
      }
    }
  }

  return {
    layoutDetectado,
    layoutNome,
    layoutConfianca,
    clientePadraoIdentificado: clienteIdentificado,
    headerRowIndex: melhorHeaderIndex,
    mapeamentoColunas: mapeamentoFinal
  };
}

function calcularScoreCabecalho(cols: string[]): number {
  let score = 0;
  const termos = ['NF', 'NOTA', 'DATA', 'FIO', 'TITULO', 'COR', 'CAIXA', 'PESO', 'CLIENTE', 'KG', 'ARTIGO', 'PRODUTO', 'LOTE'];
  for (const c of cols) {
    for (const t of termos) {
      if (c.includes(t)) {
        score++;
        break;
      }
    }
  }
  return score;
}

// Mapeamentos de Colunas para cada Layout Estrutural
function mapearColunasTecelagem(headerCols: string[]): Record<string, number> {
  const map: Record<string, number> = {
    cliente: -1,
    nf: -1,
    data: -1,
    fio: -1,
    tipo: -1,
    cor: -1,
    caixas: -1,
    peso: -1,
    lote: -1
  };

  headerCols.forEach((col, idx) => {
    if (col.includes('NOTA') || col.includes('NF')) map.nf = idx;
    else if (col.includes('DATA') || col.includes('ENTRADA')) map.data = idx;
    else if (col.includes('ARTIGO') || col.includes('FIO') || col.includes('TITULO') || col.includes('DESCRICAO')) map.fio = idx;
    else if (col.includes('TIPO') || col.includes('COMPOSICAO')) map.tipo = idx;
    else if (col.includes('COR') || col.includes('TONALIDADE')) map.cor = idx;
    else if (col.includes('CAIXA') || col.includes('CX') || col.includes('VOLUME') || col.includes('QTD')) map.caixas = idx;
    else if (col.includes('PESO') || col.includes('KG') || col.includes('LIQUIDO')) map.peso = idx;
    else if (col.includes('LOTE')) map.lote = idx;
  });

  return map;
}

function mapearColunasRemessaIndustrial(headerCols: string[]): Record<string, number> {
  const map: Record<string, number> = {
    cliente: -1,
    nf: -1,
    data: -1,
    fio: -1,
    tipo: -1,
    cor: -1,
    caixas: -1,
    peso: -1,
    lote: -1
  };

  headerCols.forEach((col, idx) => {
    if (col.includes('CLIENTE') || col.includes('DESTINATARIO')) map.cliente = idx;
    else if (col.includes('NOTA') || col.includes('NF')) map.nf = idx;
    else if (col.includes('DATA') || col.includes('EMISSAO')) map.data = idx;
    else if (col.includes('PRODUTO') || col.includes('FIO') || col.includes('DISCRIMINACAO') || col.includes('ESPECIFICACAO')) map.fio = idx;
    else if (col.includes('COR')) map.cor = idx;
    else if (col.includes('CAIXA') || col.includes('VOL') || col.includes('QTD')) map.caixas = idx;
    else if (col.includes('LIQUIDO') || col.includes('PESO') || col.includes('KG')) map.peso = idx;
  });

  return map;
}

function mapearColunasEntradaMP(headerCols: string[]): Record<string, number> {
  const map: Record<string, number> = {
    cliente: -1,
    nf: -1,
    data: -1,
    fio: -1,
    tipo: -1,
    cor: -1,
    caixas: -1,
    peso: -1,
    observacao: -1
  };

  headerCols.forEach((col, idx) => {
    if (col.includes('CLIENTE') || col.includes('EMPRESA')) map.cliente = idx;
    else if (col.includes('DATA')) map.data = idx;
    else if (col.includes('NF') || col.includes('NOTA')) map.nf = idx;
    else if (col.includes('FIO') || col.includes('TITULO')) map.fio = idx;
    else if (col.includes('TIPO')) map.tipo = idx;
    else if (col.includes('COR')) map.cor = idx;
    else if (col.includes('CAIXA') || col.includes('CX')) map.caixas = idx;
    else if (col.includes('PESO') || col.includes('KG')) map.peso = idx;
    else if (col.includes('OBS')) map.observacao = idx;
  });

  return map;
}

function mapearColunasUniversal(headerCols: string[]): Record<string, number> {
  const map: Record<string, number> = {
    cliente: -1,
    nf: -1,
    data: -1,
    fio: -1,
    tipo: -1,
    cor: -1,
    caixas: -1,
    peso: -1,
    lote: -1
  };

  headerCols.forEach((col, idx) => {
    if (map.cliente === -1 && (col.includes('CLIENTE') || col.includes('FORNECEDOR') || col.includes('RAZAO'))) map.cliente = idx;
    else if (map.nf === -1 && (col.includes('NF') || col.includes('NOTA') || col.includes('DOC'))) map.nf = idx;
    else if (map.data === -1 && (col.includes('DATA') || col.includes('EMISSAO') || col.includes('DIA'))) map.data = idx;
    else if (map.fio === -1 && (col.includes('FIO') || col.includes('TITULO') || col.includes('PRODUTO') || col.includes('ITEM') || col.includes('ARTIGO') || col.includes('MATERIAL'))) map.fio = idx;
    else if (map.tipo === -1 && (col.includes('TIPO') || col.includes('COMPOSICAO'))) map.tipo = idx;
    else if (map.cor === -1 && (col.includes('COR') || col.includes('TONALIDADE'))) map.cor = idx;
    else if (map.caixas === -1 && (col.includes('CAIXA') || col.includes('CX') || col.includes('VOL') || col.includes('QTD') || col.includes('QUANTIDADE'))) map.caixas = idx;
    else if (map.peso === -1 && (col.includes('PESO') || col.includes('KG') || col.includes('LIQUIDO'))) map.peso = idx;
    else if (map.lote === -1 && col.includes('LOTE')) map.lote = idx;
  });

  return map;
}

// ==========================================
// Comparar com Sistema (Diagnóstico Completo)
// ==========================================

export async function compararComSistema(resultado: ResultadoLeituraPlanilha): Promise<DiagnosticoComparacaoSistema> {
  // 1. Carrega dados atuais do Supabase
  const [clientesRes, titulosRes, entradasRes] = await Promise.all([
    supabase.from('clientes').select('id, nome, razao_social, nome_fantasia, cnpj, status'),
    supabase.from('titulos_fio').select('id, cliente_id, titulo, tipo, cor'),
    supabase.from('entradas').select('id, nf_numero, data_lancamento, cliente_id, titulo_fio')
  ]);

  const clientesDb = clientesRes.data || [];
  const titulosDb = titulosRes.data || [];
  const entradasDb = entradasRes.data || [];

  // Diagnóstico de Clientes
  const clientesMap = new Map<string, { nome: string; cadastrado: boolean; id?: number | string; cnpj?: string }>();
  
  // Inclui o cliente geral da planilha
  if (resultado.clienteGeralIdentificado) {
    const norm = normalizar(resultado.clienteGeralIdentificado);
    const match = clientesDb.find(c => 
      normalizar(c.nome) === norm || 
      normalizar(c.razao_social) === norm || 
      normalizar(c.nome_fantasia) === norm
    );
    clientesMap.set(resultado.clienteGeralIdentificado, {
      nome: resultado.clienteGeralIdentificado,
      cadastrado: !!match,
      id: match?.id,
      cnpj: match?.cnpj
    });
  }

  // Percorre registros individuais
  for (const reg of resultado.registros) {
    if (reg.clienteNome && !clientesMap.has(reg.clienteNome)) {
      const norm = normalizar(reg.clienteNome);
      const match = clientesDb.find(c => 
        normalizar(c.nome) === norm || 
        normalizar(c.razao_social) === norm || 
        normalizar(c.nome_fantasia) === norm
      );
      clientesMap.set(reg.clienteNome, {
        nome: reg.clienteNome,
        cadastrado: !!match,
        id: match?.id,
        cnpj: match?.cnpj
      });
    }
  }

  // Diagnóstico de Fios
  const fiosMap = new Map<string, { termoLido: string; catalogado: boolean; id?: number | string; titulo?: string; tipo?: string }>();
  let novosFiosContagem = 0;

  for (const reg of resultado.registros) {
    if (reg.fio && !fiosMap.has(reg.fio)) {
      const norm = normalizar(reg.fio);
      const match = titulosDb.find(f => {
        const nTitulo = normalizar(f.titulo);
        return nTitulo && (norm.includes(nTitulo) || nTitulo.includes(norm));
      });

      if (match) {
        fiosMap.set(reg.fio, {
          termoLido: reg.fio,
          catalogado: true,
          id: match.id,
          titulo: match.titulo,
          tipo: match.tipo || 'Poliéster'
        });
      } else {
        fiosMap.set(reg.fio, {
          termoLido: reg.fio,
          catalogado: false,
          tipo: reg.tipoFio || 'Novo Fio'
        });
        novosFiosContagem++;
      }
    }
  }

  // Diagnóstico de Duplicidades Internas na Planilha (mesma NF + Fio + Cor)
  const mapaChaves = new Map<string, number[]>();
  resultado.registros.forEach((reg) => {
    const chave = `${normalizar(reg.numeroNf)}|${normalizar(reg.fio)}|${normalizar(reg.cor)}|${normalizar(reg.lote || '')}`;
    const lista = mapaChaves.get(chave) || [];
    lista.push(reg.linhaOriginal);
    mapaChaves.set(chave, lista);
  });

  const duplicidadesInternas: { nf: string; fio: string; cor: string; linhas: number[] }[] = [];
  mapaChaves.forEach((linhas, chave) => {
    if (linhas.length > 1) {
      const [nf, fio, cor] = chave.split('|');
      duplicidadesInternas.push({ nf, fio, cor, linhas });
    }
  });

  // Diagnóstico de Registros já existentes no banco (checagem de NFs)
  const registrosExistentesNoSistema: { nf: string; fio?: string; data?: string; clienteNome?: string }[] = [];
  const nfsVerificadas = new Set<string>();

  for (const reg of resultado.registros) {
    if (reg.numeroNf && !nfsVerificadas.has(reg.numeroNf)) {
      nfsVerificadas.add(reg.numeroNf);
      const normNf = normalizar(reg.numeroNf);
      const jaExiste = entradasDb.find(e => normalizar(e.nf_numero) === normNf);
      if (jaExiste) {
        registrosExistentesNoSistema.push({
          nf: reg.numeroNf,
          fio: jaExiste.titulo_fio,
          data: jaExiste.data_lancamento
        });
      }
    }
  }

  // Avaliação Geral
  let diagnosticoGeral: 'PRONTO_PARA_IMPORTAR' | 'REQUER_ATENCAO' | 'COM_IMPEDIMENTOS' = 'PRONTO_PARA_IMPORTAR';
  if (resultado.totalComInconsistencias > 0 || duplicidadesInternas.length > 0) {
    diagnosticoGeral = 'COM_IMPEDIMENTOS';
  } else if (novosFiosContagem > 0 || registrosExistentesNoSistema.length > 0 || Array.from(clientesMap.values()).some(c => !c.cadastrado)) {
    diagnosticoGeral = 'REQUER_ATENCAO';
  }

  return {
    totalLinhasAnalisadas: resultado.totalLinhasLidas,
    clientesIdentificados: Array.from(clientesMap.values()),
    fiosIdentificados: Array.from(fiosMap.values()),
    novosFiosContagem,
    duplicidadesInternas,
    registrosExistentesNoSistema,
    diagnosticoGeral
  };
}

// ==========================================
// Gestão da Central de Importações (Histórico)
// ==========================================

export function getHistoricoImportacoes(): HistoricoImportacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORICO_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler histórico da Central de Importações:', err);
    return [];
  }
}

export function salvarNoHistorico(
  resultado: ResultadoLeituraPlanilha,
  status: StatusImportacao | 'LIDO_VALIDADO' | 'CONFIRMADO_MANUAL' | 'COM_INCONSISTENCIAS' | 'PENDENTE',
  usuario = 'Escritório',
  observacoes?: string
): HistoricoImportacao {
  const historico = getHistoricoImportacoes();

  // Mapeia status legados para os novos status da Sprint 3.3.1: Lida | Homologada | Importada | Cancelada
  let statusNormalizado: StatusImportacao = 'Lida';
  if (status === 'Homologada' || status === 'CONFIRMADO_MANUAL') {
    statusNormalizado = 'Homologada';
  } else if (status === 'Importada') {
    statusNormalizado = 'Importada';
  } else if (status === 'Cancelada') {
    statusNormalizado = 'Cancelada';
  } else {
    statusNormalizado = 'Lida';
  }

  const novoRegistro: HistoricoImportacao = {
    id: resultado.id,
    nomeArquivo: resultado.nomeArquivo,
    layoutDetectado: resultado.layoutDetectado,
    layoutNome: resultado.layoutNome,
    clienteNome: resultado.clienteGeralIdentificado || 'Diversos',
    dataHora: new Date().toISOString(),
    totalLinhas: resultado.totalLinhasLidas,
    totalValidos: resultado.totalValidos,
    totalPendentes: resultado.totalPendentes,
    totalInconsistencias: resultado.totalComInconsistencias,
    totalNovosFios: resultado.totalNovosFios,
    totalCaixas: resultado.totalCaixas,
    totalPesoKg: resultado.totalPesoKg,
    indiceConfiabilidade: resultado.indiceConfiabilidade,
    observacoesImportacao: observacoes || resultado.observacoesImportacao || '',
    status: statusNormalizado,
    usuario,
    resultadoCompleto: {
      ...resultado,
      observacoesImportacao: observacoes || resultado.observacoesImportacao || ''
    }
  };

  // Remove duplicata prévia do mesmo id se houver
  const filtrado = historico.filter(h => h.id !== resultado.id);
  filtrado.unshift(novoRegistro);
  localStorage.setItem(STORAGE_HISTORICO_KEY, JSON.stringify(filtrado));

  window.dispatchEvent(new CustomEvent('texlog_importacao_salva', { detail: novoRegistro }));

  return novoRegistro;
}

export function atualizarStatusHistorico(id: string, novoStatus: StatusImportacao): void {
  const historico = getHistoricoImportacoes();
  const item = historico.find(h => h.id === id);
  if (item) {
    item.status = novoStatus;
    localStorage.setItem(STORAGE_HISTORICO_KEY, JSON.stringify(historico));
    window.dispatchEvent(new CustomEvent('texlog_importacao_salva', { detail: item }));
  }
}

// ==========================================
// Gerador de Planilhas de Amostra Reais
// ==========================================

export function gerarPlanilhaAmostra(tipo: 'ALAMO' | 'BAT' | 'RB_SOUZA' | 'DESCONHECIDO'): { buffer: ArrayBuffer; nomeArquivo: string } {
  const wb = XLSX.utils.book_new();

  if (tipo === 'ALAMO') {
    const dados = [
      ['ALAMO TEXTIL LTDA - ENTRADA DE MATÉRIA-PRIMA'],
      ['NF', 'DATA', 'ARTIGO / FIO', 'COR', 'CAIXAS', 'PESO (KG)', 'LOTE'],
      ['NF-88210', '2026-09-20', '150/48 - POLIÉSTER', 'CRU', 25, 875.40, 'L-9021'],
      ['NF-88210', '2026-09-20', '150/48 - POLIÉSTER', 'BRANCO', 15, 524.80, 'L-9022'],
      ['NF-88215', '2026-09-22', '167/48 - POLIÉSTER', 'PRETO', 30, 1050.00, 'L-9030'],
      ['NF-88220', '2026-09-23', 'FIO ESPECIAL 999', 'AZUL', 10, 320.00, 'L-9040'], // Novo fio (Pendente)
    ];
    const ws = XLSX.utils.aoa_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'ALAMO_ENTRADAS');
    const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return { buffer: u8, nomeArquivo: 'amostra_alamo_tecelagem.xlsx' };
  }

  if (tipo === 'BAT') {
    const dados = [
      ['BATISTELA TEXTIL - CONTROLE DE REMESSAS'],
      ['NOTA FISCAL', 'EMISSÃO', 'DESTINATÁRIO', 'PRODUTO / FIO', 'COR', 'QTD CAIXAS', 'PESO LÍQUIDO'],
      ['10450', '21/09/2026', 'BAT', '150/48', 'BRANCO', 20, 680.00],
      ['10450', '21/09/2026', 'BAT', '300/96', 'CRU', 18, 620.50],
      ['10452', '22/09/2026', 'BAT', '14/2 ALGODÃO', 'CINZA', 12, 410.20],
      ['10455', '', 'CLIENTE DESCONHECIDO X', '150/48', 'VERMELHO', 0, 0], // Inconsistência impeditiva (caixas e peso 0)
    ];
    const ws = XLSX.utils.aoa_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'BAT_REMESSA');
    const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return { buffer: u8, nomeArquivo: 'amostra_bat_remessa.xlsx' };
  }

  if (tipo === 'RB_SOUZA') {
    const dados = [
      ['RB SOUZA - ENTRADA DE FIOS E MATÉRIA-PRIMA'],
      ['CLIENTE', 'DATA', 'NF', 'FIO / TÍTULO', 'TIPO', 'COR', 'CAIXAS', 'PESO KG', 'OBSERVAÇÕES'],
      ['SAGE', '2026-09-22', '55102', '167/48', 'POLIÉSTER', 'PRETO', 40, 1420.00, 'LOTE 441 - ARMAZÉM A'],
      ['TEXPOINT', '2026-09-22', '9931', '14/2', 'ALGODÃO', 'CINZA', 22, 780.50, 'FIO RETORCIDO'],
      ['NOVA ERA', '2026-09-23', '10293', '300/96', 'POLIÉSTER', 'CRU', 35, 1250.00, 'ENTREGA URGENTE'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'RB_SOUZA');
    const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return { buffer: u8, nomeArquivo: 'amostra_rb_souza_mp.xlsx' };
  }

  // Layout Desconhecido (Novo Layout ainda não catalogado)
  const dados = [
    ['PLANILHA EXTERNA CUSTOMIZADA - FORNECEDOR DIVERSOS'],
    ['DOC_CONTROLE', 'REGISTRO', 'MATERIA_PRIMA', 'TONALIDADE', 'EMBALAGENS', 'TOTAL_LIQUIDO'],
    ['DOC-991', '24/09/2026', '15048', 'AZUL MARINHO', 20, 720.00],
    ['DOC-992', '24/09/2026', 'POLIAMIDA CRUA', 'NATURAL', 15, 510.50],
    ['DOC-993', '24/09/2026', '16748', 'BRANCO', 30, 1020.00],
  ];
  const ws = XLSX.utils.aoa_to_sheet(dados);
  XLSX.utils.book_append_sheet(wb, ws, 'LAYOUT_NOVO');
  const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return { buffer: u8, nomeArquivo: 'amostra_layout_desconhecido.xlsx' };
}
