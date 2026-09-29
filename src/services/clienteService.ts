import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Cliente, OP, Rolo } from '../types';

export interface ClienteOficial {
  id: string;
  idNum: number;
  nome: string;
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

export interface OpClienteOption {
  id: string;
  codigo: string;
  clienteId: string;
  maquina: string;
  status: string;
  unidadeProducao: 'METROS' | 'VOLTAS';
  metros?: number;
  voltas?: number;
  tituloFio?: string;
  tipoFio?: string;
  totalFios?: number;
}

export interface RoloOpOption {
  id: string;
  opId: string;
  numeroRolo: string;
  status: string;
  pesoRealKg?: number;
  metros?: number;
  voltas?: number;
}

export interface FioClienteOption {
  id: string;
  clienteId: string;
  tituloFio: string;
  tipoFio: string;
  cor?: string;
}

/**
 * Consulta diretamente a tabela oficial de clientes no Supabase.
 * Retorna todos os clientes ativos ordenados alfabeticamente.
 * NÃO utiliza a tabela de entradas de matéria-prima.
 */
export async function fetchClientesOficiais(): Promise<ClienteOficial[]> {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome');

    if (error) {
      console.warn('Erro ao consultar tabela oficial clientes:', error);
      throw error;
    }

    const rawList: any[] = data || [];

    // Filtrar apenas clientes ativos (status !== 'INATIVO' e !== 'DESATIVADO')
    const ativos = rawList.filter(c => {
      const st = (c.status || '').toString().trim().toUpperCase();
      return st !== 'INATIVO' && st !== 'DESATIVADO';
    });

    // Ordenar alfabeticamente pelo nome de exibição (nome_fantasia ou nome ou razao_social)
    ativos.sort((a, b) => {
      const nomeA = (a.nome_fantasia || a.nome || a.razao_social || '').trim();
      const nomeB = (b.nome_fantasia || b.nome || b.razao_social || '').trim();
      return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
    });

    const normalized: ClienteOficial[] = ativos.map((c: any) => ({
      id: c.id?.toString() || '',
      idNum: Number(c.id) || 0,
      nome: c.nome || c.razao_social || c.nome_fantasia || 'Cliente Sem Nome',
      razaoSocial: c.razao_social || c.nome || '',
      nomeFantasia: c.nome_fantasia || c.nome || c.razao_social || '',
      cnpj: c.cnpj || '',
      ie: c.ie || '',
      cep: c.cep || '',
      endereco: c.endereco || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      contato: c.contato || '',
      telefone: c.telefone || '',
      email: c.email || '',
      observacoesComerciais: c.observacoes_comerciais || '',
      valorCobrado: Number(c.valor_por_rolo) || 0,
      tipoCobranca: (c.tipo_cobranca as any) === 'METRO' ? 'METRO' : 'ROLO',
      status: 'ATIVO',
      createdAt: c.criado_em || c.created_at || '',
      updatedAt: c.atualizado_em || c.criado_em || ''
    }));

    // Sincronizar com o useStore para que todo o ERP compartilhe a mesma origem oficial
    try {
      useStore.setState({ clientes: normalized as any });
    } catch {}

    // Disparar evento para componentes ouvintes
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('texlog_clientes_updated', { detail: normalized }));
      }
    } catch {}

    return normalized;
  } catch (err) {
    console.error('Falha ao buscar clientes oficiais, buscando fallback do store:', err);
    // Fallback: usar os clientes do store se disponíveis
    const storeClientes = useStore.getState().clientes || [];
    return (storeClientes as any[]).map(c => ({
      id: c.id?.toString() || '',
      idNum: Number(c.id) || 0,
      nome: c.nome || c.razaoSocial || c.nomeFantasia || '',
      razaoSocial: c.razaoSocial || '',
      nomeFantasia: c.nomeFantasia || '',
      cnpj: c.cnpj || '',
      ie: c.ie || '',
      cep: c.cep || '',
      endereco: c.endereco || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      contato: c.contato || '',
      telefone: c.telefone || '',
      email: c.email || '',
      observacoesComerciais: c.observacoesComerciais || '',
      valorCobrado: Number(c.valorCobrado) || 0,
      tipoCobranca: c.tipoCobranca || 'ROLO',
      status: c.status || 'ATIVO',
      createdAt: c.createdAt || '',
      updatedAt: c.updatedAt || ''
    }));
  }
}

