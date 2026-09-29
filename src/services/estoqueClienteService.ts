import { supabase } from '../lib/supabase';
import { ClassificacaoMateriaPrima, LoteMateriaPrima } from '../types';
export type { ClassificacaoMateriaPrima, LoteMateriaPrima };

export interface EstoqueClienteItem {
  id: string;
  clienteId: string | number;
  clienteNome?: string;
  fioId?: string | number;
  fioNome: string; // Ex: "150/48 - POLIÉSTER" ou "14/2 - ALGODÃO"
  tipo?: string;
  cor: string;
  lote?: string;
  quantidadeCaixas: number;
  quantidadeEmbalagens?: number;
  tipoEmbalagem?: string;
  conesPorEmbalagem?: number;
  totalCones?: number;
  pesoMedioConeKg?: number;
  pesoKg: number;
  classificacao?: ClassificacaoMateriaPrima;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ItemEntradaMercadoria {
  fioId?: string | number;
  fioNome: string;
  tipo?: string;
  cor: string;
  lote: string;
  tipoEmbalagem: string;
  quantidadeEmbalagens: number;
  conesPorEmbalagem: number;
  totalCones: number;
  pesoKg: number;
  pesoMedioConeKg: number;
  classificacao: ClassificacaoMateriaPrima;
  // Compatibilidade retroativa
  quantidadeCaixas?: number;
}

export interface EntradaMercadoriaPayload {
  clienteId: string | number;
  clienteNome?: string;
  numeroNf: string;
  dataEntrada: string;
  itens: ItemEntradaMercadoria[];
}

export interface RegistroEntradaSalva {
  id: string;
  clienteId: string | number;
  clienteNome: string;
  numeroNf: string;
  dataEntrada: string;
  itens: ItemEntradaMercadoria[];
  totalCaixas: number;
  totalEmbalagens: number;
  totalCones: number;
  totalPesoKg: number;
  criadoEm: string;
}

export const CLASSIFICACOES_MATERIA_PRIMA: { value: ClassificacaoMateriaPrima; label: string; badgeColor: string }[] = [
  { value: 'MATERIAL_NOVO', label: 'Material Novo', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'SALDO_CLIENTE', label: 'Saldo do Cliente', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'RETORNO_PRODUCAO', label: 'Retorno de Produção', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'OUTRO', label: 'Outro', badgeColor: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' },
];

const STORAGE_KEY_ESTOQUE = 'texlog_estoque_cliente_items_v2';
const STORAGE_KEY_ENTRADAS = 'texlog_entradas_mercadoria_v2';
const STORAGE_KEY_LOTES = 'texlog_lotes_materia_prima_v1';
export const EVENT_ESTOQUE_UPDATED = 'texlog_estoque_updated';
export const EVENT_MATERIA_PRIMA_UPDATED = 'texlog_materia_prima_updated';

// Helpers de persistência local resiliente
function getLocalEstoque(): EstoqueClienteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESTOQUE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler estoque local:', err);
    return [];
  }
}

function setLocalEstoque(items: EstoqueClienteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ESTOQUE, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_ESTOQUE_UPDATED, { detail: items }));
  } catch (err) {
    console.error('Erro ao salvar estoque local:', err);
  }
}

export function getLocalEntradas(): RegistroEntradaSalva[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRADAS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler entradas locais:', err);
    return [];
  }
}

function addLocalEntrada(entrada: RegistroEntradaSalva) {
  try {
    const entradas = getLocalEntradas();
    entradas.unshift(entrada);
    localStorage.setItem(STORAGE_KEY_ENTRADAS, JSON.stringify(entradas));
  } catch (err) {
    console.error('Erro ao salvar entrada local:', err);
  }
}

// Persistência de Lotes de Matéria-Prima (Sprint 3.4)
export function getLotesMateriaPrima(clienteId?: string | number): LoteMateriaPrima[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTES);
    let list: LoteMateriaPrima[] = raw ? JSON.parse(raw) : [];

    if (!raw || list.length === 0) {
      list = seedInitialLotes();
      localStorage.setItem(STORAGE_KEY_LOTES, JSON.stringify(list));
    }

    if (clienteId !== undefined && clienteId !== '') {
      return list.filter(l => String(l.clienteId) === String(clienteId));
    }

    return list;
  } catch (err) {
    console.error('Erro ao ler lotes de matéria-prima:', err);
    return [];
  }
}

