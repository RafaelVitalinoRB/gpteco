import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Play, 
  CheckCircle2, 
  Package, 
  AlertTriangle, 
  User, 
  Users,
  Clock, 
  X,
  FileText,
  RotateCw,
  RotateCcw,
  Layers,
  Cpu,
  Check,
  LogOut,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Lock,
  ClipboardCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, generateId } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { carregarOperadores as fetchOperadoresSupabase, EVENT_OPERADORES_UPDATED } from '../../hooks/useOperadores';
import { ModalConferencia } from './ModalConferencia';
import { TelaRevisaoRolo } from './TelaRevisaoRolo';
import { TelaRetiradaRolo, OcorrenciaRetiradaItem } from './TelaRetiradaRolo';
import { UltimosRolosProduzidos } from './UltimosRolosProduzidos';
import { RoloStatus } from '../../types';

// ============================================================================
// MÁQUINA DE ESTADOS DO PAINEL DO OPERADOR (Sprint 2.4.1 / Sprint 2.4.3)
// ============================================================================
export type EstadoOperador = 
  | 'SEM_OPERADOR'
  | 'OPERADOR_SELECIONADO'
  | 'OP_SELECIONADA'
  | 'CONFERENCIA'
  | 'PRODUZINDO'
  | 'REVISAO_ROLO'
  | 'RETIRADA_ROLO'
  | 'FINALIZANDO_ROLO'
  | 'PROXIMO_ROLO'
  | 'OP_FINALIZADA';