/**
 * Carrega APENAS as OPs pertencentes ao cliente selecionado.
 * Consulta a tabela oficial ordens_producao no Supabase e mescla com OPs do store.
 */
export async function fetchOpsPorCliente(clienteId: string | number): Promise<OpClienteOption[]> {
  if (!clienteId) return [];

  const cidStr = clienteId.toString().trim();
  const cidNum = Number(clienteId);

  const opsMap = new Map<string, OpClienteOption>();

  // 1. Consultar ordens_producao no Supabase
  try {
    let query = supabase.from('ordens_producao').select('*');
    if (!isNaN(cidNum) && cidNum > 0) {
      query = query.eq('cliente_id', cidNum);
    }

    const { data, error } = await query.order('id', { ascending: false });

    if (!error && data) {
      data.forEach((o: any) => {
        const opCid = o.cliente_id?.toString() || '';
        if (opCid === cidStr || (!isNaN(cidNum) && Number(opCid) === cidNum)) {
          const key = o.id?.toString() || o.codigo;
          opsMap.set(key, {
            id: o.id?.toString() || '',
            codigo: o.codigo || `OP-${o.id}`,
            clienteId: opCid,
            maquina: o.maquina || 'MAQUINA 1',
            status: o.status || 'PENDENTE',
            unidadeProducao: o.unidade_producao === 'VOLTAS' ? 'VOLTAS' : 'METROS',
            metros: o.metros != null ? Number(o.metros) : undefined,
            voltas: o.voltas != null ? Number(o.voltas) : undefined,
            tituloFio: o.titulo_fio || '',
            tipoFio: o.tipo_fio || '',
            totalFios: o.total_fios != null ? Number(o.total_fios) : undefined
          });
        }
      });
    }
  } catch (err) {
    console.warn('Erro ao consultar ordens_producao no Supabase:', err);
  }

  // 2. Mesclar com OPs locais do store (caso existam OPs adicionadas localmente)
  try {
    const storeOps = useStore.getState().ops || [];
    storeOps.forEach(o => {
      const opCid = o.clienteId?.toString() || '';
      if (opCid === cidStr || (!isNaN(cidNum) && Number(opCid) === cidNum)) {
        const key = o.id || o.codigo;
        if (!opsMap.has(key)) {
          opsMap.set(key, {
            id: o.id,
            codigo: o.codigo,
            clienteId: o.clienteId,
            maquina: o.maquina,
            status: o.status,
            unidadeProducao: o.unidadeProducao,
            metros: o.metros,
            voltas: o.voltas,
            tituloFio: o.tituloFio,
            tipoFio: o.tipoFio,
            totalFios: o.totalFios
          });
        }
      }
    });
  } catch {}

  const result = Array.from(opsMap.values());
  // Ordenar decrescente por código ou id
  result.sort((a, b) => b.codigo.localeCompare(a.codigo));
  return result;
}

/**
 * Carrega APENAS os rolos da OP selecionada.
 * Consulta a tabela oficial rolos no Supabase e mescla com histórico local.
 */
