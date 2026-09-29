import { supabase } from '../lib/supabase';
import { RoloStatus } from '../types';

export interface RoloAptoExpedicao {
  id: string;
  numero_rolo: string; // Número Oficial (ex: 25561)
  cliente_id?: string | number;
  cliente_nome: string;
  op_id?: string | number;
  op_codigo: string;
  titulo_fio: string;
  tipo_fio?: string;
  cor: string;
  metros: number;
  voltas?: number;
  peso_liquido: number;
  pesado_em: string;
  romaneio_codigo?: string;
  status: RoloStatus | string;
}

const STORAGE_ULTIMO_NUMERO = 'texlog_ultimo_numero_rolo_oficial';
const STORAGE_HISTORICO_ROLOS = 'texlog_historico_rolos_produzidos';
const NUMERO_OFICIAL_BASE = 25561;

/**
 * Encontra o maior número oficial já utilizado no sistema (Supabase, localStorage, store)
 * e gera o próximo número sequencial, único, progressivo e global.
 */
export async function obterProximoNumeroOficial(): Promise<string> {
  let maiorNumero = NUMERO_OFICIAL_BASE - 1;

  // 1. Checa o último salvo em localStorage
  try {
    const salvo = localStorage.getItem(STORAGE_ULTIMO_NUMERO);
    if (salvo) {
      const numSalvo = parseInt(salvo, 10);
      if (!isNaN(numSalvo) && numSalvo > maiorNumero) {
        maiorNumero = numSalvo;
      }
    }
  } catch {}

  // 2. Checa o histórico de rolos em localStorage
  try {
    const raw = localStorage.getItem(STORAGE_HISTORICO_ROLOS);
    if (raw) {
      const lista = JSON.parse(raw);
      if (Array.isArray(lista)) {
        for (const item of lista) {
          const nr = String(item.numero_rolo || '').trim();
          if (/^\d{4,8}$/.test(nr)) {
            const val = parseInt(nr, 10);
            if (!isNaN(val) && val > maiorNumero) {
              maiorNumero = val;
            }
          }
        }
      }
    }
  } catch {}

  // 3. Checa os romaneios emitidos
  try {
    const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
    if (rawRom) {
      const roms = JSON.parse(rawRom);
      if (Array.isArray(roms)) {
        for (const rom of roms) {
          if (Array.isArray(rom.rolos)) {
            for (const r of rom.rolos) {
              const nr = String(r.numero_rolo || '').trim();
              if (/^\d{4,8}$/.test(nr)) {
                const val = parseInt(nr, 10);
                if (!isNaN(val) && val > maiorNumero) {
                  maiorNumero = val;
                }
              }
            }
          }
        }
      }
    }
  } catch {}

  // 4. Checa no Supabase se houver rolos com numeração numérica
  try {
    const { data, error } = await supabase
      .from('rolos')
      .select('numero_rolo')
      .order('id', { ascending: false })
      .limit(100);

    if (!error && data) {
      for (const r of data) {
        const nr = String(r.numero_rolo || '').trim();
        if (/^\d{4,8}$/.test(nr)) {
          const val = parseInt(nr, 10);
          if (!isNaN(val) && val > maiorNumero) {
            maiorNumero = val;
          }
        }
      }
    }
  } catch {}

  const proximoNumero = maiorNumero + 1;
  const proximoStr = String(proximoNumero);

  try {
    localStorage.setItem(STORAGE_ULTIMO_NUMERO, proximoStr);
  } catch {}

  return proximoStr;
}

/**
 * Atualiza o rolo em todas as fontes (Supabase, localStorage, eventos)
 * atribuindo seu Número Oficial e os dados de pesagem.
 */