export function setLotesMateriaPrima(lotes: LoteMateriaPrima[]) {
  try {
    localStorage.setItem(STORAGE_KEY_LOTES, JSON.stringify(lotes));
    window.dispatchEvent(new CustomEvent(EVENT_MATERIA_PRIMA_UPDATED, { detail: lotes }));
  } catch (err) {
    console.error('Erro ao salvar lotes de matéria-prima:', err);
  }
}

/**
 * Retorna os lotes de matéria-prima disponíveis para o Programador selecionar na criação da OP
 */
export function getLotesDisponiveis(clienteId?: string | number, fioNome?: string): LoteMateriaPrima[] {
  const lotes = getLotesMateriaPrima(clienteId);
  if (!fioNome) return lotes;

  const normalizado = normalizarTexto(fioNome);
  return lotes.filter(l => {
    const nomeLoteFio = normalizarTexto(l.fioNome);
    return nomeLoteFio.includes(normalizado) || normalizado.includes(nomeLoteFio);
  });
}

function seedInitialLotes(): LoteMateriaPrima[] {
  const now = new Date().toISOString();
  // Cria alguns lotes padrão com as especificações exigidas para testes imediatos do Programador
  return [
    {
      id: 'lote_seed_1',
      numeroNf: 'NF-10492',
      dataEntrada: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      clienteId: '1',
      clienteNome: 'TEXTIL SANTA CRUZ',
      fioNome: '150/48 - POLIÉSTER',
      tipo: 'POLIESTER',
      cor: 'BRANCO CRU',
      lote: 'LT-8420-A',
      tipoEmbalagem: 'Caixa',
      quantidadeEmbalagens: 25,
      conesPorEmbalagem: 6,
      totalCones: 150,
      pesoLiquido: 300,
      pesoDisponivelKg: 300,
      pesoMedioConeKg: 2.000,
      classificacao: 'MATERIAL_NOVO',
      criadoEm: now,
      atualizadoEm: now
    },
    {
      id: 'lote_seed_2',
      numeroNf: 'NF-10518',
      dataEntrada: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      clienteId: '1',
      clienteNome: 'TEXTIL SANTA CRUZ',
      fioNome: '75/36 - POLIÉSTER',
      tipo: 'POLIESTER',
      cor: 'PRETO',
      lote: 'LT-9114-B',
      tipoEmbalagem: 'Caixa Algodão',
      quantidadeEmbalagens: 15,
      conesPorEmbalagem: 8,
      totalCones: 120,
      pesoLiquido: 216,
      pesoDisponivelKg: 216,
      pesoMedioConeKg: 1.800,
      classificacao: 'MATERIAL_NOVO',
      criadoEm: now,
      atualizadoEm: now
    },
    {
      id: 'lote_seed_3',
      numeroNf: 'NF-10550',
      dataEntrada: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      clienteId: '2',
      clienteNome: 'CONFECÇÕES BRASIL',
      fioNome: '150/48 - POLIÉSTER',
      tipo: 'POLIESTER',
      cor: 'AZUL ROYAL',
      lote: 'LT-3301-C',
      tipoEmbalagem: 'Fardo',
      quantidadeEmbalagens: 18,
      conesPorEmbalagem: 9,
      totalCones: 162,
      pesoLiquido: 283.5,
      pesoDisponivelKg: 283.5,
      pesoMedioConeKg: 1.750,
      classificacao: 'SALDO_CLIENTE',
      criadoEm: now,
      atualizadoEm: now
    }
  ];
}

/**
 * Normaliza textos para comparação sem acento e sem diferenciação de maiúsculas
 */
