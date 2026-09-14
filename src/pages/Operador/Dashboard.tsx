import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Play, 
  CheckCircle2, 
  Package, 
  AlertTriangle, 
  User, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  RotateCw,
  Layers,
  Cpu,
  Info,
  Sliders,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, generateId } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { ModalConferencia } from './ModalConferencia';

export default function DashboardOperador() {
  const { 
    user, 
    clientes, 
    operadores, 
    especificacoes,
    fiosCliente,
    updateOP, 
    addEventoProducao 
  } = useStore();
  
  const deviceConfig = useStore(state => state.deviceConfig);
  const isBoundMachine = deviceConfig?.isBound && deviceConfig.type === 'MAQUINA';
  
  const [selectedMachine, setSelectedMachine] = useState<string>(
    isBoundMachine ? (deviceConfig.machineId || 'MAQUINA 1') : (user?.machine || 'MAQUINA 1')
  );
  const maquina = selectedMachine;

  // Active OP & Operador Selection
  const [activeOPId, setActiveOPId] = useState<string | null>(null);
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>('');

  // Operator status: 'PRODUZINDO' | 'PAUSADO' | 'AGUARDANDO_OP'
  const [statusOperacao, setStatusOperacao] = useState<'PRODUZINDO' | 'PAUSADO' | 'AGUARDANDO_OP'>('AGUARDANDO_OP');

  // Portadas concluídas do rolo atual (0 até totalPortadas)
  const [portadasAtual, setPortadasAtual] = useState<number>(0);

  // Rolos finalizados localmente em memória para sincronização imediata
  const [rolosFinalizadosMemoria, setRolosFinalizadosMemoria] = useState<Record<string, number>>({});

  // Ficha técnica: expandir informações complementares
  const [isInfoExpanded, setIsInfoExpanded] = useState<boolean>(false);

  // Modais
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState<boolean>(false);
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState<boolean>(false);
  const [isTrocaOperadorModalOpen, setIsTrocaOperadorModalOpen] = useState<boolean>(false);
  const [isConferenciaModalOpen, setIsConferenciaModalOpen] = useState<boolean>(false);

  // Registro de Ciclo e Produção do Rolo Atual
  const [cicloInicioEm, setCicloInicioEm] = useState<string>(new Date().toISOString());
  const [tempoProducao, setTempoProducao] = useState<string>('00:00:00');
  const [ocorrenciasCicloAtual, setOcorrenciasCicloAtual] = useState<string[]>([]);

  // Campos do modal finalizar rolo
  const [modalFinalizarObs, setModalFinalizarObs] = useState<string>('');

  // 4. Lista padronizada de Ocorrências (Sprint 2.3.2)
  const TIPOS_OCORRENCIA = [
    'Fio quebrado',
    'Rolete torto/travado',
    'Voltas a menos',
    'Voltas a mais',
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

  // Consultar a tabela public.ordens_producao via Supabase
  const fetchOPs = async () => {
    try {
      const machineVariants = getMachineFilterValues(maquina);

      let query = supabase
        .from('ordens_producao')
        .select('*, clientes!ordens_producao_cliente_id_fkey(id, nome, razao_social, nome_fantasia)')
        .in('status', ['PENDENTE', 'PREPARANDO', 'EM_ANDAMENTO'])
        .or(`maquina.in.(${machineVariants.map(v => `"${v}"`).join(',')}),maquina_preparacao.in.(${machineVariants.map(v => `"${v}"`).join(',')})`)
        .order('criado_em', { ascending: true });

      let { data, error } = await query;

      if (error) {
        console.warn('Tentativa com join em clientes falhou, buscando sem join:', error);
        const fallback = await supabase
          .from('ordens_producao')
          .select('*')
          .in('status', ['PENDENTE', 'PREPARANDO', 'EM_ANDAMENTO'])
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
        maquinaPreparacao: o.maquina_preparacao || null,
        maquina_preparacao: o.maquina_preparacao || null,
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
        roloDesenho: o.rolo_desenho || null,
        rolo_desenho: o.rolo_desenho || null,
        composicao: o.composicao || [],
        fiosPorPortada: o.fios_por_portada != null ? Number(o.fios_por_portada) : undefined,
        fios_por_portada: o.fios_por_portada != null ? Number(o.fios_por_portada) : undefined,
        portadasPrevistas: o.portadas_previstas != null ? Number(o.portadas_previstas) : undefined,
        portadas_previstas: o.portadas_previstas != null ? Number(o.portadas_previstas) : undefined,
        observacoesProducao: o.observacoes_producao || '',
        observacoes_producao: o.observacoes_producao || '',
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

  // Supabase Realtime: quando houver alteração em ordens_producao, atualizar
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

  // 5. Atualização em tempo real do Tempo de Produção do Rolo Atual
  useEffect(() => {
    const updateTimer = () => {
      if (!cicloInicioEm || statusOperacao === 'AGUARDANDO_OP') {
        setTempoProducao('00:00:00');
        return;
      }
      const inicioMs = new Date(cicloInicioEm).getTime();
      const agoraMs = Date.now();
      const diffSeg = Math.max(0, Math.floor((agoraMs - inicioMs) / 1000));
      const h = Math.floor(diffSeg / 3600);
      const m = Math.floor((diffSeg % 3600) / 60);
      const s = diffSeg % 60;
      setTempoProducao(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cicloInicioEm, statusOperacao]);

  // Operadores autorizados para esta máquina
  const operadoresAtivos = useMemo(() => {
    return operadores.filter(o => o.status === 'ATIVO' && o.maquinasAutorizadas.includes(maquina as any));
  }, [operadores, maquina]);

  // Se nenhum operador selecionado, preenche automaticamente
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

  // Variações de máquina para filtro
  const machineVariants = useMemo(() => getMachineFilterValues(maquina), [maquina]);

  // OPs vinculadas à máquina atual
  const opsDaMaquina = useMemo(() => {
    return supabaseOPs.filter(o => {
      const maqOp = (o.maquina || '').toUpperCase();
      const maqPrep = (o.maquinaPreparacao || o.maquina_preparacao || '').toUpperCase();
      return machineVariants.some(v => v.toUpperCase() === maqOp || v.toUpperCase() === maqPrep);
    });
  }, [supabaseOPs, machineVariants]);

  // Identificar OP Ativa
  const activeOP = useMemo(() => {
    if (activeOPId) {
      const found = opsDaMaquina.find(o => o.id === activeOPId);
      if (found) return found;
    }
    const emAndamento = opsDaMaquina.find(o => o.status === 'EM_ANDAMENTO' && machineVariants.includes(o.maquina));
    if (emAndamento) return emAndamento;

    const preparando = opsDaMaquina.find(o => o.status === 'PREPARANDO' && (machineVariants.includes(o.maquina) || machineVariants.includes(o.maquinaPreparacao)));
    if (preparando) return preparando;

    const pendente = opsDaMaquina.find(o => o.status === 'PENDENTE' && machineVariants.includes(o.maquina));
    return pendente || null;
  }, [activeOPId, opsDaMaquina, machineVariants]);

  // Sincronizar activeOPId
  useEffect(() => {
    if (activeOP && activeOP.id !== activeOPId) {
      setActiveOPId(activeOP.id);
    } else if (!activeOP && activeOPId) {
      setActiveOPId(null);
    }
  }, [activeOP, activeOPId]);

  // Atualizar status de operação conforme a OP ativa
  useEffect(() => {
    if (!activeOP) {
      setStatusOperacao('AGUARDANDO_OP');
      return;
    }
    if (activeOP.status === 'EM_ANDAMENTO') {
      setStatusOperacao('PRODUZINDO');
    } else if (activeOP.status === 'PREPARANDO') {
      setStatusOperacao('PAUSADO');
    } else {
      setStatusOperacao('PAUSADO');
    }
  }, [activeOP]);

  // Fila completa de OPs da máquina
  const filaDeProducao = useMemo(() => {
    return opsDaMaquina.filter(o => o.id !== activeOP?.id);
  }, [opsDaMaquina, activeOP]);

  // Cálculos de Progresso da OP Ativa
  const { planejado, produzidos, pendentes, roloAtualFormatado } = useMemo(() => {
    if (!activeOP) {
      return { planejado: 1, produzidos: 0, pendentes: 1, roloAtualFormatado: '01 de 01' };
    }

    const qtdPlanejada = Number(activeOP.quantidade_planejada || activeOP.qtdRolos || 1);
    const rolosFinalizadosMem = rolosFinalizadosMemoria[activeOP.id] || 0;
    
    const qtdProduzida = Math.max(
      Number(activeOP.quantidade_produzida || 0),
      rolosFinalizadosMem
    );
    const qtdPendente = Math.max(0, qtdPlanejada - qtdProduzida);
    
    // Rolo atual sendo produzido (Ex.: 03 de 10)
    const numeroRoloAtual = Math.min(qtdPlanejada, qtdProduzida + 1);
    const formatado = `${String(numeroRoloAtual).padStart(2, '0')} de ${String(qtdPlanejada).padStart(2, '0')}`;

    return {
      planejado: qtdPlanejada,
      produzidos: qtdProduzida,
      pendentes: qtdPendente,
      roloAtualFormatado: formatado
    };
  }, [activeOP, rolosFinalizadosMemoria]);

  // Helper para obter nome do cliente
  const getClienteNome = (opItem: any) => {
    if (!opItem) return '—';
    if (opItem.clientes) {
      const c = opItem.clientes;
      const n = c.nome_fantasia || c.nomeFantasia || c.razao_social || c.razaoSocial || c.nome;
      if (n) return n;
    }
    const cid = (opItem.cliente_id || opItem.clienteId)?.toString();
    const sc = supabaseClientes.find(c => c.id?.toString() === cid);
    if (sc) return sc.nome_fantasia || sc.razao_social || sc.nome || 'Cliente';
    const c = clientes.find(item => item.id.toString() === cid);
    return c?.nomeFantasia || c?.razaoSocial || (c as any)?.nome || 'Cliente';
  };

  const clienteNome = useMemo(() => getClienteNome(activeOP), [activeOP, supabaseClientes, clientes]);

  const currentOperador = useMemo(() => {
    return operadores.find(o => o.id === selectedOperadorId) || null;
  }, [operadores, selectedOperadorId]);

  // Especificação Técnica associada à OP ativa
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

  // 3. Total de Portadas conhecido pelo sistema para este rolo
  const totalPortadas = useMemo(() => {
    if (!activeOP) return 18;
    const prev = Number(activeOP.portadas_previstas || activeOP.portadasPrevistas);
    if (prev > 0) return prev;
    const tf = Number(activeOP.total_fios || activeOP.totalFios);
    const fp = Number(activeOP.fios_por_portada || activeOP.fiosPorPortada);
    if (tf > 0 && fp > 0) return Math.ceil(tf / fp);
    return 18; // Fallback padronizado caso não informado
  }, [activeOP]);

  // Identificação do Rolo Desenho (quando existir)
  const temRoloDesenho = useMemo(() => {
    if (!activeOP) return false;
    return Boolean(
      activeOP.is_desenho || 
      activeOP.isDesenho || 
      activeEspecificacao?.isDesenho || 
      activeEspecificacao?.is_desenho ||
      activeOP.rolo_desenho ||
      activeOP.roloDesenho
    );
  }, [activeOP, activeEspecificacao]);

  const valorRoloDesenho = useMemo(() => {
    if (!activeOP) return null;
    return activeOP.rolo_desenho || activeOP.roloDesenho || (temRoloDesenho ? 'Desenho Especial' : null);
  }, [activeOP, temRoloDesenho]);

  // Observações da OP para dados complementares
  const observacoesComplementares = useMemo(() => {
    if (!activeOP) return 'Nenhuma observação informada.';
    const obsOP = activeOP.observacoes_producao || activeOP.observacoesProducao || (activeOP as any).observacoes;
    const obsEsp = activeEspecificacao?.observacoes_tecnicas || (activeEspecificacao as any)?.observacoes;
    const partes: string[] = [];
    if (obsOP) partes.push(`OP: ${obsOP}`);
    if (obsEsp) partes.push(`Técnica: ${obsEsp}`);
    return partes.length > 0 ? partes.join(' • ') : 'Nenhuma observação informada.';
  }, [activeOP, activeEspecificacao]);

  // =========================================================================
  // 6. AÇÕES: FINALIZAR PORTADA, REGISTRAR OCORRÊNCIA, FINALIZAR ROLO
  // =========================================================================

  // AÇÃO 1: FINALIZAR PORTADA (Avança de 🟡 para 🟢 e próxima para 🟡)
  const handleFinalizarPortada = () => {
    if (!activeOP) return;

    if (portadasAtual < totalPortadas) {
      const novaPortada = portadasAtual + 1;
      setPortadasAtual(novaPortada);
      toast.success(`Portada ${String(novaPortada).padStart(2, '0')} concluída!`, {
        icon: '🟢',
        style: { background: '#10131a', color: '#10b981', border: '1px solid #10b98140' }
      });

      if (novaPortada === totalPortadas) {
        toast('Todas as portadas do rolo foram concluídas! Prossiga para FINALIZAR ROLO.', {
          icon: '🏁',
          duration: 4000
        });
      }
    } else {
      toast('Todas as portadas deste rolo já foram concluídas. Clique em FINALIZAR ROLO.', {
        icon: 'ℹ️'
      });
    }
  };

  // AÇÃO 2: REGISTRAR OCORRÊNCIA (Abre modal para salvar ocorrência vinculada à portada atual)
  const handleOpenOcorrenciaModal = () => {
    if (!activeOP) return;
    setOcorrenciaTipo(TIPOS_OCORRENCIA[0]);
    setOcorrenciaObs('');
    setIsOcorrenciaModalOpen(true);
  };

  // Confirmar Ocorrência (Registra automaticamente a portada atual)
  const handleConfirmOcorrencia = () => {
    if (!activeOP) return;

    // 4. Portada atual registrada automaticamente (Ex.: Portada 08 ↓ Rolete torto)
    const portadaAtualNumero = Math.min(totalPortadas, portadasAtual + 1);
    const portadaFormatada = `Portada ${String(portadaAtualNumero).padStart(2, '0')}`;
    
    const textoFinal = ocorrenciaTipo === 'Outros'
      ? `${portadaFormatada} - Outros${ocorrenciaObs ? ': ' + ocorrenciaObs.trim() : ''}`
      : `${portadaFormatada} - ${ocorrenciaTipo}${ocorrenciaObs ? ': ' + ocorrenciaObs.trim() : ''}`;

    setOcorrenciasCicloAtual(prev => [...prev, textoFinal]);

    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: `${activeOP.codigo}-R${produzidos + 1}`,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'OCORRENCIA' as any,
      portadasNoEvento: portadasAtual,
      timestampInicio: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      observacao: textoFinal
    });

    toast.success(`Ocorrência salva: ${textoFinal}!`, {
      icon: '⚠️'
    });

    setIsOcorrenciaModalOpen(false);
    setOcorrenciaObs('');
  };

  // AÇÃO 3: FINALIZAR ROLO (Abre modal de confirmação)
  const handleOpenFinalizarModal = () => {
    if (!activeOP) {
      toast.error('Nenhuma OP ativa');
      return;
    }
    setModalFinalizarObs('');
    setIsFinalizarModalOpen(true);
  };

  // 7. FINALIZAR ROLO - Executar rigorosamente nesta ordem:
  // 1. Salvar portadas
  // 2. Salvar ciclo
  // 3. Salvar ocorrências
  // 4. Atualizar quantidade produzida da OP
  // 5. Atualizar quantidade pendente
  // 6. Alterar status do rolo para AGUARDANDO_PESAGEM
  const handleConfirmFinalizarRolo = async () => {
    if (!activeOP) return;

    const horarioTermino = new Date().toISOString();
    const horarioInicio = cicloInicioEm || horarioTermino;
    const inicioMs = new Date(horarioInicio).getTime();
    const terminoMs = new Date(horarioTermino).getTime();
    const duracaoSegundos = Math.max(1, Math.round((terminoMs - inicioMs) / 1000));
    const h = Math.floor(duracaoSegundos / 3600);
    const m = Math.floor((duracaoSegundos % 3600) / 60);
    const s = duracaoSegundos % 60;
    const tempoProducaoFormatado = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const operadorNome = currentOperador?.nome || (user as any)?.name || 'Operador';

    // 1. Salvar portadas
    const portadasSalvas = portadasAtual;

    // 2. Salvar ciclo & 3. Salvar ocorrências
    const todasOcorrencias = [...ocorrenciasCicloAtual];
    if (modalFinalizarObs.trim()) {
      todasOcorrencias.push(modalFinalizarObs.trim());
    }
    const ocorrenciasTexto = todasOcorrencias.length > 0 ? todasOcorrencias.join('; ') : 'Nenhuma';

    // 4. Atualizar quantidade produzida da OP
    const qtdPlanejada = Number(activeOP.quantidade_planejada ?? activeOP.qtdRolos ?? 1);
    const qtdProduzidaAtual = Number(activeOP.quantidade_produzida ?? produzidos ?? 0);
    const novaQtdProduzida = qtdProduzidaAtual + 1;

    // 5. Atualizar quantidade pendente
    const novaQtdPendente = Math.max(0, qtdPlanejada - novaQtdProduzida);
    const isOpConcluida = novaQtdPendente === 0;
    const novoStatusOP = isOpConcluida ? 'FINALIZADA' : 'EM_ANDAMENTO';

    const numeroRoloGerado = `${activeOP.codigo}-R${novaQtdProduzida}`;

    // 6. Alterar status do rolo para AGUARDANDO_PESAGEM no Supabase
    try {
      await supabase.from('rolos').insert([{
        op_id: Number(activeOP.id) || null,
        numero_rolo: numeroRoloGerado,
        status: 'AGUARDANDO_PESAGEM',
        portadas_total: portadasSalvas,
        finalizado_em: horarioTermino,
        sequencia: novaQtdProduzida
      }]);
    } catch (errRolo) {
      console.warn('Erro ao inserir rolo no Supabase:', errRolo);
    }

    // Salvar ciclo em producao_operador se existir
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

    // Atualizar quantidade produzida, pendente e status da OP no Supabase
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
    } catch (errOP) {
      console.warn('Erro ao atualizar ordens_producao no Supabase:', errOP);
    }

    // Registrar Evento de Produção
    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: numeroRoloGerado,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'FINALIZAR_ROLO',
      portadasNoEvento: portadasSalvas,
      timestampInicio: horarioInicio,
      timestampFim: horarioTermino,
      duracaoSegundos,
      observacao: `Rolo #${numeroRoloGerado} finalizado • Portadas: ${portadasSalvas} | Ocorrências: ${ocorrenciasTexto} | Tempo: ${tempoProducaoFormatado}`,
      createdAt: horarioTermino
    });

    // Atualizar store local
    setRolosFinalizadosMemoria(prev => ({
      ...prev,
      [activeOP.id]: novaQtdProduzida
    }));

    updateOP(activeOP.id, {
      quantidade_produzida: novaQtdProduzida,
      quantidade_pendente: novaQtdPendente,
      status: novoStatusOP as any,
      ...(isOpConcluida ? { fim: horarioTermino } : {})
    } as any);

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

    setIsFinalizarModalOpen(false);
    setModalFinalizarObs('');

    // =======================================================================
    // 8. PRÓXIMO ROLO: Se existir rolo pendente na mesma OP, abrir automaticamente!
    // =======================================================================
    if (!isOpConcluida) {
      const novoCicloInicio = new Date().toISOString();
      setCicloInicioEm(novoCicloInicio);
      setPortadasAtual(0);
      setOcorrenciasCicloAtual([]);
      setStatusOperacao('PRODUZINDO');
      toast.success(
        `Rolo ${String(novaQtdProduzida).padStart(2, '0')} finalizado com sucesso! Rolo ${String(novaQtdProduzida + 1).padStart(2, '0')} de ${String(qtdPlanejada).padStart(2, '0')} iniciado.`,
        { icon: '🚀', duration: 4000 }
      );
    } 
    // =======================================================================
    // 9. ÚLTIMO ROLO: Atualizar OP para CONCLUÍDA e retornar à lista de OPs
    // =======================================================================
    else {
      setPortadasAtual(0);
      setOcorrenciasCicloAtual([]);
      setStatusOperacao('AGUARDANDO_OP');
      setActiveOPId(null);
      toast.success(
        'Todos os rolos foram produzidos! Ordem de Produção CONCLUÍDA.',
        { icon: '🎉', duration: 5000 }
      );
      fetchOPs();
    }
  };

  // Iniciar Produção da OP (abre conferência antes de começar)
  const handleConfirmarInicioConferencia = async () => {
    if (!activeOP) return;
    setIsConferenciaModalOpen(false);

    const agora = new Date().toISOString();
    setCicloInicioEm(agora);
    setPortadasAtual(0);
    setOcorrenciasCicloAtual([]);
    setStatusOperacao('PRODUZINDO');

    try {
      await supabase
        .from('ordens_producao')
        .update({ 
          status: 'EM_ANDAMENTO',
          inicio: agora,
          atualizado_em: agora
        })
        .eq('id', Number(activeOP.id));
    } catch (e) {
      console.warn('Erro ao atualizar início da OP no Supabase:', e);
    }

    updateOP(activeOP.id, { status: 'EM_ANDAMENTO', inicio: agora } as any);

    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: `${activeOP.codigo}-R${produzidos + 1}`,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'INICIO_PRODUCAO',
      portadasNoEvento: 0,
      timestampInicio: agora,
      createdAt: agora,
      observacao: `Início de produção da OP ${activeOP.codigo} com conferência realizada`
    });

    toast.success('Produção iniciada com sucesso!');
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-neutral-100 font-sans pb-16 selection:bg-blue-600 selection:text-white">
      {/* ============================================================== */}
      {/* CABEÇALHO DO TABLET                                            */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 bg-[#10131a]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Título & Máquina */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-black text-blue-400 text-xl tracking-wider shadow-inner">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white uppercase">TEXLOG</span>
                <span className="text-neutral-500 text-xs font-semibold">|</span>
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Operador V2</span>
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
            {/* Operador badge clicável */}
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

      {/* ============================================================== */}
      {/* CONTEÚDO PRINCIPAL (SPRINT 2.3.2)                              */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {activeOP ? (
          <>
            {/* ========================================================== */}
            {/* 2. FICHA TÉCNICA (SEMPRE VISÍVEL, SEM MODAL)               */}
            {/* ========================================================== */}
            <section className="bg-[#12161f] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Ficha Técnica
                  </h2>
                </div>

                {/* Botão Único: Expandir informações */}
                <button
                  type="button"
                  onClick={() => setIsInfoExpanded(prev => !prev)}
                  className="text-xs font-bold text-blue-300 hover:text-white flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 px-3.5 py-2 rounded-xl border border-blue-500/30 transition-all shadow-sm active:scale-95"
                >
                  {isInfoExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 text-blue-400" />
                      <span>Recolher informações</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-blue-400" />
                      <span>Expandir informações</span>
                    </>
                  )}
                </button>
              </div>

              {/* Cabeçalho Primário da Ficha Técnica: Cliente, OP, Máquina, Rolo Atual */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Cliente
                  </span>
                  <span className="text-base sm:text-lg font-black text-white truncate block">
                    {clienteNome}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    OP
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-400 font-mono block">
                    {activeOP.codigo}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Máquina
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono block">
                    {maquina}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                    Rolo Atual
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300 font-mono block">
                    {roloAtualFormatado}
                  </span>
                </div>
              </div>

              {/* Fita Completa dos Parâmetros Técnicos Exigidos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-2.5">
                {/* Título */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Título
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono truncate block" title={activeOP.titulo_fio || activeOP.tituloFio || activeTitulo?.codigo}>
                    {activeOP.titulo_fio || activeOP.tituloFio || activeTitulo?.codigo || '—'}
                  </span>
                </div>

                {/* Tipo do Fio */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Tipo do Fio
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white truncate block">
                    {activeOP.tipo_fio || activeOP.tipoFio || activeTitulo?.tipo_fio || '—'}
                  </span>
                </div>

                {/* Total de Fios */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Total Fios
                  </span>
                  <span className="text-xs sm:text-sm font-black text-blue-400 font-mono block">
                    {(activeOP.total_fios ?? activeOP.totalFios)?.toLocaleString('pt-BR') || '—'}
                  </span>
                </div>

                {/* Pente */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Pente
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono block">
                    {activeOP.pente || activeEspecificacao?.pente || '—'}
                  </span>
                </div>

                {/* Faca */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Faca
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono block">
                    {activeOP.faca || activeEspecificacao?.faca || '—'}
                  </span>
                </div>

                {/* Avanço */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Avanço
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono block">
                    {activeOP.avanco || activeEspecificacao?.avanco || '—'}
                  </span>
                </div>

                {/* Abertura */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Abertura
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono block">
                    {activeOP.abertura || activeEspecificacao?.abertura || '—'}
                  </span>
                </div>

                {/* Rolete */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Rolete
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-300 font-mono truncate block" title={activeOP.rolete || activeEspecificacao?.rolete}>
                    {activeOP.rolete || activeEspecificacao?.rolete || '—'}
                  </span>
                </div>

                {/* Metros */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Metros
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono block">
                    {activeOP.metros ? `${activeOP.metros.toLocaleString('pt-BR')} m` : (activeEspecificacao?.metros ? `${activeEspecificacao.metros.toLocaleString('pt-BR')} m` : '—')}
                  </span>
                </div>

                {/* Voltas */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                    Voltas
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono block">
                    {(activeOP.voltas ?? activeEspecificacao?.voltas)?.toLocaleString('pt-BR') || '—'}
                  </span>
                </div>
              </div>

              {/* Rolo Desenho (quando existir) */}
              {temRoloDesenho && (
                <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎨</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Rolo Desenho:
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-purple-200 uppercase bg-purple-500/20 px-3 py-1 rounded-xl border border-purple-500/30">
                    {valorRoloDesenho || 'Sim (Especial)'}
                  </span>
                </div>
              )}

              {/* Dados Complementares (quando botão "Expandir informações" for acionado) */}
              {isInfoExpanded && (
                <div className="pt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                        Largura
                      </span>
                      <span className="text-sm font-black text-white font-mono">
                        {activeEspecificacao?.largura || activeOP.largura ? `${activeEspecificacao?.largura || activeOP.largura} cm` : '—'}
                      </span>
                    </div>

                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                        Fios por Portada (Gaiola)
                      </span>
                      <span className="text-sm font-black text-white font-mono">
                        {activeOP.fios_por_portada || activeOP.fiosPorPortada || '—'} fios
                      </span>
                    </div>

                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                        Composição do Fio
                      </span>
                      <span className="text-sm font-black text-white truncate block">
                        {activeEspecificacao?.composicao?.length 
                          ? activeEspecificacao.composicao.map((c: any) => `${c.fio} (${c.quantidade})`).join(', ') 
                          : 'Padrão'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl p-3.5 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                      Observações da Produção & Instruções
                    </span>
                    <p className="text-xs text-neutral-200 leading-relaxed font-medium">
                      {observacoesComplementares}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* SE A OP AINDA NÃO FOI INICIADA: AVISO E BOTÃO DE CONFERÊNCIA INICIAL */}
            {statusOperacao !== 'PRODUZINDO' && (
              <div className="bg-gradient-to-r from-emerald-950/40 via-[#12161f] to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 text-center shadow-xl space-y-3">
                <h3 className="text-lg font-black uppercase tracking-wider text-white">
                  Ordem de Produção Selecionada
                </h3>
                <p className="text-xs text-neutral-300 max-w-xl mx-auto">
                  Confira as configurações físicas de gaiola, dentes do pente e rolete antes de dar partida na máquina.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConferenciaModalOpen(true)}
                    className="py-4 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Iniciar Produção (Conferência)</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* 3. ÁREA DAS PORTADAS (PAINEL AUTOMÁTICO SEM CONTADOR)      */}
            {/* ========================================================== */}
            <section className="bg-[#12161f] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-neutral-200">
                    Portadas do Rolo ({totalPortadas} prevístas)
                  </h2>
                </div>

                {/* Legenda Exata: 🟢 concluída | 🟡 atual | ⬜ pendente */}
                <div className="flex items-center gap-3 sm:gap-5 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm">🟢</span>
                    <span className="text-emerald-400">Concluída</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm">🟡</span>
                    <span className="text-amber-300">Atual</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm">⬜</span>
                    <span className="text-neutral-400">Pendente</span>
                  </span>
                </div>
              </div>

              {/* Grid Automático de Portadas */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-10 gap-2 sm:gap-3 py-2">
                {Array.from({ length: totalPortadas }, (_, i) => i + 1).map((num) => {
                  const isConcluida = num <= portadasAtual;
                  const isAtual = num === portadasAtual + 1 && portadasAtual < totalPortadas;
                  const isPendente = num > portadasAtual + 1;

                  return (
                    <div
                      key={num}
                      className={cn(
                        "rounded-2xl p-3 flex flex-col items-center justify-center transition-all min-h-[68px]",
                        isConcluida && "bg-emerald-950/40 border-2 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
                        isAtual && "bg-amber-500/20 border-2 border-amber-400 text-amber-200 ring-4 ring-amber-400/20 shadow-[0_0_18px_rgba(245,158,11,0.3)] animate-pulse",
                        isPendente && "bg-black/30 border border-white/10 text-neutral-500"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-mono font-black text-sm sm:text-base">
                        <span>{isConcluida ? '🟢' : isAtual ? '🟡' : '⬜'}</span>
                        <span>{String(num).padStart(2, '0')}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider mt-1",
                        isConcluida && "text-emerald-400",
                        isAtual && "text-amber-300 font-black",
                        isPendente && "text-neutral-600"
                      )}>
                        {isConcluida ? 'Concluída' : isAtual ? 'Atual' : 'Pendente'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ======================================================== */}
              {/* 5. RESUMO (ABAIXO DAS PORTADAS COM TEMPO REAL)          */}
              {/* ======================================================== */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 mt-3">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Concluídas:
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono text-emerald-400 block">
                    {String(portadasAtual).padStart(2, '0')} / {String(totalPortadas).padStart(2, '0')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Restantes:
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono text-neutral-200 block">
                    {String(Math.max(0, totalPortadas - portadasAtual)).padStart(2, '0')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Tempo Produção
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono text-blue-400 block">
                    {tempoProducao}
                  </span>
                </div>
              </div>

              {/* Registro visual das ocorrências anotadas neste rolo */}
              {ocorrenciasCicloAtual.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 space-y-1 mt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Ocorrências anotadas neste rolo ({ocorrenciasCicloAtual.length}):
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ocorrenciasCicloAtual.map((oc, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-black/50 border border-amber-500/30 text-[11px] font-mono text-amber-200 font-bold">
                        {oc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ========================================================== */}
            {/* 6. BOTÕES (A TELA DEVE POSSUIR APENAS ESTES 3)             */}
            {/* ========================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {/* Botão 1: FINALIZAR PORTADA */}
              <button
                type="button"
                onClick={handleFinalizarPortada}
                className="h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:from-emerald-700 active:to-emerald-600 text-white flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/30 border border-emerald-400/30 transition-all active:scale-[0.98] focus:outline-none"
              >
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                <span className="text-base sm:text-xl font-black uppercase tracking-wider">
                  FINALIZAR PORTADA
                </span>
              </button>

              {/* Botão 2: REGISTRAR OCORRÊNCIA */}
              <button
                type="button"
                onClick={handleOpenOcorrenciaModal}
                className="h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:from-amber-700 active:to-amber-600 text-white flex items-center justify-center gap-3 shadow-xl shadow-amber-900/30 border border-amber-400/30 transition-all active:scale-[0.98] focus:outline-none"
              >
                <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
                <span className="text-base sm:text-xl font-black uppercase tracking-wider">
                  REGISTRAR OCORRÊNCIA
                </span>
              </button>

              {/* Botão 3: FINALIZAR ROLO */}
              <button
                type="button"
                onClick={handleOpenFinalizarModal}
                className="h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-700 active:to-blue-600 text-white flex items-center justify-center gap-3 shadow-xl shadow-blue-900/30 border border-blue-400/30 transition-all active:scale-[0.98] focus:outline-none"
              >
                <Package className="w-7 h-7 stroke-[2.5]" />
                <span className="text-base sm:text-xl font-black uppercase tracking-wider">
                  FINALIZAR ROLO
                </span>
              </button>
            </div>
          </>
        ) : (
          /* ============================================================ */
          /* NENHUMA OP ATIVA: LISTA DE ORDENS DA MÁQUINA               */
          /* ============================================================ */
          <section className="bg-[#12161f] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-white">
                    Fila de Produção da Máquina ({opsDaMaquina.length})
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Selecione uma ordem de produção programada para esta máquina para iniciar os trabalhos.
                  </p>
                </div>
              </div>
            </div>

            {opsDaMaquina.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opsDaMaquina.map((opItem, idx) => {
                  const cName = getClienteNome(opItem);
                  const qPlan = Number(opItem.quantidade_planejada ?? opItem.qtdRolos ?? 1);
                  const qProd = Number(opItem.quantidade_produzida ?? 0);

                  return (
                    <div
                      key={opItem.id}
                      className="bg-black/40 border border-white/10 hover:border-blue-500/40 rounded-2xl p-5 space-y-4 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-neutral-400">
                            #{idx + 1}
                          </span>
                          <span className="text-lg font-black text-white font-mono">
                            {opItem.codigo}
                          </span>
                        </div>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border",
                          opItem.urgencia === 'ALTA' && "bg-red-500/20 text-red-400 border-red-500/30",
                          opItem.urgencia === 'MEDIA' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                          opItem.urgencia === 'BAIXA' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        )}>
                          {opItem.urgencia}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-neutral-500 block">Cliente</span>
                        <span className="text-base font-black text-blue-300 block truncate">{cName}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                        <div>
                          <span className="text-[9px] font-bold uppercase text-neutral-500 block">Título</span>
                          <span className="text-xs font-mono font-bold text-white truncate block">
                            {opItem.titulo_fio || opItem.tituloFio || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-neutral-500 block">Fios</span>
                          <span className="text-xs font-mono font-bold text-blue-400 block">
                            {(opItem.total_fios ?? opItem.totalFios)?.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-neutral-500 block">Rolos</span>
                          <span className="text-xs font-mono font-bold text-emerald-400 block">
                            {qProd} / {qPlan}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveOPId(opItem.id);
                          toast.success(`Ordem ${opItem.codigo} selecionada.`);
                        }}
                        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Selecionar para Produzir</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-neutral-500 space-y-2">
                <Clock className="w-12 h-12 mx-auto text-neutral-600 mb-2" />
                <p className="text-base font-bold uppercase tracking-wider text-neutral-400">
                  Nenhuma Ordem Programada
                </p>
                <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                  Não há ordens de produção pendentes para a {maquina}. O programador definirá as próximas ordens.
                </p>
              </div>
            )}
          </section>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL: CONFERÊNCIA ANTES DO INÍCIO                             */}
      {/* ============================================================== */}
      {activeOP && (
        <ModalConferencia
          isOpen={isConferenciaModalOpen}
          onClose={() => setIsConferenciaModalOpen(false)}
          onConfirm={handleConfirmarInicioConferencia}
          op={activeOP}
          clienteNome={clienteNome}
          tituloFio={activeOP.titulo_fio || activeOP.tituloFio || activeTitulo?.codigo}
          tipoFio={activeOP.tipo_fio || activeOP.tipoFio || activeTitulo?.tipo_fio}
          especificacao={activeEspecificacao}
          maquina={maquina}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL: FINALIZAR ROLO (7. FINALIZAR ROLO)                      */}
      {/* ============================================================== */}
      {isFinalizarModalOpen && activeOP && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151922] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
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
              {/* Quantidade de portadas acumuladas */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Rolo em Finalização
                </span>
                <div className="text-xl font-black font-mono text-white">
                  {roloAtualFormatado}
                </div>
                <div className="text-xs text-neutral-300 font-semibold pt-1">
                  Portadas acumuladas: <span className="text-emerald-400 font-mono font-bold text-sm">{portadasAtual} de {totalPortadas}</span>
                </div>
              </div>

              {/* Campo Observação Opcional */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Observação <span className="text-neutral-500 font-normal text-[11px]">(Opcional)</span>
                </label>
                <textarea 
                  rows={2}
                  value={modalFinalizarObs}
                  onChange={(e) => setModalFinalizarObs(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 text-white rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Observação sobre o rolo finalizado..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                type="button"
                onClick={() => {
                  setIsFinalizarModalOpen(false);
                  setModalFinalizarObs('');
                }}
                className="w-full py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmFinalizarRolo}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.99]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRAR OCORRÊNCIA (4. OCORRÊNCIAS)                   */}
      {/* ============================================================== */}
      {isOcorrenciaModalOpen && activeOP && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151922] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Registrar Ocorrência
                </h3>
                {/* Portada Atual Automática */}
                <span className="text-xs font-mono font-bold text-amber-300 block mt-0.5">
                  Vinculada à Portada {String(Math.min(totalPortadas, portadasAtual + 1)).padStart(2, '0')}
                </span>
              </div>
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
                  Selecione o Tipo da Ocorrência
                </label>
                <div className="space-y-2">
                  {TIPOS_OCORRENCIA.map(tipo => {
                    const isSelected = ocorrenciaTipo === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setOcorrenciaTipo(tipo)}
                        className={cn(
                          "w-full p-3.5 rounded-xl border text-sm font-bold text-left transition-all flex items-center justify-between",
                          isSelected 
                            ? "bg-amber-500/20 text-amber-200 border-amber-400 shadow-md ring-2 ring-amber-400/20"
                            : "bg-black/30 text-neutral-300 border-white/5 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center",
                            isSelected ? "border-amber-400 bg-amber-400" : "border-neutral-500"
                          )}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </span>
                          <span>{tipo}</span>
                        </div>
                      </button>
                    );
                  })}
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
                    rows={2}
                    className="w-full bg-black/50 border border-white/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Detalhes adicionais da ocorrência..."
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                type="button"
                onClick={() => {
                  setIsOcorrenciaModalOpen(false);
                  setOcorrenciaObs('');
                }}
                className="w-full py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmOcorrencia}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-900/30 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: IDENTIFICAÇÃO DO OPERADOR                               */}
      {/* ============================================================== */}
      {isTrocaOperadorModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151922] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
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
              type="button"
              onClick={() => setIsTrocaOperadorModalOpen(false)}
              className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors mt-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
