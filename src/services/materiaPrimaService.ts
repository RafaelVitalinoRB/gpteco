import { supabase } from '../lib/supabase';
import { generateId } from '../lib/utils';
import { useStore } from '../store/useStore';

export interface MateriaPrimaItem {
  id: string;
  clienteId: string | number;
  origem: 'CLIENTE' | 'EMPRESA';
  fornecedor?: string;
  titulo: string;
  tipo: string;
  cor: string;
  quantidadeCaixas: number;
  pesoKg: number;
  saldoCaixas: number;
  saldoAtualKg: number;
  ultimaMovimentacao: string;
  criadoEm: string;
}

export interface MovimentacaoMateriaPrima {
  id: string;
  materiaPrimaId?: string;
  clienteId: string | number;
  origem: 'CLIENTE' | 'EMPRESA';
  fornecedor?: string;
  tipoMovimento: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  titulo: string;
  tipo: string;
  cor: string;
  quantidadeCaixas: number;
  pesoKg: number;
  saldoResultanteCaixas: number;
  saldoResultantePesoKg: number;
  observacao?: string;
  dataHora: string;
  usuario: string;
}

export interface EventoNotificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  origem: 'CLIENTE' | 'EMPRESA';
  clienteId?: string | number;
  clienteNome?: string;
  payload?: any;
  dataHora: string;
  usuario: string;
  status: 'GRAVADO' | 'PENDENTE';
}

const STORAGE_KEY_MATERIAIS = 'texlog_materia_prima_estoque';
const STORAGE_KEY_MOVIMENTACOES = 'texlog_movimentacoes_materia_prima';
const STORAGE_KEY_EVENTOS = 'texlog_eventos_notificacoes';

// Obter todos os materiais
export function getTodosMateriais(): MateriaPrimaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MATERIAIS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Erro ao ler materiais do storage:', err);
    return [];
  }
}

// Salvar lista de materiais
function salvarMateriais(lista: MateriaPrimaItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MATERIAIS, JSON.stringify(lista));
  } catch (err) {
    console.error('Erro ao salvar materiais no storage:', err);
  }
}

// Obter materiais de um cliente específico
export function getMateriaisPorCliente(clienteId: string | number): MateriaPrimaItem[] {
  const todos = getTodosMateriais();
  const cId = String(clienteId);
  return todos.filter(m => String(m.clienteId) === cId);
}

// Obter movimentações
export function getMovimentacoes(clienteId?: string | number): MovimentacaoMateriaPrima[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVIMENTACOES);
    const lista: MovimentacaoMateriaPrima[] = raw ? JSON.parse(raw) : [];
    if (clienteId !== undefined && clienteId !== null) {
      const cId = String(clienteId);
      return lista.filter(mov => String(mov.clienteId) === cId);
    }
    return lista;
  } catch (err) {
    console.error('Erro ao ler movimentações:', err);
    return [];
  }
}

// Salvar movimentação
function salvarMovimentacao(mov: MovimentacaoMateriaPrima): void {
  try {
    const todas = getMovimentacoes();
    todas.unshift(mov);
    localStorage.setItem(STORAGE_KEY_MOVIMENTACOES, JSON.stringify(todas));
  } catch (err) {
    console.error('Erro ao salvar movimentação:', err);
  }
}

// Obter eventos gravados
export function getEventosNotificacao(): EventoNotificacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTOS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Erro ao ler eventos de notificação:', err);
    return [];
  }
}

// Gravar evento de notificação para Sprint seguinte
export function gravarEventoNotificacao(evento: EventoNotificacao): void {
  try {
    const eventos = getEventosNotificacao();
    eventos.unshift(evento);
    localStorage.setItem(STORAGE_KEY_EVENTOS, JSON.stringify(eventos));
  } catch (err) {
    console.error('Erro ao gravar evento de notificação:', err);
  }
}

export interface RegistrarEntradaParams {
  origem: 'CLIENTE' | 'EMPRESA';
  clienteId?: string | number;
  clienteNome?: string;
  fornecedor?: string;
  titulo: string;
  tipo: string;
  cor: string;
  quantidadeCaixas: number;
  pesoKg: number;
  observacao?: string;
  usuario?: string;
}

/**
 * Registra uma entrada de matéria-prima, atualiza o saldo do material,
 * registra a movimentação com usuário e data, e grava o evento para notificação.
 */
