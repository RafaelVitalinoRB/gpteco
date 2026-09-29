import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Cpu, 
  Clock, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  Search, 
  Filter, 
  RefreshCw,
  Scale,
  Eye,
  Activity,
  User,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { OP, Rolo, MachineCode } from '../../../types';
import { supabase } from '../../../lib/supabase';

interface ProducaoModuleProps {
  activeSub: string;
  onNavigateSub: (sub: string) => void;
  onIrParaPesagem?: (roloId?: string) => void;
}

export function ProducaoModule({ activeSub, onNavigateSub, onIrParaPesagem }: ProducaoModuleProps) {
  const { ops, rolos } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMaquina, setFiltroMaquina] = useState<string>('TODAS');
  const [historicoLocal, setHistoricoLocal] = useState<any[]>([]);
  const [ocorrenciasList, setOcorrenciasList] = useState<any[]>([]);

  // Carrega histórico e ocorrências do storage e Supabase
  const carregarDadosProducao = async () => {
    try {
      const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
      if (raw) setHistoricoLocal(JSON.parse(raw));

      const { data: ocorrenciasData } = await supabase
        .from('rolo_ocorrencias')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(50);

      if (ocorrenciasData) {
        setOcorrenciasList(ocorrenciasData);
      } else {
        // Fallback local se houver
        const rawOcorrencias = localStorage.getItem('texlog_rolo_ocorrencias');
        if (rawOcorrencias) setOcorrenciasList(JSON.parse(rawOcorrencias));
      }
    } catch (e) {
      console.warn('Erro ao carregar dados de produção:', e);
    }
  };

  useEffect(() => {
    carregarDadosProducao();
    const interval = setInterval(carregarDadosProducao, 8000);
    return () => clearInterval(interval);
  }, []);

  // Máquinas do Sistema
  const maquinas: MachineCode[] = ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'];

  // Dados para Produções em Andamento
  const producoesEmAndamento = ops.filter(op => op.status === 'EM_ANDAMENTO' || op.status === 'PREPARANDO');

  // Rolos Aguardando Retirada
  const rolosAguardandoRetirada = rolos.filter(r => 
    r.status === 'AGUARDANDO_REVISAO' || r.status === 'RETIRADA_EM_ANDAMENTO'
  );

  // Rolos Aguardando Pesagem (unificado store + storage)
  const rolosAguardandoPesagem = (() => {
    const list = [...rolos.filter(r => r.status === 'AGUARDANDO_PESAGEM')];
    historicoLocal.forEach(h => {
      if ((h.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM' && !list.some(r => r.id === h.id || r.numeroRolo === h.numero_rolo)) {
        list.push({
          id: String(h.id),
          opId: String(h.op_id),
          opCodigo: h.op_codigo,
          numeroRolo: h.numero_rolo,
          clienteNome: h.cliente_nome,
          maquina: h.maquina,
          operadorNome: h.operador_nome || h.operadores_nomes,
          status: 'AGUARDANDO_PESAGEM',
          pesoEstimadoKg: h.peso_estimado_kg || 25,
          createdAt: h.finalizado_em || h.iniciado_em || new Date().toISOString(),
          updatedAt: h.atualizado_em || new Date().toISOString(),
          portadasTotal: h.voltas || 0,
          faltaRoleteTempo: 0,
          operadores: [],
          sequencia: 1
        });
      }
    });
    return list;
  })();

  return (
    <div className="space-y-6">
      
      {/* Barra de Submenus com Identidade Azul */}
      <div className="flex border-b border-neutral-800 overflow-x-auto gap-2 pb-2">
        {[
          { id: 'painel-maquinas', label: 'Painel das Máquinas', icon: Cpu },
          { id: 'em-andamento', label: 'Produções em Andamento', icon: Play, count: producoesEmAndamento.length },
          { id: 'aguardando-retirada', label: 'Rolos Aguardando Retirada', icon: Clock, count: rolosAguardandoRetirada.length },
          { id: 'aguardando-pesagem', label: 'Rolos Aguardando Pesagem', icon: Scale, count: rolosAguardandoPesagem.length, alert: rolosAguardandoPesagem.length > 0 },
          { id: 'historico-producao', label: 'Histórico de Produção', icon: Layers },
          { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle, count: ocorrenciasList.length }
        ].map(sub => {
          const isActive = activeSub === sub.id;
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => onNavigateSub(sub.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {typeof sub.count === 'number' && sub.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  isActive ? 'bg-white text-blue-900' : sub.alert ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {sub.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Nota informativa de conformidade da Sprint */}
      <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-300 block">Modo Acompanhamento da Produção</span>
            <p className="text-[11px] text-neutral-400">
              O Escritório acompanha toda a fábrica em tempo real sem alterar a produção dos operadores.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider">Tempo Real</span>
        </div>
      </div>

      {/* 1. PAINEL DAS MÁQUINAS */}
      {activeSub === 'painel-maquinas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {maquinas.map((maqNome, idx) => {
              const opAtiva = ops.find(o => o.maquina === maqNome && (o.status === 'EM_ANDAMENTO' || o.status === 'PREPARANDO'));
              const isRodando = !!opAtiva && opAtiva.status === 'EM_ANDAMENTO';
              const isPreparando = !!opAtiva && opAtiva.status === 'PREPARANDO';
              const rolosDestaOp = rolos.filter(r => r.opId === opAtiva?.id);
              const roloEmProducao = rolosDestaOp.find(r => r.status === 'EM_PRODUCAO');

              return (
                <div 
                  key={maqNome}
                  className={`bg-neutral-900 border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all ${
                    isRodando 
                      ? 'border-emerald-500/40 shadow-emerald-500/5' 
                      : isPreparando 
                        ? 'border-amber-500/40' 
                        : 'border-neutral-800'
                  }`}
                >
                  {/* Top Bar do Card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isRodando 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                          : isPreparando 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                            : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base tracking-tight">{maqNome}</h3>
                        <span className="text-[10px] text-neutral-400 font-mono">Tear Circular / Fita</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                      isRodando 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                        : isPreparando 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                          : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isRodando ? 'bg-emerald-400 animate-ping' : isPreparando ? 'bg-amber-400' : 'bg-neutral-600'}`}></span>
                      {isRodando ? 'RODANDO' : isPreparando ? 'PREPARANDO' : 'AGUARDANDO'}
                    </span>
                  </div>

                  {/* Informações da Produção em Andamento */}
                  {opAtiva ? (
                    <div className="space-y-3.5 bg-neutral-950/60 p-4 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Ordem de Produção</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-400 text-sm">{opAtiva.codigo}</span>
                          <span className="text-xs text-neutral-300 font-bold truncate max-w-[120px]">{opAtiva.tituloFio}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Tipo Fio</span>
                          <span className="font-medium text-white uppercase text-[11px] truncate block">{opAtiva.tipoFio}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Meta Produção</span>
                          <span className="font-mono font-bold text-white">{opAtiva.qtdRolos} rolo(s)</span>
                        </div>
                      </div>

                      {roloEmProducao && (
                        <div className="bg-blue-950/30 p-2.5 rounded-lg border border-blue-500/20">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-blue-300 font-medium">No Tear:</span>
                            <span className="font-mono font-bold text-white">Rolo {roloEmProducao.sequencia} de {opAtiva.qtdRolos}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
                            <span>Status:</span>
                            <span className="text-emerald-400 font-mono">Em Enrolamento</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-neutral-950/30 rounded-xl border border-dashed border-neutral-800">
                      <span className="text-xs text-neutral-500 block">Nenhuma OP em andamento</span>
                      <span className="text-[10px] text-neutral-600 block mt-1">Aguardando programação</span>
                    </div>
                  )}

                  {/* Rodapé do Card com Operador */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-[11px]">{opAtiva ? 'Operador em Turno' : 'Disponível'}</span>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-300">
                      {isRodando ? 'Velocidade Normal' : 'Standby'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PRODUÇÕES EM ANDAMENTO */}
      {activeSub === 'em-andamento' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-400" />
              Ordens de Produção Ativas no Chão de Fábrica
            </h3>
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              {producoesEmAndamento.length} ativas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">OP</th>
                  <th className="px-6 py-4 font-medium">Máquina</th>
                  <th className="px-6 py-4 font-medium">Título do Fio & Tipo</th>
                  <th className="px-6 py-4 font-medium">Progresso dos Rolos</th>
                  <th className="px-6 py-4 font-medium">Metragem / Voltas</th>
                  <th className="px-6 py-4 font-medium text-center">Urgência</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {producoesEmAndamento.map(op => {
                  const rolosOp = rolos.filter(r => r.opId === op.id);
                  const concluidos = rolosOp.filter(r => r.status === 'PESADO' || r.status === 'EM_ESTOQUE' || r.status === 'ROMANEADO' || r.status === 'EXPEDIDO').length;
                  const pct = op.qtdRolos > 0 ? Math.round((concluidos / op.qtdRolos) * 100) : 0;

                  return (
                    <tr key={op.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-400">
                        {op.codigo}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        <span className="px-2 py-1 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-mono">
                          {op.maquina}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{op.tituloFio}</div>
                        <div className="text-xs text-neutral-400 uppercase">{op.tipoFio} • {op.totalFios} fios</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-40">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-mono text-white font-bold">{concluidos} / {op.qtdRolos}</span>
                            <span className="font-mono text-neutral-400">{pct}%</span>
                          </div>
                          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        {op.metros ? `${op.metros.toLocaleString('pt-BR')} m` : op.voltas ? `${op.voltas.toLocaleString('pt-BR')} voltas` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          op.urgencia === 'ALTA' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          op.urgencia === 'MEDIA' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {op.urgencia}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          {op.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {producoesEmAndamento.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                      Nenhuma produção em andamento no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ROLOS AGUARDANDO RETIRADA */}
      {activeSub === 'aguardando-retirada' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Rolos Concluídos no Tear Aguardando Retirada Física
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Identificação temporária no chão de fábrica para controle do operador ("Rolo X de Y").
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              {rolosAguardandoRetirada.length} aguardando
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Identificação Operador</th>
                  <th className="px-6 py-4 font-medium">Máquina</th>
                  <th className="px-6 py-4 font-medium">OP Vinculada</th>
                  <th className="px-6 py-4 font-medium">Portadas / Metros</th>
                  <th className="px-6 py-4 font-medium">Peso Estimado</th>
                  <th className="px-6 py-4 font-medium text-right">Fase Operacional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {rolosAguardandoRetirada.map(r => {
                  const op = ops.find(o => o.id === r.opId);
                  return (
                    <tr key={r.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-white text-sm">
                          Rolo {r.sequencia} de {op?.qtdRolos || '?'}
                        </span>
                        <span className="block text-[11px] text-neutral-500">Controle Provisório do Tear</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        {r.maquina || op?.maquina || 'MAQUINA'}
                      </td>
                      <td className="px-6 py-4 font-mono text-blue-400 font-bold">
                        {op?.codigo || 'OP-—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        {r.portadasTotal} portadas
                      </td>
                      <td className="px-6 py-4 font-mono text-emerald-400">
                        ~{r.pesoEstimadoKg.toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          {r.status === 'AGUARDANDO_REVISAO' ? 'Aguardando Revisão' : 'Retirada em Andamento'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {rolosAguardandoRetirada.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      Nenhum rolo aguardando retirada no tear no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ROLOS AGUARDANDO PESAGEM */}
      {activeSub === 'aguardando-pesagem' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                Rolos Retirados da Máquina Aguardando Pesagem Oficial
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Após confirmação da pesagem, o sistema atribuirá automaticamente o Número Oficial definitivo.
              </p>
            </div>
            <button
              onClick={() => onIrParaPesagem ? onIrParaPesagem() : onNavigateSub('pesagem')}
              className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <span>Abrir Balança de Pesagem</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Controle Produção</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Máquina</th>
                  <th className="px-6 py-4 font-medium">OP</th>
                  <th className="px-6 py-4 font-medium">Finalizado em</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {rolosAguardandoPesagem.map(r => (
                  <tr key={r.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-white text-sm">
                        {r.numeroRolo ? `Rolo ${r.numeroRolo}` : `Rolo ${r.sequencia}`}
                      </span>
                      <span className="block text-[11px] text-amber-400/90 font-mono">Fila de Pesagem</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {r.clienteNome || 'RB Souza'}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-neutral-300">
                      {r.maquina || 'MAQUINA'}
                    </td>
                    <td className="px-6 py-4 font-mono text-blue-400 font-bold">
                      {r.opCodigo || r.opId || '—'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                      {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onIrParaPesagem ? onIrParaPesagem(r.id) : onNavigateSub('pesagem')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Pesar Rolo
                      </button>
                    </td>
                  </tr>
                ))}

                {rolosAguardandoPesagem.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      Nenhum rolo aguardando pesagem no momento. Todos foram pesados e estão em estoque!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. HISTÓRICO DE PRODUÇÃO */}
      {activeSub === 'historico-producao' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Histórico Completo de Rolos Produzidos
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Buscar por rolo, cliente ou OP..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Nº Oficial Rolo</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">OP</th>
                  <th className="px-6 py-4 font-medium">Título do Fio</th>
                  <th className="px-6 py-4 font-medium text-right">Peso Líquido</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {historicoLocal
                  .filter(item => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      String(item.numero_rolo || '').toLowerCase().includes(term) ||
                      String(item.cliente_nome || '').toLowerCase().includes(term) ||
                      String(item.op_codigo || '').toLowerCase().includes(term)
                    );
                  })
                  .slice(0, 50)
                  .map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-black text-white text-base">
                        {item.numero_rolo}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-200">
                        {item.cliente_nome || 'Cliente'}
                      </td>
                      <td className="px-6 py-4 font-mono text-blue-400 font-bold">
                        {item.op_codigo || (item.op_id ? `OP-${item.op_id}` : '—')}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-mono text-neutral-300 font-semibold">{item.titulo_fio}</span>
                        <span className="block text-neutral-500">{item.cor}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400 text-right">
                        {item.peso_real_kg ? `${Number(item.peso_real_kg).toFixed(2)} kg` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                          {item.status || 'CONCLUÍDO'}
                        </span>
                      </td>
                    </tr>
                  ))}

                {historicoLocal.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      Nenhum histórico de produção registrado até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. OCORRÊNCIAS */}
      {activeSub === 'ocorrencias' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Registro de Ocorrências e Paradas da Produção
            </h3>
            <span className="text-xs font-mono text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-full">
              {ocorrenciasList.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Data / Horário</th>
                  <th className="px-6 py-4 font-medium">Fase</th>
                  <th className="px-6 py-4 font-medium">Rolo / OP</th>
                  <th className="px-6 py-4 font-medium">Operador</th>
                  <th className="px-6 py-4 font-medium">Descrição da Ocorrência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {ocorrenciasList.map((oc, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                      {oc.criado_em ? new Date(oc.criado_em).toLocaleString('pt-BR') : oc.horario || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono">
                        {oc.fase_ocorrencia || 'PRODUÇÃO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white text-xs">
                      {oc.numero_rolo || '—'}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {oc.operador_nome || 'Operador'}
                    </td>
                    <td className="px-6 py-4 text-white text-xs">
                      {oc.ocorrencia || 'Parada operacional registrada'}
                    </td>
                  </tr>
                ))}

                {ocorrenciasList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      Nenhuma ocorrência registrada pela equipe de produção. Fábrica operando normalmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
