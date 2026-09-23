import React, { useState, useEffect, useMemo } from 'react';
import { Scale, Search, Clock, CheckCircle2, AlertCircle, RefreshCw, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { generateId } from '../../lib/utils';
import { Rolo } from '../../types';

export interface RoloPesagemItem {
  id: string;
  op_id?: string | number | null;
  op_codigo?: string;
  numero_rolo: string;
  cliente_nome?: string;
  maquina?: string;
  operador_nome?: string;
  status: string;
  peso_real_kg?: number | null;
  peso_bruto_kg?: number | null;
  tara_kg?: number | null;
  criado_em?: string;
  finalizado_em?: string;
  portadas_total?: number;
  observacoes?: string;
}

export const FilaRolosAguardandoPesagem: React.FC = () => {
  const { user, rolos: storeRolos, updateRolo, ops: storeOps, clientes: storeClientes, addEventoProducao } = useStore();
  const [rolos, setRolos] = useState<RoloPesagemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroAba, setFiltroAba] = useState<'AGUARDANDO' | 'PESADOS'>('AGUARDANDO');

  // Modal de Pesagem
  const [modalPesagemAberta, setModalPesagemAberta] = useState(false);
  const [roloSelecionado, setRoloSelecionado] = useState<RoloPesagemItem | null>(null);
  const [pesoBruto, setPesoBruto] = useState<number | ''>('');
  const [tara, setTara] = useState<number | ''>(5); // Padrão 5kg de rolete se não informado
  const [observacoes, setObservacoes] = useState('');

  // Cálculo automático do peso líquido
  const pesoLiquido = useMemo(() => {
    const b = Number(pesoBruto) || 0;
    const t = Number(tara) || 0;
    return Math.max(0, Number((b - t).toFixed(2)));
  }, [pesoBruto, tara]);

  // Carregar dados unificados do Supabase, LocalStorage e Store
  const carregarRolos = async () => {
    setIsLoading(true);
    try {
      // 1. Carregar do localStorage
      let localItems: RoloPesagemItem[] = [];
      try {
        const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (raw) {
          localItems = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Erro ao carregar do localStorage:', e);
      }

      // 2. Carregar do Supabase
      let supabaseItems: RoloPesagemItem[] = [];
      try {
        const { data, error } = await supabase
          .from('rolos')
          .select('*, ordens_producao!rolos_op_id_fkey(id, codigo, cliente_id, clientes!ordens_producao_cliente_id_fkey(nome_fantasia, razao_social))')
          .order('criado_em', { ascending: false })
          .limit(100);

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
              peso_bruto_kg: r.peso_bruto_kg,
              tara_kg: r.tara_kg,
              criado_em: r.criado_em || r.finalizado_em,
              portadas_total: r.portadas_total,
              observacoes: r.observacoes
            };
          });
        } else {
          // Fallback sem join
          const fallback = await supabase
            .from('rolos')
            .select('*')
            .order('criado_em', { ascending: false })
            .limit(100);

          if (!fallback.error && fallback.data) {
            supabaseItems = fallback.data.map((r: any) => ({
              id: r.id?.toString() || r.numero_rolo,
              op_id: r.op_id,
              op_codigo: r.op_id ? `OP-${r.op_id}` : '—',
              numero_rolo: r.numero_rolo || `ETQ-PROV-${r.id || 'ROLO'}`,
              status: r.status || 'AGUARDANDO_PESAGEM',
              peso_real_kg: r.peso_real_kg,
              peso_bruto_kg: r.peso_bruto_kg,
              tara_kg: r.tara_kg,
              criado_em: r.criado_em || r.finalizado_em,
              portadas_total: r.portadas_total
            }));
          }
        }
      } catch (errSupabase) {
        console.warn('Erro ao consultar rolos no Supabase:', errSupabase);
      }

      // 3. Mesclar com rolos da Store
      const storeItems: RoloPesagemItem[] = storeRolos.map(r => {
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
          peso_bruto_kg: r.pesoBrutoKg,
          tara_kg: r.taraKg,
          criado_em: r.finalizadoEm || r.createdAt,
          portadas_total: r.portadasTotal,
          observacoes: r.observacoes
        };
      });

      // 4. Unificar eliminando duplicidades
      const mapa = new Map<string, RoloPesagemItem>();

      localItems.forEach(item => {
        const chave = item.numero_rolo || item.id;
        if (chave) mapa.set(chave, item);
      });

      supabaseItems.forEach(item => {
        const chave = item.numero_rolo || item.id;
        if (chave) {
          const ex = mapa.get(chave);
          mapa.set(chave, {
            ...ex,
            ...item,
            cliente_nome: item.cliente_nome || ex?.cliente_nome,
            op_codigo: item.op_codigo || ex?.op_codigo
          });
        }
      });

      storeItems.forEach(item => {
        const chave = item.numero_rolo || item.id;
        if (chave) {
          const ex = mapa.get(chave);
          mapa.set(chave, {
            ...ex,
            ...item
          });
        }
      });

      const lista = Array.from(mapa.values()).sort((a, b) => {
        const dataA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
        const dataB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
        return dataB - dataA;
      });

      setRolos(lista);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarRolos();

    // Ouvinte em tempo real sem ação manual (Item 4)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'texlog_novo_rolo_pesagem' || e.key === 'texlog_historico_rolos_produzidos') {
        carregarRolos();
      }
    };

    const handleCustomEvent = () => {
      carregarRolos();
    };

    // Auto-poll a cada 5 segundos para garantir atualização sem reload
    const interval = setInterval(carregarRolos, 5000);

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('texlog_novo_rolo_pesagem', handleCustomEvent);
    window.addEventListener('texlog_reset_operacional', handleCustomEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('texlog_novo_rolo_pesagem', handleCustomEvent);
      window.removeEventListener('texlog_reset_operacional', handleCustomEvent);
    };
  }, []);

  // Filtragem dos rolos
  const rolosAguardando = useMemo(() => {
    return rolos.filter(r => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM');
  }, [rolos]);

  const rolosPesados = useMemo(() => {
    return rolos.filter(r => (r.status || '').toUpperCase() !== 'AGUARDANDO_PESAGEM');
  }, [rolos]);

  const listaExibicao = useMemo(() => {
    const base = filtroAba === 'AGUARDANDO' ? rolosAguardando : rolosPesados;
    const termo = busca.trim().toLowerCase();
    if (!termo) return base;

    return base.filter(r => {
      const num = (r.numero_rolo || '').toLowerCase();
      const op = (r.op_codigo || '').toLowerCase();
      const cli = (r.cliente_nome || '').toLowerCase();
      return num.includes(termo) || op.includes(termo) || cli.includes(termo);
    });
  }, [filtroAba, rolosAguardando, rolosPesados, busca]);

  const handleAbrirPesagem = (rolo: RoloPesagemItem) => {
    setRoloSelecionado(rolo);
    setPesoBruto('');
    setTara(5); // tara padrão de rolete
    setObservacoes('');
    setModalPesagemAberta(true);
  };

  const handleConfirmarPesagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roloSelecionado) return;
    if (!pesoBruto || Number(pesoBruto) <= 0) {
      toast.error('Informe o peso bruto do rolo');
      return;
    }

    const valorBruto = Number(pesoBruto);
    const valorTara = Number(tara) || 0;
    const valorLiquido = Math.max(0.1, Number((valorBruto - valorTara).toFixed(2)));
    const horarioPesagem = new Date().toISOString();

    try {
      // 1. Atualizar no Supabase
      try {
        await supabase
          .from('rolos')
          .update({
            status: 'PESADO',
            peso_real_kg: valorLiquido,
            peso_bruto_kg: valorBruto,
            tara_kg: valorTara,
            atualizado_em: horarioPesagem,
            observacoes: observacoes.trim() || undefined
          })
          .eq('numero_rolo', roloSelecionado.numero_rolo);
      } catch (errSupabase) {
        console.warn('Erro ao atualizar rolo no Supabase:', errSupabase);
      }

      // 2. Atualizar no LocalStorage
      try {
        const rawHist = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (rawHist) {
          const list = JSON.parse(rawHist);
          const updated = list.map((item: any) => {
            if (item.numero_rolo === roloSelecionado.numero_rolo || item.id === roloSelecionado.id) {
              return {
                ...item,
                status: 'PESADO',
                peso_real_kg: valorLiquido,
                peso_bruto_kg: valorBruto,
                tara_kg: valorTara
              };
            }
            return item;
          });
          localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(updated));
          window.dispatchEvent(new Event('texlog_novo_rolo_pesagem'));
        }
      } catch (e) {
        console.warn('Erro ao atualizar localStorage:', e);
      }

      // 3. Atualizar no Zustand Store
      const storeRolo = storeRolos.find(r => String(r.numeroRolo) === roloSelecionado.numero_rolo || r.id === roloSelecionado.id);
      if (storeRolo) {
        updateRolo(storeRolo.id, {
          status: 'PESADO',
          pesoRealKg: valorLiquido,
          pesoBrutoKg: valorBruto,
          taraKg: valorTara
        });
      }

      // 4. Registrar evento de auditoria
      addEventoProducao({
        id: generateId(),
        opId: String(roloSelecionado.op_id || 'OP'),
        roloId: roloSelecionado.id,
        operadorId: 'escritorio',
        machineCode: (roloSelecionado.maquina as any) || 'MAQUINA 1',
        tipoEvento: 'FINALIZAR_ROLO',
        portadasNoEvento: roloSelecionado.portadas_total || 0,
        timestampInicio: horarioPesagem,
        observacao: `Pesagem concluída no Escritório: ${valorLiquido} kg (Bruto: ${valorBruto}kg, Tara: ${valorTara}kg)`,
        createdAt: horarioPesagem
      });

      // Atualizar estado local
      setRolos(prev => prev.map(r => {
        if (r.numero_rolo === roloSelecionado.numero_rolo || r.id === roloSelecionado.id) {
          return {
            ...r,
            status: 'PESADO',
            peso_real_kg: valorLiquido,
            peso_bruto_kg: valorBruto,
            tara_kg: valorTara
          };
        }
        return r;
      }));

      toast.success(`Pesagem registrada com sucesso! Rolo ${roloSelecionado.numero_rolo}: ${valorLiquido} kg`, {
        icon: '⚖️',
        duration: 4000
      });

      setModalPesagemAberta(false);
      setRoloSelecionado(null);
    } catch (err: any) {
      toast.error('Erro ao registrar pesagem: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const formatarData = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Resumo da Fila */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
              Aguardando Pesagem
            </span>
            <span className="text-3xl font-black text-amber-400 font-mono mt-1 block">
              {rolosAguardando.length}
            </span>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Rolos liberados da produção
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-blue-500/30 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
              Rolos Já Pesados
            </span>
            <span className="text-3xl font-black text-blue-400 font-mono mt-1 block">
              {rolosPesados.length}
            </span>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Prontos para faturamento / expedição
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
              Sincronização
            </span>
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Tempo Real Ativo
            </span>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Recebe novos rolos automaticamente
            </span>
          </div>
          <button
            type="button"
            onClick={carregarRolos}
            disabled={isLoading}
            className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
            title="Atualizar dados agora"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controles: Abas Internas e Busca */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFiltroAba('AGUARDANDO')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              filtroAba === 'AGUARDANDO'
                ? 'bg-amber-500/20 border border-amber-500 text-amber-300 shadow-md'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Aguardando Pesagem ({rolosAguardando.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroAba('PESADOS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              filtroAba === 'PESADOS'
                ? 'bg-blue-500/20 border border-blue-500 text-blue-300 shadow-md'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Histórico de Pesados ({rolosPesados.length})</span>
          </button>
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Rolo, OP ou Cliente..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Rolos */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-bold">Número do Rolo</th>
                <th className="px-6 py-4 font-bold">OP</th>
                <th className="px-6 py-4 font-bold">Cliente</th>
                <th className="px-6 py-4 font-bold">Máquina / Operador</th>
                <th className="px-6 py-4 font-bold">Retirado Em</th>
                <th className="px-6 py-4 font-bold">Portadas</th>
                <th className="px-6 py-4 font-bold">Peso Real</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {listaExibicao.length > 0 ? (
                listaExibicao.map((item) => (
                  <tr key={item.id || item.numero_rolo} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-black text-white whitespace-nowrap">
                      {item.numero_rolo}
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                      {item.op_codigo || (item.op_id ? `OP-${item.op_id}` : '—')}
                    </td>

                    <td className="px-6 py-4 text-white font-medium max-w-[180px] truncate" title={item.cliente_nome}>
                      {item.cliente_nome || 'Cliente'}
                    </td>

                    <td className="px-6 py-4 text-xs text-neutral-300 whitespace-nowrap">
                      <div className="font-bold text-white">{item.maquina || 'Urdideira'}</div>
                      <div className="text-neutral-500">{item.operador_nome || 'Operador'}</div>
                    </td>

                    <td className="px-6 py-4 text-xs text-neutral-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        {formatarData(item.criado_em)}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-neutral-200">
                      {item.portadas_total || '—'}
                    </td>

                    <td className="px-6 py-4 font-mono font-bold whitespace-nowrap">
                      {item.peso_real_kg ? (
                        <span className="text-emerald-400 text-base">{item.peso_real_kg} kg</span>
                      ) : (
                        <span className="text-neutral-500 italic text-xs">Pendente</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status === 'AGUARDANDO_PESAGEM' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                          <Scale className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          <span>AGUARDANDO PESAGEM</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>{item.status}</span>
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {item.status === 'AGUARDANDO_PESAGEM' ? (
                        <button
                          type="button"
                          onClick={() => handleAbrirPesagem(item)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/40 flex items-center gap-1.5 ml-auto transition-all active:scale-95 cursor-pointer"
                        >
                          <Scale className="w-4 h-4" />
                          <span>Pesar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAbrirPesagem(item)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                        >
                          <span>Revisar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-neutral-500 space-y-3">
                    <Scale className="w-12 h-12 mx-auto text-neutral-600 mb-2" />
                    <p className="text-base font-bold text-neutral-300 uppercase tracking-wider">
                      {filtroAba === 'AGUARDANDO' 
                        ? 'Nenhum rolo aguardando pesagem no momento' 
                        : 'Nenhum rolo pesado registrado'}
                    </p>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto">
                      {filtroAba === 'AGUARDANDO'
                        ? 'Assim que o operador concluir a retirada de um rolo na fábrica, ele aparecerá automaticamente aqui.'
                        : 'Os rolos com pesagem confirmada aparecerão listados aqui para histórico.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REGISTRAR PESAGEM DO ROLO */}
      {modalPesagemAberta && roloSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    Registrar Pesagem do Rolo
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    {roloSelecionado.numero_rolo} • {roloSelecionado.op_codigo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPesagemAberta(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dados do Rolo */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block uppercase text-[10px] font-bold">Cliente</span>
                <span className="text-white font-bold truncate block">{roloSelecionado.cliente_nome || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block uppercase text-[10px] font-bold">Portadas Realizadas</span>
                <span className="text-neutral-200 font-mono font-bold">{roloSelecionado.portadas_total || '—'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmarPesagem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Peso Bruto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Peso Bruto (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={pesoBruto}
                    onChange={(e) => setPesoBruto(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 85.4"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-mono text-lg font-bold focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <span className="text-[10px] text-neutral-500">Rolo + rolete na balança</span>
                </div>

                {/* Tara do Rolete */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Tara do Rolete (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tara}
                    onChange={(e) => setTara(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 5.0"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-mono text-lg font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-neutral-500">Peso do rolete vazio</span>
                </div>
              </div>

              {/* Resultado: Peso Líquido */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                    Peso Líquido Calculado
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    (Peso Bruto - Tara do Rolete)
                  </span>
                </div>
                <div className="text-3xl font-black font-mono text-emerald-300">
                  {pesoLiquido.toFixed(2)} <span className="text-sm">kg</span>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Observações da Pesagem (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Rolete conferido, fio sem avarias..."
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPesagemAberta(false)}
                  className="w-1/3 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Pesagem</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