export async function registrarEntradaMateriaPrima(params: RegistrarEntradaParams): Promise<{
  material: MateriaPrimaItem;
  movimentacao: MovimentacaoMateriaPrima;
  evento: EventoNotificacao;
}> {
  const {
    origem,
    clienteId = 'EMPRESA',
    clienteNome = '',
    fornecedor = '',
    titulo,
    tipo,
    cor,
    quantidadeCaixas,
    pesoKg,
    observacao = '',
    usuario = 'Escritório'
  } = params;

  const dataHora = new Date().toISOString();
  const materiais = getTodosMateriais();

  const cId = origem === 'CLIENTE' ? String(clienteId) : 'EMPRESA';
  const cleanTitulo = titulo.trim();
  const cleanTipo = tipo.trim();
  const cleanCor = cor.trim();

  // Localizar se já existe registro desse material para essa entidade
  const index = materiais.findIndex(m => 
    String(m.clienteId) === cId &&
    m.origem === origem &&
    m.titulo.toLowerCase() === cleanTitulo.toLowerCase() &&
    m.tipo.toLowerCase() === cleanTipo.toLowerCase() &&
    m.cor.toLowerCase() === cleanCor.toLowerCase()
  );

  let materialAtualizado: MateriaPrimaItem;

  if (index >= 0) {
    const existing = materiais[index];
    const novasCaixas = existing.quantidadeCaixas + quantidadeCaixas;
    const novoPeso = Number((existing.pesoKg + pesoKg).toFixed(2));

    materialAtualizado = {
      ...existing,
      quantidadeCaixas: novasCaixas,
      pesoKg: novoPeso,
      saldoCaixas: novasCaixas,
      saldoAtualKg: novoPeso,
      ultimaMovimentacao: dataHora,
      fornecedor: fornecedor || existing.fornecedor
    };

    materiais[index] = materialAtualizado;
  } else {
    materialAtualizado = {
      id: generateId(),
      clienteId: cId,
      origem,
      fornecedor: fornecedor || undefined,
      titulo: cleanTitulo,
      tipo: cleanTipo,
      cor: cleanCor,
      quantidadeCaixas,
      pesoKg: Number(pesoKg.toFixed(2)),
      saldoCaixas: quantidadeCaixas,
      saldoAtualKg: Number(pesoKg.toFixed(2)),
      ultimaMovimentacao: dataHora,
      criadoEm: dataHora
    };

    materiais.push(materialAtualizado);
  }

  // 1. Salvar estoque atualizado
  salvarMateriais(materiais);

  // 2. Registrar movimentação com usuário, data e saldo resultante
  const movimentacao: MovimentacaoMateriaPrima = {
    id: generateId(),
    materiaPrimaId: materialAtualizado.id,
    clienteId: cId,
    origem,
    fornecedor: fornecedor || undefined,
    tipoMovimento: 'ENTRADA',
    titulo: cleanTitulo,
    tipo: cleanTipo,
    cor: cleanCor,
    quantidadeCaixas,
    pesoKg: Number(pesoKg.toFixed(2)),
    saldoResultanteCaixas: materialAtualizado.saldoCaixas,
    saldoResultantePesoKg: materialAtualizado.saldoAtualKg,
    observacao,
    dataHora,
    usuario
  };
  salvarMovimentacao(movimentacao);

  // 3. Preparar e gravar evento para notificação futura (Sprint seguinte)
  const evento: EventoNotificacao = {
    id: generateId(),
    tipo: 'NOVA_ENTRADA_MATERIA_PRIMA',
    titulo: `Entrada de Matéria-Prima: ${cleanTitulo}`,
    mensagem: `${quantidadeCaixas} caixas (${pesoKg} kg) de ${cleanTipo} ${cleanCor} recebidos. Origem: ${origem === 'CLIENTE' ? (clienteNome || `Cliente #${clienteId}`) : (fornecedor ? `Empresa (${fornecedor})` : 'Empresa')}`,
    origem,
    clienteId: cId,
    clienteNome: clienteNome || undefined,
    payload: {
      materialId: materialAtualizado.id,
      quantidadeCaixas,
      pesoKg,
      titulo: cleanTitulo,
      tipo: cleanTipo,
      cor: cleanCor,
      fornecedor
    },
    dataHora,
    usuario,
    status: 'GRAVADO'
  };
  gravarEventoNotificacao(evento);

  // 4. Integração retrocompatível com Supabase tabela 'entradas' se disponível
  try {
    const clienteIdNum = Number(clienteId);
    if (!isNaN(clienteIdNum) && clienteIdNum > 0) {
      await supabase.from('entradas').insert([{
        cliente_id: clienteIdNum,
        quantidade_caixas: quantidadeCaixas,
        peso_liquido: pesoKg,
        data_entrada: dataHora
      }]);
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar entrada no Supabase entradas:', err);
  }

  // 5. Integração com useStore (entradas) para manter compatibilidade total
  try {
    useStore.getState().addEntrada({
      id: generateId(),
      clienteId: cId,
      tipoLancamento: 'CAIXAS',
      tipoFio: cleanTipo as any,
      tituloFio: cleanTitulo,
      nfNumero: 'S/N',
      dataLancamento: dataHora,
      quantidade: quantidadeCaixas,
      pesoBruto: pesoKg,
      pesoLiquido: pesoKg,
      observacao,
      isRetroativo: false,
      createdAt: dataHora
    });
  } catch (err) {
    // Silencioso se o store não tiver o formato
  }

  // 6. Notificar componentes ouvintes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('texlog_materia_prima_updated', {
      detail: { material: materialAtualizado, movimentacao, evento }
    }));
  }

  return { material: materialAtualizado, movimentacao, evento };
}