export default function DashboardOperador() {
  const { 
    user, 
    clientes, 
    especificacoes,
    fiosCliente,
    ops: storeOps,
    rolos: storeRolos,
    updateOP, 
    addEventoProducao,
    addRolo
  } = useStore();
  
  const deviceConfig = useStore(state => state.deviceConfig);
  const isBoundMachine = deviceConfig?.isBound && deviceConfig.type === 'MAQUINA';
  
  const [selectedMachine, setSelectedMachine] = useState<string>(
    isBoundMachine ? (deviceConfig.machineId || 'MAQUINA 2') : (user?.machine || 'MAQUINA 2')
  );
  const maquina = selectedMachine;

  // SPRINT 2.5.1 — Operadores carregados exclusivamente do Supabase (Fonte Única da Verdade)
  const [operadoresSupabase, setOperadoresSupabase] = useState<any[]>([]);
  const [loadingOperadores, setLoadingOperadores] = useState<boolean>(true);
  const [errorOperadores, setErrorOperadores] = useState<string | null>(null);

  // ETAPA 2 — Carregar operadores diretamente do Supabase (com fallback resiliente)
  async function carregarOperadores() {
    try {
      setLoadingOperadores(true);
      setErrorOperadores(null);
      const lista = await fetchOperadoresSupabase(true);
      setOperadoresSupabase(lista || []);
      return lista;
    } catch (err: any) {
      console.warn("Aviso ao carregar operadores:", err);
      setOperadoresSupabase([]);
      return [];
    } finally {
      setLoadingOperadores(false);
    }
  }

  // ETAPA 3 & ETAPA 4 — Carregamento automático e Inscrição Realtime com canal isolado
  useEffect(() => {
    carregarOperadores();

    const channelId = `operador_dashboard_${generateId()}`;
    const opChannel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operadores"
        },
        () => carregarOperadores()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "usuarios"
        },
        () => carregarOperadores()
      )
      .subscribe();

    // SPRINT 3.4.1: Sincronização em tempo real quando o operador mudar de máquina no cadastro
    const handleOperadoresUpdate = () => {
      carregarOperadores();
    };
    window.addEventListener(EVENT_OPERADORES_UPDATED, handleOperadoresUpdate);
    window.addEventListener('storage', handleOperadoresUpdate);

    return () => {
      supabase.removeChannel(opChannel);
      window.removeEventListener(EVENT_OPERADORES_UPDATED, handleOperadoresUpdate);
      window.removeEventListener('storage', handleOperadoresUpdate);
    };
  }, []);

  // 1. FLUXO OBRIGATÓRIO DE ESTADOS (Sprint 2.4.3: Revisão e Retirada)
  const [estadoOperador, setEstadoOperador] = useState<EstadoOperador>('SEM_OPERADOR');
  const [roloStatus, setRoleStatus] = useState<RoloStatus>('EM_PRODUCAO');
  const [ocorrenciasRetirada, setOcorrenciasRetirada] = useState<OcorrenciaRetiradaItem[]>([]);

  // Operador e OP selecionados
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>('');
  const [tempOperadorSelect, setTempOperadorSelect] = useState<string>('');
  const [activeOPId, setActiveOPId] = useState<string | null>(null);

  // Modal de confirmação de troca de operador (fora de produção)
  const [isConfirmTrocaOperadorOpen, setIsConfirmTrocaOperadorOpen] = useState<boolean>(false);

  // SPRINT 2.4.2: Troca de operador com transferência em produção ativa
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [novoOperadorTransferId, setNovoOperadorTransferId] = useState<string>('');
  const [historicoOperadores, setHistoricoOperadores] = useState<{
    operadorId: string;
    operadorNome: string;
    assumiuEm: string;
    portadaInicio: number;
  }[]>([]);

  // SPRINT 2.4.2: Recuperação de queda / Crash Recovery
  const [recoveryData, setRecoveryData] = useState<any | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);

  // SPRINT 3.4.1: Contadores Sincronizados de Portadas
  // 1. Contador do Rolo
  // 2. Contador do Operador
  // 3. Contador da OP
  // Ao finalizar uma portada, os 3 contadores incrementam juntos e permanecem sincronizados.
  // Ao iniciar um novo rolo, todos os contadores iniciam obrigatoriamente em 0 Portadas.
  const [contadorRolo, setContadorRolo] = useState<number>(0);
  const [contadorOperador, setContadorOperador] = useState<number>(0);
  const [contadorOP, setContadorOP] = useState<number>(0);

  // Mantém portadasAtual para retrocompatibilidade em todo o componente
  const portadasAtual = contadorRolo;
  const setPortadasAtual = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === 'function' ? val(contadorRolo) : val;
    setContadorRolo(nextVal);
    setContadorOperador(nextVal);
    setContadorOP(nextVal);
  };

  // Rolos finalizados localmente em memória para sincronização imediata
  const [rolosFinalizadosMemoria, setRolosFinalizadosMemoria] = useState<Record<string, number>>({});

  // Ficha técnica: expandir informações opcionais
  const [isInfoExpanded, setIsInfoExpanded] = useState<boolean>(false);

  // ETAPA 13: Informações do próximo rolo
  const [infoProximoRolo, setInfoProximoRolo] = useState<{
    roloAnterior: number;
    proximoRolo: number;
    totalRolos: number;
  } | null>(null);

  // ETAPA 14: Informações de OP Finalizada
  const [infoOpFinalizada, setInfoOpFinalizada] = useState<{
    codigo: string;
    cliente: string;
    totalRolos: number;
  } | null>(null);

  // Registro de Ciclo e Produção do Rolo Atual
  const [cicloInicioEm, setCicloInicioEm] = useState<string>(new Date().toISOString());
  const [tempoProducao, setTempoProducao] = useState<string>('00:00:00');
  const [ocorrenciasCicloAtual, setOcorrenciasCicloAtual] = useState<string[]>([]);

  // Campos do modal finalizar rolo
  const [modalFinalizarObs, setModalFinalizarObs] = useState<string>('');

  // 12. Lista padronizada de Ocorrências
  const TIPOS_OCORRENCIA = [
    'Fio quebrado',
    'Rolete torto/travado',
    'Voltas a menos',
    'Voltas a mais',
    'Manutenção máquina',
    'Outros'
  ];

  // Campos do modal ocorrência
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState<boolean>(false);
  const [ocorrenciaTipo, setOcorrenciaTipo] = useState<string>(TIPOS_OCORRENCIA[0]);
  const [ocorrenciaObs, setOcorrenciaObs] = useState<string>('');
  const [ocorrenciaHorarioAbertura, setOcorrenciaHorarioAbertura] = useState<string>('');

  // Estados para integração com Supabase
  const [supabaseOPs, setSupabaseOPs] = useState<any[]>([]);
  const [supabaseClientes, setSupabaseClientes] = useState<any[]>([]);
  const [supabaseTitulos, setSupabaseTitulos] = useState<any[]>([]);
  const [supabaseEspecificacoes, setSupabaseEspecificacoes] = useState<any[]>([]);
  const [isLoadingOPs, setIsLoadingOPs] = useState<boolean>(true);

  // Normalizador de variações de máquina (ex: RBMAQ2 <-> MAQUINA 2)
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

  // SPRINT 3.4.1: Regra obrigatória de vínculo Operador <-> Máquina
  // Cada operador pertence obrigatoriamente a uma única máquina.
  // Ao abrir o painel da Máquina 1, somente os operadores vinculados à Máquina 1 deverão aparecer na seleção.
  // Operadores de outras máquinas nunca deverão aparecer.
  const operatorBelongsToMachine = (op: any, targetMaq: string): boolean => {
    if (!op || !targetMaq) return false;

    const targetNum = targetMaq.replace(/[^0-9]/g, '');
    const targetVariants = getMachineFilterValues(targetMaq).map(v => v.toUpperCase().trim());

    // 1. Vínculo direto em op.maquina (string)
    if (op.maquina) {
      const opMaqStr = String(op.maquina).toUpperCase().trim();
      const opNum = opMaqStr.replace(/[^0-9]/g, '');
      if (targetNum && opNum === targetNum) return true;
      if (targetVariants.includes(opMaqStr)) return true;
    }

    // 2. Vínculo em op.maquinas_autorizadas ou op.maquinasAutorizadas (array)
    const list = op.maquinas_autorizadas || op.maquinasAutorizadas;
    if (Array.isArray(list) && list.length > 0) {
      return list.some((item: any) => {
        const itemStr = String(item).toUpperCase().trim();
        const itemNum = itemStr.replace(/[^0-9]/g, '');
        if (targetNum && itemNum === targetNum) return true;
        return targetVariants.includes(itemStr);
      });
    }

    return false;
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

  // Carregar dados auxiliares do Supabase
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

  // Supabase Realtime & BroadcastChannel (Sincronização em tempo real sem refresh)
  useEffect(() => {
    fetchOPs();

    // 1. Supabase Postgres Changes
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

    // 2. Ouvir BroadcastChannel compartilhado no navegador (sincronização instantânea entre abas e telas)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('texlog_machine_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'RESET_OPERACIONAL') {
          setSupabaseOPs([]);
          setRolosFinalizadosMemoria({});
          setActiveOPId(null);
          setRecoveryData(null);
          setEstadoOperador('STANDBY');
          setPortadasAtual(0);
          setOcorrenciasCicloAtual([]);
          setOcorrenciasRetirada([]);
          localStorage.removeItem(`texlog_producao_ativa_${maquina}`);
          localStorage.removeItem(`texlog_live_status_${maquina}`);
          fetchOPs();
          return;
        }
        if (event.data?.type === 'OP_CONCLUIDA' && (event.data?.opId || event.data?.opCodigo)) {
          const finishedId = event.data.opId;
          const finishedCod = event.data.opCodigo;
          setSupabaseOPs(prev => prev.filter(o => o.id !== finishedId && o.codigo !== finishedCod));
          if (finishedId) {
            setRolosFinalizadosMemoria(prev => ({
              ...prev,
              [finishedId]: Number(event.data.quantidade_produzida || 999)
            }));
          }
        }
      };
    } catch {}

    // 3. Ouvir canal Supabase Realtime Broadcast
    const rtChannel = supabase
      .channel('producao_maquinas_realtime')
      .on('broadcast', { event: 'op_status_update' }, ({ payload }) => {
        if (payload && (payload.status === 'AGUARDANDO_PESAGEM' || payload.quantidade_produzida >= payload.quantidade_planejada)) {
          setSupabaseOPs(prev => prev.filter(o => o.id !== payload.opId && o.codigo !== payload.opCodigo));
          if (payload.opId) {
            setRolosFinalizadosMemoria(prev => ({
              ...prev,
              [payload.opId]: Number(payload.quantidade_produzida || 999)
            }));
          }
        }
      })
      .on('broadcast', { event: 'machine_status_update' }, ({ payload }) => {
        if (payload?.reset) {
          setSupabaseOPs([]);
          setRolosFinalizadosMemoria({});
          setActiveOPId(null);
          setRecoveryData(null);
          setEstadoOperador('STANDBY');
          setPortadasAtual(0);
          setOcorrenciasCicloAtual([]);
          setOcorrenciasRetirada([]);
          localStorage.removeItem(`texlog_producao_ativa_${maquina}`);
          localStorage.removeItem(`texlog_live_status_${maquina}`);
          fetchOPs();
        }
      })
      .subscribe();

    // 4. Ouvir CustomEvent local
    const handleOpConcluidaLocal = (e: any) => {
      const detail = e.detail;
      if (detail && detail.opId) {
        setSupabaseOPs(prev => prev.filter(o => o.id !== detail.opId && o.codigo !== detail.opCodigo));
        setRolosFinalizadosMemoria(prev => ({
          ...prev,
          [detail.opId]: Number(detail.quantidade_produzida || 999)
        }));
      }
    };
    window.addEventListener('texlog_op_concluida', handleOpConcluidaLocal);

    const handleResetOperacionalLocal = () => {
      setSupabaseOPs([]);
      setRolosFinalizadosMemoria({});
      setActiveOPId(null);
      setRecoveryData(null);
      setEstadoOperador('STANDBY');
      setPortadasAtual(0);
      setOcorrenciasCicloAtual([]);
      setOcorrenciasRetirada([]);
      localStorage.removeItem(`texlog_producao_ativa_${maquina}`);
      localStorage.removeItem(`texlog_live_status_${maquina}`);
      fetchOPs();
    };
    window.addEventListener('texlog_reset_operacional', handleResetOperacionalLocal);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(rtChannel);
      if (bc) bc.close();
      window.removeEventListener('texlog_op_concluida', handleOpConcluidaLocal);
      window.removeEventListener('texlog_reset_operacional', handleResetOperacionalLocal);
    };
  }, [maquina]);

  // Cronômetro do Tempo de Produção durante o estado PRODUZINDO
  useEffect(() => {
    const updateTimer = () => {
      if (estadoOperador !== 'PRODUZINDO' || !cicloInicioEm) {
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
  }, [cicloInicioEm, estadoOperador]);

  // SPRINT 3.4.1: Lista de operadores vinculados exclusivamente à máquina atual
  // Cada operador pertence obrigatoriamente a uma única máquina.
  // Ao abrir o painel da Máquina 1, somente os operadores vinculados à Máquina 1 deverão aparecer na seleção.
  // Operadores de outras máquinas nunca deverão aparecer.
  const operadoresAtivos = useMemo(() => {
    return (operadoresSupabase || [])
      .filter(op => {
        const isAtivo = op.status === 'ATIVO' || op.ativo !== false;
        if (!isAtivo) return false;
        return operatorBelongsToMachine(op, maquina);
      })
      .map(op => ({
        id: String(op.id),
        nome: String(op.nome || ''),
        matricula: String(op.matricula || ''),
        status: (op.status || (op.ativo !== false ? 'ATIVO' : 'INATIVO')) as 'ATIVO' | 'INATIVO',
        maquina: maquina,
        maquinasAutorizadas: [maquina] as any[]
      }));
  }, [operadoresSupabase, maquina]);

  // Objeto do operador atual
  const currentOperador = useMemo(() => {
    return operadoresAtivos.find(o => String(o.id) === String(selectedOperadorId)) || null;
  }, [operadoresAtivos, selectedOperadorId]);

  // Variações da máquina
  const machineVariants = useMemo(() => getMachineFilterValues(maquina), [maquina]);

  // OPs vinculadas exclusivamente à máquina atual
  // Regra Principal Sprint 2.4.3: Fila exibe APENAS OPs com rolos pendentes (rolos_finalizados < quantidade_rolos_planejada)
  // Decisão baseada na quantidade real de rolos produzidos, saindo imediatamente da fila sem refresh
  const opsDaMaquina = useMemo(() => {
    return supabaseOPs.filter(o => {
      const maqOp = (o.maquina || '').toUpperCase();
      const maqPrep = (o.maquinaPreparacao || o.maquina_preparacao || '').toUpperCase();
      const match = machineVariants.some(v => v.toUpperCase() === maqOp || v.toUpperCase() === maqPrep);
      if (!match) return false;

      // Status que nunca devem figurar na fila do operador
      const statusOp = (o.status || '').toUpperCase();
      if (statusOp === 'AGUARDANDO_PESAGEM' || statusOp === 'FINALIZADA' || statusOp === 'CANCELADA') {
        return false;
      }

      // Quantidade planejada da OP
      const qPlan = Number(o.quantidade_planejada ?? o.qtdRolos ?? 1);

      // Quantidade real de rolos concluídos (Supabase, memória de ciclo e store local)
      const qProdMem = Number(rolosFinalizadosMemoria[o.id] ?? 0);
      const qProdSupabase = Number(o.quantidade_produzida ?? 0);
      const qProdStore = storeRolos.filter(r => 
        (r.opId?.toString() === o.id?.toString() || r.opCodigo === o.codigo) &&
        r.status !== 'PENDENTE' && r.status !== 'EM_PRODUCAO'
      ).length;

      const qProdReal = Math.max(qProdSupabase, qProdMem, qProdStore);

      // Regra principal: rolos_finalizados >= quantidade_rolos_planejada -> sai imediatamente da fila!
      if (qProdReal >= qPlan) {
        return false;
      }

      return true;
    });
  }, [supabaseOPs, machineVariants, rolosFinalizadosMemoria, storeRolos]);

  // OP ativa selecionada (encontra na fila ou em fallback na store/supabaseOPs enquanto o modal de finalização estiver aberto)
  const activeOP = useMemo(() => {
    if (!activeOPId) return null;
    return opsDaMaquina.find(o => o.id === activeOPId) || 
      supabaseOPs.find(o => o.id === activeOPId) || 
      storeOps.find(o => o.id === activeOPId) || 
      null;
  }, [activeOPId, opsDaMaquina, supabaseOPs, storeOps]);

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

  // Total de Portadas conhecido pelo sistema para este rolo
  const totalPortadas = useMemo(() => {
    if (!activeOP) return 18;
    const prev = Number(activeOP.portadas_previstas || activeOP.portadasPrevistas);
    if (prev > 0) return prev;
    const tf = Number(activeOP.total_fios || activeOP.totalFios);
    const fp = Number(activeOP.fios_por_portada || activeOP.fiosPorPortada);
    if (tf > 0 && fp > 0) return Math.ceil(tf / fp);
    return 18;
  }, [activeOP]);

  // Cálculos de Progresso da OP Ativa & Rolo Atual
  // 8. ROLO ATUAL:
  // Antes da produção: "Nenhum rolo iniciado"
  // Ao iniciar: "01 de 02"
  // Depois: "02 de 02"
  const { planejado, produzidos, pendentes, roloAtualFormatado } = useMemo(() => {
    if (!activeOP) {
      return { planejado: 1, produzidos: 0, pendentes: 1, roloAtualFormatado: 'Nenhum rolo iniciado' };
    }

    const qtdPlanejada = Number(activeOP.quantidade_planejada || activeOP.qtdRolos || 1);
    const rolosFinalizadosMem = rolosFinalizadosMemoria[activeOP.id] || 0;
    
    const qtdProduzida = Math.max(
      Number(activeOP.quantidade_produzida || 0),
      rolosFinalizadosMem
    );
    const qtdPendente = Math.max(0, qtdPlanejada - qtdProduzida);
    
    let formatado = 'Nenhum rolo iniciado';
    if (estadoOperador === 'PRODUZINDO' || estadoOperador === 'REVISAO_ROLO' || estadoOperador === 'RETIRADA_ROLO' || estadoOperador === 'FINALIZANDO_ROLO' || estadoOperador === 'PROXIMO_ROLO' || estadoOperador === 'OP_FINALIZADA') {
      const numeroRoloAtual = Math.min(qtdPlanejada, qtdProduzida + 1);
      formatado = `${String(numeroRoloAtual).padStart(2, '0')} de ${String(qtdPlanejada).padStart(2, '0')}`;
    } else if (qtdProduzida > 0) {
      const numeroRoloAtual = Math.min(qtdPlanejada, qtdProduzida + 1);
      formatado = `${String(numeroRoloAtual).padStart(2, '0')} de ${String(qtdPlanejada).padStart(2, '0')}`;
    } else {
      formatado = 'Nenhum rolo iniciado';
    }

    return {
      planejado: qtdPlanejada,
      produzidos: qtdProduzida,
      pendentes: qtdPendente,
      roloAtualFormatado: formatado
    };
  }, [activeOP, rolosFinalizadosMemoria, estadoOperador]);

  // Identificação do Rolo Desenho
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

  // 10. RESUMO: Progresso percentual calculado
  const progressoPercentual = useMemo(() => {
    if (totalPortadas <= 0) return 0;
    return Math.min(100, Math.round((portadasAtual / totalPortadas) * 100));
  }, [portadasAtual, totalPortadas]);

  // Metros planejados
  const metrosPlanejados = useMemo(() => {
    if (activeOP?.metros != null) return `${activeOP.metros.toLocaleString('pt-BR')} m`;
    if (activeEspecificacao?.metros != null) return `${activeEspecificacao.metros.toLocaleString('pt-BR')} m`;
    return '—';
  }, [activeOP, activeEspecificacao]);

  // Fios por portada
  const fiosPorPortadaValor = useMemo(() => {
    if (activeOP?.fios_por_portada != null) return activeOP.fios_por_portada;
    if (activeOP?.fiosPorPortada != null) return activeOP.fiosPorPortada;
    if (activeEspecificacao?.fios_por_portada != null) return activeEspecificacao.fios_por_portada;
    return '—';
  }, [activeOP, activeEspecificacao]);

  // =========================================================================
  // SPRINT 2.4.2: TRANSMISSÃO EM TEMPO REAL & RECUPERAÇÃO APÓS QUEDA
  // =========================================================================

  // Helper de Transmissão em Tempo Real para o Dashboard do Programador
  const broadcastLiveStatus = (overrides?: Partial<any>) => {
    try {
      const progresso = totalPortadas > 0 ? Math.min(100, Math.round((portadasAtual / totalPortadas) * 100)) : 0;
      const payload = {
        maquina,
        opId: activeOP?.id,
        opCodigo: activeOP?.codigo,
        clienteNome,
        tituloFio: activeOP?.tituloFio || activeOP?.titulo_fio,
        operadorId: selectedOperadorId,
        operadorNome: currentOperador?.nome || 'Operador',
        status: estadoOperador,
        portadaAtual: portadasAtual,
        totalPortadas,
        progressoPercentual: progresso,
        roloAtual: roloAtualFormatado,
        tempoProducao,
        ocorrenciasCount: ocorrenciasCicloAtual.length,
        updatedAt: new Date().toISOString(),
        ...overrides
      };

      // 1. Supabase Realtime Broadcast
      supabase.channel('producao_maquinas_realtime').send({
        type: 'broadcast',
        event: 'machine_status_update',
        payload
      }).catch(() => {});

      // 2. Local Storage síncrono para recuperação imediata
      localStorage.setItem(`texlog_live_status_${maquina}`, JSON.stringify(payload));

      // 3. Browser BroadcastChannel para abas abertas simultâneas
      try {
        const bc = new BroadcastChannel('texlog_machine_channel');
        bc.postMessage(payload);
        bc.close();
      } catch {}
    } catch (e) {
      console.warn('Erro ao transmitir status em tempo real:', e);
    }
  };

  // Persistência Automática em Tempo Real (Recuperação após Queda / Reload)
  useEffect(() => {
    if ((estadoOperador === 'PRODUZINDO' || estadoOperador === 'REVISAO_ROLO' || estadoOperador === 'RETIRADA_ROLO') && activeOP) {
      const storageKey = `texlog_producao_ativa_${maquina}`;
      const backupData = {
        maquina,
        opId: activeOP.id,
        opCodigo: activeOP.codigo,
        clienteNome,
        operadorId: selectedOperadorId,
        operadorNome: currentOperador?.nome || 'Operador',
        portadasAtual,
        totalPortadas,
        cicloInicioEm,
        roloAtualFormatado,
        ocorrenciasCicloAtual,
        ocorrenciasRetirada,
        historicoOperadores,
        estadoOperador,
        roloStatus,
        salvoEm: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(backupData));
    }
  }, [
    estadoOperador,
    roloStatus,
    activeOP,
    maquina,
    clienteNome,
    selectedOperadorId,
    currentOperador,
    portadasAtual,
    totalPortadas,
    cicloInicioEm,
    roloAtualFormatado,
    ocorrenciasCicloAtual,
    ocorrenciasRetirada,
    historicoOperadores
  ]);

  // Transmissão periódica de status enquanto estiver produzindo, revisando ou retirando
  useEffect(() => {
    if (estadoOperador === 'PRODUZINDO' || estadoOperador === 'REVISAO_ROLO' || estadoOperador === 'RETIRADA_ROLO') {
      broadcastLiveStatus();
      const intv = setInterval(() => {
        broadcastLiveStatus();
      }, 3000);
      return () => clearInterval(intv);
    } else {
      broadcastLiveStatus();
    }
  }, [estadoOperador, portadasAtual, tempoProducao, selectedOperadorId, activeOP]);

  // Detecção de produção em aberto ao iniciar / mudar de máquina
  useEffect(() => {
    const storageKey = `texlog_producao_ativa_${maquina}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.opId && parsed.maquina === maquina && estadoOperador === 'SEM_OPERADOR') {
          setRecoveryData(parsed);
          setIsRecoveryModalOpen(true);
        }
      }
    } catch (e) {
      console.warn('Erro ao verificar backup:', e);
    }
  }, [maquina, estadoOperador]);

  // Retomar produção recuperada
  const handleRetomarProducao = () => {
    if (!recoveryData) return;

    // Verificar se a OP recuperada já foi concluída
    const opCandidata = supabaseOPs.find(o => o.id === recoveryData.opId) || storeOps.find(o => o.id === recoveryData.opId);
    if (opCandidata) {
      const qPlan = Number(opCandidata.quantidade_planejada ?? opCandidata.qtdRolos ?? 1);
      const qProdMem = Number(rolosFinalizadosMemoria[recoveryData.opId] ?? 0);
      const qProdSupabase = Number(opCandidata.quantidade_produzida ?? 0);
      const qProdStore = storeRolos.filter(r => 
        (r.opId?.toString() === recoveryData.opId?.toString() || r.opCodigo === opCandidata.codigo) &&
        r.status !== 'PENDENTE' && r.status !== 'EM_PRODUCAO'
      ).length;
      const qProdReal = Math.max(qProdSupabase, qProdMem, qProdStore);
      const statusNorm = (opCandidata.status || '').toUpperCase();

      if (statusNorm === 'AGUARDANDO_PESAGEM' || statusNorm === 'FINALIZADA' || qProdReal >= qPlan) {
        toast.error(
          'Esta Ordem de Produção já foi totalmente concluída e encaminhada para o Escritório. Não é possível reiniciar sua produção.',
          { duration: 6000, icon: '⛔' }
        );
        handleDescartarRecuperacao();
        return;
      }
    }

    setSelectedOperadorId(recoveryData.operadorId);
    setActiveOPId(recoveryData.opId);
    setPortadasAtual(recoveryData.portadasAtual);
    setCicloInicioEm(recoveryData.cicloInicioEm);
    setOcorrenciasCicloAtual(recoveryData.ocorrenciasCicloAtual || []);
    setOcorrenciasRetirada(recoveryData.ocorrenciasRetirada || []);
    if (recoveryData.historicoOperadores && recoveryData.historicoOperadores.length > 0) {
      setHistoricoOperadores(recoveryData.historicoOperadores);
    } else {
      setHistoricoOperadores([{
        operadorId: recoveryData.operadorId,
        operadorNome: recoveryData.operadorNome,
        assumiuEm: recoveryData.cicloInicioEm,
        portadaInicio: 0
      }]);
    }
    setEstadoOperador(recoveryData.estadoOperador || 'PRODUZINDO');
    if (recoveryData.roloStatus) {
      setRoleStatus(recoveryData.roloStatus);
    }
    setIsRecoveryModalOpen(false);
    toast.success('Produção recuperada e retomada com sucesso!', {
      icon: '🔄',
      duration: 4000
    });
  };

  // Descartar produção recuperada
  const handleDescartarRecuperacao = () => {
    const storageKey = `texlog_producao_ativa_${maquina}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`texlog_live_status_${maquina}`);
    setIsRecoveryModalOpen(false);
    setRecoveryData(null);
    toast('Produção anterior descartada.', { icon: '🗑️' });
  };

  // =========================================================================
  // TRANSIÇÕES DA MÁQUINA DE ESTADOS (COM BLOQUEIOS DA SPRINT 2.4.2)
  // =========================================================================

  // 2. TELA INICIAL -> SELECIONAR OPERADOR E ENTRAR
  const handleEntrarOperador = () => {
    if (!tempOperadorSelect) {
      toast.error('Selecione um operador para entrar.');
      return;
    }
    const opFound = operadoresAtivos.find(o => String(o.id) === String(tempOperadorSelect));
    setSelectedOperadorId(tempOperadorSelect);
    setEstadoOperador('OPERADOR_SELECIONADO');
    toast.success(`Operador ${opFound?.nome || ''} conectado na ${maquina}.`);
  };

  // 15. TROCAR OPERADOR (Com validação estrita de estado)
  const handleSolicitarTrocaOperador = () => {
    if (estadoOperador === 'PRODUZINDO' && activeOP) {
      // Bloqueio / Confirmação com modal de transferência
      setNovoOperadorTransferId('');
      setIsTransferModalOpen(true);
    } else {
      // Fora de produção: confirmação padrão para encerrar sessão
      setIsConfirmTrocaOperadorOpen(true);
    }
  };

  // Confirmar troca fora de produção
  const handleConfirmarTrocaOperador = () => {
    setIsConfirmTrocaOperadorOpen(false);
    setSelectedOperadorId('');
    setTempOperadorSelect('');
    setActiveOPId(null);
    setPortadasAtual(0);
    setOcorrenciasCicloAtual([]);
    setTempoProducao('00:00:00');
    setEstadoOperador('SEM_OPERADOR');
    localStorage.removeItem(`texlog_producao_ativa_${maquina}`);
    localStorage.removeItem(`texlog_live_status_${maquina}`);
    broadcastLiveStatus({ status: 'SEM_OPERADOR', operadorId: '', operadorNome: '' });
    toast('Sessão encerrada. Selecione o operador.', { icon: '👤' });
  };

  // Confirmar transferência de produção ativa para novo operador
  const handleConfirmarTransferencia = async () => {
    if (!novoOperadorTransferId) {
      toast.error('Selecione o novo operador para assumir a produção.');
      return;
    }
    if (novoOperadorTransferId === selectedOperadorId) {
      toast.error('O novo operador deve ser diferente do operador atual.');
      return;
    }

    const anteriorOp = currentOperador?.nome || 'Operador Anterior';
    const novoOpObj = operadoresAtivos.find(o => String(o.id) === String(novoOperadorTransferId));
    const novoOpNome = novoOpObj?.nome || 'Novo Operador';
    const agora = new Date().toISOString();

    const novoHistoricoItem = {
      operadorId: novoOperadorTransferId,
      operadorNome: novoOpNome,
      assumiuEm: agora,
      portadaInicio: portadasAtual
    };
    const atualizadoHistorico = [...historicoOperadores, novoHistoricoItem];
    setHistoricoOperadores(atualizadoHistorico);

    const seqAtual = (Number(activeOP?.quantidade_produzida ?? produzidos ?? 0) + 1);
    const planejadoTotal = Number(activeOP?.quantidade_planejada ?? activeOP?.qtdRolos ?? 1);
    const roloIdentificadorOperador = `Rolo ${seqAtual} de ${planejadoTotal}`;

    // Registra evento de auditoria e rastreabilidade
    addEventoProducao({
      id: generateId(),
      opId: activeOP?.id || '',
      roloId: roloIdentificadorOperador,
      operadorId: novoOperadorTransferId,
      machineCode: maquina as any,
      tipoEvento: 'TROCA_OPERADOR',
      portadasNoEvento: portadasAtual,
      timestampInicio: agora,
      createdAt: agora,
      observacao: `Produção transferida de ${anteriorOp} para ${novoOpNome} na portada ${portadasAtual + 1} de ${totalPortadas}`
    });

    try {
      await supabase.from('producao_operador').insert([{
        op_id: activeOP?.id ? Number(activeOP.id) : null,
        operador_id: novoOperadorTransferId,
        quantidade_portadas: portadasAtual,
        data_registro: agora
      }]);
    } catch {}

    setSelectedOperadorId(novoOperadorTransferId);
    setIsTransferModalOpen(false);
    setNovoOperadorTransferId('');

    toast.success(`Produção transferida com sucesso para ${novoOpNome}!`, {
      icon: '🔄',
      duration: 4000
    });

    broadcastLiveStatus({
      operadorId: novoOperadorTransferId,
      operadorNome: novoOpNome
    });
  };

  // 4. SELEÇÃO DA OP NA FILA
  const handleSelecionarOP = (opId: string) => {
    // Buscar dados da OP candidata
    const opCandidata = supabaseOPs.find(o => o.id === opId) || storeOps.find(o => o.id === opId);
    if (!opCandidata) return;

    const qPlan = Number(opCandidata.quantidade_planejada ?? opCandidata.qtdRolos ?? 1);
    const qProdMem = Number(rolosFinalizadosMemoria[opId] ?? 0);
    const qProdSupabase = Number(opCandidata.quantidade_produzida ?? 0);
    const qProdStore = storeRolos.filter(r => 
      (r.opId?.toString() === opId?.toString() || r.opCodigo === opCandidata.codigo) &&
      r.status !== 'PENDENTE' && r.status !== 'EM_PRODUCAO'
    ).length;
    const qProdReal = Math.max(qProdSupabase, qProdMem, qProdStore);
    const statusNorm = (opCandidata.status || '').toUpperCase();

    // Regra de Segurança Sprint 2.4.3:
    // Caso um operador tente abrir uma OP que já esteja com status = AGUARDANDO_PESAGEM ou rolos_finalizados >= quantidade_rolos_planejada,
    // o sistema deve impedir a abertura com a mensagem exata:
    // "Esta Ordem de Produção já foi totalmente concluída e encaminhada para o Escritório. Não é possível reiniciar sua produção."
    if (statusNorm === 'AGUARDANDO_PESAGEM' || statusNorm === 'FINALIZADA' || qProdReal >= qPlan) {
      toast.error(
        'Esta Ordem de Produção já foi totalmente concluída e encaminhada para o Escritório. Não é possível reiniciar sua produção.',
        {
          duration: 6000,
          icon: '⛔'
        }
      );
      return;
    }

    setActiveOPId(opId);
    setPortadasAtual(0);
    setOcorrenciasCicloAtual([]);
    setTempoProducao('00:00:00');
    setEstadoOperador('OP_SELECIONADA');
  };

  // Voltar da OP selecionada para a Fila da Máquina
  const handleVoltarFila = () => {
    if (estadoOperador === 'PRODUZINDO') {
      toast.error('Produção em andamento. Não é possível retornar à fila sem finalizar.');
      return;
    }
    setActiveOPId(null);
    setPortadasAtual(0);
    setOcorrenciasCicloAtual([]);
    setTempoProducao('00:00:00');
    setEstadoOperador('OPERADOR_SELECIONADO');
  };

  // 11. OP SELECIONADA -> ABRIR CONFERÊNCIA
  const handleIniciarConferencia = () => {
    if (!activeOP) return;
    setEstadoOperador('CONFERENCIA');
  };

  // Fechar conferência sem confirmar
  const handleFecharConferencia = () => {
    setEstadoOperador('OP_SELECIONADA');
  };

  // 13. AUDITORIA: Registro automático das etapas com data, hora e operador
  const registrarAuditoria = async (
    etapa: 'PRODUCAO_INICIADA' | 'PRODUCAO_CONCLUIDA' | 'REVISAO_REALIZADA' | 'RETIRADA_INICIADA' | 'RETIRADA_CONCLUIDA' | 'AGUARDANDO_PESAGEM',
    detalhes?: string
  ) => {
    if (!activeOP) return;
    const agora = new Date().toISOString();
    const operadorNome = currentOperador?.nome || 'Operador';
    const seqAtual = (Number(activeOP.quantidade_produzida ?? produzidos ?? 0) + 1);
    const planejadoTotal = Number(activeOP.quantidade_planejada ?? activeOP.qtdRolos ?? 1);
    const roloIdentificador = `Rolo ${seqAtual} de ${planejadoTotal}`;

    const descricoes: Record<string, string> = {
      PRODUCAO_INICIADA: `Produção iniciada pelo operador ${operadorNome} na máquina ${maquina}`,
      PRODUCAO_CONCLUIDA: `Produção concluída pelo operador ${operadorNome} na máquina ${maquina} (${totalPortadas} portadas)`,
      REVISAO_REALIZADA: `Revisão realizada e rolete confirmado pelo operador ${operadorNome}`,
      RETIRADA_INICIADA: `Retirada iniciada pelo operador ${operadorNome} na máquina ${maquina}`,
      RETIRADA_CONCLUIDA: `Retirada concluída e checklist verificado pelo operador ${operadorNome}`,
      AGUARDANDO_PESAGEM: `Rolo ${roloIdentificador} aguardando pesagem (Máquina ${maquina} liberada)`
    };

    const textoObs = detalhes ? `${descricoes[etapa]} • ${detalhes}` : descricoes[etapa];

    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: roloIdentificador,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: etapa as any,
      portadasNoEvento: portadasAtual,
      timestampInicio: agora,
      timestampFim: agora,
      observacao: `[${etapa}] ${new Date(agora).toLocaleString('pt-BR')} | Operador: ${operadorNome} | ${textoObs}`,
      createdAt: agora
    });

    try {
      const keyAuditoria = `texlog_auditoria_${activeOP.id}`;
      const existentes = JSON.parse(localStorage.getItem(keyAuditoria) || '[]');
      existentes.push({
        etapa,
        data_hora: agora,
        operador_id: selectedOperadorId,
        operador_nome: operadorNome,
        maquina,
        op_id: activeOP.id,
        op_codigo: activeOP.codigo,
        rolo: roloIdentificador,
        detalhes: textoObs
      });
      localStorage.setItem(keyAuditoria, JSON.stringify(existentes));
    } catch {}
  };

  // 5. APÓS CONFIRMAR CONFERÊNCIA -> STATUS 🟢 PRODUZINDO
  const handleConfirmarConferenciaEIniciar = async () => {
    if (!activeOP) return;

    // Regra de Segurança Sprint 2.4.3:
    const qPlan = Number(activeOP.quantidade_planejada ?? activeOP.qtdRolos ?? 1);
    const qProdMem = Number(rolosFinalizadosMemoria[activeOP.id] ?? 0);
    const qProdSupabase = Number(activeOP.quantidade_produzida ?? 0);
    const qProdStore = storeRolos.filter(r => 
      (r.opId?.toString() === activeOP.id?.toString() || r.opCodigo === activeOP.codigo) &&
      r.status !== 'PENDENTE' && r.status !== 'EM_PRODUCAO'
    ).length;
    const qProdReal = Math.max(qProdSupabase, qProdMem, qProdStore);
    const statusNorm = (activeOP.status || '').toUpperCase();

    if (statusNorm === 'AGUARDANDO_PESAGEM' || statusNorm === 'FINALIZADA' || qProdReal >= qPlan) {
      toast.error(
        'Esta Ordem de Produção já foi totalmente concluída e encaminhada para o Escritório. Não é possível reiniciar sua produção.',
        {
          duration: 6000,
          icon: '⛔'
        }
      );
      setActiveOPId(null);
      setEstadoOperador('OPERADOR_SELECIONADO');
      return;
    }

    const agora = new Date().toISOString();
    setCicloInicioEm(agora);
    // SPRINT 3.4.1: Ao iniciar um novo rolo, todos os contadores iniciam obrigatoriamente em 0 Portadas
    setContadorRolo(0);
    setContadorOperador(0);
    setContadorOP(0);
    setOcorrenciasCicloAtual([]);
    setTempoProducao('00:00:00');

    const historicoInicial = [{
      operadorId: selectedOperadorId,
      operadorNome: currentOperador?.nome || 'Operador',
      assumiuEm: agora,
      portadaInicio: 0
    }];
    setHistoricoOperadores(historicoInicial);

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
      console.warn('Erro ao atualizar status da OP no Supabase:', e);
    }

    updateOP(activeOP.id, { status: 'EM_ANDAMENTO', inicio: agora } as any);

    const seqAtualProd = (Number(activeOP.quantidade_produzida ?? produzidos ?? 0) + 1);
    const planejadoTotalProd = Number(activeOP.quantidade_planejada ?? activeOP.qtdRolos ?? 1);
    const roloControleOperador = `Rolo ${seqAtualProd} de ${planejadoTotalProd}`;

    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: roloControleOperador,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'INICIO_PRODUCAO',
      portadasNoEvento: 0,
      timestampInicio: agora,
      createdAt: agora,
      observacao: `Início de produção da OP ${activeOP.codigo} (${roloControleOperador}) com conferência realizada por ${currentOperador?.nome || 'Operador'}`
    });

    setRoleStatus('EM_PRODUCAO');
    setEstadoOperador('PRODUZINDO');
    await registrarAuditoria('PRODUCAO_INICIADA', 'Conferência inicial realizada com sucesso.');
    toast.success('Conferência confirmada! Produção iniciada.', { icon: '🟢' });

    broadcastLiveStatus({
      status: 'PRODUZINDO',
      portadaAtual: 0,
      progressoPercentual: 0
    });
  };

  // 9. FINALIZAR PORTADA:
  // Bloqueio: Não pode finalizar portada sem iniciar produção
  const handleFinalizarPortada = async () => {
    if (estadoOperador !== 'PRODUZINDO' || !activeOP) {
      toast.error('Bloqueado: Inicie a produção antes de finalizar a portada.');
      return;
    }

    if (portadasAtual < totalPortadas) {
      const novaPortada = portadasAtual + 1;
      
      // SPRINT 3.4.1: Ao finalizar uma portada:
      // - incrementar o contador da OP;
      // - incrementar o contador do Operador;
      // - incrementar o contador do Rolo.
      // Essas três informações permanecem rigorosamente sincronizadas.
      setContadorRolo(novaPortada);
      setContadorOperador(novaPortada);
      setContadorOP(novaPortada);

      // Gravação no Supabase (producao_operador e ordens_producao)
      try {
        await supabase.from('producao_operador').insert([{
          op_id: Number(activeOP.id) || null,
          operador_id: selectedOperadorId || null,
          quantidade_portadas: novaPortada,
          data_registro: new Date().toISOString()
        }]);
      } catch (err) {
        console.warn('Erro ao registrar portada:', err);
      }

      try {
        await supabase.from('ordens_producao').update({
          atualizado_em: new Date().toISOString()
        }).eq('id', Number(activeOP.id));
      } catch {}

      toast.success(`Portada ${String(novaPortada).padStart(2, '0')} concluída!`, {
        icon: '🟢',
        style: { background: '#10131a', color: '#10b981', border: '1px solid #10b98140' }
      });

      broadcastLiveStatus({
        portadaAtual: novaPortada,
        progressoPercentual: Math.min(100, Math.round((novaPortada / totalPortadas) * 100))
      });

      if (novaPortada === totalPortadas) {
        setRoleStatus('AGUARDANDO_REVISAO');
        toast('Produção concluída. Realizar revisão do rolo.', {
          icon: '📋',
          duration: 5000
        });
        await registrarAuditoria('PRODUCAO_CONCLUIDA', `Todas as ${totalPortadas} portadas concluídas com sucesso.`);
      }
    } else {
      toast('Produção concluída. Realizar revisão do rolo.', {
        icon: '📋'
      });
    }
  };

  // 12. REGISTRAR OCORRÊNCIA:
  // Bloqueio: Não pode registrar ocorrência sem existir uma portada ativa
  const handleAbrirOcorrencia = () => {
    if (estadoOperador !== 'PRODUZINDO' || !activeOP) {
      toast.error('Bloqueado: Não é possível registrar ocorrência sem uma produção ativa.');
      return;
    }
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setOcorrenciaHorarioAbertura(`${hh}:${mm}:${ss}`);
    setOcorrenciaTipo(TIPOS_OCORRENCIA[0]);
    setOcorrenciaObs('');
    setIsOcorrenciaModalOpen(true);
  };

  const handleConfirmarOcorrencia = () => {
    if (!activeOP || estadoOperador !== 'PRODUZINDO') return;

    const portadaAtualNumero = Math.min(totalPortadas, portadasAtual + 1);
    const portadaFormatada = `Portada ${String(portadaAtualNumero).padStart(2, '0')}`;
    const textoOcorrencia = ocorrenciaTipo === 'Outros'
      ? `${portadaFormatada} [${ocorrenciaHorarioAbertura}] - Outros${ocorrenciaObs ? ': ' + ocorrenciaObs.trim() : ''}`
      : `${portadaFormatada} [${ocorrenciaHorarioAbertura}] - ${ocorrenciaTipo}${ocorrenciaObs ? ': ' + ocorrenciaObs.trim() : ''}`;

    const novaListaOcorrencias = [...ocorrenciasCicloAtual, textoOcorrencia];
    setOcorrenciasCicloAtual(novaListaOcorrencias);

    const seqAtualOc = (Number(activeOP.quantidade_produzida ?? produzidos ?? 0) + 1);
    const planejadoTotalOc = Number(activeOP.quantidade_planejada ?? activeOP.qtdRolos ?? 1);
    const roloControleOc = `Rolo ${seqAtualOc} de ${planejadoTotalOc}`;

    addEventoProducao({
      id: generateId(),
      opId: activeOP.id,
      roloId: roloControleOc,
      operadorId: selectedOperadorId,
      machineCode: maquina as any,
      tipoEvento: 'OCORRENCIA' as any,
      portadasNoEvento: portadasAtual,
      timestampInicio: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      observacao: textoOcorrencia
    });

    toast.success(`Ocorrência registrada: ${ocorrenciaTipo}!`, { icon: '⚠️' });
    setIsOcorrenciaModalOpen(false);
    setOcorrenciaObs('');

    broadcastLiveStatus({
      ocorrenciasCount: novaListaOcorrencias.length
    });
  };

  // ============================================================================
  // SPRINT 2.4.3: REVISÃO E RETIRADA DO ROLO
  // ============================================================================

  // Iniciar Revisão do Rolo (Ao concluir todas as portadas)
  const handleIniciarRevisaoRolo = async () => {
    if (estadoOperador !== 'PRODUZINDO' || !activeOP) {
      toast.error('Bloqueado: Inicie a produção antes de revisar o rolo.');
      return;
    }
    if (portadasAtual < totalPortadas) {
      toast.error(`Bloqueado: Conclua todas as ${totalPortadas} portadas antes de revisar o rolo! (Restam ${totalPortadas - portadasAtual} portadas)`, {
        icon: '🚫',
        duration: 4000
      });
      return;
    }
    setRoleStatus('AGUARDANDO_REVISAO');
    setEstadoOperador('REVISAO_ROLO');
    await registrarAuditoria('PRODUCAO_CONCLUIDA', `Produção concluída. Todas as ${totalPortadas} portadas realizadas.`);
    toast.success('Produção concluída! Iniciando revisão técnica do rolo.', { icon: '📋', duration: 4000 });
    broadcastLiveStatus({
      status: 'AGUARDANDO_REVISAO'
    });
  };

  // Mantém compatibilidade com acionador de finalizar rolo
  const handleAbrirFinalizarRolo = () => {
    handleIniciarRevisaoRolo();
  };

  // Transição: Revisão Aprovada -> Iniciar Retirada
  const handleIniciarRetirada = async () => {
    if (!activeOP) return;
    setRoleStatus('RETIRADA_EM_ANDAMENTO');
    setEstadoOperador('RETIRADA_ROLO');
    await registrarAuditoria('REVISAO_REALIZADA', 'Revisão técnica aprovada e rolete conferido.');
    await registrarAuditoria('RETIRADA_INICIADA', 'Procedimento de retirada do rolo iniciado na máquina.');
    toast.success('Revisão confirmada! Inicie a retirada do rolo da máquina.', { icon: '📦' });
    broadcastLiveStatus({
      status: 'RETIRADA_EM_ANDAMENTO'
    });
  };

  // Registrar ocorrência específica da fase de RETIRADA
  const handleAdicionarOcorrenciaRetirada = (tipo: string, obs?: string) => {
    const now = new Date();
    const horario = now.toLocaleTimeString('pt-BR');
    const textoFormatado = tipo === 'Outros'
      ? (obs ? `Outros: ${obs}` : 'Outros')
      : (obs ? `${tipo} (${obs})` : tipo);

    const novaOc: OcorrenciaRetiradaItem = {
      id: generateId(),
      tipo,
      obs,
      texto: textoFormatado,
      horario,
      fase_ocorrencia: 'RETIRADA'
    };
    setOcorrenciasRetirada(prev => [...prev, novaOc]);
    toast.success(`Ocorrência da retirada registrada: ${tipo}`, { icon: '⚠️' });
  };

  const handleRemoverOcorrenciaRetirada = (id: string) => {
    setOcorrenciasRetirada(prev => prev.filter(o => o.id !== id));
    toast('Ocorrência removida.', { icon: '🗑️' });
  };

  // Finalizar Retirada do Rolo (Checklist 100% verificado -> Máquina Liberada -> Aguardando Pesagem)
  const handleFinalizarRetirada = async () => {
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

    const operadorNome = currentOperador?.nome || 'Operador';
    const portadasSalvas = portadasAtual;

    const qtdPlanejada = Number(activeOP.quantidade_planejada ?? activeOP.qtdRolos ?? 1);
    const qtdProduzidaAtual = Number(activeOP.quantidade_produzida ?? produzidos ?? 0);
    const novaQtdProduzida = qtdProduzidaAtual + 1;
    const novaQtdPendente = Math.max(0, qtdPlanejada - novaQtdProduzida);
    const isOpConcluida = novaQtdPendente === 0;
    // Sprint 2.4.3: Após concluir o último rolo, status da OP é atualizado para AGUARDANDO_PESAGEM
    const novoStatusOP = isOpConcluida ? 'AGUARDANDO_PESAGEM' : 'EM_ANDAMENTO';
    // Regra definitiva TEXLOG: Durante a produção: "Rolo 1 de 2", "Rolo 2 de 2" (Apenas para controle do operador)
    // O número oficial (ex: 25561) é gerado automaticamente após a confirmação da pesagem pelo Escritório.
    const numeroRoloGerado = `Rolo ${novaQtdProduzida} de ${qtdPlanejada}`;

    // Histórico de operadores para rastreabilidade
    const historicoFormatado = historicoOperadores.length > 1
      ? `Iniciado por ${historicoOperadores[0].operadorNome}, finalizado por ${operadorNome} (${historicoOperadores.map(h => `${h.operadorNome} [Portada ${h.portadaInicio + 1}]`).join(' → ')})`
      : `Operador: ${operadorNome}`;

    // 1. Inserir rolo no Supabase com STATUS AGUARDANDO_PESAGEM
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

    // 2. Gravar ocorrências na tabela rolos_ocorrencias discriminando fase_ocorrencia
    // Fase PRODUCAO
    for (const ocProd of ocorrenciasCicloAtual) {
      const ocTexto = typeof ocProd === 'string' ? ocProd : (ocProd as any).texto || 'Ocorrência de Produção';
      try {
        await supabase.from('rolos_ocorrencias').insert([{
          rolo_id: Number(activeOP.id) || null,
          numero_rolo: numeroRoloGerado,
          fase_ocorrencia: 'PRODUCAO',
          ocorrencia: ocTexto,
          operador_id: selectedOperadorId || null,
          operador_nome: operadorNome,
          criado_em: horarioInicio
        }]);
      } catch {}
    }

    // Fase RETIRADA
    for (const ocRet of ocorrenciasRetirada) {
      try {
        await supabase.from('rolos_ocorrencias').insert([{
          rolo_id: Number(activeOP.id) || null,
          numero_rolo: numeroRoloGerado,
          fase_ocorrencia: 'RETIRADA',
          ocorrencia: ocRet.texto,
          operador_id: selectedOperadorId || null,
          operador_nome: operadorNome,
          criado_em: ocRet.horario || horarioTermino
        }]);
      } catch {}
    }

    // 3. Salvar histórico completo em producao_operador
    const textoOcorrenciasTotal = [
      ocorrenciasCicloAtual.length > 0 ? `PRODUÇÃO: ${ocorrenciasCicloAtual.join('; ')}` : '',
      ocorrenciasRetirada.length > 0 ? `RETIRADA: ${ocorrenciasRetirada.map(o => o.texto).join('; ')}` : ''
    ].filter(Boolean).join(' | ') || 'Nenhuma ocorrência';

    try {
      await supabase.from('producao_operador').insert([{
        op_id: Number(activeOP.id) || null,
        maquina: maquina,
        operador: operadorNome,
        operador_id: selectedOperadorId || null,
        portadas_total: portadasSalvas,
        ocorrencias: `${textoOcorrenciasTotal} | ${historicoFormatado}`,
        horario_inicio: horarioInicio,
        horario_termino: horarioTermino,
        duracao_segundos: duracaoSegundos,
        tempo_producao: tempoProducaoFormatado,
        criado_em: horarioTermino
      }]);
    } catch {}

    // 4. Atualizar ordens_producao no Supabase
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

    // 5. Auditoria das etapas finais: Retirada concluída & Aguardando pesagem
    await registrarAuditoria('RETIRADA_CONCLUIDA', `Checklist de retirada 100% aprovado pelo operador ${operadorNome}. Retirada concluída.`);
    await registrarAuditoria('AGUARDANDO_PESAGEM', `Rolo ${numeroRoloGerado} transferido para fila de pesagem. Máquina ${maquina} liberada para a próxima produção.`);

    // 6. Atualizar memórias locais, store e histórico geral de rolos
    const novoRoloObj = {
      id: generateId(),
      opId: activeOP.id,
      opCodigo: activeOP.codigo,
      sequencia: novaQtdProduzida,
      numeroRolo: numeroRoloGerado,
      status: 'AGUARDANDO_PESAGEM' as RoloStatus,
      portadasTotal: portadasSalvas,
      pesoEstimadoKg: activeOP.pesoEstimadoKg || 0,
      clienteNome: clienteNome,
      maquina: maquina,
      operadorNome: operadorNome,
      iniciadoEm: horarioInicio,
      finalizadoEm: horarioTermino,
      createdAt: horarioTermino,
      updatedAt: horarioTermino,
      operadores: [{ operadorId: selectedOperadorId || '', portadas: portadasSalvas }],
      faltaRoleteTempo: 0
    };

    addRolo(novoRoloObj);

    // Persistência no histórico unificado e broadcast imediato para o Escritório
    try {
      const itemHistorico = {
        id: novoRoloObj.id,
        op_id: activeOP.id,
        op_codigo: activeOP.codigo,
        numero_rolo: numeroRoloGerado,
        cliente_nome: clienteNome,
        maquina: maquina,
        operador_nome: operadorNome,
        status: 'AGUARDANDO_PESAGEM',
        peso_real_kg: null,
        criado_em: horarioTermino,
        finalizado_em: horarioTermino,
        portadas_total: portadasSalvas
      };
      const rawHist = localStorage.getItem('texlog_historico_rolos_produzidos');
      const hist = rawHist ? JSON.parse(rawHist) : [];
      const atualizado = [itemHistorico, ...hist.filter((h: any) => h.numero_rolo !== numeroRoloGerado)].slice(0, 100);
      localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(atualizado));
      localStorage.setItem('texlog_novo_rolo_pesagem', JSON.stringify(itemHistorico));
      window.dispatchEvent(new CustomEvent('texlog_novo_rolo_pesagem', { detail: itemHistorico }));
    } catch (errHist) {
      console.warn('Erro ao salvar histórico de rolos:', errHist);
    }

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

    if (isOpConcluida) {
      setSupabaseOPs(prev => prev.filter(o => o.id !== activeOP.id));
      localStorage.removeItem(`texlog_producao_ativa_${maquina}`);
      localStorage.removeItem(`texlog_live_status_${maquina}`);
    } else {
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
    }

    setRoleStatus('AGUARDANDO_PESAGEM');
    setModalFinalizarObs('');
    toast.success('Retirada concluída! Máquina liberada e rolo aguardando pesagem.', { icon: '⚖️' });

    // 7. Transições pós-retirada: PRÓXIMO ROLO OU OP FINALIZADA
    if (!isOpConcluida) {
      setInfoProximoRolo({
        roloAnterior: novaQtdProduzida,
        proximoRolo: novaQtdProduzida + 1,
        totalRolos: qtdPlanejada
      });
      setEstadoOperador('PROXIMO_ROLO');
      broadcastLiveStatus({
        status: 'PROXIMO_ROLO',
        roloAtual: `${String(novaQtdProduzida + 1).padStart(2, '0')} de ${String(qtdPlanejada).padStart(2, '0')}`
      });
    } else {
      setInfoOpFinalizada({
        codigo: activeOP.codigo,
        cliente: clienteNome,
        totalRolos: qtdPlanejada
      });
      setEstadoOperador('OP_FINALIZADA');

      // Sincronização em tempo real (BroadcastChannel, Supabase Realtime e painéis)
      try {
        const bc = new BroadcastChannel('texlog_machine_channel');
        bc.postMessage({
          type: 'OP_CONCLUIDA',
          maquina,
          opId: activeOP.id,
          opCodigo: activeOP.codigo,
          status: 'AGUARDANDO_PESAGEM',
          quantidade_produzida: novaQtdProduzida,
          quantidade_planejada: qtdPlanejada,
          timestamp: horarioTermino
        });
        bc.close();
      } catch {}

      try {
        supabase.channel('producao_maquinas_realtime').send({
          type: 'broadcast',
          event: 'op_status_update',
          payload: {
            opId: activeOP.id,
            opCodigo: activeOP.codigo,
            status: 'AGUARDANDO_PESAGEM',
            quantidade_produzida: novaQtdProduzida,
            quantidade_planejada: qtdPlanejada,
            maquina
          }
        }).catch(() => {});
      } catch {}

      window.dispatchEvent(new CustomEvent('texlog_op_concluida', {
        detail: {
          opId: activeOP.id,
          opCodigo: activeOP.codigo,
          status: 'AGUARDANDO_PESAGEM',
          quantidade_produzida: novaQtdProduzida,
          quantidade_planejada: qtdPlanejada,
          maquina
        }
      }));

      broadcastLiveStatus({
        status: 'OP_FINALIZADA',
        opId: undefined,
        opCodigo: undefined,
        progressoPercentual: 100,
        opConcluidaId: activeOP.id,
        opConcluidaCodigo: activeOP.codigo,
        novoStatusOP: 'AGUARDANDO_PESAGEM'
      });
    }
  };

  // Mantém handleConfirmarFinalizarRolo como alias seguro
  const handleConfirmarFinalizarRolo = async () => {
    await handleFinalizarRetirada();
  };

  // 13. PRÓXIMO ROLO: Ao confirmar [SIM]:
  // Contador reinicia, cronômetro reinicia, ocorrências zeram, portada 01 ativa
  const handleConfirmarProximoRolo = () => {
    const agora = new Date().toISOString();
    setOcorrenciasCicloAtual([]);
    setOcorrenciasRetirada([]);
    setRoleStatus('EM_PRODUCAO');
    setCicloInicioEm(agora);
    setTempoProducao('00:00:00');
    // SPRINT 3.4.1: Ao iniciar um novo rolo, todos os contadores iniciam obrigatoriamente em 0 Portadas
    setContadorRolo(0);
    setContadorOperador(0);
    setContadorOP(0);
    setHistoricoOperadores([{
      operadorId: selectedOperadorId,
      operadorNome: currentOperador?.nome || 'Operador',
      assumiuEm: agora,
      portadaInicio: 0
    }]);
    setEstadoOperador('PRODUZINDO');
    const prox = infoProximoRolo?.proximoRolo || 2;
    const tot = infoProximoRolo?.totalRolos || 2;
    toast.success(
      `Rolo ${String(prox).padStart(2, '0')} de ${String(tot).padStart(2, '0')} preparado e iniciado! Portada 01 ativa.`,
      { icon: '🚀' }
    );
    broadcastLiveStatus({
      status: 'PRODUZINDO',
      portadaAtual: 0,
      progressoPercentual: 0,
      roloAtual: `${String(prox).padStart(2, '0')} de ${String(tot).padStart(2, '0')}`,
      tempoProducao: '00:00:00'
    });
  };

  // 14. FINAL DA OP: Ao clicar [Voltar para fila]
  // OP finalizada não reaparece na fila
  const handleVoltarFilaAposConclusaoOP = () => {
    setActiveOPId(null);
    setInfoOpFinalizada(null);
    setContadorRolo(0);
    setContadorOperador(0);
    setContadorOP(0);
    setOcorrenciasCicloAtual([]);
    setOcorrenciasRetirada([]);
    setRoleStatus('EM_PRODUCAO');
    setTempoProducao('00:00:00');
    setEstadoOperador('OPERADOR_SELECIONADO');
    localStorage.removeItem(`texlog_producao_ativa_${maquina}`);
    localStorage.removeItem(`texlog_live_status_${maquina}`);
    broadcastLiveStatus({
      status: 'OPERADOR_SELECIONADO',
      opId: undefined,
      opCodigo: undefined,
      portadaAtual: 0,
      progressoPercentual: 0
    });
    fetchOPs();
    toast.success('Retornou à fila de produção da máquina.');
  };

  // =========================================================================
  // RENDERIZAÇÃO
  // =========================================================================

  return (
    <div className="min-h-screen bg-[#0a0c10] text-neutral-100 font-sans pb-16 selection:bg-blue-600 selection:text-white">
      
      {/* ============================================================== */}
      {/* 2. TELA INICIAL: ESTADO SEM_OPERADOR                           */}
      {/* Ocultar completamente: Ficha técnica, Portadas, Botões,        */}
      {/* Status Produzindo, Rolo Atual.                                 */}
      {/* ============================================================== */}
      {estadoOperador === 'SEM_OPERADOR' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#0d1017] to-[#08090d]">
          <div className="w-full max-w-md bg-[#121620] border-2 border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            
            {/* Ícone e Nome da Máquina */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mx-auto shadow-inner">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                {maquina}
              </div>
              <p className="text-xs text-neutral-400 font-medium">
                TEXLOG ERP • Painel do Operador
              </p>
            </div>

            <div className="border-t border-white/10 pt-5 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                  Selecione o Operador
                </label>
                <div className="relative">
                  {loadingOperadores ? (
                    <div className="w-full h-14 bg-black/50 border-2 border-white/15 rounded-2xl px-4 flex items-center justify-center text-sm font-medium text-neutral-300 gap-2">
                      <RotateCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Carregando operadores...</span>
                    </div>
                  ) : errorOperadores ? (
                    <div className="w-full h-14 bg-red-950/40 border-2 border-red-500/40 rounded-2xl px-4 flex items-center justify-between text-xs font-medium text-red-300">
                      <span>Erro ao carregar operadores.</span>
                      <button
                        type="button"
                        onClick={() => carregarOperadores()}
                        className="underline text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : operadoresAtivos.length === 0 ? (
                    <div className="w-full h-14 bg-neutral-900/60 border-2 border-dashed border-neutral-700 rounded-2xl px-4 flex items-center justify-center text-xs font-medium text-neutral-400">
                      <span>Nenhum operador cadastrado.</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={tempOperadorSelect}
                        onChange={(e) => setTempOperadorSelect(e.target.value)}
                        className="w-full h-14 bg-black/50 border-2 border-white/15 focus:border-blue-500 rounded-2xl px-4 text-base font-bold text-white appearance-none cursor-pointer focus:outline-none transition-colors"
                      >
                        <option value="" disabled className="bg-[#121620] text-neutral-400">
                          ▼ Selecionar Operador
                        </option>
                        {operadoresAtivos.map((op) => (
                          <option key={op.id} value={op.id} className="bg-[#121620] text-white">
                            {op.nome}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400">
                        <User className="w-5 h-5" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleEntrarOperador}
                disabled={!tempOperadorSelect || loadingOperadores || !!errorOperadores || operadoresAtivos.length === 0}
                className={cn(
                  "w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg",
                  tempOperadorSelect && !loadingOperadores && !errorOperadores && operadoresAtivos.length > 0
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 active:scale-[0.98] cursor-pointer"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                )}
              >
                <span>Entrar</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso sobre troca rápida de máquina caso necessário */}
            <div className="pt-2">
              <span className="text-[11px] text-neutral-500">
                Ponto de Operação Industrial • Configurado para {maquina}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CABEÇALHO ORGANIZADO (Para estados com Operador Selecionado)*/}
      {/* ┌──────────────────────────────────────────────┐                */}
      {/*  Operador: João                                                */}
      {/*  Máquina: 2                                                    */}
      {/*  OP: OP-0002                                                   */}
      {/*  Cliente: TESTE TEXLOG                                         */}
      {/*  Status: 🟢 PRODUZINDO                                         */}
      {/* └──────────────────────────────────────────────┘                */}
      {/* ============================================================== */}
      {estadoOperador !== 'SEM_OPERADOR' && (
        <header className="sticky top-0 z-30 bg-[#10131a]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6 shadow-xl">
          <div className="max-w-7xl mx-auto">
            {/* Bloco Unificado Conforme Especificação */}
            <div className="bg-black/50 border border-white/15 rounded-2xl p-3 sm:p-4 shadow-inner flex flex-wrap items-center justify-between gap-3 sm:gap-4">
              
              {/* Metadados: Operador, Máquina, OP, Cliente, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-6 flex-1 text-left">
                {/* Operador */}
                <div className="border-r border-white/10 pr-2 last:border-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Operador:
                  </span>
                  <span className="text-sm sm:text-base font-black text-white truncate block">
                    {currentOperador?.nome || '—'}
                  </span>
                </div>

                {/* Máquina */}
                <div className="border-r border-white/10 pr-2 last:border-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Máquina:
                  </span>
                  <span className="text-sm sm:text-base font-black text-blue-400 font-mono block">
                    {maquina.replace(/[^0-9]/g, '') || maquina}
                  </span>
                </div>

                {/* OP */}
                <div className="border-r border-white/10 pr-2 last:border-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    OP:
                  </span>
                  <span className="text-sm sm:text-base font-black text-amber-300 font-mono truncate block">
                    {activeOP?.codigo || '—'}
                  </span>
                </div>

                {/* Cliente */}
                <div className="border-r border-white/10 pr-2 last:border-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Cliente:
                  </span>
                  <span className="text-sm sm:text-base font-black text-white truncate block">
                    {activeOP ? clienteNome : '—'}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Status:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {estadoOperador === 'PRODUZINDO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs font-mono uppercase tracking-wide border border-emerald-500/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>🟢 PRODUZINDO</span>
                      </span>
                    )}

                    {estadoOperador === 'REVISAO_ROLO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-black text-xs font-mono uppercase tracking-wide border border-indigo-500/40">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span>AGUARDANDO REVISÃO</span>
                      </span>
                    )}

                    {estadoOperador === 'RETIRADA_ROLO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-black text-xs font-mono uppercase tracking-wide border border-amber-500/40">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>RETIRADA EM ANDAMENTO</span>
                      </span>
                    )}

                    {estadoOperador === 'OPERADOR_SELECIONADO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-500/20 text-slate-300 font-black text-xs font-mono uppercase tracking-wide border border-slate-500/30">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>AGUARDANDO OP</span>
                      </span>
                    )}

                    {(estadoOperador === 'OP_SELECIONADA' || estadoOperador === 'CONFERENCIA') && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-black text-xs font-mono uppercase tracking-wide border border-amber-500/30">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>AGUARDANDO INÍCIO</span>
                      </span>
                    )}

                    {estadoOperador === 'FINALIZANDO_ROLO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-black text-xs font-mono uppercase tracking-wide border border-blue-500/30">
                        <span>FINALIZANDO ROLO</span>
                      </span>
                    )}

                    {estadoOperador === 'PROXIMO_ROLO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-black text-xs font-mono uppercase tracking-wide border border-blue-500/30">
                        <span>PRÓXIMO ROLO</span>
                      </span>
                    )}

                    {estadoOperador === 'OP_FINALIZADA' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs font-mono uppercase tracking-wide border border-emerald-500/30">
                        <span>OP FINALIZADA</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações do Cabeçalho: Voltar para fila & 15. Trocar Operador */}
              <div className="flex items-center gap-2">
                {activeOP && estadoOperador !== 'OP_FINALIZADA' && (
                  <button
                    type="button"
                    onClick={handleVoltarFila}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    title="Ver a fila completa de ordens da máquina"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Fila</span>
                  </button>
                )}

                {/* 15. Botão "Trocar operador" */}
                <button
                  type="button"
                  onClick={handleSolicitarTrocaOperador}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  title="Trocar operador ativo e encerrar sessão atual"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Trocar operador</span>
                </button>
              </div>

            </div>
          </div>
        </header>
      )}

      {/* ============================================================== */}
      {/* CORPO PRINCIPAL COM CONDIÇÃO DE ESTADOS                        */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ============================================================ */}
        {/* 3. ESTADO OPERADOR_SELECIONADO: FILA DA MÁQUINA               */}
        {/* Listar somente OPs daquela máquina.                           */}
        {/* 4. SELEÇÃO DA OP: Cada OP mostra apenas:                     */}
        {/* Código, Cliente, Quantidade de rolos, Status, Botão Selecionar*/}
        {/* Nada mais.                                                    */}
        {/* ============================================================ */}
        {estadoOperador === 'OPERADOR_SELECIONADO' && (
          <section className="bg-[#12161f] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-4">
              <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-blue-400" />
                FILA DA MÁQUINA ({opsDaMaquina.length})
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Ordens de produção programadas exclusivamente para esta máquina.
              </p>
            </div>

            {opsDaMaquina.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opsDaMaquina.map((opItem) => {
                  const cName = getClienteNome(opItem);
                  const qPlan = Number(opItem.quantidade_planejada ?? opItem.qtdRolos ?? 1);
                  const qProdMem = Number(rolosFinalizadosMemoria[opItem.id] ?? 0);
                  const qProdSupabase = Number(opItem.quantidade_produzida ?? 0);
                  const qProd = Math.max(qProdSupabase, qProdMem);

                  return (
                    <div
                      key={opItem.id}
                      className="bg-black/40 border border-white/10 hover:border-blue-500/40 rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between"
                    >
                      {/* Código e Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-white font-mono">
                          {opItem.codigo}
                        </span>
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold uppercase font-mono border",
                          opItem.status === 'EM_ANDAMENTO' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                          opItem.status === 'PREPARANDO' && "bg-amber-500/20 text-amber-300 border-amber-500/30",
                          opItem.status === 'PENDENTE' && "bg-slate-500/20 text-slate-300 border-slate-500/30"
                        )}>
                          {opItem.status}
                        </span>
                      </div>

                      {/* Cliente */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                          Cliente
                        </span>
                        <span className="text-base font-black text-blue-300 block truncate" title={cName}>
                          {cName}
                        </span>
                      </div>

                      {/* Quantidade de rolos */}
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Quantidade de rolos
                        </span>
                        <span className="text-base font-mono font-black text-emerald-400">
                          {qPlan === 1 ? '1 rolo' : `${qProd} / ${qPlan} rolos`}
                        </span>
                      </div>

                      {/* Botão Selecionar */}
                      <button
                        type="button"
                        onClick={() => handleSelecionarOP(opItem.id)}
                        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Selecionar</span>
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
                  Não há ordens de produção pendentes para esta máquina.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ============================================================ */}
        {/* ESTADO OP_SELECIONADA: PRÉ-INÍCIO DA PRODUÇÃO                */}
        {/* 11. Botão: Apenas "Iniciar produção"                         */}
        {/* 8. Rolo Atual antes da produção: "Nenhum rolo iniciado"      */}
        {/* ============================================================ */}
        {estadoOperador === 'OP_SELECIONADA' && activeOP && (
          <section className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-[#121620] via-[#151a26] to-[#121620] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <span>Pronta para iniciar conferência e produção</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                  OP {activeOP.codigo} • {clienteNome}
                </h2>
                <p className="text-xs text-neutral-300 max-w-md mx-auto">
                  Realize a conferência dos parâmetros da máquina antes de liberar a produção.
                </p>
              </div>

              {/* Indicador do Rolo Atual: Nenhum rolo iniciado (Item 8) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto bg-black/40 p-4 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Rolo Atual
                  </span>
                  <span className="text-sm sm:text-base font-bold text-amber-300">
                    Nenhum rolo iniciado
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Total de Rolos
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-white">
                    {planejado}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Portadas Previstas
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-blue-400">
                    {totalPortadas}
                  </span>
                </div>
              </div>

              {/* 11. Botão: Apenas "Iniciar produção" */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleIniciarConferencia}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-base uppercase tracking-wider shadow-xl shadow-emerald-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>Iniciar Produção</span>
                </button>

                <button
                  type="button"
                  onClick={handleVoltarFila}
                  className="w-full sm:w-auto px-6 py-5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Voltar para fila
                </button>
              </div>

            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* ESTADO PRODUZINDO: FICHA TÉCNICA, ROLO ATUAL, PORTADAS,      */}
        {/* RESUMO E BOTÕES ATIVOS                                       */}
        {/* ============================================================ */}
        {(estadoOperador === 'PRODUZINDO' || estadoOperador === 'FINALIZANDO_ROLO') && activeOP && (
          <>
            {/* ======================================================== */}
            {/* 7. FICHA TÉCNICA (MANTER SEMPRE VISÍVEL DURANTE PRODUÇÃO) */}
            {/* Adicionar também: Rolo desenho, Fios por portada, Metros  */}
            {/* ======================================================== */}
            <section className="bg-[#12161f] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Ficha Técnica
                  </h2>
                </div>

                {/* 8. ROLO ATUAL: Exibe "01 de 02", etc. */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Rolo Atual:
                  </span>
                  <span className="text-sm font-black font-mono text-amber-300">
                    {roloAtualFormatado}
                  </span>
                </div>
              </div>

              {/* Grid Completo dos Parâmetros Solicitados */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {/* Título do Fio */}
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

                {/* 7. Fios por Portada (Gaiola) */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Fios p/ Portada
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono block">
                    {fiosPorPortadaValor}
                  </span>
                </div>

                {/* 7. Metros Planejados */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Metros Planejados
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono block">
                    {metrosPlanejados}
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
                  <span className="text-xs sm:text-sm font-black text-amber-300 font-mono truncate block">
                    {activeOP.rolete || activeEspecificacao?.rolete || '—'}
                  </span>
                </div>

                {/* 7. Rolo Desenho */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Rolo Desenho
                  </span>
                  <span className={cn(
                    "text-xs sm:text-sm font-black font-mono truncate block",
                    temRoloDesenho ? "text-purple-300 font-bold" : "text-neutral-500"
                  )}>
                    {valorRoloDesenho || (temRoloDesenho ? 'Sim' : 'Não')}
                  </span>
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* 9. PORTADAS (✔ Concluída, 🟡 Atual, ⬜ Pendente)        */}
            {/* Ao finalizar: marca como concluída e move p/ a próxima   */}
            {/* ======================================================== */}
            <section className="bg-[#12161f] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-neutral-200">
                    Portadas do Rolo ({totalPortadas} previstas)
                  </h2>
                </div>

                {/* Legenda Exata da Sprint */}
                <div className="flex items-center gap-3 sm:gap-5 text-xs font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span>✔</span>
                    <span>Concluída</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span>🟡</span>
                    <span>Atual</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-neutral-400">
                    <span>⬜</span>
                    <span>Pendente</span>
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
                        <span>{isConcluida ? '✔' : isAtual ? '🟡' : '⬜'}</span>
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

              {/* ====================================================== */}
              {/* 10. RESUMO (Concluídas, Restantes, Tempo, Progresso)   */}
              {/* ====================================================== */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 mt-3">
                {/* Concluídas */}
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Concluídas
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono text-emerald-400 block">
                    {String(portadasAtual).padStart(2, '0')} / {String(totalPortadas).padStart(2, '0')}
                  </span>
                </div>

                {/* Restantes */}
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Restantes
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono text-neutral-200 block">
                    {String(Math.max(0, totalPortadas - portadasAtual)).padStart(2, '0')}
                  </span>
                </div>

                {/* Tempo */}
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Tempo
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono text-blue-400 block">
                    {tempoProducao}
                  </span>
                </div>

                {/* Progresso % */}
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    Progresso
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono text-purple-300 block">
                    {progressoPercentual}%
                  </span>
                </div>
              </div>

              {/* Ocorrências registradas neste ciclo */}
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

            {/* ======================================================== */}
            {/* 11. BOTÕES DE AÇÃO:                                     */}
            {/* Finalizar portada, Registrar ocorrência, Finalizar rolo  */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {/* Botão 1: Finalizar portada */}
              <button
                type="button"
                onClick={handleFinalizarPortada}
                className="h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:from-emerald-700 active:to-emerald-600 text-white flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/30 border border-emerald-400/30 transition-all active:scale-[0.98] focus:outline-none cursor-pointer"
              >
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                <span className="text-base sm:text-xl font-black uppercase tracking-wider">
                  Finalizar portada
                </span>
              </button>

              {/* Botão 2: Registrar ocorrência */}
              <button
                type="button"
                onClick={handleAbrirOcorrencia}
                className="h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:from-amber-700 active:to-amber-600 text-white flex items-center justify-center gap-3 shadow-xl shadow-amber-900/30 border border-amber-400/30 transition-all active:scale-[0.98] focus:outline-none cursor-pointer"
              >
                <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
                <span className="text-base sm:text-xl font-black uppercase tracking-wider">
                  Registrar ocorrência
                </span>
              </button>

              {/* Botão 3: Revisar rolo (com bloqueio visual e badge de portadas restantes) */}
              <button
                type="button"
                onClick={handleIniciarRevisaoRolo}
                className={cn(
                  "h-20 sm:h-24 rounded-2xl flex items-center justify-center gap-3 border transition-all active:scale-[0.98] focus:outline-none shadow-xl",
                  portadasAtual >= totalPortadas
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 text-white shadow-blue-900/30 border-blue-400/40 cursor-pointer"
                    : "bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 border-white/10 opacity-75 cursor-not-allowed"
                )}
              >
                {portadasAtual >= totalPortadas ? (
                  <ClipboardCheck className="w-7 h-7 stroke-[2.5]" />
                ) : (
                  <Lock className="w-6 h-6 text-neutral-400" />
                )}
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-xl font-black uppercase tracking-wider">
                    Revisar Rolo
                  </span>
                  {portadasAtual >= totalPortadas ? (
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-0.5">
                      Produção concluída
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                      (Restam {totalPortadas - portadasAtual} portadas)
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Aviso de Produção Concluída na última portada */}
            {portadasAtual >= totalPortadas && (
              <div className="bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border-2 border-blue-500/60 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-blue-950/50 mt-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0">
                    <ClipboardCheck className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-black text-xs uppercase tracking-wider mb-1">
                      <span>✔ Produção concluída</span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-white">
                      Produção concluída. Realizar revisão do rolo.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleIniciarRevisaoRolo}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base uppercase tracking-wider shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <ClipboardCheck className="w-5 h-5 stroke-[2.5]" />
                  <span>Revisar Rolo</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SPRINT 2.4.3: TELA REVISÃO DO ROLO                           */}
        {/* ============================================================ */}
        {estadoOperador === 'REVISAO_ROLO' && activeOP && (
          <TelaRevisaoRolo
            op={activeOP}
            clienteNome={clienteNome}
            maquina={maquina}
            operadorNome={currentOperador?.nome || 'Operador'}
            roloAtualFormatado={roloAtualFormatado}
            especificacao={activeEspecificacao}
            fiosPorPortada={fiosPorPortadaValor}
            totalPortadas={totalPortadas}
            ocorrenciasProducao={ocorrenciasCicloAtual}
            onIniciarRetirada={handleIniciarRetirada}
            onVoltarProducao={() => setEstadoOperador('PRODUZINDO')}
          />
        )}

        {/* ============================================================ */}
        {/* SPRINT 2.4.3: TELA RETIRADA DO ROLO                          */}
        {/* ============================================================ */}
        {estadoOperador === 'RETIRADA_ROLO' && activeOP && (
          <TelaRetiradaRolo
            op={activeOP}
            clienteNome={clienteNome}
            operadorNome={currentOperador?.nome || 'Operador'}
            maquina={maquina}
            roloAtualFormatado={roloAtualFormatado}
            ocorrenciasRetirada={ocorrenciasRetirada}
            onAdicionarOcorrenciaRetirada={handleAdicionarOcorrenciaRetirada}
            onRemoverOcorrenciaRetirada={handleRemoverOcorrenciaRetirada}
            onFinalizarRetirada={handleFinalizarRetirada}
            onVoltarRevisao={() => setEstadoOperador('REVISAO_ROLO')}
          />
        )}

        {/* ============================================================ */}
        {/* SPRINT 2.4.4: HISTÓRICO - ÚLTIMOS ROLOS PRODUZIDOS          */}
        {/* ============================================================ */}
        <UltimosRolosProduzidos maquinaAtual={maquina} />

      </main>

      {/* ============================================================== */}
      {/* 5. MODAL: CONFERÊNCIA ANTES DO INÍCIO                          */}
      {/* ============================================================== */}
      {estadoOperador === 'CONFERENCIA' && activeOP && (
        <ModalConferencia
          isOpen={true}
          onClose={handleFecharConferencia}
          onConfirm={handleConfirmarConferenciaEIniciar}
          op={activeOP}
          clienteNome={clienteNome}
          tituloFio={activeOP.titulo_fio || activeOP.tituloFio || activeTitulo?.codigo}
          tipoFio={activeOP.tipo_fio || activeOP.tipoFio || activeTitulo?.tipo_fio}
          especificacao={activeEspecificacao}
          maquina={maquina}
          operadorNome={currentOperador?.nome}
          onSelectOperador={handleSolicitarTrocaOperador}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL: FINALIZAR ROLO (CONFIRMAÇÃO)                            */}
      {/* ============================================================== */}
      {estadoOperador === 'FINALIZANDO_ROLO' && activeOP && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#151922] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Finalizar Rolo
              </h3>
              <button 
                onClick={() => setEstadoOperador('PRODUZINDO')}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
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
                onClick={() => setEstadoOperador('PRODUZINDO')}
                className="w-full py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmarFinalizarRolo}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.99] cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 13. PRÓXIMO ROLO: MODAL 'Preparar próximo rolo?'                */}
      {/* ✔ Rolo concluído. Preparar próximo rolo? [Sim]                */}
      {/* ============================================================== */}
      {estadoOperador === 'PROXIMO_ROLO' && infoProximoRolo && activeOP && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#121620] border-2 border-blue-500/40 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 mx-auto shadow-lg shadow-blue-900/30">
              <Package className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase">
                <Check className="w-4 h-4" />
                <span>Rolo concluído</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wider text-white">
                Preparar próximo rolo?
              </h3>
              <p className="text-xs text-neutral-300">
                Rolo <span className="font-mono font-bold text-emerald-400">{String(infoProximoRolo.roloAnterior).padStart(2, '0')}</span> de <span className="font-mono font-bold text-white">{String(infoProximoRolo.totalRolos).padStart(2, '0')}</span> finalizado com sucesso.
              </p>
              
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mt-3 text-left space-y-1.5">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Próximo Rolo • OP {activeOP.codigo}
                </div>
                <div className="text-xl font-black text-blue-400 font-mono">
                  Rolo {String(infoProximoRolo.proximoRolo).padStart(2, '0')} de {String(infoProximoRolo.totalRolos).padStart(2, '0')}
                </div>
                <div className="text-xs text-neutral-300">
                  Total de portadas a produzir: <span className="text-white font-bold">{totalPortadas}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmarProximoRolo}
                className="w-full py-4.5 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-black text-base uppercase tracking-wider shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Sim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 14. FINAL DA OP: OP FINALIZADA                                 */}
      {/* ✔ OP Finalizada. Produção encerrada. [Voltar para fila]        */}
      {/* Não voltar automaticamente.                                    */}
      {/* ============================================================== */}
      {estadoOperador === 'OP_FINALIZADA' && infoOpFinalizada && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#10141d] border-2 border-emerald-500/50 rounded-3xl w-full max-w-md p-7 shadow-2xl shadow-emerald-950/50 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-900/40">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                OP FINALIZADA
              </h3>
              
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-400 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Todos os rolos produzidos.</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-300 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Todos revisados.</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-300 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Todos retirados.</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-left space-y-2 mt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 uppercase font-bold">Ordem</span>
                  <span className="text-white font-mono font-black">{infoOpFinalizada.codigo}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 uppercase font-bold">Cliente</span>
                  <span className="text-blue-300 font-bold truncate max-w-[220px]">{infoOpFinalizada.cliente}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 uppercase font-bold">Total de Rolos</span>
                  <span className="text-emerald-400 font-mono font-black">{infoOpFinalizada.totalRolos} de {infoOpFinalizada.totalRolos} concluídos</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleVoltarFilaAposConclusaoOP}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-emerald-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-5 h-5" />
                <span>Voltar para fila</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 12. MODAL: REGISTRAR OCORRÊNCIA                                */}
      {/* Portada atual, horário, operador, máquina, rolo pré-preenchidos*/}
      {/* ============================================================== */}
      {isOcorrenciaModalOpen && activeOP && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#151922] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Registrar Ocorrência
                </h3>
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

            {/* Metadados Automáticos Registrados (Item 12) */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Portada Atual:</span>
                <span className="font-mono font-black text-amber-300">
                  Portada {String(Math.min(totalPortadas, portadasAtual + 1)).padStart(2, '0')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Horário:</span>
                <span className="font-mono font-black text-white">{ocorrenciaHorarioAbertura}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Operador:</span>
                <span className="font-bold text-white truncate block">{currentOperador?.nome}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Máquina / Rolo:</span>
                <span className="font-mono font-bold text-blue-300 truncate block">{maquina} • {roloAtualFormatado}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Selecione o Motivo da Ocorrência
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
                          "w-full p-3 rounded-xl border text-sm font-bold text-left transition-all flex items-center justify-between cursor-pointer",
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
                    Observação
                  </label>
                  <textarea
                    value={ocorrenciaObs}
                    onChange={(e) => setOcorrenciaObs(e.target.value)}
                    rows={2}
                    className="w-full bg-black/50 border border-white/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Descreva a ocorrência..."
                    autoFocus
                  />
                </div>
              )}

              {/* Histórico de ocorrências já salvas no rolo atual */}
              {ocorrenciasCicloAtual.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                    Ocorrências deste rolo ({ocorrenciasCicloAtual.length}):
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {ocorrenciasCicloAtual.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-black/40 border border-amber-500/20 text-[11px] font-mono text-amber-200/90 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
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
                className="w-full py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-colors uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmarOcorrencia}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-900/30 transition-colors cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 15. MODAL DE CONFIRMAÇÃO: TROCAR OPERADOR (FORA DE PRODUÇÃO)  */}
      {/* ============================================================== */}
      {isConfirmTrocaOperadorOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#151922] border-2 border-red-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-400/30 text-red-400 flex items-center justify-center mx-auto">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-wider text-white">
                Trocar Operador?
              </h3>
              <p className="text-xs text-neutral-300">
                Esta ação encerrará a sessão atual do operador <span className="font-bold text-white">{currentOperador?.nome}</span> e retornará à tela inicial para nova identificação.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmTrocaOperadorOpen(false)}
                className="w-full py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarTrocaOperador}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-900/30 active:scale-95 cursor-pointer"
              >
                Confirmar e Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SPRINT 2.4.2: MODAL TRANSFERÊNCIA DE OPERADOR EM PRODUÇÃO ATIVA*/}
      {/* Permite que Carlos assuma de João com rastreabilidade total    */}
      {/* ============================================================== */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#151922] border-2 border-blue-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white">
                  Transferir Produção?
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {maquina} • OP {activeOP?.codigo}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-left">
              {/* Operador Atual */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Operador atual:
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-base font-black text-white">
                    {currentOperador?.nome || 'Operador Atual'}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 block">
                  Iniciou a produção e concluiu até a portada {portadasAtual} de {totalPortadas}.
                </span>
              </div>

              {/* Novo Operador */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Novo operador:
                </label>
                <div className="relative">
                  {loadingOperadores ? (
                    <div className="w-full py-3.5 px-4 rounded-2xl bg-black/50 border border-white/10 text-xs text-neutral-300 flex items-center gap-2">
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span>Carregando operadores...</span>
                    </div>
                  ) : errorOperadores ? (
                    <div className="w-full py-3.5 px-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center justify-between">
                      <span>Erro ao carregar operadores.</span>
                      <button
                        type="button"
                        onClick={() => carregarOperadores()}
                        className="underline text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : operadoresAtivos.filter(o => o.id !== selectedOperadorId).length === 0 ? (
                    <div className="w-full py-3.5 px-4 rounded-2xl bg-black/50 border border-white/10 text-xs text-neutral-400">
                      <span>Nenhum operador cadastrado.</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={novoOperadorTransferId}
                        onChange={(e) => setNovoOperadorTransferId(e.target.value)}
                        className="w-full bg-black/50 border border-blue-500/40 text-white rounded-2xl py-3.5 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="bg-neutral-900 text-neutral-500">
                          Selecione o novo operador para assumir...
                        </option>
                        {operadoresAtivos
                          .filter(o => o.id !== selectedOperadorId)
                          .map((op) => (
                            <option key={op.id} value={op.id} className="bg-neutral-900 text-white">
                              {op.nome} ({op.matricula || 'Ativo'})
                            </option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400">
                        ▼
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Rastreabilidade e Auditoria */}
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  O sistema registrará no histórico quem iniciou e quem terminou a produção para produtividade e rastreabilidade total.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setNovoOperadorTransferId('');
                }}
                className="w-full py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarTransferencia}
                disabled={!novoOperadorTransferId}
                className={cn(
                  "w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg",
                  novoOperadorTransferId
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 active:scale-95 cursor-pointer"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                )}
              >
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SPRINT 2.4.2: MODAL DE RECUPERAÇÃO APÓS QUEDA / CRASH RECOVERY */}
      {/* Detecta produção em andamento após refresh ou queda de aba     */}
      {/* ============================================================== */}
      {isRecoveryModalOpen && recoveryData && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#151922] border-2 border-amber-500/50 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-6 h-6 animate-spin-reverse" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                  Produção Interrompida
                </h3>
                <span className="text-xs text-amber-300 font-bold">
                  Sessão em andamento recuperada do dispositivo
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Identificamos que uma produção na <span className="font-black text-white">{recoveryData.maquina}</span> estava em andamento antes do encerramento da sessão ou reinício da página.
            </p>

            {/* Ficha Resumo do Estado Salvo */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Ordem de Produção</span>
                  <span className="font-mono font-black text-white text-sm">OP {recoveryData.opCodigo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Cliente</span>
                  <span className="font-black text-white truncate block text-sm">{recoveryData.clienteNome}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Operador</span>
                  <span className="font-black text-emerald-400 text-sm">{recoveryData.operadorNome}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Rolo Atual</span>
                  <span className="font-mono font-black text-blue-400 text-sm">{recoveryData.roloAtualFormatado}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Portadas Concluídas</span>
                  <span className="font-mono font-black text-amber-300 text-sm">
                    {recoveryData.portadasAtual} de {recoveryData.totalPortadas}
                  </span>
                </div>
                {recoveryData.salvoEm && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 block mb-0.5">Último Salvamento</span>
                    <span className="font-mono text-neutral-400 text-[11px]">
                      {new Date(recoveryData.salvoEm).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleDescartarRecuperacao}
                className="w-full py-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleRetomarProducao}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/40 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Retomar Produção
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
