import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Play, RotateCw, AlertTriangle, CheckSquare, History, ChevronLeft, Pause, Cylinder } from 'lucide-react';
import toast from 'react-hot-toast';
import RoloDetailsModal from '../../components/RoloDetailsModal';
import { cn, formatPeso, formatGramatura, generateId } from '../../lib/utils';
import { EventoProducao, Rolo } from '../../types';

export default function DashboardOperador() {
  const { 
    user, 
    ops, 
    rolos, 
    clientes, 
    operadores, 
    eventosProducao,
    updateRolo, 
    updateOP, 
    updateOperador, 
    addEventoProducao 
  } = useStore();
  
  const deviceConfig = useStore(state => state.deviceConfig);
  const isBoundMachine = deviceConfig?.isBound && deviceConfig.type === 'MAQUINA';
  
  const [selectedMachine, setSelectedMachine] = useState<string>(isBoundMachine ? (deviceConfig.machineId || 'MAQUINA 1') : (user?.machine || 'MAQUINA 1'));
  const [activeOPId, setActiveOPId] = useState<string | null>(null);
  const [activeRoloId, setActiveRoloId] = useState<string | null>(null);
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>('');
  const [isFaltaRolete, setIsFaltaRolete] = useState(false);
  const [producaoTempo, setProducaoTempo] = useState<string>('00:00:00');
  const [paradaTempo, setParadaTempo] = useState<string>('00:00:00');

  // Modal states
  const [isTrocaModalOpen, setIsTrocaModalOpen] = useState(false);
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [modalPesoReal, setModalPesoReal] = useState<string>('');
  const [modalNumeroRolo, setModalNumeroRolo] = useState<string>('');

  const maquina = selectedMachine;
  const opsDaMaquina = useMemo(() => {
    const urgencyOrder = { 'ALTA': 0, 'MEDIA': 1, 'BAIXA': 2 };
    return ops
      .filter(op => op.maquina === maquina && op.status !== 'FINALIZADA')
      .sort((a, b) => urgencyOrder[a.urgencia] - urgencyOrder[b.urgencia]);
  }, [ops, maquina]);

  const operadoresAtivos = operadores.filter(o => o.status === 'ATIVO' && o.maquinasAutorizadas.includes(maquina as any));

  // Timers logic
  useEffect(() => {
    const interval = setInterval(() => {
      const currentRolo = rolos.find(r => r.id === activeRoloId);
      if (!currentRolo) {
        setProducaoTempo('00:00:00');
        setParadaTempo('00:00:00');
        return;
      }

      const formatTime = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      if (currentRolo.status === 'EM_ANDAMENTO' && currentRolo.iniciadoEm) {
        const diff = new Date().getTime() - new Date(currentRolo.iniciadoEm).getTime();
        setProducaoTempo(formatTime(diff));
        setParadaTempo('00:00:00');
      } else if (currentRolo.status === 'PARADO' && currentRolo.faltaRoleteInicio) {
        const diff = new Date().getTime() - new Date(currentRolo.faltaRoleteInicio).getTime();
        setParadaTempo(formatTime(diff));
        setProducaoTempo('00:00:00');
      } else {
        setProducaoTempo('00:00:00');
        setParadaTempo('00:00:00');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRoloId, rolos]);

  useEffect(() => {
    if (!activeRoloId) {
      const roloEmAndamento = rolos.find(r => {
        if (r.status !== 'EM_ANDAMENTO' && r.status !== 'PARADO') return false;
        const op = ops.find(o => o.id === r.opId);
        return op?.maquina === maquina;
      });
      if (roloEmAndamento) {
        setActiveOPId(roloEmAndamento.opId);
        setActiveRoloId(roloEmAndamento.id);
        if (roloEmAndamento.status === 'PARADO') {
          setIsFaltaRolete(true);
        }
      }
    }
  }, [rolos, ops, maquina, activeRoloId]);

  const handleIniciarRolo = (opId: string, roloId: string) => {
    if (!selectedOperadorId) {
      toast.error('Selecione seu nome na lista de operadores');
      return;
    }
    setActiveOPId(opId);
    setActiveRoloId(roloId);
    setIsFaltaRolete(false);
    
    updateRolo(roloId, { 
      status: 'EM_ANDAMENTO', 
      iniciadoEm: new Date().toISOString() 
    });

    const currentRolo = rolos.find(r => r.id === roloId);
    addEventoProducao({
      id: generateId(),
      opId,
      roloId,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'INICIO_PRODUCAO',
      portadasNoEvento: currentRolo?.portadasTotal || 0,
      timestampInicio: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    
    const op = ops.find(o => o.id === opId);
    if (op && op.status === 'PENDENTE') {
      updateOP(opId, { status: 'EM_ANDAMENTO' });
    }
    
    toast.success('Produção iniciada!');
  };

  const handleIncrementPortada = () => {
    if (!activeRoloId || !selectedOperadorId) return;
    const rolo = rolos.find(r => r.id === activeRoloId);
    if (!rolo || rolo.status !== 'EM_ANDAMENTO') {
      toast.error('Produção deve estar ativa para registrar portadas');
      return;
    }

    // Update rolo total portadas
    updateRolo(activeRoloId, {
      portadasTotal: (rolo.portadasTotal || 0) + 1
    });

    // Update current operator portadas in the rolo record
    const opRelIndex = rolo.operadores.findIndex(o => o.operadorId === selectedOperadorId);
    if (opRelIndex >= 0) {
      const newOperadores = [...rolo.operadores];
      newOperadores[opRelIndex] = {
        ...newOperadores[opRelIndex],
        portadas: (newOperadores[opRelIndex].portadas || 0) + 1,
        data: new Date().toISOString()
      };
      updateRolo(activeRoloId, { operadores: newOperadores });
    } else {
      updateRolo(activeRoloId, {
        operadores: [...rolo.operadores, { 
          operadorId: selectedOperadorId, 
          portadas: 1,
          data: new Date().toISOString()
        }]
      });
    }
  };

  const [newOperadorId, setNewOperadorId] = useState('');

  const handleTrocaTurno = () => {
    if (!activeRoloId || !activeOPId) return;

    if (!newOperadorId) {
      toast.error('Selecione o novo operador');
      return;
    }

    if (newOperadorId === selectedOperadorId) {
      toast.error('Selecione um operador diferente do atual');
      return;
    }
    
    const rolo = rolos.find(r => r.id === activeRoloId);
    if (!rolo) return;

    const opAnterior = operadores.find(o => o.id === selectedOperadorId);
    const opAnteriorNome = opAnterior?.nome || 'Nenhum';
    const opNovo = operadores.find(o => o.id === newOperadorId);

    // Stop production manually to force new operator to "start"
    updateRolo(activeRoloId, {
      status: 'PARADO',
      faltaRoleteInicio: new Date().toISOString()
    });

    addEventoProducao({
      id: generateId(),
      opId: activeOPId,
      roloId: activeRoloId,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'TROCA_OPERADOR',
      portadasNoEvento: rolo.portadasTotal,
      timestampInicio: new Date().toISOString(),
      observacao: `Troca: ${opAnteriorNome} -> ${opNovo?.nome}`,
      createdAt: new Date().toISOString()
    });

    setSelectedOperadorId(newOperadorId);
    setNewOperadorId('');
    setIsTrocaModalOpen(false);
    setIsFaltaRolete(true);
    toast.success('Operador trocado. Clique em Retomar Produção para continuar.');
  };

  const handleFinalizarRolo = () => {
    if (!activeRoloId || !activeOPId || !selectedOperadorId) {
      toast.error('Dados incompletos para finalizar rolo');
      return;
    }
    
    const numeroRoloNum = modalNumeroRolo.trim();
    const pesoReal = parseFloat(modalPesoReal);

    if (!numeroRoloNum) {
      toast.error('Informe o número do rolo');
      return;
    }
    
    const rolo = rolos.find(r => r.id === activeRoloId);
    if (!rolo) return;

    updateRolo(activeRoloId, {
      status: 'FINALIZADO',
      finalizadoEm: new Date().toISOString(),
      numeroRolo: numeroRoloNum,
      pesoRealKg: isNaN(pesoReal) ? undefined : pesoReal
    });

    addEventoProducao({
      id: generateId(),
      opId: activeOPId,
      roloId: activeRoloId,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'FINALIZAR_ROLO',
      portadasNoEvento: rolo.portadasTotal,
      timestampInicio: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    // Check if OP is finished
    const rolosDaOP = rolos.filter(r => r.opId === activeOPId);
    const todosFinalizados = rolosDaOP.every(r => r.id === activeRoloId || r.status === 'FINALIZADO');
    
    if (todosFinalizados) {
      updateOP(activeOPId, { status: 'FINALIZADA', fim: new Date().toISOString() });
      toast.success('OP Finalizada com sucesso!');
      setActiveOPId(null);
      setActiveRoloId(null);
    } else {
      toast.success('Rolo finalizado!');
      // Abrir automaticamente o próximo
      const proximoRolo = rolosDaOP.find(r => r.id !== activeRoloId && r.status === 'PENDENTE');
      if (proximoRolo) {
        setActiveOPId(activeOPId);
        setActiveRoloId(proximoRolo.id);
        setIsFaltaRolete(false);
        updateRolo(proximoRolo.id, { 
          status: 'EM_ANDAMENTO', 
          iniciadoEm: new Date().toISOString() 
        });
        toast.success(`Rolo ${proximoRolo.numeroRolo} iniciado automaticamente!`);
      } else {
        setActiveOPId(null);
        setActiveRoloId(null);
      }
    }
    setModalNumeroRolo('');
    setModalPesoReal('');
    setIsFinalizarModalOpen(false);
  };

  const toggleFaltaRolete = () => {
    if (!activeRoloId || !activeOPId || !selectedOperadorId) return;
    
    const rolo = rolos.find(r => r.id === activeRoloId);
    if (!rolo) return;

    if (isFaltaRolete) {
      setIsFaltaRolete(false);
      
      let tempoParado = 0;
      if (rolo.faltaRoleteInicio) {
        const inicio = new Date(rolo.faltaRoleteInicio).getTime();
        const agora = new Date().getTime();
        tempoParado = Math.floor((agora - inicio) / 60000); // em minutos
      }

      updateRolo(activeRoloId, { 
        status: 'EM_ANDAMENTO',
        faltaRoleteTempo: (rolo.faltaRoleteTempo || 0) + tempoParado,
        faltaRoleteInicio: undefined,
        iniciadoEm: new Date().toISOString()
      });

      addEventoProducao({
        id: generateId(),
        opId: activeOPId,
        roloId: activeRoloId,
        operadorId: selectedOperadorId,
        machineCode: maquina as any,
        tipoEvento: 'RETOMADA_PRODUCAO',
        portadasNoEvento: rolo.portadasTotal,
        timestampInicio: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      updateOP(activeOPId, { status: 'EM_ANDAMENTO' });
      toast.success('Produção retomada.');
    } else {
      setIsFaltaRolete(true);
      updateRolo(activeRoloId, { 
        status: 'PARADO',
        faltaRoleteInicio: new Date().toISOString()
      });

      addEventoProducao({
        id: generateId(),
        opId: activeOPId,
        roloId: activeRoloId,
        operadorId: selectedOperadorId,
        machineCode: maquina as any,
        tipoEvento: 'FALTA_ROLETE',
        portadasNoEvento: rolo.portadasTotal,
        timestampInicio: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      updateOP(activeOPId, { status: 'PARADA' });
      toast.error('Máquina parada por falta de rolete.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {!isBoundMachine && (
            <button 
              onClick={() => setSelectedMachine('')}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-neutral-400" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight uppercase">{maquina}</h1>
        </div>
        
        {!isBoundMachine && (
          <button 
            onClick={() => setSelectedMachine('')}
            className="bg-[#f2c94c] hover:bg-[#e0b83d] text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-yellow-500/10"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]",
            isFaltaRolete ? "bg-red-500 shadow-red-500/50" : "bg-emerald-500 shadow-emerald-500/50 animate-pulse"
          )}></div>
          <span className="text-sm font-bold text-neutral-200">
            {isFaltaRolete ? 'Parado' : 'Rodando'}
          </span>
          <span className="text-neutral-600">•</span>
          <span className="text-sm font-medium text-neutral-400">
            {selectedOperadorId ? operadores.find(o => o.id === selectedOperadorId)?.nome : 'Nenhum operador'}
          </span>
        </div>
        
        {selectedOperadorId && (
          <div className="w-10 h-10 rounded-full border-2 border-neutral-800 overflow-hidden bg-neutral-900">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${operadores.find(o => o.id === selectedOperadorId)?.nome}`} 
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {activeRoloId ? (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* NÍVEL 1: TOPO (MAIS IMPORTANTE) */}
          {(() => {
            const op = ops.find(o => o.id === activeOPId);
            if (!op) return null;
            const cliente = clientes.find(c => c.id === op.clienteId);
            const rolosDaOP = rolos.filter(r => r.opId === op.id);
            const rolosFeitos = rolosDaOP.filter(r => r.status === 'FINALIZADO').length;
            
            return (
              <div className="bg-[#14181f] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                      {op.tituloFio} — <span className="text-emerald-500">{op.totalFios} FIOS</span>
                    </h2>
                    <p className="text-neutral-500 font-bold uppercase text-sm mt-2 tracking-widest leading-none">
                      {cliente?.nomeFantasia}
                    </p>
                    <p className="text-neutral-700 font-bold text-xs mt-3 uppercase tracking-wider">
                      OP: {op.codigo}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-500 text-3xl font-black tracking-tighter block leading-none">
                      {rolosFeitos} / {op.qtdRolos}
                    </span>
                    <span className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">Rolos</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-6 mt-6 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      isFaltaRolete ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"
                    )}></div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-300">
                      {isFaltaRolete ? 'MAQUINA PARADA' : 'MAQUINA RODANDO'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* NÍVEL 2: OPERAÇÃO */}
          <div className="space-y-4">
            {/* Rolo Atual e Portadas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1c2128] border border-white/5 rounded-2xl p-6 flex flex-col justify-center">
                <span className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Rolo Atual</span>
                <span className="text-white font-black text-5xl uppercase tracking-tighter leading-none mb-1">
                  {rolos.find(r => r.id === activeRoloId)?.numeroRolo}
                </span>
                <span className="text-neutral-700 font-black text-[10px] uppercase italic tracking-widest">Número do Rolo</span>
              </div>
              
              <button 
                onClick={handleIncrementPortada}
                disabled={isFaltaRolete}
                className={cn(
                  "bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/20 rounded-2xl p-6 flex flex-col justify-center items-center shadow-lg active:scale-95 transition-all text-center",
                  isFaltaRolete && "opacity-50 grayscale cursor-not-allowed"
                )}
              >
                <div className="flex flex-col items-center">
                  <span className="text-white font-black text-5xl tracking-tighter leading-none mb-1">
                    {rolos.find(r => r.id === activeRoloId)?.operadores.find(o => o.operadorId === selectedOperadorId)?.portadas || 0}
                  </span>
                  <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Portadas Atuais</span>
                </div>
                <div className="mt-3 bg-white/20 px-3 py-1 rounded-full text-[9px] text-white font-black uppercase tracking-widest border border-white/10">
                  Registrar Portada
                </div>
              </button>
            </div>

            {/* Rolete Destaque */}
            {(() => {
              const op = ops.find(o => o.id === activeOPId);
              return (
                <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                      <Cylinder className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest block mb-0.5">Rolete Cadastrado</span>
                      <span className="text-white font-black text-xl tracking-wider uppercase leading-none">{op?.rolete || 'NÃO INFORMADO'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Timers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Produção</span>
                <span className="text-emerald-500 font-mono font-bold text-sm tracking-tighter">{producaoTempo}</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Parado</span>
                <span className="text-red-500 font-mono font-bold text-sm tracking-tighter">{paradaTempo}</span>
              </div>
            </div>

            {/* Botões de Ação Principais */}
            <div className="grid grid-cols-2 gap-4">
              {!isFaltaRolete ? (
                <button 
                  onClick={toggleFaltaRolete}
                  className="bg-red-600 hover:bg-red-700 text-white h-20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
                >
                  <AlertTriangle className="w-6 h-6" />
                  Falta Rolete
                </button>
              ) : (
                <button 
                  onClick={toggleFaltaRolete}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Retomar
                </button>
              )}

              <button 
                onClick={() => setIsTrocaModalOpen(true)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white h-20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <RotateCw className="w-6 h-6" />
                Trocar Oper.
              </button>

              <button 
                onClick={() => {
                  if (!activeRoloId || !selectedOperadorId) return;
                  addEventoProducao({
                    id: generateId(),
                    opId: activeOPId!,
                    roloId: activeRoloId,
                    operadorId: selectedOperadorId,
                    machineCode: maquina as any,
                    tipoEvento: 'TIRAR_ROLO' as any,
                    portadasNoEvento: rolos.find(r => r.id === activeRoloId)?.portadasTotal || 0,
                    timestampInicio: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                  });
                  toast.success('Rolo retirado da máquina!');
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white h-20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <Cylinder className="w-6 h-6" />
                Tirar Rolo
              </button>

              <button 
                onClick={() => {
                  const currentRolo = rolos.find(r => r.id === activeRoloId);
                  setModalNumeroRolo(currentRolo?.numeroRolo?.toString() || '');
                  setIsFinalizarModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <CheckSquare className="w-6 h-6" />
                Finalizar Rolo
              </button>
            </div>
          </div>

          {/* NÍVEL 3: INFORMAÇÕES TÉCNICAS (FINAL DA TELA) */}
          {(() => {
            const op = ops.find(o => o.id === activeOPId);
            if (!op) return null;
            
            return (
              <div className="bg-[#14181f] border border-white/5 rounded-3xl p-8 space-y-8">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] text-center mb-2">Especificações Técnicas</h3>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-neutral-600 text-[9px] font-black uppercase block mb-1 tracking-widest">Pente</span>
                    <span className="text-white font-black text-2xl tracking-tighter">{op.pente || '-'}</span>
                  </div>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-neutral-600 text-[9px] font-black uppercase block mb-1 tracking-widest">Faca</span>
                    <span className="text-white font-black text-2xl tracking-tighter">{op.faca || '-'}</span>
                  </div>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-neutral-600 text-[9px] font-black uppercase block mb-1 tracking-widest">Abertura</span>
                    <span className="text-white font-black text-2xl tracking-tighter">{op.abertura || '-'}</span>
                  </div>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-neutral-600 text-[9px] font-black uppercase block mb-1 tracking-widest">Largura</span>
                    <span className="text-white font-black text-2xl tracking-tighter">{op.largura || '-'} <span className="text-xs">cm</span></span>
                  </div>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-neutral-600 text-[9px] font-black uppercase block mb-1 tracking-widest">Peso Est.</span>
                    <span className="text-white font-black text-2xl tracking-tighter">{formatPeso(op.pesoEstimadoKg).split(' ')[0]} <span className="text-xs">kg</span></span>
                  </div>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-neutral-600 text-[9px] font-black uppercase block mb-1 tracking-widest">Desenho</span>
                    <span className={cn("font-black text-2xl tracking-tighter", op.isDesenho ? "text-amber-500" : "text-white")}>
                      {op.isDesenho ? 'SIM' : 'NÃO'}
                    </span>
                  </div>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-neutral-600 text-[9px] font-black uppercase block mb-1 tracking-widest">Gramatura</span>
                    <span className="text-white font-black text-2xl tracking-tighter">{formatGramatura(op.gramatura)}</span>
                  </div>
                </div>

                {op.isDesenho && op.composicao && (
                  <div className="pt-6 border-t border-white/5">
                    <span className="text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] block mb-4 text-center">Composição do Desenho</span>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {op.composicao.map((comp, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[12px] text-neutral-400 border-b border-white/5 pb-2">
                          <span className="font-bold text-neutral-300">{comp.fio}</span>
                          <span className="text-white font-black">{comp.quantidade} <span className="text-[10px] text-neutral-500">fios</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {opsDaMaquina.map(op => {
            const cliente = clientes.find(c => c.id === op.clienteId);
            const rolosDaOP = rolos.filter(r => r.opId === op.id).sort((a, b) => a.sequencia - b.sequencia);
            const proximoRolo = rolosDaOP.find(r => r.status === 'PENDENTE');
            const rolosFeitos = rolosDaOP.filter(r => r.status === 'FINALIZADO').length;

            return (
              <div key={op.id} className="bg-[#14181f] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all flex flex-col group relative overflow-hidden">
                {op.urgencia === 'ALTA' && (
                  <div className="absolute top-0 right-0 px-4 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                    Urgente
                  </div>
                )}
                
                <div className="mb-6">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1">
                    {op.tituloFio} — <span className="text-emerald-500">{op.totalFios} FIOS</span>
                  </h2>
                  <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest">{cliente?.nomeFantasia}</p>
                  <p className="text-neutral-700 font-bold text-[10px] mt-1">OP: {op.codigo}</p>
                </div>
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                    <span className="text-white font-black text-lg">{rolosFeitos} / {op.qtdRolos}</span>
                    <span className="text-neutral-600 text-[10px] font-black uppercase tracking-tighter ml-2 italic">Rolos</span>
                  </div>
                </div>

                {proximoRolo ? (
                  <button 
                    onClick={() => handleIniciarRolo(op.id, proximoRolo.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Iniciar Rolo {proximoRolo.numeroRolo}
                  </button>
                ) : (
                  <div className="w-full bg-emerald-500/5 text-emerald-500/50 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-center border border-emerald-500/10">
                    Finalizada
                  </div>
                )}
              </div>
            );
          })}
          {opsDaMaquina.length === 0 && (
            <div className="col-span-full text-center py-20 text-neutral-600 bg-[#14181f] rounded-3xl border border-white/5">
              <p className="font-black uppercase tracking-widest">Nenhuma OP pendente</p>
            </div>
          )}
        </div>
      )}

      {/* Operator Selection (Only when there are pending OPs and no active roll) */}
      {!selectedOperadorId && !activeRoloId && opsDaMaquina.some(op => rolos.some(r => r.opId === op.id && r.status === 'PENDENTE')) && (
        <div className="fixed inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black to-transparent z-40">
           <div className="bg-[#1c2128] border border-white/10 rounded-3xl p-6 shadow-2xl max-w-md mx-auto">
            <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-4 text-center">Identifique-se</h3>
            <select 
              value={selectedOperadorId} 
              onChange={(e) => setSelectedOperadorId(e.target.value)}
              className="w-full bg-black border border-white/10 text-white rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-bold"
            >
              <option value="">Selecione seu nome...</option>
              {operadoresAtivos.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Modal Troca de Turno */}
      {isTrocaModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-white mb-2">Troca de Operador</h2>
            <p className="text-neutral-400 mb-6 text-sm">Siga os passos para realizar a troca corretamente.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">1. Novo Operador *</label>
                <select 
                  value={newOperadorId} 
                  onChange={(e) => setNewOperadorId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">Selecione o novo operador...</option>
                  {operadoresAtivos.filter(o => o.id !== selectedOperadorId).map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setIsTrocaModalOpen(false);
                    setNewOperadorId('');
                  }}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleTrocaTurno}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-xl font-bold transition-colors"
                >
                  Confirmar Troca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Finalizar Rolo */}
      {isFinalizarModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-white mb-2">Finalizar Rolo</h2>
            <p className="text-neutral-400 mb-6 text-sm">Confirme os dados finais para encerrar a produção deste rolo.</p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Número do Rolo *</label>
                  <input 
                    type="text" 
                    value={modalNumeroRolo}
                    onChange={(e) => setModalNumeroRolo(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Peso Real (kg)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    value={modalPesoReal}
                    onChange={(e) => setModalPesoReal(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.000"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsFinalizarModalOpen(false)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleFinalizarRolo}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  Confirmar Finalização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && activeRoloId && (
        <RoloDetailsModal 
          rolo={rolos.find(r => r.id === activeRoloId)!}
          operadores={operadores}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
    </div>
  );
}