function normalizarTexto(txt: string): string {
  return (txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

/**
 * Retorna o estoque de matéria-prima de um cliente específico
 */
export async function getEstoquePorCliente(clienteId: string | number): Promise<EstoqueClienteItem[]> {
  const todos = await getAllEstoque();
  return todos.filter(item => String(item.clienteId) === String(clienteId));
}

/**
 * Retorna o estoque completo de todos os clientes
 */
export async function getAllEstoque(): Promise<EstoqueClienteItem[]> {
  try {
    const { data, error } = await supabase
      .from('estoque_cliente')
      .select('*')
      .order('atualizado_em', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: String(d.id),
        clienteId: d.cliente_id,
        clienteNome: d.cliente_nome,
        fioId: d.fio_id,
        fioNome: d.fio_nome || d.fio,
        tipo: d.tipo,
        cor: d.cor,
        lote: d.lote || '',
        quantidadeCaixas: Number(d.quantidade_caixas || d.quantidade_embalagens || 0),
        quantidadeEmbalagens: Number(d.quantidade_embalagens || d.quantidade_caixas || 0),
        tipoEmbalagem: d.tipo_embalagem || 'Caixa',
        conesPorEmbalagem: Number(d.cones_por_embalagem || 6),
        totalCones: Number(d.total_cones || 0),
        pesoMedioConeKg: Number(d.peso_medio_cone_kg || 0),
        pesoKg: Number(d.peso_kg || 0),
        classificacao: d.classificacao || 'MATERIAL_NOVO',
        criadoEm: d.criado_em,
        atualizadoEm: d.atualizado_em || d.criado_em
      }));
    }
  } catch {
    // Fallback silencioso para a camada resiliente
  }

  return getLocalEstoque();
}

/**
 * Salva a Entrada de Mercadoria e atualiza automaticamente o Estoque e Lotes de Matéria-Prima:
 * - Calcula Total de Cones = Quantidade de Embalagens × Cones por Embalagem
 * - Calcula Peso Médio do Cone = Peso Líquido ÷ Total de Cones
 * - Salva lote rastreável de matéria-prima para simulação inteligente do Programador
 * - NÃO faz baixa de estoque, consumo automático nem movimentações nesta sprint
 */
