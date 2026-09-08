import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Package, 
  AlertTriangle, 
  Plus, 
  Minus, 
  User, 
  Clock, 
  Activity, 
  ChevronRight, 
  X,
  FileText,
  RotateCw,
  Layers,
  Cpu,
  BookOpen,
  Info,
  Sliders,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, generateId } from '../../lib/utils';
import { EventoProducao, Rolo, OP } from '../../types';
import { supabase } from '../../lib/supabase';

export default function DashboardOperador() {
  const { 
    user, 
    ops, 
    rolos, 
    clientes, 
    operadores, 
    eventosProducao,
    especificacoes,
    fiosCliente,
    updateRolo, 
    updateOP, 
    addEventoProducao 
  } = useStore();
  
  const deviceConfig = useStore(state => state.deviceConfig);
  const isBoundMachine = deviceConfig?.isBound && deviceConfig.type === 'MAQUINA';
  
  const [selectedMachine, setSelectedMachine] = useState<string>(
    isBoundMachine ? (deviceConfig.machineId || 'MAQUINA 1') : (user?.machine || 'MAQUINA 1')
  );
  const maquina = selectedMachine;

  // Active OP & Rolo Selection
  const [activeOPId, setActiveOPId] = useState<string | null>(null);
  const [activeRoloId, setActiveRoloId] = useState<string | null>(null);
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>('');

  // Operator status: 'PRODUZINDO' | 'PAUSADO' | 'AGUARDANDO_OP'
  const [statusOperacao, setStatusOperacao] = useState<'PRODUZINDO' | 'PAUSADO' | 'AGUARDANDO_OP'>('AGUARDANDO_OP');

  // Portadas do rolo atual (Salvo em memória conforme especificação)
  const [portadasAtual, setPortadasAtual] = useState<number>(0);

  // Rolos finalizados localmente em memória caso a OP não tenha registros prévios de rolos
  const [rolosFinalizadosMemoria, setRolosFinalizadosMemoria] = useState<Record<string, number>>({});

  // Modais
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState(false);
  const [isTrocaOperadorModalOpen, setIsTrocaOperadorModalOpen] = useState(false);
  const [isSelectOPModalOpen, setIsSelectOPModalOpen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);

  // Registro de Ciclo e Produção do Rolo Atual
  const [cicloInicioEm, setCicloInicioEm] = useState<string>(new Date().toISOString());
  const [ocorrenciasCicloAtual, setOcorrenciasCicloAtual] = useState<string[]>([]);

  // Campos do modal finalizar rolo
  const [modalFinalizarObs, setModalFinalizarObs] = useState<string>('');

  // Lista padronizada de Ocorrências (Sprint Operador 1 - Texlog)
  const TIPOS_OCORRENCIA = [
    'Fio quebrado',
    'Rolete torto/travado',
    'Voltas a menos/mais',
    'Manutenção máquina',
    'Outros'
  ];

  // Campos do modal ocorrência
  const [ocorrenciaTipo, setOcorrenciaTipo] = useState<string>(TIPOS_OCORRENCIA[0]);
  const [ocorrenciaObs, setOcorrenciaObs] = useState<string>('');

  // Estados para integração com Supabase
  const [supabaseOPs, setSupabaseOPs] = useState<any[]>([]);
  const [supabaseClientes, setSupabaseClientes] = useState<any[]>([]);
  const [supabaseTitulos, setSupabaseTitulos] = useState<any[]>([]);
  const [supabaseEspecificacoes, setSupabaseEspecificacoes] = useState<any[]>([]);
  const [isLoadingOPs, setIsLoadingOPs] = useState<boolean>(true);

  // Normalizador de variações de máquina (ex: RBMAQ1 <-> MAQUINA 1)
  const getMachineFilterValues = (maq: string): string[] => {
    const clean = (maq || '').trim();
    const upper = clean.toUpperCase();
    if (upper === 'RBMAQ1' || upper === 'MAQUINA 1' || upper === 'MÁQUINA 1') {
      return ['MAQUINA 1', 'RBMAQ1'];
    }
    if (upper === 'RBMAQ2' || upper === 'MAQUINA 2' || upper === 'MÁQUINA 2') {
      return ['MAQUINA 2', 'RBMAQ2'];
    }
    if (upper === 'RBMAQ3' || upper === 'MAQUINA 3' || upper === 'MÁQUINA 3') {
      return ['MAQUINA 3', 'RBMAQ3'];
    }
    if (upper === 'RBMAQ4' || upper === 'MAQUINA 4' || upper === 'MÁQUINA 4') {
      return ['MAQUINA 4', 'RBMAQ4'];
    }
    return [clean];
  };

  // Consultar a tabela public.ordens_producao: status = 'PENDENTE' e maquina = máquina atual, ordenando pela mais antiga
  const fetchOPs = async () => {
    try {
      const machineVariants = getMachineFilterValues(maquina);

      let query = supabase
        .from('ordens_producao')
        .select('*, clientes!ordens_producao_cliente_id_fkey(id, nome, razao_social, nome_fantasia)')
        .eq('status', 'PENDENTE')
        .in('maquina', machineVariants)
        .order('criado_em', { ascending: true });

      let { data, error } = await query;

      if (error) {
        console.warn('Tentativa com join em clientes falhou, buscando sem join:', error);
        const fallback = await supabase
          .from('ordens_producao')
          .select('*')
          .eq('status', 'PENDENTE')
          .in('maquina', machineVariants)
          .order('criado_em', { ascending: true });

        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      const normalized = (data || []).map((o: any) => ({
        id: o.id?.toString() || '',
        codigo: o.codigo || `OP-${o.id}`,
        clienteId: o.cliente_id?.toString() || '',
        cliente_id: o.cliente_id,
        tipoFio: o.tipo_fio || 'POLIÉSTER',
        tipo_fio: o.tipo_fio || 'POLIÉSTER',
        tituloFio: o.titulo_fio || '',
        titulo_fio: o.titulo_fio || '',
        totalFios: Number(o.total_fios) || 0,
        total_fios: Number(o.total_fios) || 0,
        especificacaoId: o.especificacao_id?.toString() || '',
        especificacao_id: o.especificacao_id,
        maquina: o.maquina || maquina,
        urgencia: o.urgencia || 'BAIXA',
        rolete: o.rolete || '',
        qtdRolos: Number(o.quantidade_planejada ?? o.quantidade_rolos ?? 1),
        quantidade_planejada: Number(o.quantidade_planejada ?? o.quantidade_rolos ?? 1),
        quantidade_produzida: Number(o.quantidade_produzida ?? 0),
        quantidade_pendente: Number(
          o.quantidade_pendente ?? 
          Math.max(0, (o.quantidade_planejada ?? o.quantidade_rolos ?? 1) - (o.quantidade_produzida ?? 0))
        ),
        unidadeProducao: o.unidade_producao || 'METROS',
        unidade_producao: o.unidade_producao || 'METROS',
        metros: o.metros != null ? Number(o.metros) : undefined,
        voltas: o.voltas != null ? Number(o.voltas) : undefined,
        faca: Number(o.faca) || 0,
        avanco: Number(o.avanco) || 0,
        pente: Number(o.pente) || 0,
        abertura: Number(o.abertura) || 0,
        largura: Number(o.largura) || 0,
        isDesenho: Boolean(o.is_desenho),
        is_desenho: Boolean(o.is_desenho),
        composicao: o.composicao || [],
        gramatura: Number(o.gramatura) || 0,
        pesoEstimadoKg: Number(o.peso_estimado) || 0,
        peso_estimado: Number(o.peso_estimado) || 0,
        status: o.status || 'PENDENTE',
        criado_em: o.criado_em || '',
        createdAt: o.criado_em || '',
        clientes: o.clientes
      }));

      setSupabaseOPs(normalized);
    } catch (err: any) {
      console.error('Erro ao consultar ordens_producao no Supabase:', err);
    } finally {
      setIsLoadingOPs(false);
    }
  };

  // Carregar dados auxiliares de clientes, especificações e títulos do Supabase
  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nome, razao_social, nome_fantasia')
      .then(({ data }) => {
        if (data) setSupabaseClientes(data);
      });

    supabase
      .from('titulos_fio')
      .select('*')
      .then(({ data }) => {
        if (data) setSupabaseTitulos(data);
      });

    supabase
      .from('especificacoes')
      .select('*')
      .then(({ data }) => {
        if (data) setSupabaseEspecificacoes(data);
      });
  }, []);

  // Supabase Realtime: quando houver nova OP para a máquina atual, atualizar sem refresh
  useEffect(() => {
    fetchOPs();

    const channel = supabase
      .channel(`realtime_operador_${maquina}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordens_producao'
        },
        () => {
          fetchOPs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [maquina]);

  // Operadores autorizados para esta máquina
  const operadoresAtivos = useMemo(() => {
    return operadores.filter(o => o.status === 'ATIVO' && o.maquinasAutorizadas.includes(maquina as any));
  }, [operadores, maquina]);

  // Se nenhum operador selecionado, preenche automaticamente se houver operador logado ou primeiro disponível
  useEffect(() => {
    if (!selectedOperadorId && operadoresAtivos.length > 0) {
      const loggedUserName = (user as any)?.name || '';
      const matchByName = operadoresAtivos.find(o => o.nome.toLowerCase() === loggedUserName.toLowerCase());
      if (matchByName) {
        setSelectedOperadorId(matchByName.id);
      } else {
        setSelectedOperadorId(operadoresAtivos[0].id);
      }
    }
  }, [operadoresAtivos, selectedOperadorId, user]);

  // Fechar modal de especificação com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSpecModalOpen) {
        setIsSpecModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpecModalOpen]);

  // OPs pendentes da máquina atual vindas do Supabase (já ordenadas pela mais antiga)
  const opsDaMaquina = supabaseOPs;

  // Identificar OP ativa: seleciona a primeira da fila (mais antiga ordenada pelo Supabase) ou pelo activeOPId
  const activeOP = useMemo(() => {
    if (activeOPId) {
      const found = opsDaMaquina.find(o => o.id === activeOPId);
      if (found) return found;
    }
    // Caso padrão: seleciona a primeira da fila (mais antiga)
    return opsDaMaquina[0] || null;
  }, [activeOPId, opsDaMaquina]);

  // Sincronizar activeOPId
  useEffect(() => {
    if (activeOP && activeOP.id !== activeOPId) {
      setActiveOPId(activeOP.id);
    } else if (!activeOP && activeOPId) {
      setActiveOPId(null);
    }
  }, [activeOP, activeOPId]);

  // Rolo atual
  useEffect(() => {
    if (!activeOP) {
      setActiveRoloId(null);
      setStatusOperacao('AGUARDANDO_OP');
      return;
    }

    const rolosDaOP = rolos.filter(r => r.opId === activeOP.id);
    const roloEmAndamento = rolosDaOP.find(r => r.status === 'EM_ANDAMENTO');
    const roloParado = rolosDaOP.find(r => r.status === 'PARADO');
    const roloPendente = rolosDaOP.find(r => r.status === 'PENDENTE');

    if (roloEmAndamento) {
      setActiveRoloId(roloEmAndamento.id);
      setPortadasAtual(roloEmAndamento.portadasTotal || 0);
      setStatusOperacao('PRODUZINDO');
    } else if (roloParado) {
      setActiveRoloId(roloParado.id);
      setPortadasAtual(roloParado.portadasTotal || 0);
      setStatusOperacao('PAUSADO');
    } else if (roloPendente) {
      setActiveRoloId(roloPendente.id);
      setPortadasAtual(roloPendente.portadasTotal || 0);
      if (activeOP.status === 'EM_ANDAMENTO') {
        setStatusOperacao('PRODUZINDO');
      } else {
        setStatusOperacao('PAUSADO');
      }
    } else {
      // OP sem rolos pré-criados (comportamento do Sprint OP 1)
      if (activeOP.status === 'EM_ANDAMENTO') {
        setStatusOperacao('PRODUZINDO');
      } else if (activeOP.status === 'PARADA') {
        setStatusOperacao('PAUSADO');
      } else {
        setStatusOperacao('PAUSADO');
      }
    }
  }, [activeOP, rolos]);

  // Cálculos de Progresso da OP Ativa
  const { planejado, produzidos, pendentes, percentual } = useMemo(() => {
    if (!activeOP) {
      return { planejado: 0, produzidos: 0, pendentes: 0, percentual: 0 };
    }

    const qtdPlanejada = Number((activeOP as any).quantidade_planejada || activeOP.qtdRolos || 1);
    
    // Total de rolos finalizados no useStore
    const rolosFinalizadosStore = rolos.filter(r => r.opId === activeOP.id && r.status === 'FINALIZADO').length;
    // Total de rolos finalizados em memória durante a sessão
    const rolosFinalizadosMem = rolosFinalizadosMemoria[activeOP.id] || 0;
    
    const qtdProduzida = Math.max(
      Number((activeOP as any).quantidade_produzida || 0),
      rolosFinalizadosStore + rolosFinalizadosMem
    );
    const qtdPendente = Math.max(0, qtdPlanejada - qtdProduzida);
    const pct = qtdPlanejada > 0 ? Math.min(100, Math.round((qtdProduzida / qtdPlanejada) * 100)) : 0;

    return {
      planejado: qtdPlanejada,
      produzidos: qtdProduzida,
      pendentes: qtdPendente,
      percentual: pct
    };
  }, [activeOP, rolos, rolosFinalizadosMemoria]);

  // Dados do cliente da OP ativa
  const clienteNome = useMemo(() => {
    if (!activeOP) return '—';
    if (activeOP.clientes) {
      const c = activeOP.clientes;
      const n = c.nome_fantasia || c.nomeFantasia || c.razao_social || c.razaoSocial || c.nome;
      if (n) return n;
    }
    const cid = (activeOP.cliente_id || activeOP.clienteId)?.toString();
    const sc = supabaseClientes.find(c => c.id?.toString() === cid);
    if (sc) {
      return sc.nome_fantasia || sc.razao_social || sc.nome || 'Cliente';
    }
    const c = clientes.find(item => item.id.toString() === cid);
    return c?.nomeFantasia || c?.razaoSocial || (c as any)?.nome || 'Cliente Não Informado';
  }, [activeOP, supabaseClientes, clientes]);

  // Operador atual selecionado
  const currentOperador = useMemo(() => {
    return operadores.find(o => o.id === selectedOperadorId) || null;
  }, [operadores, selectedOperadorId]);

  // Especificação Técnica completa associada à OP ativa
  const activeEspecificacao = useMemo(() => {
    if (!activeOP) return null;
    const espId = (activeOP.especificacao_id || activeOP.especificacaoId)?.toString();
    if (espId) {
      const fromSupabase = supabaseEspecificacoes.find(e => e.id?.toString() === espId);
      if (fromSupabase) return fromSupabase;
      const fromStore = especificacoes.find(e => e.id?.toString() === espId);
      if (fromStore) return fromStore;
    }
    return null;
  }, [activeOP, supabaseEspecificacoes, especificacoes]);

  // Título e dados de Fio associados à OP ativa
  const activeTitulo = useMemo(() => {
    if (!activeOP) return null;
    const tId = (activeOP.titulo_id || activeOP.fioClienteId || activeEspecificacao?.titulo_fio_id)?.toString();
    if (tId) {
      const fromSupabase = supabaseTitulos.find(t => t.id?.toString() === tId);
      if (fromSupabase) return fromSupabase;
    }
    const titNome = activeOP.titulo_fio || activeOP.tituloFio;
    const fromSupabaseByName = supabaseTitulos.find(t => t.titulo === titNome);
    if (fromSupabaseByName) return fromSupabaseByName;
    return fiosCliente.find(f => f.tituloFio === titNome) || null;
  }, [activeOP, activeEspecificacao, supabaseTitulos, fiosCliente]);

  // Cor do fio (da OP, do título cadastrado ou padrão)
  const corFio = useMemo(() => {
    if (!activeOP) return '—';
    if ((activeOP as any).cor) return (activeOP as any).cor;
    if (activeTitulo?.cor) return activeTitulo.cor;
    return 'Cru / Padrão';
  }, [activeOP, activeTitulo]);

  // Código / identificador da especificação
  const especificacaoCodigo = useMemo(() => {
    if (!activeOP) return '—';
    if (activeOP.especificacao_id || activeOP.especificacaoId) {
      return `ESP-${activeOP.especificacao_id || activeOP.especificacaoId}`;
    }
    if (activeEspecificacao?.codigo) return activeEspecificacao.codigo;
    return `ESP-${activeOP.codigo?.replace('OP-', '') || '001'}`;
  }, [activeOP, activeEspecificacao]);

  // Observações consolidadas para a Ficha Técnica
  const observacoesFicha = useMemo(() => {
    if (!activeOP) return 'Nenhuma observação registrada.';
    const obsOP = (activeOP as any).observacoes || (activeOP as any).observacao;
    const obsEsp = activeEspecificacao?.observacoes_tecnicas || (activeEspecificacao as any)?.observacoes;
    const obsTitulo = activeTitulo?.observacoes || (activeTitulo as any)?.observacao;
    
    const partes: string[] = [];
    if (obsOP) partes.push(`OP: ${obsOP}`);
    if (obsEsp) partes.push(`Técnica: ${obsEsp}`);
    if (obsTitulo) partes.push(`Fio: ${obsTitulo}`);
    
    return partes.length > 0 ? partes.join(' • ') : 'Nenhuma observação informada.';
  }, [activeOP, activeEspecificacao, activeTitulo]);

  // ================= AÇÕES DO CARD 3: PORTADAS =================
  const handleIncrementPortada = () => {
    const nextVal = portadasAtual + 1;
    setPortadasAtual(nextVal);

    // Se existe rolo ativo no useStore, mantém sincronizado em memória
    if (activeRoloId) {
      const rolo = rolos.find(r => r.id === activeRoloId);
      if (rolo) {
        updateRolo(activeRoloId, {
          portadasTotal: nextVal
        });
      }
    }
  };

  const handleDecrementPortada = () => {
    if (portadasAtual <= 0) return;
    const nextVal = portadasAtual - 1;
    setPortadasAtual(nextVal);

    // Se existe rolo ativo no useStore, atualiza correção em memória
    if (activeRoloId) {
      const rolo = rolos.find(r => r.id === activeRoloId);
      if (rolo) {
        updateRolo(activeRoloId, {
          portadasTotal: nextVal
        });
      }
    }
  };

  // ================= AÇÕES DO CARD 4: BOTÕES GRANDES =================

  // 1. Iniciar Produção
  const handleIniciarProducao = () => {
    if (!activeOP) {
      toast.error('Nenhuma Ordem de Produção selecionada');
      return;
    }
    if (!selectedOperadorId) {
      toast.error('Selecione um operador antes de iniciar');
      setIsTrocaOperadorModalOpen(true);
      return;
    }

    const agora = new Date().toISOString();
    setCicloInicioEm(agora);
    setOcorrenciasCicloAtual([]);
    setStatusOperacao('PRODUZINDO');

    // Atualiza status da OP se estiver pendente ou parada
    if (activeOP.status !== 'EM_ANDAMENTO') {
      updateOP(activeOP.id, { status: 'EM_ANDAMENTO' });
    }

    // Se houver rolo no useStore, atualiza status do rolo
    if (activeRoloId) {
      updateRolo(activeRoloId, {
        status: 'EM_ANDAMENTO',
        iniciadoEm: agora
      });
    }

    // Registra evento de início
    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: activeRoloId || activeOP.id,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'INICIO_PRODUCAO',
      portadasNoEvento: portadasAtual,
      timestampInicio: agora,
      createdAt: agora,
      observacao: `Início de produção da OP ${activeOP.codigo}`
    });

    toast.success('Produção iniciada!');
  };

  // 2. Pausar
  const handlePausarProducao = () => {
    if (!activeOP) return;

    setStatusOperacao('PAUSADO');

    // Atualiza status da OP
    updateOP(activeOP.id, { status: 'PARADA' });

    // Se houver rolo no useStore
    if (activeRoloId) {
      updateRolo(activeRoloId, {
        status: 'PARADO',
        faltaRoleteInicio: new Date().toISOString()
      });
    }

    // Registra evento de pausa
    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: activeRoloId || activeOP.id,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'PARADA' as any,
      portadasNoEvento: portadasAtual,
      timestampInicio: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      observacao: `Produção pausada na máquina ${maquina}`
    });

    toast('Produção pausada.', {
      icon: '⏸',
      style: { background: '#1c2128', color: '#f59e0b', border: '1px solid #f59e0b40' }
    });
  };

  // 3. Finalizar Rolo (Abrir Modal)
  const handleOpenFinalizarModal = () => {
    if (!activeOP) {
      toast.error('Nenhuma OP ativa para finalizar rolo');
      return;
    }
    setModalFinalizarObs('');
    setIsFinalizarModalOpen(true);
  };

  // Confirmar Finalização do Rolo (Sprint Operador 1 - Texlog)
  const handleConfirmFinalizarRolo = async () => {
    if (!activeOP) return;

    const horarioTermino = new Date().toISOString();
    const horarioInicio = cicloInicioEm || horarioTermino;
    const inicioMs = new Date(horarioInicio).getTime();
    const terminoMs = new Date(horarioTermino).getTime();
    const duracaoSegundos = Math.max(1, Math.round((terminoMs - inicioMs) / 1000));
    const minutos = Math.floor(duracaoSegundos / 60);
    const segundos = duracaoSegundos % 60;
    const tempoProducaoFormatado = minutos > 0 ? `${minutos}min ${segundos}s` : `${segundos}s`;

    const operadorNome = currentOperador?.nome || (user as any)?.name || 'Operador';

    // Compilar todas as ocorrências deste rolo
    const todasOcorrencias = [...ocorrenciasCicloAtual];
    if (modalFinalizarObs.trim()) {
      todasOcorrencias.push(modalFinalizarObs.trim());
    }
    const ocorrenciasTexto = todasOcorrencias.length > 0 ? todasOcorrencias.join('; ') : 'Nenhuma';

    const portadasSalvas = portadasAtual;

    // Gerar número do rolo automaticamente utilizando a sequência global de rolos
    const rolosNums = rolos.map(r => {
      const num = typeof r.numeroRolo === 'number' ? r.numeroRolo : parseInt(String(r.numeroRolo || '').replace(/\D/g, ''), 10);
      const seq = typeof r.sequencia === 'number' ? r.sequencia : 0;
      return Math.max(isNaN(num) ? 0 : num, isNaN(seq) ? 0 : seq);
    });

    const eventosNums = eventosProducao
      .filter(ev => ev.tipoEvento === 'FINALIZAR_ROLO')
      .map(ev => {
        const match = (ev.observacao || '').match(/Rolo\s*#?(\d+)/i) || (ev.roloId || '').match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });

    const maxGlobal = Math.max(0, ...rolosNums, ...eventosNums);
    const proximaSequencia = maxGlobal + 1;
    const numRolo = proximaSequencia.toString();

    // Se há rolo no useStore vinculado à OP
    if (activeRoloId) {
      updateRolo(activeRoloId, {
        status: 'FINALIZADO',
        finalizadoEm: horarioTermino,
        iniciadoEm: horarioInicio,
        numeroRolo: numRolo,
        sequencia: proximaSequencia,
        portadasTotal: portadasSalvas
      });
    }

    // Salvar evento com os campos exatos exigidos:
    // portadas totais, ocorrências, operador, máquina, horário de início, horário de término, tempo de produção
    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: activeRoloId || `ROLO-${numRolo}`,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'FINALIZAR_ROLO',
      portadasNoEvento: portadasSalvas,
      timestampInicio: horarioInicio,
      timestampFim: horarioTermino,
      duracaoSegundos,
      observacao: `Rolo #${numRolo} finalizado • Portadas: ${portadasSalvas} | Ocorrências: ${ocorrenciasTexto} | Operador: ${operadorNome} | Máquina: ${maquina} | Início: ${formatHora(horarioInicio)} | Término: ${formatHora(horarioTermino)} | Tempo: ${tempoProducaoFormatado}`,
      createdAt: horarioTermino
    });

    // Tentar persistir na tabela producao_operador no Supabase caso exista
    try {
      await supabase.from('producao_operador').insert([{
        op_id: Number(activeOP.id) || null,
        maquina: maquina,
        operador: operadorNome,
        operador_id: selectedOperadorId || null,
        portadas_total: portadasSalvas,
        ocorrencias: ocorrenciasTexto,
        horario_inicio: horarioInicio,
        horario_termino: horarioTermino,
        duracao_segundos: duracaoSegundos,
        tempo_producao: tempoProducaoFormatado,
        criado_em: horarioTermino
      }]);
    } catch {
      // Ignora se tabela não existir
    }

    // Atualiza contador em memória
    setRolosFinalizadosMemoria(prev => ({
      ...prev,
      [activeOP.id]: (prev[activeOP.id] || 0) + 1
    }));

    // Atualizar automaticamente a OP (quantidade_produzida +1 e quantidade_pendente -1)
    const qtdPlanejada = Number(activeOP.quantidade_planejada ?? activeOP.qtdRolos ?? 1);
    const qtdProduzidaAtual = Number(activeOP.quantidade_produzida ?? produzidos ?? 0);
    const novaQtdProduzida = qtdProduzidaAtual + 1;
    const novaQtdPendente = Math.max(0, qtdPlanejada - novaQtdProduzida);
    const isOpConcluida = novaQtdPendente === 0;
    const novoStatusOP = isOpConcluida ? 'FINALIZADA' : 'EM_ANDAMENTO';

    // Atualizar no Supabase ordens_producao
    try {
      await supabase
        .from('ordens_producao')
        .update({
          quantidade_produzida: novaQtdProduzida,
          quantidade_pendente: novaQtdPendente,
          status: novoStatusOP,
          atualizado_em: new Date().toISOString(),
          ...(isOpConcluida ? { fim: horarioTermino } : {})
        })
        .eq('id', Number(activeOP.id));
    } catch (err) {
      console.warn('Erro ao atualizar ordens_producao no Supabase:', err);
    }

    // Atualizar no useStore
    updateOP(activeOP.id, {
      quantidade_produzida: novaQtdProduzida,
      quantidade_pendente: novaQtdPendente,
      status: novoStatusOP as any,
      ...(isOpConcluida ? { fim: horarioTermino } : {})
    } as any);

    // Atualizar estado local de OPs para sincronização imediata
    setSupabaseOPs(prev => prev.map(o => {
      if (o.id === activeOP.id) {
        return {
          ...o,
          quantidade_produzida: novaQtdProduzida,
          quantidade_pendente: novaQtdPendente,
          status: novoStatusOP
        };
      }
      return o;
    }));

    // Fechar modal de finalização e limpar campos
    setModalFinalizarObs('');
    setIsFinalizarModalOpen(false);

    // Se ainda existirem rolos pendentes na OP, iniciar automaticamente o próximo ciclo de produção, sem retornar para a tela inicial
    if (!isOpConcluida) {
      const novoCicloInicio = new Date().toISOString();
      setCicloInicioEm(novoCicloInicio);
      setPortadasAtual(0);
      setOcorrenciasCicloAtual([]);
      setStatusOperacao('PRODUZINDO');

      // Buscar próximo rolo se houver na store
      const rolosPendentes = rolos.filter(r => r.opId === activeOP.id && r.status === 'PENDENTE');
      if (rolosPendentes.length > 0) {
        const nextRolo = rolosPendentes[0];
        setActiveRoloId(nextRolo.id);
        updateRolo(nextRolo.id, {
          status: 'EM_ANDAMENTO',
          iniciadoEm: novoCicloInicio
        });
      }

      // Registrar evento de início automático do próximo ciclo
      addEventoProducao({
        id: generateId(),
        opId: activeOP.id,
        roloId: rolosPendentes[0]?.id || activeOP.id,
        operadorId: selectedOperadorId,
        machineCode: maquina as any,
        tipoEvento: 'INICIO_PRODUCAO',
        portadasNoEvento: 0,
        timestampInicio: novoCicloInicio,
        createdAt: novoCicloInicio,
        observacao: `Próximo ciclo iniciado automaticamente • Rolo ${novaQtdProduzida + 1} de ${qtdPlanejada}`
      });

      toast.success(`Rolo #${numRolo} finalizado! Próximo rolo (${novaQtdProduzida + 1}/${qtdPlanejada}) iniciado automaticamente.`);
    } else {
      setPortadasAtual(0);
      setOcorrenciasCicloAtual([]);
      setStatusOperacao('AGUARDANDO_OP');
      toast.success('Todos os rolos foram produzidos! Ordem de Produção finalizada.');
    }
  };

  // 4. Solicitar Rolete
  const handleSolicitarRolete = () => {
    if (!activeOP) {
      toast.error('Nenhuma OP em andamento');
      return;
    }

    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: activeRoloId || activeOP.id,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'FALTA_ROLETE',
      portadasNoEvento: portadasAtual,
      timestampInicio: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      observacao: `Rolete solicitado: ${activeOP.rolete || 'Padrão'}`
    });

    toast.success(`Rolete solicitado: ${activeOP.rolete || 'Padrão'}!`, {
      icon: '📦',
      style: { background: '#181c24', color: '#a855f7', border: '1px solid #a855f740' }
    });
  };

  // 5. Ocorrência (Confirmar)
  const handleConfirmOcorrencia = () => {
    if (!activeOP) return;

    const textoFinal = ocorrenciaTipo === 'Outros'
      ? (ocorrenciaObs ? `Outros: ${ocorrenciaObs.trim()}` : 'Outros')
      : `${ocorrenciaTipo}${ocorrenciaObs ? ': ' + ocorrenciaObs.trim() : ''}`;

    // Registrar na lista de ocorrências do ciclo atual
    setOcorrenciasCicloAtual(prev => [...prev, textoFinal]);

    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: activeRoloId || activeOP.id,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'OCORRENCIA' as any,
      portadasNoEvento: portadasAtual,
      timestampInicio: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      observacao: textoFinal
    });

    toast.success('Ocorrência registrada com sucesso!', {
      icon: '📝'
    });
    setIsOcorrenciaModalOpen(false);
    setOcorrenciaObs('');
  };

  // ================= CARD 5: ÚLTIMOS EVENTOS =================
  const ultimosEventos = useMemo(() => {
    return eventosProducao
      .filter(e => e.machineCode === maquina || (activeOP && e.opId === activeOP.id))
      .sort((a, b) => new Date(b.createdAt || b.timestampInicio).getTime() - new Date(a.createdAt || a.timestampInicio).getTime())
      .slice(0, 5);
  }, [eventosProducao, maquina, activeOP]);

  // Formatação de hora amigável
  const formatHora = (isoStr?: string) => {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getTipoEventoLabel = (tipo: string) => {
    switch (tipo) {
      case 'INICIO_PRODUCAO':
        return { label: 'Início de Produção', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'FINALIZAR_ROLO':
        return { label: 'Rolo Finalizado', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'PARADA':
        return { label: 'Pausa de Produção', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'FALTA_ROLETE':
        return { label: 'Rolete Solicitado', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'OCORRENCIA':
        return { label: 'Ocorrência', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
      case 'TROCA_OPERADOR':
        return { label: 'Troca de Operador', color: 'text-neutral-300 bg-white/10 border-white/20' };
      default:
        return { label: tipo.replace('_', ' '), color: 'text-neutral-400 bg-white/5 border-white/10' };
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-neutral-100 font-sans pb-16 selection:bg-blue-600 selection:text-white">
      {/* ============================================================== */}
      {/* TOPO: TÍTULO, OPERADOR, NOME DA MÁQUINA, STATUS                */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 bg-[#10131a]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6 shadow-xl">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Título & Máquina */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-black text-blue-400 text-xl tracking-wider shadow-inner">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white uppercase">TEXLOG</span>
                <span className="text-neutral-500 text-xs font-semibold">|</span>
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Operador</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-black uppercase tracking-wider text-blue-400 font-mono">
                  {maquina}
                </span>
              </div>
            </div>
          </div>

          {/* Operador & Status */}
          <div className="flex items-center gap-3">
            {/* Operador badge clicável para troca rápida */}
            <button
              onClick={() => setIsTrocaOperadorModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
              title="Clique para alternar operador"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 text-xs font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block leading-none">Operador</span>
                <span className="text-xs font-bold text-white block leading-tight truncate max-w-[120px]">
                  {currentOperador?.nome || (user as any)?.name || 'Selecionar'}
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
            </button>

            {/* Status da Máquina */}
            {statusOperacao === 'PRODUZINDO' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Produzindo</span>
              </div>
            )}

            {statusOperacao === 'PAUSADO' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">Pausado</span>
              </div>
            )}

            {statusOperacao === 'AGUARDANDO_OP' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-500/10 border border-slate-500/30">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Aguardando OP</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ============================================================== */}
        {/* CARD 1: ORDEM DE PRODUÇÃO (APENAS OS DADOS SOLICITADOS)         */}
        {/* ============================================================== */}
        <section className="bg-[#12161f] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Ordem de Produção {activeOP ? `• ${activeOP.codigo}` : ''}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {activeOP && (
                <button
                  onClick={() => setIsSpecModalOpen(true)}
                  className="text-xs font-bold text-blue-300 hover:text-white flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 px-3 py-1.5 rounded-xl border border-blue-500/30 transition-all shadow-sm"
                  title="Abrir Especificação Completa da OP"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>📖 Ver Especificação Completa</span>
                </button>
              )}
              {opsDaMaquina.length > 1 && (
                <button
                  onClick={() => setIsSelectOPModalOpen(true)}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2.5 py-1.5 rounded-xl border border-blue-500/20"
                >
                  Fila ({opsDaMaquina.length})
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {activeOP ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Cliente */}
              <div className="col-span-2 bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Cliente
                </span>
                <span className="text-base sm:text-lg font-black text-white tracking-tight block truncate">
                  {clienteNome}
                </span>
              </div>

              {/* Título */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Título
                </span>
                <span className="text-base sm:text-lg font-black text-white tracking-tight block truncate font-mono">
                  {activeOP.titulo_fio || activeOP.tituloFio || '—'}
                </span>
              </div>

              {/* Total de fios */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Total de Fios
                </span>
                <span className="text-base sm:text-lg font-black text-blue-400 tracking-tight block font-mono">
                  {(activeOP.total_fios ?? activeOP.totalFios)?.toLocaleString('pt-BR') || '—'}
                </span>
              </div>

              {/* Máquina */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Máquina
                </span>
                <span className="text-base sm:text-lg font-black text-neutral-200 tracking-tight block font-mono">
                  {activeOP.maquina || maquina}
                </span>
              </div>

              {/* Quantidade Planejada */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Qtd. Planejada
                </span>
                <span className="text-base sm:text-lg font-black text-white tracking-tight block font-mono">
                  {planejado} <span className="text-xs font-semibold text-neutral-500">rolos</span>
                </span>
              </div>

              {/* Produzidos */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                  Produzidos
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight block font-mono">
                  {produzidos} <span className="text-xs font-semibold text-neutral-500">rolos</span>
                </span>
              </div>

              {/* Pendentes */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                  Pendentes
                </span>
                <span className="text-base sm:text-lg font-black text-amber-400 tracking-tight block font-mono">
                  {pendentes} <span className="text-xs font-semibold text-neutral-500">rolos</span>
                </span>
              </div>

              {/* Urgência */}
              <div className="col-span-2 sm:col-span-4 flex items-center justify-between bg-black/20 rounded-xl p-3 border border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Nível de Urgência
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider font-mono border",
                  activeOP.urgencia === 'ALTA' && "bg-red-500/20 text-red-400 border-red-500/30",
                  activeOP.urgencia === 'MEDIA' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                  activeOP.urgencia === 'BAIXA' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                )}>
                  {activeOP.urgencia || 'NORMAL'}
                </span>
              </div>

              {/* Botão Ficha Técnica Completa */}
              <div className="col-span-2 sm:col-span-4 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSpecModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
                >
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>📖 Ver Especificação Completa</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-neutral-600" />
              <p className="text-sm font-bold uppercase tracking-wider">Nenhuma Ordem de Produção disponível.</p>
              <p className="text-xs text-neutral-600 mt-1">Aguardando programação de nova ordem de produção.</p>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* CARD 2: PROGRESSO                                              */}
        {/* ============================================================== */}
        <section className="bg-[#12161f] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Progresso
            </h2>
            <span className="text-xs font-black font-mono text-emerald-400">
              {percentual}% Concluído
            </span>
          </div>

          {/* Barra de Progresso Horizontal */}
          <div className="w-full bg-black/50 border border-white/10 rounded-xl h-7 p-1 overflow-hidden relative mb-4">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-lg transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              style={{ width: `${percentual}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[11px] font-black text-white drop-shadow-md tracking-wider font-mono">
                {produzidos} de {planejado} rolos ({percentual}%)
              </span>
            </div>
          </div>

          {/* Métricas: Planejado, Produzido, Pendente */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">
                Planejado
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none">
                {planejado}
              </span>
            </div>

            <div className="bg-emerald-950/20 rounded-xl p-3 text-center border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-1">
                Produzido
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono leading-none">
                {produzidos}
              </span>
            </div>

            <div className="bg-amber-950/20 rounded-xl p-3 text-center border border-amber-500/20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
                Pendente
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono leading-none">
                {pendentes}
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* CARD 3: PORTADAS (ROLO ATUAL, BOTÃO +, BOTÃO -)                */}
        {/* ============================================================== */}
        <section className="bg-[#12161f] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Portadas do Rolo Atual
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Controle em Memória
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/40 rounded-2xl p-6 border border-white/5">
            {/* Display Numérico Gigante */}
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1">
                Contagem Atual
              </span>
              <div className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tighter drop-shadow-md">
                {portadasAtual}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mt-1">
                Portadas registradas neste rolo
              </span>
            </div>

            {/* Controles de Touchscreen */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
              {/* Botão Pequeno: - (Correção rápida) */}
              <button
                onClick={handleDecrementPortada}
                disabled={portadasAtual <= 0}
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border border-white/10 flex items-center justify-center text-neutral-300 text-3xl font-black shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-neutral-500"
                )}
                title="Corrigir portada (-1)"
              >
                <Minus className="w-8 h-8" />
              </button>

              {/* Botão Grande: + (Registro de portada principal) */}
              <button
                onClick={handleIncrementPortada}
                className={cn(
                  "flex-1 sm:flex-none sm:w-48 h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-700 active:to-blue-600 text-white flex items-center justify-center gap-3 text-4xl font-black shadow-xl shadow-blue-900/30 transition-all active:scale-[0.98] border border-blue-400/30",
                  "focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                )}
                title="Registrar portada (+1)"
              >
                <Plus className="w-10 h-10 stroke-[3]" />
                <span className="text-xl sm:text-2xl tracking-wider uppercase font-black">Portada</span>
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* CARD 4: AÇÕES (BOTÕES GRANDES OCUPANDO TODA LARGURA)           */}
        {/* ============================================================== */}
        <section className="bg-[#12161f] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4 border-b border-white/5 pb-2">
            Ações Principais
          </h2>

          <div className="flex flex-col gap-3.5">
            {/* ▶ Iniciar Produção */}
            <button
              onClick={handleIniciarProducao}
              disabled={statusOperacao === 'PRODUZINDO' || !activeOP}
              className={cn(
                "w-full h-16 sm:h-18 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.99] border border-emerald-400/30",
                (statusOperacao === 'PRODUZINDO' || !activeOP) && "opacity-40 grayscale cursor-not-allowed shadow-none"
              )}
            >
              <Play className="w-6 h-6 fill-current" />
              <span>Iniciar Produção</span>
            </button>

            {/* ⏸ Pausar */}
            <button
              onClick={handlePausarProducao}
              disabled={statusOperacao === 'PAUSADO' || !activeOP}
              className={cn(
                "w-full h-16 sm:h-18 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-amber-900/30 transition-all active:scale-[0.99] border border-amber-400/30",
                (statusOperacao === 'PAUSADO' || !activeOP) && "opacity-40 grayscale cursor-not-allowed shadow-none"
              )}
            >
              <Pause className="w-6 h-6 fill-current" />
              <span>Pausar</span>
            </button>

            {/* ✅ Finalizar Rolo */}
            <button
              onClick={handleOpenFinalizarModal}
              disabled={!activeOP}
              className={cn(
                "w-full h-16 sm:h-18 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-blue-900/30 transition-all active:scale-[0.99] border border-blue-400/30",
                !activeOP && "opacity-40 grayscale cursor-not-allowed shadow-none"
              )}
            >
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              <span>Finalizar Rolo</span>
            </button>

            {/* 📦 Solicitar Rolete */}
            <button
              onClick={handleSolicitarRolete}
              disabled={!activeOP}
              className={cn(
                "w-full h-16 sm:h-18 rounded-2xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-purple-900/30 transition-all active:scale-[0.99] border border-purple-400/30",
                !activeOP && "opacity-40 grayscale cursor-not-allowed shadow-none"
              )}
            >
              <Package className="w-6 h-6 stroke-[2.5]" />
              <span>Solicitar Rolete</span>
            </button>

            {/* 📝 Ocorrência */}
            <button
              onClick={() => setIsOcorrenciaModalOpen(true)}
              className="w-full h-16 sm:h-18 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-rose-900/30 transition-all active:scale-[0.99] border border-rose-400/30"
            >
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              <span>Ocorrência</span>
            </button>
          </div>
        </section>

        {/* ============================================================== */}
        {/* CARD 5: ÚLTIMOS EVENTOS                                        */}
        {/* ============================================================== */}
        <section className="bg-[#12161f] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Últimos Eventos
            </h2>
            <span className="text-[11px] font-semibold text-neutral-500">
              Histórico da Máquina
            </span>
          </div>

          {ultimosEventos.length > 0 ? (
            <div className="space-y-2.5">
              {ultimosEventos.map((ev) => {
                const opDaLista = ops.find(o => o.id === ev.opId);
                const opCod = opDaLista?.codigo || '';
                const style = getTipoEventoLabel(ev.tipoEvento);
                const operadorNome = operadores.find(o => o.id === ev.operadorId)?.nome || 'Operador';

                return (
                  <div 
                    key={ev.id} 
                    className="bg-black/30 rounded-xl p-3.5 border border-white/5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        style.color
                      )}>
                        {style.label}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white leading-snug">
                          {ev.observacao || `Ação na máquina ${maquina}`}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-medium">
                          {opCod ? `OP: ${opCod} • ` : ''}Por: {operadorNome}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-400 whitespace-nowrap">
                      {formatHora(ev.createdAt || ev.timestampInicio)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-neutral-500">
              <p className="text-sm font-bold uppercase tracking-wider">Nenhum evento registrado.</p>
            </div>
          )}
        </section>

      </main>

      {/* ============================================================== */}
      {/* MODAL: FINALIZAR ROLO                                          */}
      {/* ============================================================== */}
      {isFinalizarModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151922] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Finalizar Rolo
              </h3>
              <button 
                onClick={() => {
                  setIsFinalizarModalOpen(false);
                  setModalFinalizarObs('');
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Quantidade de portadas acumuladas (somente leitura) */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Portadas acumuladas
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {portadasAtual} <span className="text-xs text-neutral-400 font-normal">portadas</span>
                </span>
              </div>

              {/* Campo Observação (opcional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Observação <span className="text-neutral-500 font-normal text-[11px]">(Opcional)</span>
                </label>
                <textarea 
                  rows={3}
                  value={modalFinalizarObs}
                  onChange={(e) => setModalFinalizarObs(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Observações sobre o rolo (opcional)..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => {
                  setIsFinalizarModalOpen(false);
                  setModalFinalizarObs('');
                }}
                className="w-full py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmFinalizarRolo}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-colors"
              >
                Finalizar Rolo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRAR OCORRÊNCIA                                    */}
      {/* ============================================================== */}
      {isOcorrenciaModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151922] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Registrar Ocorrência
              </h3>
              <button 
                onClick={() => {
                  setIsOcorrenciaModalOpen(false);
                  setOcorrenciaObs('');
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Tipo de Ocorrência
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TIPOS_OCORRENCIA.map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setOcorrenciaTipo(tipo)}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold text-left transition-all",
                        ocorrenciaTipo === tipo 
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                          : "bg-black/30 text-neutral-400 border-white/5 hover:border-white/20"
                      )}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {ocorrenciaTipo === 'Outros' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Descrição da ocorrência
                  </label>
                  <textarea
                    value={ocorrenciaObs}
                    onChange={(e) => setOcorrenciaObs(e.target.value)}
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Descrição da ocorrência..."
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => {
                  setIsOcorrenciaModalOpen(false);
                  setOcorrenciaObs('');
                }}
                className="w-full py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmOcorrencia}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-900/30 transition-colors"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TROCA RÁPIDA DE OPERADOR                                */}
      {/* ============================================================== */}
      {isTrocaOperadorModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151922] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Identificação do Operador
              </h3>
              <button 
                onClick={() => setIsTrocaOperadorModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-neutral-400 mb-3">
                Selecione o operador atuando na {maquina}:
              </p>
              {operadoresAtivos.map(opItem => (
                <button
                  key={opItem.id}
                  onClick={() => {
                    setSelectedOperadorId(opItem.id);
                    setIsTrocaOperadorModalOpen(false);
                    toast.success(`Operador definido: ${opItem.nome}`);
                  }}
                  className={cn(
                    "w-full p-3.5 rounded-xl border text-sm font-bold flex items-center justify-between transition-all",
                    selectedOperadorId === opItem.id
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                      : "bg-black/30 border-white/5 text-neutral-300 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs text-white">
                      {opItem.nome.charAt(0)}
                    </div>
                    <span>{opItem.nome}</span>
                  </div>
                  {selectedOperadorId === opItem.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  )}
                </button>
              ))}
              {operadoresAtivos.length === 0 && (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  Nenhum operador com autorização específica para esta máquina.
                </p>
              )}
            </div>

            <button 
              onClick={() => setIsTrocaOperadorModalOpen(false)}
              className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors mt-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SELEÇÃO DE OP NA FILA                                   */}
      {/* ============================================================== */}
      {isSelectOPModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151922] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                Fila de OPs — {maquina}
              </h3>
              <button 
                onClick={() => setIsSelectOPModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {opsDaMaquina.map(opItem => {
                const cSupabase = supabaseClientes.find(item => item.id?.toString() === (opItem.cliente_id || opItem.clienteId)?.toString());
                const cStore = clientes.find(item => item.id.toString() === (opItem.cliente_id || opItem.clienteId)?.toString());
                const cName = opItem.clientes?.nome_fantasia || opItem.clientes?.nome || cSupabase?.nome_fantasia || cSupabase?.nome || cStore?.nomeFantasia || (cStore as any)?.nome || 'Cliente';
                const isSelected = activeOP?.id === opItem.id;

                return (
                  <button
                    key={opItem.id}
                    onClick={() => {
                      setActiveOPId(opItem.id);
                      setIsSelectOPModalOpen(false);
                      setPortadasAtual(0);
                      toast.success(`Ordem ${opItem.codigo} selecionada.`);
                    }}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all space-y-2",
                      isSelected 
                        ? "bg-blue-600/20 border-blue-500/40" 
                        : "bg-black/30 border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white font-mono">{opItem.codigo}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border",
                        opItem.urgencia === 'ALTA' && "bg-red-500/20 text-red-400 border-red-500/30",
                        opItem.urgencia === 'MEDIA' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                        opItem.urgencia === 'BAIXA' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      )}>
                        {opItem.urgencia}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-300 font-bold truncate">
                      {cName}
                    </div>

                    <div className="text-[11px] text-neutral-400 flex items-center justify-between font-mono">
                      <span>{opItem.titulo_fio || opItem.tituloFio} ({(opItem.total_fios ?? opItem.totalFios)?.toLocaleString('pt-BR')} fios)</span>
                      <span>{opItem.quantidade_planejada ?? opItem.qtdRolos} rolos</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setIsSelectOPModalOpen(false)}
              className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL FULLSCREEN: ESPECIFICAÇÃO COMPLETA (FICHA TÉCNICA)       */}
      {/* ============================================================== */}
      {isSpecModalOpen && activeOP && (
        <div className="fixed inset-0 z-50 bg-[#090c12] text-white flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Barra Superior Fixa */}
          <div className="bg-[#121620] border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between shadow-xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl">
                📖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-xl font-black uppercase tracking-wider text-white">
                    Ficha Técnica Completa
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Somente Leitura
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-mono">
                  OP <span className="text-white font-bold">{activeOP.codigo}</span> • Cliente: <span className="text-blue-300 font-bold">{clienteNome}</span> • Máquina: <span className="text-neutral-200">{activeOP.maquina || maquina}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSpecModalOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
              title="Fechar (ESC)"
            >
              <X className="w-4 h-4" />
              <span>Fechar</span>
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-6xl mx-auto w-full">
            {/* Bloco 1: Identificação da Ordem */}
            <div className="bg-[#121620] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Identificação da Ordem & Planejamento
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider font-mono border",
                  activeOP.urgencia === 'ALTA' && "bg-red-500/20 text-red-400 border-red-500/30",
                  activeOP.urgencia === 'MEDIA' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                  activeOP.urgencia === 'BAIXA' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                )}>
                  Urgência: {activeOP.urgencia || 'NORMAL'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Cliente */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Cliente
                  </span>
                  <span className="text-base sm:text-lg font-black text-white block">
                    {clienteNome}
                  </span>
                </div>

                {/* 2. OP */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Código da OP
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-400 font-mono block">
                    {activeOP.codigo}
                  </span>
                </div>

                {/* 3. Especificação */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Especificação
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block truncate" title={especificacaoCodigo}>
                    {especificacaoCodigo}
                  </span>
                </div>

                {/* 16. Quantidade Planejada */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Quantidade Planejada
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-mono block">
                    {planejado} <span className="text-xs font-semibold text-neutral-400">rolos</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Fio & Matéria-Prima */}
            <div className="bg-[#121620] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Dados do Fio & Construção
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 4. Título */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Título do Fio
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block truncate">
                    {activeTitulo?.codigo || activeOP.titulo_fio || activeOP.tituloFio || '—'}
                  </span>
                  {activeTitulo?.descricao && (
                    <span className="text-[11px] text-neutral-400 block mt-0.5 truncate">
                      {activeTitulo.descricao}
                    </span>
                  )}
                </div>

                {/* 5. Tipo do Fio */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Tipo do Fio
                  </span>
                  <span className="text-base sm:text-lg font-black text-white block truncate">
                    {activeTitulo?.tipo_fio || activeTitulo?.tipo || (activeOP as any)?.tipo_fio || (activeOP as any)?.tipoFio || '—'}
                  </span>
                </div>

                {/* 6. Cor */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Cor do Fio
                  </span>
                  <span className="text-base sm:text-lg font-black text-purple-300 block truncate">
                    {corFio}
                  </span>
                </div>

                {/* 7. Total de Fios */}
                <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Total de Fios
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-400 font-mono block">
                    {(activeOP.total_fios ?? activeOP.totalFios)?.toLocaleString('pt-BR') || '—'} <span className="text-xs font-semibold text-neutral-400">fios</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 3: Parâmetros Técnicos da Máquina & Fita */}
            <div className="bg-[#121620] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Parâmetros Técnicos & Ajustes de Máquina
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* 8. Largura */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Largura
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block">
                    {activeEspecificacao?.largura || (activeOP as any)?.largura || '—'}
                  </span>
                </div>

                {/* 9. Pente */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Pente
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block">
                    {activeEspecificacao?.pente || (activeOP as any)?.pente || '—'}
                  </span>
                </div>

                {/* 10. Faca */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Faca
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block">
                    {activeEspecificacao?.faca || (activeOP as any)?.faca || '—'}
                  </span>
                </div>

                {/* 11. Avanço */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Avanço
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block">
                    {activeEspecificacao?.avanco || (activeOP as any)?.avanco || '—'}
                  </span>
                </div>

                {/* 12. Abertura */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Abertura
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block">
                    {activeEspecificacao?.abertura || (activeOP as any)?.abertura || '—'}
                  </span>
                </div>

                {/* 13. Rolete */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Rolete
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300 font-mono block truncate" title={activeOP.rolete || activeEspecificacao?.rolete}>
                    {activeOP.rolete || activeEspecificacao?.rolete || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 4: Medidas & Rotação */}
            <div className="bg-[#121620] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Metros & Voltas por Rolo
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 14. Metros */}
                <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                      Metros por Rolo
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono block">
                      {activeOP.metros ? `${activeOP.metros.toLocaleString('pt-BR')} m` : (activeEspecificacao?.metros ? `${activeEspecificacao.metros.toLocaleString('pt-BR')} m` : '—')}
                    </span>
                  </div>
                  <span className="text-2xl">📏</span>
                </div>

                {/* 15. Voltas */}
                <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                      Voltas por Rolo
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block">
                      {(activeOP.voltas ?? (activeOP as any)?.voltasPorRolo ?? activeEspecificacao?.voltas)?.toLocaleString('pt-BR') || '—'} <span className="text-sm font-semibold text-neutral-400">voltas</span>
                    </span>
                  </div>
                  <span className="text-2xl">🔄</span>
                </div>
              </div>
            </div>

            {/* Bloco 5: 17. Observações */}
            <div className="bg-[#121620] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
              <div className="border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Observações Gerais & Instruções
                </span>
              </div>

              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <p className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">
                  {observacoesFicha || 'Nenhuma observação cadastrada para esta Ordem de Produção.'}
                </p>
              </div>
            </div>

            {/* Botão de Fechamento Inferior */}
            <div className="pt-2 pb-6">
              <button
                type="button"
                onClick={() => setIsSpecModalOpen(false)}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-blue-900/30 transition-all active:scale-[0.99]"
              >
                Voltar para o Painel de Produção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