export async function salvarPesagemComNumeroOficial(
  identificadorRolo: string, // id ou numero_rolo atual
  dados: {
    pesoRealKg: number;
    pesoBrutoKg: number;
    taraKg: number;
    observacoes?: string;
  }
): Promise<{ numeroOficial: string; roloAtualizado: any }> {
  // Verifica se o rolo já tem um número oficial válido (5 dígitos numéricos)
  let numeroOficial = '';
  if (/^\d{5,8}$/.test(identificadorRolo.trim())) {
    numeroOficial = identificadorRolo.trim();
  } else {
    numeroOficial = await obterProximoNumeroOficial();
  }

  const agora = new Date().toISOString();

  // 1. Atualizar no Supabase
  try {
    await supabase
      .from('rolos')
      .update({
        numero_rolo: numeroOficial,
        status: 'EM_ESTOQUE',
        peso_real_kg: dados.pesoRealKg,
        peso_bruto_kg: dados.pesoBrutoKg,
        tara_kg: dados.taraKg,
        pesado_em: agora,
        atualizado_em: agora
      })
      .or(`numero_rolo.eq.${identificadorRolo},id.eq.${identificadorRolo}`);
  } catch (err) {
    console.warn('Erro ao atualizar pesagem no Supabase:', err);
  }

  // 2. Atualizar no localStorage (histórico unificado)
  let roloAtualizado: any = null;
  try {
    const raw = localStorage.getItem(STORAGE_HISTORICO_ROLOS);
    if (raw) {
      const lista = JSON.parse(raw);
      const atualizados = lista.map((item: any) => {
        if (
          item.numero_rolo === identificadorRolo ||
          item.id === identificadorRolo ||
          String(item.id) === String(identificadorRolo)
        ) {
          roloAtualizado = {
            ...item,
            numero_rolo_original: item.numero_rolo_original || item.numero_rolo,
            numero_rolo: numeroOficial,
            status: 'EM_ESTOQUE',
            peso_real_kg: dados.pesoRealKg,
            peso_bruto_kg: dados.pesoBrutoKg,
            tara_kg: dados.taraKg,
            pesado_em: agora,
            observacoes_pesagem: dados.observacoes || ''
          };
          return roloAtualizado;
        }
        return item;
      });

      localStorage.setItem(STORAGE_HISTORICO_ROLOS, JSON.stringify(atualizados));
    }
  } catch (err) {
    console.warn('Erro ao atualizar localStorage com número oficial:', err);
  }

  // 3. Disparar eventos
  try {
    window.dispatchEvent(new CustomEvent('texlog_rolo_pesado', { detail: { numeroOficial, roloAtualizado } }));
    window.dispatchEvent(new CustomEvent('texlog_novo_rolo_pesagem'));
  } catch {}

  return { numeroOficial, roloAtualizado };
}

/**
 * Busca todos os rolos no Estoque de Rolos (pesados e aguardando expedição):
 * - Deve estar pesado (peso_real_kg > 0 e pesado_em)
 * - Status EM_ESTOQUE, PESADO ou ROMANEADO
 * - Bloquear: AGUARDANDO_PESAGEM, EM_PRODUCAO, PENDENTE, EXPEDIDO, FATURADO, CANCELADO
 * - Filtrado por cliente caso informado
 */
export function buscarRolosEmEstoque(clienteIdOuNome?: string): RoloAptoExpedicao[] {
  return buscarRolosAptosExpedicao(clienteIdOuNome);
}

/**
 * Busca todos os rolos aptos para expedição:
 * - Deve estar pesado (peso_real_kg > 0 e pesado_em)
 * - Status EM_ESTOQUE, PESADO ou ROMANEADO
 * - NÃO pode ser rolo em produção, aguardando pesagem, expedido ou faturado
 * - Filtrado por cliente caso informado
 */
