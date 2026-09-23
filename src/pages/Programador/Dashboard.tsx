import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useOperadores } from '../../hooks/useOperadores';
import { Activity, Play, CheckCircle, Clock, X, TrendingUp, Users, Package, Scale, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function DashboardProgramador() {
  const { ops, rolos, clientes, eventosProducao } = useStore();
  const { operadores } = useOperadores();
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [liveStatusMap, setLiveStatusMap] = useState<Record<string, any>>({});

  const maquinas = ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'];

  // SPRINT 2.4.2: Sincronização em Tempo Real com o Painel do Operador
  useEffect(() => {
    // 1. Carregar estado salvo de cada máquina
    const loadSavedStatus = () => {
      const updated: Record<string, any> = {};
      maquinas.forEach(m => {
        try {
          const raw = localStorage.getItem(`texlog_live_status_${m}`);
          if (raw) {
            updated[m] = JSON.parse(raw);
          }
        } catch {}
      });
      setLiveStatusMap(prev => ({ ...prev, ...updated }));
    };

    loadSavedStatus();

    // 2. Ouvir canal BroadcastChannel do navegador (sincronização entre abas)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('texlog_machine_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'RESET_OPERACIONAL') {
          setLiveStatusMap({});
          return;
        }
        if (event.data && event.data.maquina) {
          setLiveStatusMap(prev => ({
            ...prev,
            [event.data.maquina]: event.data
          }));
        }
      };
    } catch {}

    // 3. Ouvir Supabase Realtime Broadcast
    const channel = supabase
      .channel('producao_maquinas_realtime')
      .on('broadcast', { event: 'machine_status_update' }, ({ payload }) => {
        if (payload?.reset) {
          setLiveStatusMap({});
          return;
        }
        if (payload && payload.maquina) {
          setLiveStatusMap(prev => ({
            ...prev,
            [payload.maquina]: payload
          }));
        }
      })
      .subscribe();

    const handleResetEvent = () => {
      setLiveStatusMap({});
    };
    window.addEventListener('texlog_reset_operacional', handleResetEvent);

    // 4. Polling periódico a cada 2s para sincronização suave
    const interval = setInterval(loadSavedStatus, 2000);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      supabase.removeChannel(channel);
      window.removeEventListener('texlog_reset_operacional', handleResetEvent);
    };
  }, []);

  const getMachineStats = (maquina: string) => {
    const today = new Date().toISOString().split('T')[0];
    const rolosMaqHoje = rolos.filter(r => {
      const op = ops.find(o => o.id === r.opId);
      return op?.maquina === maquina && r.finalizadoEm?.startsWith(today);
    });

    let kgHoje = 0;
    let tempoParado = 0;
    const paradasEventosCount = eventosProducao.filter(ev => 
      ev.machineCode === maquina && 
      ev.tipoEvento === 'FALTA_ROLETE' && 
      ev.timestampInicio.startsWith(today)
    ).length;

    rolosMaqHoje.forEach(r => {
      const op = ops.find(o => o.id === r.opId);
      if (op?.pesoEstimadoKg) {
        kgHoje += op.pesoEstimadoKg / op.qtdRolos;
      }
      tempoParado += r.faltaRoleteTempo || 0;
    });

    const opAtiva = ops.find(op => {
      if (op.maquina !== maquina) return false;
      const status = (op.status || '').toUpperCase();
      if (status === 'FINALIZADA' || status === 'AGUARDANDO_PESAGEM' || status === 'CANCELADA') return false;
      const qPlan = Number(op.quantidade_planejada ?? op.qtdRolos ?? 1);
      const qProd = Number(op.quantidade_produzida ?? 0);
      if (qProd >= qPlan) return false;
      return true;
    });
    const cliente = opAtiva ? clientes.find(c => c.id === opAtiva.clienteId) : null;
    const roloAtivo = opAtiva ? rolos.find(r => r.opId === opAtiva.id && (r.status === 'EM_ANDAMENTO' || r.status === 'PARADO')) : null;
    
    let operadorAtivo = null;
    if (roloAtivo && roloAtivo.operadores.length > 0) {
      const lastOperadorId = roloAtivo.operadores[roloAtivo.operadores.length - 1].operadorId;
      operadorAtivo = operadores.find(o => o.id === lastOperadorId);
    }

    return { 
      op: opAtiva, 
      cliente, 
      rolo: roloAtivo, 
      operador: operadorAtivo,
      rollsCount: rolosMaqHoje.length,
      kgHoje: kgHoje.toFixed(2),
      tempoParado,
      paradasCount: paradasEventosCount
    };
  };

  const metrics = useMemo(() => {
    // ... metrics calculation ...
    const today = new Date().toISOString().split('T')[0];
    
    const rolosHoje = rolos.filter(r => r.status === 'FINALIZADO' && r.finalizadoEm?.startsWith(today));
    
    let kgHoje = 0;
    const maquinaCount: Record<string, number> = {};
    const operadorCount: Record<string, number> = {};

    rolosHoje.forEach(rolo => {
      const op = ops.find(o => o.id === rolo.opId);
      if (op) {
        if (op.pesoEstimadoKg) {
          kgHoje += op.pesoEstimadoKg / op.qtdRolos;
        }
        maquinaCount[op.maquina] = (maquinaCount[op.maquina] || 0) + 1;
      }

      rolo.operadores.forEach(opRolo => {
        operadorCount[opRolo.operadorId] = (operadorCount[opRolo.operadorId] || 0) + opRolo.portadas;
      });
    });

    let maquinaMaisProdutiva = '-';
    let maxRolos = 0;
    Object.entries(maquinaCount).forEach(([maquina, count]) => {
      if (count > maxRolos) {
        maxRolos = count;
        maquinaMaisProdutiva = maquina;
      }
    });

    let operadorMaisProdutivo = '-';
    let maxPortadas = 0;
    Object.entries(operadorCount).forEach(([opId, portadas]) => {
      if (portadas > maxPortadas) {
        maxPortadas = portadas;
        const op = operadores.find(o => o.id === opId);
        if (op) operadorMaisProdutivo = op.nome;
      }
    });

    return {
      rolosProduzidos: rolosHoje.length,
      kgProduzidos: kgHoje.toFixed(2),
      maquinaMaisProdutiva,
      operadorMaisProdutivo
    };
  }, [rolos, ops, operadores]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-neutral-400 mt-2">Visão geral da produção</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">Rolos Hoje</p>
            <p className="text-2xl font-bold text-white">{metrics.rolosProduzidos}</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">KG Produzidos Hoje</p>
            <p className="text-2xl font-bold text-white">{metrics.kgProduzidos} kg</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">Operador Destaque</p>
            <p className="text-lg font-bold text-white truncate">{metrics.operadorMaisProdutivo}</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">Máquina Destaque</p>
            <p className="text-lg font-bold text-white">{metrics.maquinaMaisProdutiva}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {maquinas.map((maquina) => {
          const stats = getMachineStats(maquina);
          const live = liveStatusMap[maquina];
          
          let statusColor = 'bg-neutral-800/50 border-neutral-800';
          let badgeColor = 'text-neutral-400 bg-neutral-800';
          let dotColor = 'bg-neutral-500';
          let statusText = 'LIVRE';
          let isPulse = false;

          const isProduzindoLive = live?.status === 'PRODUZINDO';
          const isAguardandoOP = live?.status === 'OPERADOR_SELECIONADO';
          const isSetupLive = live?.status === 'OP_SELECIONADA' || live?.status === 'CONFERENCIA';
          const isProxRoloLive = live?.status === 'PROXIMO_ROLO';
          const isFinalizadaLive = live?.status === 'OP_FINALIZADA';

          if (isProduzindoLive) {
            statusColor = 'bg-emerald-500/10 border-emerald-500/30';
            badgeColor = 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 font-bold';
            dotColor = 'bg-emerald-400';
            statusText = 'PRODUZINDO';
            isPulse = true;
          } else if (isProxRoloLive) {
            statusColor = 'bg-blue-500/10 border-blue-500/30';
            badgeColor = 'text-blue-300 bg-blue-500/20 border border-blue-500/30 font-bold';
            dotColor = 'bg-blue-400';
            statusText = 'PRÓXIMO ROLO';
            isPulse = true;
          } else if (isSetupLive) {
            statusColor = 'bg-yellow-500/10 border-yellow-500/30';
            badgeColor = 'text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 font-bold';
            dotColor = 'bg-yellow-400';
            statusText = 'CONFERÊNCIA';
          } else if (isAguardandoOP) {
            statusColor = 'bg-amber-500/10 border-amber-500/30';
            badgeColor = 'text-amber-300 bg-amber-500/20 border border-amber-500/30 font-bold';
            dotColor = 'bg-amber-400';
            statusText = 'AGUARDANDO OP';
          } else if (isFinalizadaLive) {
            statusColor = 'bg-purple-500/10 border-purple-500/30';
            badgeColor = 'text-purple-300 bg-purple-500/20 border border-purple-500/30 font-bold';
            dotColor = 'bg-purple-400';
            statusText = 'OP CONCLUÍDA';
          } else if (stats.op) {
            if (stats.rolo?.status === 'EM_ANDAMENTO') {
              statusColor = 'bg-emerald-500/10 border-emerald-500/20';
              badgeColor = 'text-emerald-400 bg-emerald-400/10';
              dotColor = 'bg-emerald-400';
              statusText = 'RODANDO';
              isPulse = true;
            } else if (stats.rolo?.status === 'PARADO') {
              statusColor = 'bg-red-500/10 border-red-500/20';
              badgeColor = 'text-red-400 bg-red-400/10';
              dotColor = 'bg-red-400';
              statusText = 'PARADA';
            } else {
              statusColor = 'bg-yellow-500/10 border-yellow-500/20';
              badgeColor = 'text-yellow-400 bg-yellow-400/10';
              dotColor = 'bg-yellow-400';
              statusText = 'SETUP';
            }
          }

          // Operador ativo (preferência do live)
          const operadorDisplay = live?.operadorNome || stats.operador?.nome;
          const clienteDisplay = live?.clienteNome || stats.cliente?.nomeFantasia;
          const opDisplay = live?.opCodigo ? `OP ${live.opCodigo}` : stats.op?.codigo;

          return (
            <div 
              key={maquina} 
              onClick={() => setSelectedMachine(maquina)}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden transition-all flex flex-col cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
            >
              <div className={`p-4 border-b ${statusColor}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{maquina}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${badgeColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isPulse ? 'animate-pulse' : ''}`}></span>
                      {statusText}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {(isProduzindoLive || isSetupLive || stats.op) ? (
                  <>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Produção Atual</span>
                      <p className="text-white font-bold leading-tight mt-0.5 truncate">{clienteDisplay || 'Cliente em Produção'}</p>
                      <p className="text-blue-400 text-sm font-medium">{opDisplay}</p>
                    </div>

                    {operadorDisplay && (
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Operador em Linha</span>
                        <p className="text-emerald-400 text-sm font-bold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {operadorDisplay}
                        </p>
                      </div>
                    )}

                    {/* Telemetria ao Vivo de Portadas e Tempo */}
                    {isProduzindoLive && live && (
                      <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-400 font-bold uppercase text-[10px]">
                            Portada {String(live.portadaAtual).padStart(2, '0')} de {String(live.totalPortadas).padStart(2, '0')}
                          </span>
                          <span className="font-mono text-emerald-400 font-black text-xs">
                            {live.progressoPercentual}%
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${live.progressoPercentual}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-0.5">
                          <span className="flex items-center gap-1 text-blue-400">
                            <Clock className="w-3 h-3" />
                            {live.tempoProducao || '00:00:00'}
                          </span>
                          {live.ocorrenciasCount > 0 && (
                            <span className="flex items-center gap-1 text-amber-400 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              {live.ocorrenciasCount} oc.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : isAguardandoOP ? (
                  <div className="py-3 space-y-2">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Operador Conectado</span>
                      <p className="text-amber-400 text-sm font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {operadorDisplay}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-400 italic">Aguardando seleção de Ordem de Produção...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-neutral-600">
                    <Clock className="w-6 h-6 mb-2 opacity-50" />
                    <p className="text-xs uppercase font-bold tracking-widest">Sem Operador</p>
                  </div>
                )}

                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase font-black block">Rolos Dia</span>
                    <span className="text-white font-bold">{stats.rollsCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase font-black block">KG Dia</span>
                    <span className="text-white font-bold">{stats.kgHoje}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase font-black block">T. Parado</span>
                    <span className="text-orange-500 font-bold">{stats.tempoParado} min</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase font-black block">Nº Paradas</span>
                    <span className="text-red-500 font-bold">{stats.paradasCount}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMachine(null)}></div>
          <div className="relative bg-[#14181f] border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">{selectedMachine}</h2>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Resumo Gerencial e Telemetria em Tempo Real</p>
              </div>
              <button 
                onClick={() => setSelectedMachine(null)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {(() => {
                const stats = getMachineStats(selectedMachine);
                const live = liveStatusMap[selectedMachine];
                
                // Produção Períodos
                const calculatePeriodProd = (days: number) => {
                  const now = new Date();
                  const startDateString = new Date(now.setDate(now.getDate() - days)).toISOString().split('T')[0];
                  
                  const periodRolos = rolos.filter(r => {
                    const op = ops.find(o => o.id === r.opId);
                    return op?.maquina === selectedMachine && r.finalizadoEm && r.finalizadoEm >= startDateString && r.status === 'FINALIZADO';
                  });

                  let kg = 0;
                  periodRolos.forEach(r => {
                    const op = ops.find(o => o.id === r.opId);
                    if (op?.pesoEstimadoKg) kg += op.pesoEstimadoKg / op.qtdRolos;
                  });

                  return { count: periodRolos.length, kg: kg.toFixed(1) };
                };

                const prodDia = stats;
                const prodSemana = calculatePeriodProd(7);
                const prodMes = calculatePeriodProd(30);

                const clienteNome = live?.clienteNome || stats.cliente?.nomeFantasia;
                const opCodigo = live?.opCodigo || stats.op?.codigo;
                const operadorNome = live?.operadorNome || stats.operador?.nome;

                return (
                  <div className="space-y-8">
                    {/* Linha de Status Atual com Telemetria ao Vivo */}
                    {(live?.status === 'PRODUZINDO' || stats.op) ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">
                              {live?.status === 'PRODUZINDO' ? 'Produção Ativa (Ao Vivo)' : 'Produção em Curso'}
                            </span>
                          </div>
                          {live?.tempoProducao && (
                            <span className="font-mono text-sm font-black text-blue-400 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                              Tempo: {live.tempoProducao}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div>
                            <span className="text-neutral-500 text-[9px] font-black uppercase block mb-1">Cliente</span>
                            <p className="text-white font-bold">{clienteNome || 'Cliente'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-500 text-[9px] font-black uppercase block mb-1">OP / Fio</span>
                            <p className="text-white font-bold">{opCodigo || 'OP'}</p>
                            <p className="text-blue-400 text-xs font-bold uppercase">{live?.tituloFio || stats.op?.tituloFio || '—'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-500 text-[9px] font-black uppercase block mb-1">Rolo / Portadas</span>
                            <p className="text-white font-bold">{live?.roloAtual || `${stats.rolo?.numeroRolo || '1'} de ${stats.op?.qtdRolos || 1}`}</p>
                            {live && (
                              <p className="text-emerald-400 text-xs font-bold font-mono">
                                Portada {live.portadaAtual} / {live.totalPortadas} ({live.progressoPercentual}%)
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="text-neutral-500 text-[9px] font-black uppercase block mb-1">Operador Atual</span>
                            <p className="text-emerald-400 font-bold">{operadorNome || 'NÃO IDENTIFICADO'}</p>
                          </div>
                        </div>
                      </div>
                    ) : live?.status === 'OPERADOR_SELECIONADO' ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                          <span className="text-amber-400 text-xs font-black uppercase tracking-widest block mb-1">Operador Conectado</span>
                          <p className="text-white text-lg font-bold">{operadorNome}</p>
                        </div>
                        <span className="text-neutral-400 text-xs italic">Aguardando seleção de Ordem de Produção</span>
                      </div>
                    ) : (
                      <div className="bg-neutral-900 border border-white/5 rounded-2xl p-10 text-center">
                        <p className="text-neutral-600 font-black uppercase tracking-widest text-sm">Máquina em Standby - Sem operador ativo</p>
                      </div>
                    )}

                    {/* Estatísticas de Produção */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
                        <span className="text-neutral-500 text-[10px] font-black uppercase block mb-4">Produção Hoje</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white leading-none">{prodDia.kgHoje}</span>
                          <span className="text-neutral-500 text-xs font-bold">kg</span>
                        </div>
                        <p className="text-neutral-600 text-[11px] font-bold mt-2 uppercase">{prodDia.rollsCount} rolos fabricados</p>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
                        <span className="text-neutral-500 text-[10px] font-black uppercase block mb-4">Últimos 7 dias</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white leading-none">{prodSemana.kg}</span>
                          <span className="text-neutral-500 text-xs font-bold">kg</span>
                        </div>
                        <p className="text-neutral-600 text-[11px] font-bold mt-2 uppercase">{prodSemana.count} rolos fabricados</p>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
                        <span className="text-neutral-500 text-[10px] font-black uppercase block mb-4">Últimos 30 dias</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white leading-none">{prodMes.kg}</span>
                          <span className="text-neutral-500 text-xs font-bold">kg</span>
                        </div>
                        <p className="text-neutral-600 text-[11px] font-bold mt-2 uppercase">{prodMes.count} rolos fabricados</p>
                      </div>
                    </div>

                    {/* Histórico Recente de OPs */}
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        Histórico de OPs (Recente)
                      </h3>
                      <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-white/5 text-neutral-500 font-black uppercase tracking-tighter">
                              <th className="px-4 py-3">Data</th>
                              <th className="px-4 py-3">OP</th>
                              <th className="px-4 py-3">Cliente</th>
                              <th className="px-4 py-3">Ação</th>
                              <th className="px-4 py-3">Kg</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {ops
                              .filter(o => o.maquina === selectedMachine && o.status === 'FINALIZADA')
                              .sort((a, b) => (b.fim || '').localeCompare(a.fim || ''))
                              .slice(0, 5)
                              .map(o => {
                                const c = clientes.find(client => client.id === o.clienteId);
                                return (
                                  <tr key={o.id} className="text-neutral-400">
                                    <td className="px-4 py-3 font-medium">{o.fim?.split('T')[0]}</td>
                                    <td className="px-4 py-3 text-white font-bold">{o.codigo}</td>
                                    <td className="px-4 py-3">{c?.nomeFantasia}</td>
                                    <td className="px-4 py-3">{o.qtdRolos} rolos</td>
                                    <td className="px-4 py-3 text-emerald-500 font-bold">{o.pesoEstimadoKg?.toFixed(1) || '-'} kg</td>
                                  </tr>
                                );
                              })}
                            {ops.filter(o => o.maquina === selectedMachine && o.status === 'FINALIZADA').length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-neutral-600 font-bold uppercase">Nenhum histórico disponível</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
