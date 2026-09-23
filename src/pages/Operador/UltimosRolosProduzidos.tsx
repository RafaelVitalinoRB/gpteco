import React, { useState, useMemo, useEffect } from 'react';
import { Search, History, Scale, CheckCircle2, Box, Truck, FileText, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { RoloStatus } from '../../types';

export interface RoloHistoricoItem {
  id: string;
  op_id?: string | number | null;
  op_codigo?: string;
  numero_rolo: string;
  cliente_nome?: string;
  maquina?: string;
  operador_nome?: string;
  status: RoloStatus | string;
  peso_real_kg?: number | null;
  criado_em?: string;
  data_hora_formatada?: string;
  portadas_total?: number;
}

interface UltimosRolosProduzidosProps {
  maquinaAtual?: string;
}

export const UltimosRolosProduzidos: React.FC<UltimosRolosProduzidosProps> = ({ maquinaAtual }) => {
  const { rolos: storeRolos, ops: storeOps, clientes: storeClientes } = useStore();
  const [busca, setBusca] = useState('');
  const [rolosHistorico, setRolosHistorico] = useState<RoloHistoricoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar histórico dos últimos 50 rolos do Supabase e LocalStorage
  const carregarHistorico = async () => {
    setIsLoading(true);
    try {
      // 1. Carregar do localStorage
      let localItems: RoloHistoricoItem[] = [];
      try {
        const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (raw) {
          localItems = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Erro ao ler historico do localStorage:', e);
      }

      // 2. Carregar do Supabase tabela public.rolos
      let supabaseItems: RoloHistoricoItem[] = [];
      try {
        const { data, error } = await supabase
          .from('rolos')
          .select('*, ordens_producao!rolos_op_id_fkey(id, codigo, cliente_id, clientes!ordens_producao_cliente_id_fkey(nome_fantasia, razao_social))')
          .order('criado_em', { ascending: false })
          .limit(50);

        if (!error && data) {
          supabaseItems = data.map((r: any) => {
            const opObj = r.ordens_producao;
            const opCodigo = opObj?.codigo || (r.op_id ? `OP-${r.op_id}` : '—');
            const cliObj = opObj?.clientes;
            const clienteNome = cliObj?.nome_fantasia || cliObj?.razao_social || 'Cliente';

            return {
              id: r.id?.toString() || r.numero_rolo,
              op_id: r.op_id,
              op_codigo: opCodigo,
              numero_rolo: r.numero_rolo || `ETQ-PROV-${r.id || 'ROLO'}`,
              cliente_nome: clienteNome,
              status: r.status || 'AGUARDANDO_PESAGEM',
              peso_real_kg: r.peso_real_kg,
              criado_em: r.criado_em || r.finalizado_em,
              portadas_total: r.portadas_total
            };
          });
        } else {
          // Fallback sem join
          const fallback = await supabase
            .from('rolos')
            .select('*')
            .order('criado_em', { ascending: false })
            .limit(50);

          if (!fallback.error && fallback.data) {
            supabaseItems = fallback.data.map((r: any) => ({
              id: r.id?.toString() || r.numero_rolo,
              op_id: r.op_id,
              op_codigo: r.op_id ? `OP-${r.op_id}` : '—',
              numero_rolo: r.numero_rolo || `ETQ-PROV-${r.id || 'ROLO'}`,
              status: r.status || 'AGUARDANDO_PESAGEM',
              peso_real_kg: r.peso_real_kg,
              criado_em: r.criado_em || r.finalizado_em,
              portadas_total: r.portadas_total
            }));
          }
        }
      } catch (errSupabase) {
        console.warn('Erro ao buscar rolos no Supabase:', errSupabase);
      }

      // 3. Mesclar com rolos da Store
      const storeItems: RoloHistoricoItem[] = storeRolos.map(r => {
        const op = storeOps.find(o => o.id === r.opId);
        const cli = storeClientes.find(c => c.id === op?.clienteId);
        return {
          id: r.id,
          op_id: r.opId,
          op_codigo: r.opCodigo || op?.codigo || `OP-${r.opId}`,
          numero_rolo: String(r.numeroRolo),
          cliente_nome: r.clienteNome || cli?.nomeFantasia || cli?.razaoSocial || 'Cliente',
          maquina: r.maquina,
          operador_nome: r.operadorNome,
          status: r.status,
          peso_real_kg: r.pesoRealKg,
          criado_em: r.finalizadoEm || r.createdAt,
          portadas_total: r.portadasTotal
        };
      });

      // 4. Unificar eliminando duplicatas por numero_rolo ou id
      const mapa = new Map<string, RoloHistoricoItem>();

      // Primeiro insere locais
      localItems.forEach(item => {
        const chave = item.numero_rolo || item.id;
        if (chave) mapa.set(chave, item);
      });

      // Em seguida Supabase
      supabaseItems.forEach(item => {
        const chave = item.numero_rolo || item.id;
        if (chave) {
          const existente = mapa.get(chave);
          mapa.set(chave, {
            ...existente,
            ...item,
            cliente_nome: item.cliente_nome || existente?.cliente_nome,
            op_codigo: item.op_codigo || existente?.op_codigo
          });
        }
      });

      // Em seguida Store
      storeItems.forEach(item => {
        const chave = item.numero_rolo || item.id;
        if (chave) {
          const existente = mapa.get(chave);
          mapa.set(chave, {
            ...existente,
            ...item
          });
        }
      });

      // Ordenar por data decrescente e limitar aos últimos 50
      const listaFinal = Array.from(mapa.values())
        .sort((a, b) => {
          const dataA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
          const dataB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
          return dataB - dataA;
        })
        .slice(0, 50);

      setRolosHistorico(listaFinal);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();

    // Ouvir novos rolos finalizados na máquina ou via storage
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'texlog_historico_rolos_produzidos' || e.key === 'texlog_novo_rolo_pesagem') {
        carregarHistorico();
      }
    };

    const handleCustomEvent = () => {
      carregarHistorico();
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('texlog_novo_rolo_pesagem', handleCustomEvent);
    window.addEventListener('texlog_historico_atualizado', handleCustomEvent);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('texlog_machine_channel');
      bc.onmessage = () => {
        carregarHistorico();
      };
    } catch {}

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('texlog_novo_rolo_pesagem', handleCustomEvent);
      window.removeEventListener('texlog_historico_atualizado', handleCustomEvent);
      if (bc) bc.close();
    };
  }, [storeRolos]);

  // Filtragem por Número do rolo ou OP
  const rolosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return rolosHistorico;

    return rolosHistorico.filter(r => {
      const numRolo = (r.numero_rolo || '').toLowerCase();
      const opCod = (r.op_codigo || '').toLowerCase();
      return numRolo.includes(termo) || opCod.includes(termo);
    });
  }, [busca, rolosHistorico]);

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'AGUARDANDO_PESAGEM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
            <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>AGUARDANDO PESAGEM</span>
          </span>
        );
      case 'PESADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>PESADO</span>
          </span>
        );
      case 'EM_ESTOQUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
            <Box className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>EM ESTOQUE</span>
          </span>
        );
      case 'ROMANEADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold">
            <Truck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>ROMANEADO</span>
          </span>
        );
      case 'FATURADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono text-[11px] font-bold">
            <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>FATURADO</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 border border-white/10 text-neutral-300 font-mono text-[11px] font-bold">
            <span>{s || 'FINALIZADO'}</span>
          </span>
        );
    }
  };

  const formatarDataHora = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section className="bg-[#12161f] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 mt-8">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                Últimos Rolos Produzidos
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-800 text-neutral-300 border border-white/10">
                {rolosHistorico.length} {rolosHistorico.length === 1 ? 'rolo' : 'rolos'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Consulta rápida dos últimos 50 rolos concluídos pela produção
            </p>
          </div>
        </div>

        {/* Barra de Pesquisa e Recarregar */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por Número do Rolo ou OP..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={carregarHistorico}
            disabled={isLoading}
            title="Atualizar lista"
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabela de Consulta Rápida */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="bg-[#181d28] uppercase text-[11px] font-bold text-neutral-400 border-b border-white/10 tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Número do Rolo</th>
              <th className="px-4 py-3.5">OP</th>
              <th className="px-4 py-3.5">Cliente</th>
              <th className="px-4 py-3.5">Data e Hora</th>
              <th className="px-4 py-3.5">Status Atual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rolosFiltrados.length > 0 ? (
              rolosFiltrados.map((item) => (
                <tr
                  key={item.id || item.numero_rolo}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  {/* Número do rolo ou etiqueta provisória */}
                  <td className="px-4 py-3.5 font-mono font-black text-white text-sm whitespace-nowrap">
                    {item.numero_rolo ? (
                      <span className="text-emerald-400">{item.numero_rolo}</span>
                    ) : (
                      <span className="text-amber-300 italic">
                        ETQ-PROV-{item.id?.slice(0, 8) || 'ROLO'}
                      </span>
                    )}
                  </td>

                  {/* OP */}
                  <td className="px-4 py-3.5 font-mono font-bold text-neutral-200 whitespace-nowrap">
                    {item.op_codigo || (item.op_id ? `OP-${item.op_id}` : '—')}
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3.5 font-medium text-neutral-300 max-w-[200px] truncate" title={item.cliente_nome}>
                    {item.cliente_nome || '—'}
                  </td>

                  {/* Data e Hora */}
                  <td className="px-4 py-3.5 text-neutral-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      {formatarDataHora(item.criado_em)}
                    </span>
                  </td>

                  {/* Status Atual */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {renderStatusBadge(item.status)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-neutral-500 space-y-2">
                  <p className="text-sm font-bold text-neutral-400">
                    {busca ? 'Nenhum rolo encontrado para esta busca.' : 'Nenhum rolo produzido registrado no histórico recente.'}
                  </p>
                  {busca && (
                    <button
                      type="button"
                      onClick={() => setBusca('')}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Limpar filtro de pesquisa
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