export function buscarRolosAptosExpedicao(clienteIdOuNome?: string): RoloAptoExpedicao[] {
  const mapa = new Map<string, RoloAptoExpedicao>();

  try {
    const raw = localStorage.getItem(STORAGE_HISTORICO_ROLOS);
    if (raw) {
      const lista = JSON.parse(raw);
      if (Array.isArray(lista)) {
        for (const item of lista) {
          const status = (item.status || '').toUpperCase().trim();
          
          // Somente rolos liberados (EM_ESTOQUE, PESADO ou ROMANEADO).
          // Bloquear estritamente: AGUARDANDO_PESAGEM, EM_PRODUCAO, PENDENTE, EXPEDIDO, FATURADO, CANCELADO
          const isApto = (
            status === 'EM_ESTOQUE' || 
            status === 'PESADO' || 
            status === 'ROMANEADO'
          ) && status !== 'EXPEDIDO' && status !== 'FATURADO' && status !== 'CANCELADO' && status !== 'AGUARDANDO_PESAGEM' && status !== 'EM_PRODUCAO';

          if (isApto && item.peso_real_kg && Number(item.peso_real_kg) > 0) {
            const chave = item.numero_rolo || item.id;
            mapa.set(chave, {
              id: String(item.id || chave),
              numero_rolo: item.numero_rolo || chave,
              cliente_id: item.cliente_id,
              cliente_nome: item.cliente_nome || 'Cliente',
              op_id: item.op_id,
              op_codigo: item.op_codigo || (item.op_id ? `OP-${item.op_id}` : '—'),
              titulo_fio: item.titulo_fio || '150/48',
              tipo_fio: item.tipo_fio || 'POLIÉSTER',
              cor: item.cor || 'CRU',
              metros: Number(item.metros) || 3000,
              voltas: item.voltas ? Number(item.voltas) : undefined,
              peso_liquido: Number(item.peso_real_kg),
              pesado_em: item.pesado_em || item.atualizado_em || item.finalizado_em || new Date().toISOString(),
              romaneio_codigo: item.romaneio_id,
              status: item.status
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar rolos aptos no localStorage:', e);
  }

  // Também verifica romaneios emitidos que ainda não foram expedidos
  try {
    const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
    if (rawRom) {
      const roms = JSON.parse(rawRom);
      if (Array.isArray(roms)) {
        for (const rom of roms) {
          if (rom.status === 'EMITIDO' && Array.isArray(rom.rolos)) {
            for (const r of rom.rolos) {
              const chave = r.numero_rolo || r.id;
              if (chave && !mapa.has(chave)) {
                mapa.set(chave, {
                  id: String(r.id || chave),
                  numero_rolo: r.numero_rolo || chave,
                  cliente_id: rom.clienteId,
                  cliente_nome: rom.clienteNome || r.cliente_nome || 'Cliente',
                  op_id: r.op_id,
                  op_codigo: r.op_codigo || (r.op_id ? `OP-${r.op_id}` : '—'),
                  titulo_fio: r.titulo_fio || '150/48',
                  tipo_fio: r.tipo_fio || 'POLIÉSTER',
                  cor: r.cor || 'Branco',
                  metros: Number(r.metros) || 3000,
                  voltas: r.voltas ? Number(r.voltas) : undefined,
                  peso_liquido: Number(r.pesoLiquidoKg || r.peso_real_kg || 25),
                  pesado_em: rom.dataEmissao || new Date().toISOString(),
                  romaneio_codigo: rom.codigoRomaneio,
                  status: 'EM_ESTOQUE'
                });
              }
            }
          }
        }
      }
    }
  } catch {}

  let resultado = Array.from(mapa.values());

  if (clienteIdOuNome && clienteIdOuNome.trim()) {
    const termo = clienteIdOuNome.trim().toLowerCase();
    resultado = resultado.filter(r => {
      const matchId = String(r.cliente_id || '').toLowerCase() === termo;
      const matchNome = (r.cliente_nome || '').toLowerCase().includes(termo);
      return matchId || matchNome;
    });
  }

  // Ordena pelo número oficial do rolo (decrescente ou crescente)
  return resultado.sort((a, b) => {
    const nA = parseInt(a.numero_rolo, 10);
    const nB = parseInt(b.numero_rolo, 10);
    if (!isNaN(nA) && !isNaN(nB)) return nB - nA;
    return a.numero_rolo.localeCompare(b.numero_rolo);
  });
}