export async function fetchRolosPorOp(opId: string | number): Promise<RoloOpOption[]> {
  if (!opId) return [];

  const opIdStr = opId.toString().trim();
  const opIdNum = Number(opId);

  const rolosMap = new Map<string, RoloOpOption>();

  // 1. Consultar rolos no Supabase
  try {
    let query = supabase.from('rolos').select('*');
    if (!isNaN(opIdNum) && opIdNum > 0) {
      query = query.eq('op_id', opIdNum);
    }

    const { data, error } = await query.order('id', { ascending: true });

    if (!error && data) {
      data.forEach((r: any) => {
        const rOpId = r.op_id?.toString() || '';
        if (rOpId === opIdStr || (!isNaN(opIdNum) && Number(rOpId) === opIdNum)) {
          const key = r.id?.toString() || r.numero_rolo;
          rolosMap.set(key, {
            id: r.id?.toString() || '',
            opId: rOpId,
            numeroRolo: r.numero_rolo || `Rolo-${r.id}`,
            status: (r.status || 'AGUARDANDO_PESAGEM').toUpperCase(),
            pesoRealKg: r.peso_real != null ? Number(r.peso_real) : (r.peso_bruto ? Number(r.peso_bruto) : undefined),
            metros: r.metros != null ? Number(r.metros) : undefined,
            voltas: r.voltas != null ? Number(r.voltas) : undefined
          });
        }
      });
    }
  } catch (err) {
    console.warn('Erro ao consultar rolos no Supabase:', err);
  }

  // 2. Mesclar com histórico local do localStorage (texlog_historico_rolos_produzidos)
  try {
    const rawLocal = localStorage.getItem('texlog_historico_rolos_produzidos');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        parsed.forEach((r: any) => {
          const rOpId = (r.op_id || r.opId || '').toString();
          if (rOpId === opIdStr || (!isNaN(opIdNum) && Number(rOpId) === opIdNum)) {
            const num = r.numero_rolo || r.numeroRolo || r.id;
            const key = String(num);
            if (!rolosMap.has(key)) {
              rolosMap.set(key, {
                id: String(r.id || key),
                opId: rOpId,
                numeroRolo: String(num),
                status: (r.status || 'AGUARDANDO_PESAGEM').toUpperCase(),
                pesoRealKg: r.pesoLiquidoKg || r.pesoRealKg || r.peso_real || undefined,
                metros: r.metros,
                voltas: r.voltas
              });
            }
          }
        });
      }
    }
  } catch {}

  // 3. Mesclar com rolos do store
  try {
    const storeRolos = useStore.getState().rolos || [];
    storeRolos.forEach(r => {
      const rOpId = r.opId?.toString() || '';
      if (rOpId === opIdStr || (!isNaN(opIdNum) && Number(rOpId) === opIdNum)) {
        const key = r.id || String(r.numeroRolo);
        if (!rolosMap.has(key)) {
          rolosMap.set(key, {
            id: r.id,
            opId: r.opId,
            numeroRolo: String(r.numeroRolo),
            status: r.status,
            pesoRealKg: r.pesoRealKg,
            metros: (r as any).metros,
            voltas: (r as any).voltas
          });
        }
      }
    });
  } catch {}

  const result = Array.from(rolosMap.values());
  // Ordenar por número do rolo
  result.sort((a, b) => a.numeroRolo.localeCompare(b.numeroRolo, undefined, { numeric: true }));
  return result;
}

/**
 * Carrega títulos de fios pertencentes ao cliente selecionado.
 */
export async function fetchFiosPorCliente(clienteId: string | number): Promise<FioClienteOption[]> {
  if (!clienteId) return [];

  const cidStr = clienteId.toString().trim();
  const cidNum = Number(clienteId);

  const fiosMap = new Map<string, FioClienteOption>();

  // 1. Consultar titulos_fio no Supabase
  try {
    let query = supabase.from('titulos_fio').select('*');
    if (!isNaN(cidNum) && cidNum > 0) {
      query = query.eq('cliente_id', cidNum);
    }
    const { data, error } = await query;
    if (!error && data) {
      data.forEach((t: any) => {
        const key = `${t.titulo}_${t.tipo}`;
        fiosMap.set(key, {
          id: t.id?.toString() || '',
          clienteId: t.cliente_id?.toString() || cidStr,
          tituloFio: t.titulo || '',
          tipoFio: t.tipo || '',
          cor: t.cor || ''
        });
      });
    }
  } catch (err) {
    console.warn('Erro ao consultar titulos_fio:', err);
  }

  // 2. Mesclar com fiosCliente do store
  try {
    const storeFios = useStore.getState().fiosCliente || [];
    storeFios.forEach(f => {
      if (f.clienteId?.toString() === cidStr) {
        const key = `${f.tituloFio}_${f.tipoFio}`;
        if (!fiosMap.has(key)) {
          fiosMap.set(key, {
            id: f.id,
            clienteId: f.clienteId,
            tituloFio: f.tituloFio,
            tipoFio: f.tipoFio,
            cor: f.cor
          });
        }
      }
    });
  } catch {}

  return Array.from(fiosMap.values());
}
