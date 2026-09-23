import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useOperadores } from '../../hooks/useOperadores';
import { 
  Activity, 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  BarChart3,
  Users,
  History
} from 'lucide-react';
import { format, isToday, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';

export default function MaquinasProgramador() {
  const { ops, rolos, clientes, eventosProducao } = useStore();
  const { operadores } = useOperadores();
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  const maquinas = ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'];

  const getMachineStats = (maquina: string) => {
    const rolosDaMaquina = rolos.filter(r => {
      const op = ops.find(o => o.id === r.opId);
      return op?.maquina === maquina;
    });

    const activeRolo = rolosDaMaquina.find(r => r.status === 'EM_ANDAMENTO' || r.status === 'PARADO');
    const activeOP = activeRolo ? ops.find(o => o.id === activeRolo.opId) : null;
    const activeCliente = activeOP ? clientes.find(c => c.id === activeOP.clienteId) : null;
    
    const eventsOfRolo = activeRolo ? eventosProducao.filter(e => e.roloId === activeRolo.id) : [];
    const lastEvent = eventsOfRolo.slice().reverse().find(e => e.operadorId);
    const activeOperador = lastEvent ? operadores.find(o => o.id === lastEvent.operadorId) : null;

    const rolosHoje = rolosDaMaquina.filter(r => r.finalizadoEm && isToday(new Date(r.finalizadoEm)));
    
    const kgHoje = rolosHoje.reduce((acc, r) => {
      const op = ops.find(o => o.id === r.opId);
      if (op && op.pesoEstimadoKg) {
        return acc + (op.pesoEstimadoKg / (op.qtdRolos || 1));
      }
      return acc;
    }, 0);

    const tempoParadoHoje = rolosDaMaquina.reduce((acc, r) => {
      const events = eventosProducao.filter(e => e.roloId === r.id);
      const teveAtividadeHoje = events.some(e => isToday(new Date(e.createdAt)));
      if (teveAtividadeHoje) {
        return acc + (r.faltaRoleteTempo || 0);
      }
      return acc;
    }, 0);

    const paradasHoje = rolosDaMaquina.reduce((acc, r) => {
      const events = eventosProducao.filter(e => e.roloId === r.id);
      const paradas = events.filter(e => e.tipoEvento === 'FALTA_ROLETE' && isToday(new Date(e.createdAt))).length || 0;
      return acc + paradas;
    }, 0);

    return {
      status: activeRolo ? (activeRolo.status === 'PARADO' ? 'PARADA' : 'PRODUZINDO') : 'DISPONÍVEL',
      op: activeOP,
      cliente: activeCliente,
      operador: activeOperador,
      rolosHoje: rolosHoje.length,
      kgHoje,
      tempoParadoHoje,
      paradasHoje,
      activeRolo
    };
  };

  const getDetailedStats = (maquina: string) => {
    const rolosDaMaquina = rolos.filter(r => {
      const op = ops.find(o => o.id === r.opId);
      return op?.maquina === maquina;
    });

    const filterByInterval = (start: Date, end: Date) => 
      rolosDaMaquina.filter(r => r.finalizadoEm && isWithinInterval(new Date(r.finalizadoEm), { start, end }));

    const hoje = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
    const semana = { start: startOfWeek(new Date()), end: endOfWeek(new Date()) };
    const mes = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

    const producaoDiaria = filterByInterval(hoje.start, hoje.end).length;
    const producaoSemanal = filterByInterval(semana.start, semana.end).length;
    const producaoMensal = filterByInterval(mes.start, mes.end).length;

    const historicoOPs = ops.filter(o => o.maquina === maquina).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 10);

    const operadoresAtuaram = Array.from(new Set(
      rolosDaMaquina.flatMap(r => r.operadores.map(o => o.operadorId))
    )).map(id => operadores.find(o => o.id === id)).filter(Boolean);

    const rolosFinalizados = rolosDaMaquina.filter(r => r.status === 'FINALIZADO').length;
    const tempoParadoTotal = rolosDaMaquina.reduce((acc, r) => acc + (r.faltaRoleteTempo || 0), 0);

    return {
      producaoDiaria,
      producaoSemanal,
      producaoMensal,
      historicoOPs,
      operadoresAtuaram,
      rolosFinalizados,
      tempoParadoTotal
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Monitoramento de Máquinas</h1>
          <p className="text-neutral-400 mt-1">Acompanhamento em tempo real da produção</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {maquinas.map(m => {
          const stats = getMachineStats(m);
          return (
            <div 
              key={m}
              onClick={() => setSelectedMachine(m)}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                    stats.status === 'PRODUZINDO' ? "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10" :
                    stats.status === 'PARADA' ? "bg-red-500/10 text-red-500 shadow-red-500/10" :
                    "bg-neutral-800 text-neutral-400"
                  )}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{m}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        stats.status === 'PRODUZINDO' ? "bg-emerald-500 animate-pulse" :
                        stats.status === 'PARADA' ? "bg-red-500" :
                        "bg-neutral-500"
                      )}></span>
                      <span className="text-sm font-medium text-neutral-400">{stats.status}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-neutral-600 group-hover:text-blue-500 transition-colors" />
              </div>

              {stats.op ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                      <span className="text-xs text-neutral-500 block mb-1">OP em Produção</span>
                      <span className="text-sm font-bold text-white">{stats.op.codigo}</span>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                      <span className="text-xs text-neutral-500 block mb-1">Cliente</span>
                      <span className="text-sm font-bold text-blue-400 truncate block">{stats.cliente?.nomeFantasia}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                      <span className="text-xs text-neutral-500 block mb-1">Título do Fio</span>
                      <span className="text-sm font-bold text-white">{stats.op.tituloFio}</span>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                      <span className="text-xs text-neutral-500 block mb-1">Operador Atual</span>
                      <span className="text-sm font-bold text-purple-400">{stats.operador?.nome || 'Não identificado'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[104px] flex items-center justify-center bg-neutral-950/50 rounded-xl border border-dashed border-neutral-800">
                  <p className="text-neutral-500 text-sm italic">Nenhuma OP ativa no momento</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-neutral-800">
                <div className="text-center">
                  <span className="text-lg font-bold text-white block">{stats.rolosHoje}</span>
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Rolos/Dia</span>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-emerald-500 block">{stats.kgHoje.toFixed(1)}</span>
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Kg/Dia</span>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-orange-500 block">{stats.tempoParadoHoje}m</span>
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Parado</span>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-red-500 block">{stats.paradasHoje}</span>
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Paradas</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMachine && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Relatório Detalhado: {selectedMachine}</h2>
                  <p className="text-neutral-400 text-sm">Visão geral histórica e desempenho</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMachine(null)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-neutral-400">Produção (Rolos)</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-neutral-500">Hoje</span>
                      <span className="text-xl font-bold text-white">{getDetailedStats(selectedMachine).producaoDiaria}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-neutral-500">Semana</span>
                      <span className="text-xl font-bold text-white">{getDetailedStats(selectedMachine).producaoSemanal}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-neutral-500">Mês</span>
                      <span className="text-xl font-bold text-white">{getDetailedStats(selectedMachine).producaoMensal}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-neutral-400">Total Produzido</span>
                  </div>
                  <div className="text-center py-4">
                    <span className="text-4xl font-bold text-white">{getDetailedStats(selectedMachine).rolosFinalizados}</span>
                    <span className="text-neutral-500 ml-2">rolos</span>
                    <p className="text-xs text-neutral-500 mt-2">Acumulado total da máquina</p>
                  </div>
                </div>

                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span className="text-sm font-medium text-neutral-400">Tempo Parado</span>
                  </div>
                  <div className="text-center py-4">
                    <span className="text-4xl font-bold text-white">{getDetailedStats(selectedMachine).tempoParadoTotal}</span>
                    <span className="text-neutral-500 ml-2">minutos</span>
                    <p className="text-xs text-neutral-500 mt-2">Acumulado total da máquina</p>
                  </div>
                </div>

                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium text-neutral-400">Operadores</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getDetailedStats(selectedMachine).operadoresAtuaram.map(op => (
                      <span key={op?.id} className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-xs text-neutral-300">
                        {op?.nome}
                      </span>
                    ))}
                    {getDetailedStats(selectedMachine).operadoresAtuaram.length === 0 && (
                      <p className="text-xs text-neutral-600 italic">Nenhum operador registrado</p>
                    )}
                  </div>
                </div>
              </div>

              {/* History Table */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <History className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-bold text-white">Últimas 10 OPs na Máquina</h3>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-900 text-neutral-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Fio</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {getDetailedStats(selectedMachine).historicoOPs.map(op => {
                        const cliente = clientes.find(c => c.id === op.clienteId);
                        return (
                          <tr key={op.id} className="hover:bg-neutral-900/50 transition-colors">
                            <td className="px-6 py-4 text-neutral-400">
                              {format(new Date(op.createdAt), 'dd/MM/yy HH:mm')}
                            </td>
                            <td className="px-6 py-4 font-bold text-white">{op.codigo}</td>
                            <td className="px-6 py-4 text-blue-400">{cliente?.nomeFantasia}</td>
                            <td className="px-6 py-4 text-neutral-300">{op.tituloFio}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                op.status === 'FINALIZADA' ? "bg-emerald-500/10 text-emerald-500" :
                                op.status === 'EM_ANDAMENTO' ? "bg-blue-500/10 text-blue-500" :
                                "bg-neutral-800 text-neutral-400"
                              )}>
                                {op.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {getDetailedStats(selectedMachine).historicoOPs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-neutral-600 italic">
                            Nenhum histórico encontrado para esta máquina.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-800 flex justify-end">
              <button 
                onClick={() => setSelectedMachine(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