export async function salvarEntradaMercadoria(payload: EntradaMercadoriaPayload): Promise<RegistroEntradaSalva> {
  const { clienteId, clienteNome = '', numeroNf, dataEntrada, itens } = payload;

  if (!clienteId) throw new Error('Cliente é obrigatório');
  if (!numeroNf || !numeroNf.trim()) throw new Error('Nota Fiscal é obrigatória');
  if (!dataEntrada) throw new Error('Data da entrada é obrigatória');
  if (!itens || itens.length === 0) throw new Error('A entrada deve conter pelo menos 1 item de matéria-prima');

  const now = new Date().toISOString();
  const estoqueAtual = getLocalEstoque();
  const lotesAtuais = getLotesMateriaPrima();

  let totalEmbalagensEntrada = 0;
  let totalConesEntrada = 0;
  let totalPesoKgEntrada = 0;

  for (const item of itens) {
    if (!item.fioNome || !item.fioNome.trim()) {
      throw new Error('Todo item deve ter um Fio selecionado');
    }
    if (!item.cor || !item.cor.trim()) {
      throw new Error(`Informe a cor para o fio "${item.fioNome}"`);
    }

    const qtdEmbalagens = Number(item.quantidadeEmbalagens || item.quantidadeCaixas || 0);
    if (isNaN(qtdEmbalagens) || qtdEmbalagens <= 0) {
      throw new Error(`Quantidade de embalagens inválida para o fio "${item.fioNome}"`);
    }

    const conesPorEmb = Number(item.conesPorEmbalagem) || 6;
    if (isNaN(conesPorEmb) || conesPorEmb <= 0) {
      throw new Error(`Cones por embalagem deve ser maior que zero para o fio "${item.fioNome}"`);
    }

    const peso = Number(item.pesoKg);
    if (isNaN(peso) || peso <= 0) {
      throw new Error(`Peso (kg) inválido para o fio "${item.fioNome}"`);
    }

    // Cálculos da Sprint 3.4
    const totalCones = qtdEmbalagens * conesPorEmb;
    const pesoMedioConeKg = totalCones > 0 ? (peso / totalCones) : 0;
    const loteNome = (item.lote && item.lote.trim()) || `LT-${numeroNf.trim()}-${Date.now().toString().slice(-4)}`;
    const tipoEmb = item.tipoEmbalagem || 'Caixa';
    const classif = item.classificacao || 'MATERIAL_NOVO';

    item.totalCones = totalCones;
    item.pesoMedioConeKg = Number(pesoMedioConeKg.toFixed(4));
    item.quantidadeEmbalagens = qtdEmbalagens;
    item.quantidadeCaixas = qtdEmbalagens;
    item.lote = loteNome;
    item.tipoEmbalagem = tipoEmb;
    item.classificacao = classif;

    totalEmbalagensEntrada += qtdEmbalagens;
    totalConesEntrada += totalCones;
    totalPesoKgEntrada += peso;

    const corNormalizada = normalizarTexto(item.cor);
    const fioNomeNormalizado = normalizarTexto(item.fioNome);

    // 1. Criar novo Lote Rastreável de Matéria-Prima
    const novoLote: LoteMateriaPrima = {
      id: `lote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      numeroNf: numeroNf.trim(),
      dataEntrada,
      clienteId,
      clienteNome,
      fioId: item.fioId,
      fioNome: item.fioNome.trim(),
      tipo: item.tipo,
      cor: corNormalizada,
      lote: loteNome,
      tipoEmbalagem: tipoEmb,
      quantidadeEmbalagens: qtdEmbalagens,
      conesPorEmbalagem: conesPorEmb,
      totalCones,
      pesoLiquido: peso,
      pesoDisponivelKg: peso, // Material disponível para planejamento
      pesoMedioConeKg: Number(pesoMedioConeKg.toFixed(4)),
      classificacao: classif,
      criadoEm: now,
      atualizadoEm: now
    };
    lotesAtuais.unshift(novoLote);

    // 2. Atualizar tabela de Estoque geral do cliente
    const indexExistente = estoqueAtual.findIndex(e => 
      String(e.clienteId) === String(clienteId) &&
      normalizarTexto(e.fioNome) === fioNomeNormalizado &&
      normalizarTexto(e.cor) === corNormalizada
    );

    if (indexExistente >= 0) {
      estoqueAtual[indexExistente].quantidadeCaixas += qtdEmbalagens;
      estoqueAtual[indexExistente].quantidadeEmbalagens = (estoqueAtual[indexExistente].quantidadeEmbalagens || 0) + qtdEmbalagens;
      estoqueAtual[indexExistente].totalCones = (estoqueAtual[indexExistente].totalCones || 0) + totalCones;
      estoqueAtual[indexExistente].pesoKg += peso;
      estoqueAtual[indexExistente].pesoMedioConeKg = estoqueAtual[indexExistente].totalCones! > 0 
        ? estoqueAtual[indexExistente].pesoKg / estoqueAtual[indexExistente].totalCones! 
        : pesoMedioConeKg;
      estoqueAtual[indexExistente].lote = loteNome;
      estoqueAtual[indexExistente].atualizadoEm = now;
      if (clienteNome) estoqueAtual[indexExistente].clienteNome = clienteNome;
    } else {
      estoqueAtual.push({
        id: `est_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        clienteId,
        clienteNome,
        fioId: item.fioId,
        fioNome: item.fioNome.trim(),
        tipo: item.tipo,
        cor: corNormalizada,
        lote: loteNome,
        quantidadeCaixas: qtdEmbalagens,
        quantidadeEmbalagens: qtdEmbalagens,
        tipoEmbalagem: tipoEmb,
        conesPorEmbalagem: conesPorEmb,
        totalCones,
        pesoMedioConeKg: Number(pesoMedioConeKg.toFixed(4)),
        pesoKg: peso,
        classificacao: classif,
        criadoEm: now,
        atualizadoEm: now
      });
    }

    // Gravação resiliente no Supabase (se a tabela entradas estiver disponível)
    try {
      await supabase.from('entradas').insert([{
        cliente_id: Number(clienteId),
        titulo_id: item.fioId ? Number(item.fioId) : null,
        numero_nf: numeroNf.trim(),
        quantidade_caixas: qtdEmbalagens,
        peso_liquido: peso,
        data_entrada: dataEntrada
      }]);
    } catch {
      // Ignorar falha de conexão do Supabase
    }
  }

  // Atualizar persistência local
  setLocalEstoque(estoqueAtual);
  setLotesMateriaPrima(lotesAtuais);

  const novaEntradaSalva: RegistroEntradaSalva = {
    id: `ent_${Date.now()}`,
    clienteId,
    clienteNome,
    numeroNf: numeroNf.trim(),
    dataEntrada,
    itens,
    totalCaixas: totalEmbalagensEntrada,
    totalEmbalagens: totalEmbalagensEntrada,
    totalCones: totalConesEntrada,
    totalPesoKg: Number(totalPesoKgEntrada.toFixed(3)),
    criadoEm: now
  };

  addLocalEntrada(novaEntradaSalva);
  window.dispatchEvent(new CustomEvent(EVENT_MATERIA_PRIMA_UPDATED));

  return novaEntradaSalva;
}
