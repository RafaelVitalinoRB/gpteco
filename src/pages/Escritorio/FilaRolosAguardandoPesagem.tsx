import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Scale, 
  Search, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  User, 
  Layers, 
  Cpu, 
  RotateCw, 
  Plus, 
  X, 
  Building2, 
  Info,
  Check,
  PackageCheck,
  Printer,
  Truck,
  Box,
  CheckCheck,
  Square,
  CheckSquare,
  AlertTriangle,
  Download,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { generateId } from '../../lib/utils';
import { RoloStatus } from '../../types';
import { useEmpresa, formatarEnderecoEmpresa } from '../../services/empresaService';
import { FichaTecnicaRomaneioModal } from './FichaTecnicaRomaneioModal';
import { ModalDecisaoFaturamento, ModalFaturarRomaneio } from './ModalFaturamento';
import { salvarPesagemComNumeroOficial, obterProximoNumeroOficial } from '../../services/roloOficialService';

export interface RoloFilaItem {
  id: string;
  op_id?: string | number | null;
  op_codigo?: string;
  numero_rolo: string;
  cliente_nome: string;
  faccionista_nome?: string;
  maquina: string;
  operadores_nomes: string;
  finalizado_em: string;
  status: RoloStatus | string;
  
  // Dados Técnicos (modo somente leitura)
  titulo_fio?: string;
  cor?: string;
  tipo_fio?: string;
  total_fios?: number | string;
  metros?: number | string;
  rolete?: string;
  voltas?: number | string;
  peso_estimado_kg?: number;
  
  // Dados de Pesagem
  peso_bruto_kg?: number | null;
  tara_kg?: number | null;
  peso_real_kg?: number | null;
  pesado_em?: string;
  
  // Observações (apenas para o cliente)
  observacoes_cliente?: string;
}

export interface RomaneioItem {
  id: string;
  codigoRomaneio: string;
  clienteNome: string;
  clienteId?: string | number;
  dataEmissao: string;
  rolos: Array<{
    id?: string;
    numero_rolo: string;
    op_codigo?: string;
    cliente_nome?: string;
    faccionista_nome?: string;
    maquina?: string;
    operadores_nomes?: string;
    data_producao?: string;
    fio?: string;
    tipo_fio?: string;
    titulo_fio?: string;
    cor?: string;
    total_fios?: number | string;
    metros?: number;
    rolete?: string;
    voltas?: number;
    pesoBrutoKg?: number;
    taraKg?: number;
    pesoLiquidoKg: number;
    observacoes_cliente?: string;
  }>;
  totalRolos: number;
  totalMetros: number;
  totalPesoKg: number;
  transportadora?: string;
  motorista?: string;
  placa?: string;
  observacoes?: string;
  status: 'EMITIDO' | 'EXPEDIDO' | 'PENDENTE_FATURAMENTO' | 'FATURADO';
  expedidoEm?: string;
  faturadoEm?: string;
  valorTotalFaturado?: number;
}

const ROLOS_DEMO_INICIAIS: RoloFilaItem[] = [
  {
    id: 'demo-rolo-25561',
    op_id: 'OP-25561',
    op_codigo: 'OP-25561',
    numero_rolo: '25561',
    cliente_nome: 'TEXPOINT',
    faccionista_nome: 'MALHARIA XYZ',
    maquina: '02',
    operadores_nomes: 'Alessia',
    finalizado_em: '2026-09-25T09:35:00',
    status: 'AGUARDANDO_PESAGEM',
    titulo_fio: '150/48',
    cor: 'Branco',
    tipo_fio: 'Poliéster',
    total_fios: 3520,
    metros: 3100,
    rolete: 'Rolete Metálico 1800mm',
    voltas: 1550,
    peso_estimado_kg: 248,
    observacoes_cliente: 'Entregar com embalagem reforçada. Manter tensão uniforme na urdideira para alimentação de malharia circular.'
  },
  {
    id: 'demo-rolo-104-1',
    op_id: '104',
    op_codigo: 'OP-104',
    numero_rolo: 'OP-104-R1',
    cliente_nome: 'ALAMO TÊXTIL LTDA',
    faccionista_nome: 'Próprio / Interno',
    maquina: 'MAQUINA 1',
    operadores_nomes: 'Carlos Eduardo Silva',
    finalizado_em: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: 'AGUARDANDO_PESAGEM',
    titulo_fio: '150/48',
    cor: 'BRANCO ALVEJADO',
    tipo_fio: 'POLIÉSTER',
    total_fios: 5400,
    metros: 3200,
    rolete: 'Rolete Metálico 1800mm',
    voltas: 1600,
    peso_estimado_kg: 26.50,
    observacoes_cliente: 'Entregar com embalagem reforçada conforme solicitação do cliente.'
  },
  {
    id: 'demo-rolo-102-2',
    op_id: '102',
    op_codigo: 'OP-102',
    numero_rolo: 'OP-102-R2',
    cliente_nome: 'DALILA TÊXTIL S/A',
    faccionista_nome: 'Tecelagem União',
    maquina: 'MAQUINA 2',
    operadores_nomes: 'João Ferreira',
    finalizado_em: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    status: 'AGUARDANDO_PESAGEM',
    titulo_fio: '30/1',
    cor: 'CRU NATURAL',
    tipo_fio: 'ALGODÃO',
    total_fios: 4800,
    metros: 2800,
    rolete: 'Rolete 1800mm Reforçado',
    voltas: 1400,
    peso_estimado_kg: 24.00,
    observacoes_cliente: 'Lote prioritário para corte e costura imediato.'
  }
];

export const FilaRolosAguardandoPesagem: React.FC = () => {
  const { 
    rolos: storeRolos, 
    updateRolo, 
    ops: storeOps, 
    clientes: storeClientes, 
    addSaida
  } = useStore();

  const { empresa } = useEmpresa();

  // Sub-abas do fluxo do Escritório
  const [subAba, setSubAba] = useState<'AGUARDANDO' | 'PESADOS' | 'ROMANEIOS' | 'PENDENTES'>('AGUARDANDO');

  const [todosRolos, setTodosRolos] = useState<RoloFilaItem[]>([]);
  const [busca, setBusca] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal 1: Conferência em Modo Leitura (Recebimento do Rolo)
  const [roloConferindo, setRoloConferindo] = useState<RoloFilaItem | null>(null);
  const [isConfirmandoRecebimento, setIsConfirmandoRecebimento] = useState(false);

  // Modal 2: Pesagem do Rolo (Balança)
  const [roloPesando, setRoloPesando] = useState<RoloFilaItem | null>(null);
  const [pesoBrutoInput, setPesoBrutoInput] = useState<string>('');
  const [taraInput, setTaraInput] = useState<string>('3.50');
  const [obsPesagem, setObsPesagem] = useState<string>('');
  const [isSalvandoPesagem, setIsSalvandoPesagem] = useState(false);

  // Modal 3: Geração de Romaneio
  const [isRomaneioModalOpen, setIsRomaneioModalOpen] = useState(false);
  const [clienteRomaneioId, setClienteRomaneioId] = useState<string>('');
  const [rolosSelecionadosIds, setRolosSelecionadosIds] = useState<string[]>([]);
  const [transportadoraInput, setTransportadoraInput] = useState<string>('');
  const [motoristaInput, setMotoristaInput] = useState<string>('');
  const [placaInput, setPlacaInput] = useState<string>('');
  const [obsRomaneioInput, setObsRomaneioInput] = useState<string>('');
  const [romaneioGeradoVisualizar, setRomaneioGeradoVisualizar] = useState<RomaneioItem | null>(null);

  // Modais de Faturamento (Prioridade 4 e 5: Fluxo Pesado -> Romaneio -> Expedido -> Liberar Financeiro)
  const [romaneioDecidindoFaturamento, setRomaneioDecidindoFaturamento] = useState<RomaneioItem | null>(null);
  const [romaneioFaturando, setRomaneioFaturando] = useState<RomaneioItem | null>(null);

  // Histórico de Romaneios
  const [romaneiosEmitidos, setRomaneiosEmitidos] = useState<RomaneioItem[]>(() => {
    try {
      const raw = localStorage.getItem('texlog_romaneios_emitidos');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Salvar romaneios no storage
  const salvarRomaneiosStorage = (lista: RomaneioItem[]) => {
    setRomaneiosEmitidos(lista);
    try {
      localStorage.setItem('texlog_romaneios_emitidos', JSON.stringify(lista));
    } catch (e) {
      console.warn('Erro ao salvar romaneios:', e);
    }
  };

  // Carregar todos os rolos do histórico e Supabase
  const carregarFila = async () => {
    setIsLoading(true);
    try {
      // 1. Carregar do localStorage
      let localItems: any[] = [];
      try {
        const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (raw) {
          localItems = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Erro ao ler localStorage:', e);
      }

      // Se completamente vazio, semeia os rolos iniciais para teste
      if (localItems.length === 0 && storeRolos.length === 0) {
        localItems = [...ROLOS_DEMO_INICIAIS];
        try {
          localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(localItems));
        } catch {}
      }

      // 2. Carregar do Supabase
      let supabaseItems: any[] = [];
      try {
        const { data, error } = await supabase
          .from('rolos')
          .select('*')
          .order('criado_em', { ascending: false });

        if (!error && data) {
          supabaseItems = data;
        }
      } catch (errSupabase) {
        console.warn('Erro ao consultar Supabase:', errSupabase);
      }

      // 3. Mesclar dados
      const mapa = new Map<string, RoloFilaItem>();

      localItems.forEach((r: any) => {
        const chave = r.numero_rolo || r.id;
        if (chave) {
          mapa.set(chave, {
            id: String(r.id || chave),
            op_id: r.op_id,
            op_codigo: r.op_codigo || (r.op_id ? `OP-${r.op_id}` : '—'),
            numero_rolo: r.numero_rolo || `ETQ-${chave}`,
            cliente_nome: r.cliente_nome || 'Cliente',
            faccionista_nome: r.faccionista_nome || r.faccionista || 'Próprio / Interno',
            maquina: r.maquina || 'MAQUINA 1',
            operadores_nomes: r.operadores_nomes || r.operador_nome || r.operador_responsavel || r.operador || 'Operador',
            finalizado_em: r.finalizado_em || r.horario_termino || r.criado_em || new Date().toISOString(),
            status: (r.status || 'AGUARDANDO_PESAGEM').toUpperCase().trim(),
            titulo_fio: r.titulo_fio || '150/48',
            cor: r.cor || 'CRU',
            tipo_fio: r.tipo_fio || 'POLIÉSTER',
            total_fios: r.total_fios || 5000,
            metros: r.metros || 3000,
            rolete: r.rolete || 'Rolete Padrão',
            voltas: r.voltas || 1500,
            peso_estimado_kg: Number(r.peso_estimado_kg || 25.0),
            peso_bruto_kg: r.peso_bruto_kg ? Number(r.peso_bruto_kg) : null,
            tara_kg: r.tara_kg ? Number(r.tara_kg) : null,
            peso_real_kg: r.peso_real_kg ? Number(r.peso_real_kg) : null,
            pesado_em: r.pesado_em,
            observacoes_cliente: r.observacoes_cliente || r.observacoes || ''
          });
        }
      });

      // Mescla com itens do Zustand store
      storeRolos.forEach((sr) => {
        const chave = String(sr.numeroRolo || sr.id);
        const existente = mapa.get(chave);
        const opCorrespondente = storeOps.find(o => o.id === sr.opId);
        const clienteCorrespondente = opCorrespondente 
          ? storeClientes.find(c => c.id === opCorrespondente.clienteId)
          : null;

        mapa.set(chave, {
          id: sr.id,
          op_id: sr.opId,
          op_codigo: sr.opCodigo || opCorrespondente?.codigo || (sr.opId ? `OP-${sr.opId}` : '—'),
          numero_rolo: String(sr.numeroRolo),
          cliente_nome: sr.clienteNome || clienteCorrespondente?.nomeFantasia || existente?.cliente_nome || 'Cliente',
          faccionista_nome: existente?.faccionista_nome || 'Próprio / Interno',
          maquina: sr.maquina || opCorrespondente?.maquina || existente?.maquina || 'MAQUINA 1',
          operadores_nomes: sr.operadorNome || existente?.operadores_nomes || 'Operador',
          finalizado_em: sr.finalizadoEm || sr.updatedAt || sr.createdAt || new Date().toISOString(),
          status: sr.status || existente?.status || 'AGUARDANDO_PESAGEM',
          titulo_fio: opCorrespondente?.tituloFio || existente?.titulo_fio || '150/48',
          cor: (opCorrespondente as any)?.cor || existente?.cor || 'CRU',
          tipo_fio: (opCorrespondente as any)?.tipoFio || existente?.tipo_fio || 'POLIÉSTER',
          total_fios: opCorrespondente?.totalFios || existente?.total_fios || 5000,
          metros: sr.portadasTotal ? sr.portadasTotal * 2 : (existente?.metros || 3000),
          rolete: opCorrespondente?.rolete || existente?.rolete || 'Rolete Padrão',
          voltas: sr.portadasTotal || existente?.voltas || 1500,
          peso_estimado_kg: sr.pesoEstimadoKg || opCorrespondente?.pesoEstimadoKg || existente?.peso_estimado_kg || 25.0,
          peso_bruto_kg: sr.pesoBrutoKg ?? existente?.peso_bruto_kg ?? null,
          tara_kg: sr.taraKg ?? existente?.tara_kg ?? null,
          peso_real_kg: sr.pesoRealKg ?? existente?.peso_real_kg ?? null,
          pesado_em: sr.updatedAt,
          observacoes_cliente: sr.observacoes || existente?.observacoes_cliente || ''
        });
      });

      // Mescla com Supabase
      supabaseItems.forEach((sb: any) => {
        const chave = sb.numero_rolo || sb.id;
        const existente = mapa.get(chave);
        mapa.set(chave, {
          ...(existente || {}),
          id: String(sb.id),
          op_id: sb.op_id,
          numero_rolo: sb.numero_rolo || chave,
          status: (sb.status || existente?.status || 'AGUARDANDO_PESAGEM').toUpperCase().trim(),
          peso_real_kg: sb.peso_real_kg ? Number(sb.peso_real_kg) : existente?.peso_real_kg,
          cliente_nome: sb.cliente_nome || existente?.cliente_nome || 'Cliente',
          maquina: sb.maquina || existente?.maquina || 'MAQUINA 1',
          finalizado_em: sb.finalizado_em || sb.criado_em || existente?.finalizado_em || new Date().toISOString()
        } as RoloFilaItem);
      });

      const listaCompleta = Array.from(mapa.values()).sort(
        (a, b) => new Date(b.finalizado_em).getTime() - new Date(a.finalizado_em).getTime()
      );

      setTodosRolos(listaCompleta);
    } catch (err: any) {
      console.warn('Erro ao carregar fila:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregamento inicial e listeners em tempo real
  useEffect(() => {
    carregarFila();

    const handleAtualizacaoRealtime = () => {
      carregarFila();
    };

    window.addEventListener('storage', handleAtualizacaoRealtime);
    window.addEventListener('texlog_novo_rolo_pesagem', handleAtualizacaoRealtime);
    window.addEventListener('texlog_rolo_pesado', handleAtualizacaoRealtime);
    window.addEventListener('texlog_rolo_recebido_escritorio', handleAtualizacaoRealtime);

    let channel: any = null;
    try {
      channel = supabase
        .channel('realtime_escritorio_pesagem_v3')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rolos' },
          () => {
            carregarFila();
          }
        )
        .subscribe();
    } catch {}

    const interval = setInterval(carregarFila, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleAtualizacaoRealtime);
      window.removeEventListener('texlog_novo_rolo_pesagem', handleAtualizacaoRealtime);
      window.removeEventListener('texlog_rolo_pesado', handleAtualizacaoRealtime);
      window.removeEventListener('texlog_rolo_recebido_escritorio', handleAtualizacaoRealtime);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Listas filtradas por aba
  const rolosAguardando = useMemo(() => {
    return todosRolos.filter(r => {
      const s = (r.status || '').toUpperCase().trim();
      return s === 'AGUARDANDO_PESAGEM';
    });
  }, [todosRolos]);

  const rolosPesados = useMemo(() => {
    return todosRolos.filter(r => {
      const s = (r.status || '').toUpperCase().trim();
      return s === 'PESADO' || s === 'EM_ESTOQUE';
    });
  }, [todosRolos]);

  const romaneiosPendentesFaturamento = useMemo(() => {
    return romaneiosEmitidos.filter(r => r.status === 'PENDENTE_FATURAMENTO' || r.status === 'EXPEDIDO');
  }, [romaneiosEmitidos]);

  // Filtro de busca na lista atual
  const rolosExibidos = useMemo(() => {
    const lista = subAba === 'AGUARDANDO' ? rolosAguardando : rolosPesados;
    if (!busca.trim()) return lista;

    const termo = busca.toLowerCase();
    return lista.filter(item => 
      item.numero_rolo.toLowerCase().includes(termo) ||
      (item.op_codigo || '').toLowerCase().includes(termo) ||
      item.cliente_nome.toLowerCase().includes(termo) ||
      item.maquina.toLowerCase().includes(termo) ||
      (item.operadores_nomes || '').toLowerCase().includes(termo)
    );
  }, [subAba, rolosAguardando, rolosPesados, busca]);

  // Ação 1: Simular Rolo para Teste
  const handleSimularRoloOperador = () => {
    const maquinas = ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'];
    const maqAleatoria = maquinas[Math.floor(Math.random() * maquinas.length)];
    const numSeq = Math.floor(100 + Math.random() * 900);
    const roloSeq = Math.floor(1 + Math.random() * 4);
    const agora = new Date().toISOString();

    const novoRolo: RoloFilaItem = {
      id: `sim-${Date.now()}`,
      op_id: String(numSeq),
      op_codigo: `OP-${numSeq}`,
      numero_rolo: `OP-${numSeq}-R${roloSeq}`,
      cliente_nome: numSeq % 2 === 0 ? 'ALAMO TÊXTIL LTDA' : 'DALILA TÊXTIL S/A',
      faccionista_nome: 'Próprio / Interno',
      maquina: maqAleatoria,
      operadores_nomes: 'Operador Plantão (Simulado)',
      finalizado_em: agora,
      status: 'AGUARDANDO_PESAGEM',
      titulo_fio: '150/48',
      cor: 'BRANCO',
      tipo_fio: 'POLIÉSTER',
      total_fios: 5200,
      metros: 3100,
      rolete: 'Rolete 1800mm',
      voltas: 1550,
      peso_estimado_kg: 25.50,
      observacoes_cliente: 'Rolo de teste gerado pela simulação do operador.'
    };

    try {
      const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(novoRolo);
      localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(list));
      window.dispatchEvent(new Event('texlog_novo_rolo_pesagem'));
    } catch {}

    setTodosRolos(prev => [novoRolo, ...prev]);
    toast.success(`Rolo ${novoRolo.numero_rolo} finalizado pelo Operador da ${novoRolo.maquina}!`, {
      icon: '⚡'
    });
  };

  // Ação 2: Confirmar Recebimento e abrir Pesagem
  const handleConfirmarRecebimentoEAbrirPesagem = async () => {
    if (!roloConferindo) return;
    setIsConfirmandoRecebimento(true);

    const agora = new Date().toISOString();
    const numeroRolo = roloConferindo.numero_rolo;
    const roloAlvo = roloConferindo;

    try {
      // 1. Atualizar no Supabase
      try {
        await supabase
          .from('rolos')
          .update({
            status: 'EM_CONFERENCIA_ESCRITORIO',
            atualizado_em: agora
          })
          .eq('numero_rolo', numeroRolo);
      } catch (errSupabase) {
        console.warn('Erro ao atualizar Supabase:', errSupabase);
      }

      // 2. Atualizar no LocalStorage
      try {
        const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (raw) {
          const list = JSON.parse(raw);
          const atualizado = list.map((item: any) => {
            if (item.numero_rolo === numeroRolo || item.id === roloAlvo.id) {
              return {
                ...item,
                status: 'EM_CONFERENCIA_ESCRITORIO',
                recebido_escritorio_em: agora
              };
            }
            return item;
          });
          localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(atualizado));
        }
      } catch (errLocal) {
        console.warn('Erro ao atualizar localStorage:', errLocal);
      }

      // 3. Atualizar no Zustand Store
      const storeRolo = storeRolos.find(r => 
        String(r.numeroRolo) === numeroRolo || r.id === roloAlvo.id
      );
      if (storeRolo) {
        updateRolo(storeRolo.id, {
          status: 'EM_CONFERENCIA_ESCRITORIO' as any,
          updatedAt: agora
        });
      }

      // Prepara os dados para o modal de pesagem
      setPesoBrutoInput((roloAlvo.peso_estimado_kg ? (roloAlvo.peso_estimado_kg + 3.5).toFixed(2) : '28.50'));
      setTaraInput('3.50');
      setObsPesagem('');
      
      // Fecha conferência e abre Pesagem imediatamente
      setRoloConferindo(null);
      setRoloPesando(roloAlvo);

      toast.success(
        `Recebimento confirmado! Prossiga com a pesagem do rolo ${numeroRolo}.`,
        { icon: '⚖️' }
      );
    } catch (err: any) {
      toast.error('Erro ao confirmar recebimento: ' + (err.message || 'Falha ao processar'));
    } finally {
      setIsConfirmandoRecebimento(false);
    }
  };

  // Cálculo em tempo real do Peso Líquido na Pesagem
  const pesoBrutoNum = parseFloat(pesoBrutoInput.replace(',', '.')) || 0;
  const taraNum = parseFloat(taraInput.replace(',', '.')) || 0;
  const pesoLiquidoCalculado = Math.max(0, pesoBrutoNum - taraNum);

  // Ação 3: Concluir Pesagem do Rolo (Atribuição do Número Oficial Global e Progressivo)
  const handleSalvarPesagem = async () => {
    if (!roloPesando) return;
    if (pesoLiquidoCalculado <= 0) {
      toast.error('O Peso Líquido deve ser maior que zero (Peso Bruto deve ser maior que a Tara).');
      return;
    }

    setIsSalvandoPesagem(true);
    const agora = new Date().toISOString();
    const pesoLiquidoFinal = Number(pesoLiquidoCalculado.toFixed(2));
    const pesoBrutoFinal = Number(pesoBrutoNum.toFixed(2));
    const taraFinal = Number(taraNum.toFixed(2));
    const identificadorOriginal = roloPesando.numero_rolo || roloPesando.id;

    try {
      // 1. Gera ou valida o Número Oficial Único e Progressivo
      const { numeroOficial, roloAtualizado } = await salvarPesagemComNumeroOficial(
        identificadorOriginal,
        {
          pesoRealKg: pesoLiquidoFinal,
          pesoBrutoKg: pesoBrutoFinal,
          taraKg: taraFinal,
          observacoes: obsPesagem
        }
      );

      // 2. Atualizar no Zustand Store
      const storeRolo = storeRolos.find(r => 
        String(r.numeroRolo) === identificadorOriginal || r.id === roloPesando.id
      );
      if (storeRolo) {
        updateRolo(storeRolo.id, {
          numeroRolo: numeroOficial,
          status: 'PESADO' as any,
          pesoRealKg: pesoLiquidoFinal,
          pesoBrutoKg: pesoBrutoFinal,
          taraKg: taraFinal,
          updatedAt: agora
        });
      }

      // 3. Atualizar estado local
      setTodosRolos(prev => prev.map(r => {
        if (r.numero_rolo === identificadorOriginal || r.id === roloPesando.id) {
          return {
            ...r,
            numero_rolo: numeroOficial,
            status: 'PESADO',
            peso_real_kg: pesoLiquidoFinal,
            peso_bruto_kg: pesoBrutoFinal,
            tara_kg: taraFinal,
            pesado_em: agora
          };
        }
        return r;
      }));

      // Dispara eventos em tempo real para sincronizar todo o ERP
      window.dispatchEvent(new Event('texlog_rolo_pesado'));
      window.dispatchEvent(new Event('texlog_novo_rolo_pesagem'));

      toast.success(
        `Rolo oficializado! Nº Oficial: ${numeroOficial} • Peso Líquido: ${pesoLiquidoFinal.toFixed(2)} kg. Pronto para Romaneio.`,
        { icon: '🏷️', duration: 5000 }
      );

      const roloPesadoObj = {
        ...roloPesando,
        numero_rolo: numeroOficial,
        status: 'PESADO',
        peso_real_kg: pesoLiquidoFinal,
        peso_bruto_kg: pesoBrutoFinal,
        tara_kg: taraFinal,
        pesado_em: agora
      };

      setRoloPesando(null);

      // Oferece gerar romaneio imediatamente
      setClienteRomaneioId(roloPesadoObj.cliente_nome);
      setRolosSelecionadosIds([roloPesadoObj.id || roloPesadoObj.numero_rolo]);
    } catch (err: any) {
      toast.error('Erro ao salvar pesagem: ' + (err.message || 'Falha ao processar'));
    } finally {
      setIsSalvandoPesagem(false);
    }
  };

  // Abrir Modal de Romaneio
  const handleAbrirCriacaoRomaneio = (clienteNomeInicial?: string) => {
    const clientesDisponiveis = Array.from(new Set(rolosPesados.map(r => r.cliente_nome)));
    const cli = clienteNomeInicial || clientesDisponiveis[0] || '';
    setClienteRomaneioId(cli);
    
    // Pré-seleciona todos os rolos pesados desse cliente
    const rolosCli = rolosPesados.filter(r => r.cliente_nome === cli);
    setRolosSelecionadosIds(rolosCli.map(r => r.id || r.numero_rolo));
    setTransportadoraInput('');
    setMotoristaInput('');
    setPlacaInput('');
    setObsRomaneioInput('');
    setIsRomaneioModalOpen(true);
  };

  // Rolos disponíveis para Romaneio filtrados pelo cliente selecionado
  const rolosDisponiveisParaRomaneio = useMemo(() => {
    if (!clienteRomaneioId) return [];
    return rolosPesados.filter(r => r.cliente_nome === clienteRomaneioId);
  }, [rolosPesados, clienteRomaneioId]);

  // Rolos selecionados no Romaneio
  const rolosMarcadosParaRomaneio = useMemo(() => {
    return rolosDisponiveisParaRomaneio.filter(r => 
      rolosSelecionadosIds.includes(r.id || r.numero_rolo)
    );
  }, [rolosDisponiveisParaRomaneio, rolosSelecionadosIds]);

  const totalMetrosRomaneio = rolosMarcadosParaRomaneio.reduce((acc, r) => acc + (Number(r.metros) || 0), 0);
  const totalPesoLiquidoRomaneio = rolosMarcadosParaRomaneio.reduce((acc, r) => acc + (Number(r.peso_real_kg) || 0), 0);

  // Ação 4: Confirmar e Emitir Romaneio
  const handleEmitirEExpedirRomaneio = (confirmarExpedicaoImediata: boolean) => {
    if (rolosMarcadosParaRomaneio.length === 0) {
      toast.error('Selecione pelo menos um rolo para gerar o romaneio.');
      return;
    }

    const agora = new Date().toISOString();
    const codigoSeq = (romaneiosEmitidos.length + 1).toString().padStart(4, '0');
    const anoAtual = new Date().getFullYear();
    const codigoRomaneio = `ROM-${anoAtual}-${codigoSeq}`;

    const novoRomaneio: RomaneioItem = {
      id: `rom-${Date.now()}`,
      codigoRomaneio,
      clienteNome: clienteRomaneioId,
      dataEmissao: agora,
      rolos: rolosMarcadosParaRomaneio.map(r => ({
        id: r.id,
        numero_rolo: r.numero_rolo,
        op_codigo: r.op_codigo,
        cliente_nome: r.cliente_nome,
        faccionista_nome: r.faccionista_nome,
        maquina: r.maquina,
        operadores_nomes: r.operadores_nomes,
        data_producao: r.finalizado_em,
        fio: r.tipo_fio || r.titulo_fio,
        tipo_fio: r.tipo_fio || 'Poliéster',
        titulo_fio: r.titulo_fio || '150/48',
        cor: r.cor || 'Branco',
        total_fios: r.total_fios || 3520,
        metros: Number(r.metros) || 0,
        rolete: r.rolete || 'Rolete Metálico 1800mm',
        voltas: Number(r.voltas) || 0,
        pesoBrutoKg: Number(r.peso_bruto_kg) || ((Number(r.peso_real_kg) || 0) + (Number(r.tara_kg) || 3.5)),
        taraKg: Number(r.tara_kg) || 3.5,
        pesoLiquidoKg: Number(r.peso_real_kg) || 0,
        observacoes_cliente: r.observacoes_cliente
      })),
      totalRolos: rolosMarcadosParaRomaneio.length,
      totalMetros: totalMetrosRomaneio,
      totalPesoKg: Number(totalPesoLiquidoRomaneio.toFixed(2)),
      transportadora: transportadoraInput,
      motorista: motoristaInput,
      placa: placaInput,
      observacoes: obsRomaneioInput,
      status: confirmarExpedicaoImediata ? 'EXPEDIDO' : 'EMITIDO',
      expedidoEm: confirmarExpedicaoImediata ? agora : undefined
    };

    // 1. Atualiza status dos rolos para ROMANEADO ou EXPEDIDO
    const novoStatusRolo: RoloStatus = confirmarExpedicaoImediata ? 'EXPEDIDO' : 'ROMANEADO';
    
    // Atualizar no storage e state
    const idsAfetados = rolosMarcadosParaRomaneio.map(r => r.numero_rolo);
    try {
      const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
      if (raw) {
        const list = JSON.parse(raw);
        const atualizado = list.map((item: any) => {
          if (idsAfetados.includes(item.numero_rolo)) {
            return {
              ...item,
              status: novoStatusRolo,
              romaneio_id: codigoRomaneio,
              expedido_em: agora
            };
          }
          return item;
        });
        localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(atualizado));
      }
    } catch {}

    // Atualizar no Zustand store
    rolosMarcadosParaRomaneio.forEach(r => {
      const storeRolo = storeRolos.find(sr => String(sr.numeroRolo) === r.numero_rolo || sr.id === r.id);
      if (storeRolo) {
        updateRolo(storeRolo.id, {
          status: novoStatusRolo as any,
          updatedAt: agora
        });
      }
    });

    // Salvar o Romaneio
    const novaListaRomaneios = [novoRomaneio, ...romaneiosEmitidos];
    salvarRomaneiosStorage(novaListaRomaneios);

    // Atualiza estado de todos os rolos
    setTodosRolos(prev => prev.map(r => {
      if (idsAfetados.includes(r.numero_rolo)) {
        return {
          ...r,
          status: novoStatusRolo
        };
      }
      return r;
    }));

    window.dispatchEvent(new Event('texlog_rolo_pesado'));
    window.dispatchEvent(new Event('texlog_novo_rolo_pesagem'));
    window.dispatchEvent(new Event('texlog_faturamento_updated'));

    setIsRomaneioModalOpen(false);

    if (confirmarExpedicaoImediata) {
      toast.success(
        `Romaneio ${codigoRomaneio} expedido com sucesso!`,
        { icon: '🚚', duration: 4000 }
      );
      // Avança para a pergunta: Deseja faturar agora? (Prioridade 4 e 5)
      setRomaneioDecidindoFaturamento(novoRomaneio);
    } else {
      toast.success(
        `Romaneio ${codigoRomaneio} gerado com sucesso!`,
        { icon: '📄', duration: 4000 }
      );
      setRomaneioGeradoVisualizar(novoRomaneio);
    }
  };

  // Disparar Expedição em Romaneio já emitido
  const handleDispararExpedicaoRomaneio = (romAlvo: RomaneioItem) => {
    const agora = new Date().toISOString();
    const romAtualizado: RomaneioItem = {
      ...romAlvo,
      status: 'EXPEDIDO',
      expedidoEm: agora
    };

    const lista = romaneiosEmitidos.map(r => r.id === romAlvo.id ? romAtualizado : r);
    salvarRomaneiosStorage(lista);

    const idsAfetados = romAlvo.rolos.map(r => r.numero_rolo);
    setTodosRolos(prev => prev.map(r => {
      if (idsAfetados.includes(r.numero_rolo)) {
        return { ...r, status: 'EXPEDIDO' };
      }
      return r;
    }));

    try {
      const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
      if (raw) {
        const list = JSON.parse(raw);
        const atualizado = list.map((item: any) => {
          if (idsAfetados.includes(item.numero_rolo)) {
            return {
              ...item,
              status: 'EXPEDIDO',
              expedido_em: agora
            };
          }
          return item;
        });
        localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(atualizado));
      }
    } catch {}

    if (romaneioGeradoVisualizar?.id === romAlvo.id) {
      setRomaneioGeradoVisualizar(null);
    }

    toast.success(`Romaneio ${romAlvo.codigoRomaneio} expedido com sucesso!`, { icon: '🚚' });
    setRomaneioDecidindoFaturamento(romAtualizado);
  };

  // Ação ao responder NÃO na decisão de faturamento (vai para Pendente de Faturamento)
  const handleConfirmarNaoFaturarAgora = (rom: RomaneioItem) => {
    const romAtualizado: RomaneioItem = {
      ...rom,
      status: 'PENDENTE_FATURAMENTO'
    };
    const lista = romaneiosEmitidos.map(r => r.id === rom.id ? romAtualizado : r);
    salvarRomaneiosStorage(lista);

    const ids = rom.rolos.map(r => r.numero_rolo);
    try {
      const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
      if (raw) {
        const list = JSON.parse(raw);
        const atualizado = list.map((item: any) => {
          if (ids.includes(item.numero_rolo)) {
            return { ...item, status: 'PENDENTE_FATURAMENTO' };
          }
          return item;
        });
        localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(atualizado));
      }
    } catch {}

    setTodosRolos(prev => prev.map(r => ids.includes(r.numero_rolo) ? { ...r, status: 'PENDENTE_FATURAMENTO' } : r));
    setRomaneioDecidindoFaturamento(null);
    window.dispatchEvent(new Event('texlog_faturamento_updated'));
    toast.success(`Romaneio ${rom.codigoRomaneio} enviado para Pendente de Faturamento.`, { icon: '⏳' });
  };

  // Ação ao responder SIM na decisão de faturamento (abre tela financeira)
  const handleConfirmarSimFaturarAgora = (rom: RomaneioItem) => {
    setRomaneioDecidindoFaturamento(null);
    setRomaneioFaturando(rom);
  };

  // Concluir Faturamento
  const handleFaturamentoConcluidoSucesso = (rom: RomaneioItem, valor: number) => {
    const agora = new Date().toISOString();
    const romAtualizado: RomaneioItem = {
      ...rom,
      status: 'FATURADO',
      valorTotalFaturado: valor,
      faturadoEm: agora
    };
    const lista = romaneiosEmitidos.map(r => r.id === rom.id ? romAtualizado : r);
    salvarRomaneiosStorage(lista);
    setRomaneioFaturando(null);

    const ids = rom.rolos.map(r => r.numero_rolo);
    setTodosRolos(prev => prev.map(r => ids.includes(r.numero_rolo) ? { ...r, status: 'FATURADO' } : r));

    if (romaneioGeradoVisualizar?.id === rom.id) {
      setRomaneioGeradoVisualizar(romAtualizado);
    }
  };

  // Formatar data e hora
  const formatarDataHora = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo & Sub-Abas do Fluxo */}
      <div className="bg-[#121620] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  Controle de Pesagem & Romaneio
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {rolosAguardando.length} aguardando
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Fluxo integrado: Rolo Finalizado → Aguardando Pesagem → Pesagem → Romaneio → Expedição
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botão de Geração de Romaneio */}
            <button
              type="button"
              onClick={() => handleAbrirCriacaoRomaneio()}
              disabled={rolosPesados.length === 0}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-40 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Novo Romaneio</span>
              {rolosPesados.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-purple-900 font-black">
                  {rolosPesados.length}
                </span>
              )}
            </button>

            {/* Botão de Simulação do Operador */}
            <button
              type="button"
              onClick={handleSimularRoloOperador}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Gera um rolo simulado como se tivesse sido concluído na produção"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Simular Rolo</span>
            </button>

            {/* Botão Atualizar */}
            <button
              type="button"
              onClick={carregarFila}
              disabled={isLoading}
              title="Atualizar lista"
              className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-abas de Navegação Interna */}
        <div className="flex border-b border-white/10 gap-2 overflow-x-auto">
          <button
            onClick={() => setSubAba('AGUARDANDO')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              subAba === 'AGUARDANDO'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Aguardando Pesagem</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subAba === 'AGUARDANDO' ? 'bg-amber-500 text-black font-black' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {rolosAguardando.length}
            </span>
          </button>

          <button
            onClick={() => setSubAba('PESADOS')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              subAba === 'PESADOS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Rolos Pesados (Prontos)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subAba === 'PESADOS' ? 'bg-emerald-500 text-black font-black' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {rolosPesados.length}
            </span>
          </button>

          <button
            onClick={() => setSubAba('ROMANEIOS')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              subAba === 'ROMANEIOS'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Romaneios Emitidos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subAba === 'ROMANEIOS' ? 'bg-purple-500 text-black font-black' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {romaneiosEmitidos.length}
            </span>
          </button>

          <button
            onClick={() => setSubAba('PENDENTES')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              subAba === 'PENDENTES'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pendente de Faturamento</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subAba === 'PENDENTES' ? 'bg-amber-500 text-black font-black' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {romaneiosPendentesFaturamento.length}
            </span>
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar por Número do Rolo, OP, Cliente ou Máquina..."
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
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

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            {subAba === 'AGUARDANDO' && (
              <span>Exibindo rolos aguardando pesagem pelo Escritório. Clique em <b>PESAR</b>.</span>
            )}
            {subAba === 'PESADOS' && (
              <span>Rolos com pesagem concluída disponíveis para emissão de Romaneio & Ficha Técnica.</span>
            )}
            {subAba === 'ROMANEIOS' && (
              <span>Histórico de romaneios com status de expedição e ficha técnica para impressão.</span>
            )}
            {subAba === 'PENDENTES' && (
              <span>Romaneios expedidos aguardando liberação e faturamento no financeiro.</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: FILA DE ROLOS AGUARDANDO PESAGEM (TELA INICIAL DO ESCRITÓRIO)      */}
      {/* Exibe EXATAMENTE: Número provisório, Cliente, Máquina, Data/Hora, Operador */}
      {/* Nenhuma informação de pesagem nos cards desta fila                         */}
      {/* ========================================================================= */}
      {subAba === 'AGUARDANDO' && (
        <>
          {rolosExibidos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in duration-200">
              {rolosExibidos.map((item) => (
                <div
                  key={item.id || item.numero_rolo}
                  className="bg-[#121620] border-2 border-white/10 hover:border-amber-500/50 rounded-3xl p-6 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-5 group"
                >
                  {/* Topo do Card: Número do Rolo e Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Identificação
                        </span>
                        <h3 className="text-xl font-black font-mono text-emerald-400 group-hover:text-emerald-300 transition-colors tracking-wide">
                          ROLO Nº {item.numero_rolo}
                        </h3>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-black uppercase">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>AGUARDANDO PESAGEM</span>
                      </span>
                    </div>

                    {/* Lista de Campos do Card (Conforme Prioridade 1) */}
                    <div className="mt-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                        <span className="text-neutral-400 font-semibold">Cliente:</span>
                        <span className="font-black text-white text-right truncate max-w-[200px]">{item.cliente_nome}</span>
                      </div>

                      <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                        <span className="text-neutral-400 font-semibold">Faccionista:</span>
                        <span className="font-bold text-neutral-200 text-right truncate max-w-[200px]">{item.faccionista_nome || '—'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-white/5">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Título:</span>
                          <span className="font-mono font-bold text-white">{item.titulo_fio || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Cor:</span>
                          <span className="font-bold text-neutral-200">{item.cor || '—'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-white/5">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Total de fios:</span>
                          <span className="font-mono font-bold text-white">
                            {typeof item.total_fios === 'number' ? item.total_fios.toLocaleString('pt-BR') : item.total_fios || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Metros:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {typeof item.metros === 'number' ? item.metros.toLocaleString('pt-BR') : item.metros || '—'} m
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-baseline py-1 border-b border-white/5">
                        <span className="text-neutral-400 font-semibold">Peso estimado:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {item.peso_estimado_kg ? `${item.peso_estimado_kg.toFixed(0)} kg` : '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-1 border-b border-white/5">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Máquina:</span>
                          <span className="font-mono font-bold text-blue-400">{item.maquina}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Operador:</span>
                          <span className="font-bold text-neutral-200 truncate">{item.operadores_nomes}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-neutral-400">Data/Hora:</span>
                        <span className="font-mono text-neutral-300 text-[11px]">{formatarDataHora(item.finalizado_em)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Ação Direto: [ PESAR ] */}
                  <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPesoBrutoInput((item.peso_estimado_kg ? (item.peso_estimado_kg + 3.5).toFixed(2) : '28.50'));
                        setTaraInput('3.50');
                        setObsPesagem('');
                        setRoloPesando(item);
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 group-hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      <Scale className="w-5 h-5 text-black" />
                      <span>PESAR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#121620] border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-neutral-400 mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {busca ? 'Nenhum rolo encontrado para esta busca' : 'Nenhum rolo aguardando pesagem no momento'}
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Assim que um operador finalizar a produção de um rolo na fábrica, ele aparecerá imediatamente aqui em tempo real.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ROLOS PESADOS (PRONTOS PARA ROMANEIO E EXPEDIÇÃO)                  */}
      {/* ========================================================================= */}
      {subAba === 'PESADOS' && (
        <>
          {rolosExibidos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in duration-200">
              {rolosExibidos.map((item) => (
                <div
                  key={item.id || item.numero_rolo}
                  className="bg-[#121620] border-2 border-emerald-500/20 hover:border-emerald-500/50 rounded-3xl p-6 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-5 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Rolo Pesado & Conferido
                        </span>
                        <h3 className="text-xl font-black font-mono text-white group-hover:text-emerald-300 transition-colors">
                          {item.numero_rolo}
                        </h3>
                        <span className="text-xs font-mono text-purple-400 font-semibold mt-0.5 block">
                          {item.op_codigo}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>PESADO</span>
                      </span>
                    </div>

                    {/* Destaque do Peso Líquido Real */}
                    <div className="mt-4 p-4 rounded-2xl bg-black/50 border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                          Peso Líquido Real
                        </span>
                        <div className="text-2xl font-black font-mono text-emerald-400">
                          {item.peso_real_kg ? `${item.peso_real_kg.toFixed(2)} kg` : '—'}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-neutral-400 font-mono space-y-0.5">
                        <div>Bruto: {item.peso_bruto_kg ? `${item.peso_bruto_kg.toFixed(2)}kg` : '—'}</div>
                        <div>Tara: {item.tara_kg ? `${item.tara_kg.toFixed(2)}kg` : '—'}</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Cliente
                        </span>
                        <span className="text-sm font-black text-white block truncate">
                          {item.cliente_nome}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[9px] uppercase text-neutral-400 block">Máquina</span>
                          <span className="font-mono font-bold text-neutral-200">{item.maquina}</span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[9px] uppercase text-neutral-400 block">Metros</span>
                          <span className="font-mono font-bold text-neutral-200">{item.metros ? `${item.metros}m` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAbrirCriacaoRomaneio(item.cliente_nome)}
                      className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Gerar Romaneio</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#121620] border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-neutral-400 mx-auto">
                <Box className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Nenhum rolo pesado pendente de romaneio
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Assim que os rolos forem conferidos e pesados na aba "Aguardando Pesagem", eles ficarão disponíveis aqui para gerar o Romaneio.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO DE ROMANEIOS EMITIDOS                                     */}
      {/* ========================================================================= */}
      {subAba === 'ROMANEIOS' && (
        <div className="space-y-4">
          {romaneiosEmitidos.length > 0 ? (
            <div className="bg-[#121620] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-black/60 text-[10px] uppercase text-neutral-400 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 font-bold">Romaneio</th>
                      <th className="px-6 py-4 font-bold">Data Emissão</th>
                      <th className="px-6 py-4 font-bold">Cliente</th>
                      <th className="px-6 py-4 font-bold text-center">Rolos</th>
                      <th className="px-6 py-4 font-bold text-right">Peso Líquido Total</th>
                      <th className="px-6 py-4 font-bold text-center">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {romaneiosEmitidos.map((rom) => (
                      <tr key={rom.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-black text-purple-400 text-sm">
                          {rom.codigoRomaneio}
                        </td>
                        <td className="px-6 py-4 text-neutral-400">
                          {formatarDataHora(rom.dataEmissao)}
                        </td>
                        <td className="px-6 py-4 font-sans font-bold text-white">
                          {rom.clienteNome}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-200 font-bold">
                            {rom.totalRolos} un
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-400 text-sm">
                          {rom.totalPesoKg.toFixed(2)} kg
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            rom.status === 'FATURADO'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                              : rom.status === 'PENDENTE_FATURAMENTO'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                              : rom.status === 'EXPEDIDO'
                              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                              : 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                          }`}>
                            {rom.status === 'FATURADO' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : rom.status === 'PENDENTE_FATURAMENTO' ? (
                              <Clock className="w-3 h-3 text-amber-400" />
                            ) : rom.status === 'EXPEDIDO' ? (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            ) : (
                              <FileText className="w-3 h-3 text-purple-400" />
                            )}
                            <span>{rom.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Se Emitido, pode Expedir */}
                            {rom.status === 'EMITIDO' && (
                              <button
                                type="button"
                                onClick={() => handleDispararExpedicaoRomaneio(rom)}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-sans font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title="Confirmar Expedição física"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Expedir</span>
                              </button>
                            )}

                            {/* Se Expedido ou Pendente, pode Faturar */}
                            {(rom.status === 'PENDENTE_FATURAMENTO' || rom.status === 'EXPEDIDO') && (
                              <button
                                type="button"
                                onClick={() => setRomaneioFaturando(rom)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-black text-xs inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title="Abrir tela financeira para faturar"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Faturar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setRomaneioGeradoVisualizar(rom)}
                              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-sans font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                              title="Visualizar Ficha Técnica Oficial e Imprimir"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-400" />
                              <span>Ficha Técnica</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#121620] border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-neutral-400 mx-auto">
                <Truck className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Nenhum romaneio emitido até o momento
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Os romaneios gerados na pesagem aparecerão arquivados aqui para impressão oficial e controle de saída.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: PENDENTES DE FATURAMENTO (PRIORIDADE 4 E 5)                        */}
      {/* ========================================================================= */}
      {subAba === 'PENDENTES' && (
        <div className="space-y-4">
          {romaneiosPendentesFaturamento.length > 0 ? (
            <div className="bg-[#121620] border border-amber-500/20 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Romaneios Liberados pela Expedição Aguardando Faturamento</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {romaneiosPendentesFaturamento.length} pendentes
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-black/60 text-[10px] uppercase text-neutral-400 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 font-bold">Romaneio</th>
                      <th className="px-6 py-4 font-bold">Cliente</th>
                      <th className="px-6 py-4 font-bold text-center">Rolos</th>
                      <th className="px-6 py-4 font-bold text-right">Metros</th>
                      <th className="px-6 py-4 font-bold text-right">Peso Líquido</th>
                      <th className="px-6 py-4 font-bold text-center">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {romaneiosPendentesFaturamento.map((rom) => (
                      <tr key={rom.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-black text-purple-400 text-sm">
                          {rom.codigoRomaneio}
                        </td>
                        <td className="px-6 py-4 font-sans font-bold text-white">
                          {rom.clienteNome}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-200 font-bold">
                            {rom.totalRolos} un
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-blue-400">
                          {rom.totalMetros.toLocaleString('pt-BR')} m
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-400 text-sm">
                          {rom.totalPesoKg.toFixed(2)} kg
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            <Clock className="w-3 h-3" />
                            <span>Pendente Faturamento</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRomaneioFaturando(rom)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-black text-xs inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Faturar Agora</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRomaneioGeradoVisualizar(rom)}
                              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-sans font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer border border-white/10"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Ficha</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#121620] border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-neutral-400 mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Nenhum romaneio pendente de faturamento
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Todos os romaneios expedidos já foram faturados no financeiro.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECEBIMENTO DO ROLO — CONFERÊNCIA EM MODO SOMENTE LEITURA        */}
      {/* ========================================================================= */}
      {roloConferindo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#121620] border-2 border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Cabeçalho */}
            <div className="bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-transparent border-b border-white/10 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">
                      Conferência do Rolo
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Modo Somente Leitura
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    {roloConferindo.numero_rolo} • {roloConferindo.op_codigo}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRoloConferindo(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Leitura */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-145px)] text-xs">
              {/* Bloco 1: IDENTIFICAÇÃO */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Identificação</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Cliente
                    </span>
                    <span className="text-sm font-black text-white block">
                      {roloConferindo.cliente_nome}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Faccionista
                    </span>
                    <span className="text-sm font-black text-neutral-200 block">
                      {roloConferindo.faccionista_nome || 'Próprio / Interno'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Ordem de Produção
                    </span>
                    <span className="text-sm font-black font-mono text-purple-400 block">
                      {roloConferindo.op_codigo}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Máquina
                    </span>
                    <span className="text-sm font-black font-mono text-blue-400 block">
                      {roloConferindo.maquina}
                    </span>
                  </div>

                  <div className="sm:col-span-2 border-t border-white/5 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Operador(es) Responsável(eis)
                    </span>
                    <span className="text-sm font-bold text-neutral-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      <span>{roloConferindo.operadores_nomes}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 2: DADOS TÉCNICOS */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Dados Técnicos da Produção</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Título
                    </span>
                    <span className="text-sm font-black font-mono text-white">
                      {roloConferindo.titulo_fio || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Cor
                    </span>
                    <span className="text-sm font-black text-white">
                      {roloConferindo.cor || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Tipo do Fio
                    </span>
                    <span className="text-sm font-black text-neutral-200">
                      {roloConferindo.tipo_fio || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Total de Fios
                    </span>
                    <span className="text-sm font-black font-mono text-white">
                      {roloConferindo.total_fios || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Metros
                    </span>
                    <span className="text-sm font-black font-mono text-emerald-400">
                      {roloConferindo.metros != null ? `${roloConferindo.metros} m` : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Rolete
                    </span>
                    <span className="text-sm font-bold text-neutral-300 truncate block">
                      {roloConferindo.rolete || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Voltas
                    </span>
                    <span className="text-sm font-black font-mono text-amber-300">
                      {roloConferindo.voltas != null ? `${roloConferindo.voltas} voltas` : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Peso Estimado
                    </span>
                    <span className="text-xs font-mono font-bold text-neutral-200">
                      {roloConferindo.peso_estimado_kg ? `${roloConferindo.peso_estimado_kg.toFixed(2)} kg` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 3: OBSERVAÇÕES PARA O CLIENTE */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-2 border-b border-white/10 pb-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Observações Destinadas ao Cliente</span>
                </h4>

                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-xs text-neutral-200 leading-relaxed italic">
                    {roloConferindo.observacoes_cliente || 'Nenhuma observação comercial apontada.'}
                  </p>
                  <p className="text-[10px] text-neutral-500 pt-1 border-t border-white/5">
                    Nota: Ocorrências de chão de fábrica, checklists e dados de produtividade permanecem restritos ao ambiente fabril interno.
                  </p>
                </div>
              </div>
            </div>

            {/* Rodapé: Voltar ou Confirmar Recebimento */}
            <div className="border-t border-white/10 p-5 bg-black/40 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRoloConferindo(null)}
                className="px-6 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isConfirmandoRecebimento}
                onClick={handleConfirmarRecebimentoEAbrirPesagem}
                className="px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isConfirmandoRecebimento ? 'Confirmando...' : 'Confirmar Recebimento & Pesar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PESAGEM DO ROLO (INTEGRAÇÃO COM A BALANÇA / PESO REAL)           */}
      {/* ========================================================================= */}
      {roloPesando && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#121620] border-2 border-emerald-500/40 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Pesagem */}
            <div className="bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-transparent border-b border-white/10 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    Pesagem de Rolo
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    {roloPesando.numero_rolo} • {roloPesando.cliente_nome}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRoloPesando(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário de Pesagem */}
            <div className="p-6 space-y-6">
              {/* Visor Digital da Balança */}
              <div className="bg-black/70 border-2 border-emerald-500/30 rounded-3xl p-6 text-center space-y-2 relative overflow-hidden shadow-inner">
                <div className="absolute top-3 left-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                  Balança Digital • Peso Líquido
                </div>
                <div className="text-5xl sm:text-6xl font-black font-mono text-emerald-400 tracking-tight">
                  {pesoLiquidoCalculado.toFixed(2)}
                  <span className="text-2xl text-emerald-500/60 ml-2">kg</span>
                </div>
                <div className="text-xs font-mono text-neutral-400 flex items-center justify-center gap-3 pt-1">
                  <span>Bruto: {pesoBrutoNum.toFixed(2)} kg</span>
                  <span>•</span>
                  <span>Tara: {taraNum.toFixed(2)} kg</span>
                </div>
              </div>

              {/* Campos de Entrada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-300 mb-1.5">
                    Peso Bruto (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={pesoBrutoInput}
                    onChange={(e) => setPesoBrutoInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full py-3 px-4 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">Peso total na balança com rolete</span>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-300 mb-1.5">
                    Tara do Rolete (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={taraInput}
                    onChange={(e) => setTaraInput(e.target.value)}
                    placeholder="3.50"
                    className="w-full py-3 px-4 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">Peso do rolete vazio (editável)</span>
                </div>
              </div>

              {/* Comparativo com Peso Estimado da OP */}
              {roloPesando.peso_estimado_kg && roloPesando.peso_estimado_kg > 0 && (
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 block font-bold">
                      Peso Estimado da OP
                    </span>
                    <span className="text-base font-black font-mono text-white">
                      {roloPesando.peso_estimado_kg.toFixed(2)} kg
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase text-neutral-400 block font-bold">
                      Variação
                    </span>
                    {(() => {
                      const diff = pesoLiquidoCalculado - roloPesando.peso_estimado_kg;
                      const percent = ((diff / roloPesando.peso_estimado_kg) * 100);
                      const isOk = Math.abs(percent) <= 5.0;
                      return (
                        <span className={`text-xs font-mono font-bold ${isOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} kg ({percent >= 0 ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`})
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Observação da Pesagem */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-300 mb-1.5">
                  Observações da Pesagem (Opcional)
                </label>
                <input
                  type="text"
                  value={obsPesagem}
                  onChange={(e) => setObsPesagem(e.target.value)}
                  placeholder="Ex: Rolete especial, pesagem conferida"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Rodapé Pesagem */}
            <div className="border-t border-white/10 p-5 bg-black/40 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRoloPesando(null)}
                className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSalvandoPesagem || pesoLiquidoCalculado <= 0}
                onClick={handleSalvarPesagem}
                className="px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSalvandoPesagem ? 'Salvando...' : 'Concluir Pesagem'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GERADOR DE ROMANEIO COM DADOS INSTITUCIONAIS DA EMPRESA          */}
      {/* Nenhum documento possui nome fixo: utiliza useEmpresa()                    */}
      {/* ========================================================================= */}
      {isRomaneioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#121620] border-2 border-purple-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header Romaneio */}
            <div className="bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-transparent border-b border-white/10 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    Emissão de Romaneio de Produção
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Selecione os rolos pesados do cliente para emitir o romaneio e realizar a expedição
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRomaneioModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Romaneio */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-145px)] text-xs">
              {/* Seleção do Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-300 mb-1.5">
                    Cliente do Romaneio *
                  </label>
                  <select
                    value={clienteRomaneioId}
                    onChange={(e) => {
                      const novoCli = e.target.value;
                      setClienteRomaneioId(novoCli);
                      const rolosCli = rolosPesados.filter(r => r.cliente_nome === novoCli);
                      setRolosSelecionadosIds(rolosCli.map(r => r.id || r.numero_rolo));
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-purple-500"
                  >
                    {Array.from(new Set(rolosPesados.map(r => r.cliente_nome))).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-300 mb-1.5">
                    Empresa Emissora (Institucional)
                  </label>
                  <div className="py-2.5 px-3 rounded-xl bg-neutral-900/60 border border-white/10 text-emerald-400 font-bold text-xs truncate">
                    {empresa.nomeFantasia || empresa.razaoSocial} • CNPJ: {empresa.cnpj}
                  </div>
                </div>
              </div>

              {/* Tabela de Seleção dos Rolos Pesados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-200">
                    Rolos Pesados Disponíveis ({rolosDisponiveisParaRomaneio.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRolosSelecionadosIds(rolosDisponiveisParaRomaneio.map(r => r.id || r.numero_rolo))}
                      className="text-[10px] text-purple-400 hover:underline font-bold"
                    >
                      Selecionar Todos
                    </button>
                    <span className="text-neutral-600">•</span>
                    <button
                      type="button"
                      onClick={() => setRolosSelecionadosIds([])}
                      className="text-[10px] text-neutral-400 hover:underline font-bold"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/70 text-[10px] uppercase text-neutral-400 border-b border-white/10">
                      <tr>
                        <th className="p-3 w-10 text-center">Sel.</th>
                        <th className="p-3">Rolo</th>
                        <th className="p-3">OP</th>
                        <th className="p-3">Máquina</th>
                        <th className="p-3">Especificação</th>
                        <th className="p-3 text-right">Metros</th>
                        <th className="p-3 text-right">Peso Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {rolosDisponiveisParaRomaneio.map((r) => {
                        const isMarcado = rolosSelecionadosIds.includes(r.id || r.numero_rolo);
                        return (
                          <tr 
                            key={r.id || r.numero_rolo} 
                            onClick={() => {
                              const chave = r.id || r.numero_rolo;
                              setRolosSelecionadosIds(prev => 
                                prev.includes(chave) ? prev.filter(x => x !== chave) : [...prev, chave]
                              );
                            }}
                            className={`cursor-pointer transition-colors ${isMarcado ? 'bg-purple-600/10' : 'hover:bg-white/5'}`}
                          >
                            <td className="p-3 text-center">
                              {isMarcado ? (
                                <CheckSquare className="w-4 h-4 text-purple-400 mx-auto" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-500 mx-auto" />
                              )}
                            </td>
                            <td className="p-3 font-bold text-white">{r.numero_rolo}</td>
                            <td className="p-3 text-neutral-300">{r.op_codigo}</td>
                            <td className="p-3 text-neutral-400">{r.maquina}</td>
                            <td className="p-3 font-sans text-neutral-300">{r.tipo_fio || r.titulo_fio} ({r.cor})</td>
                            <td className="p-3 text-right text-emerald-400">{r.metros ? `${r.metros}m` : '—'}</td>
                            <td className="p-3 text-right font-black text-emerald-400">
                              {r.peso_real_kg ? `${r.peso_real_kg.toFixed(2)} kg` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {rolosDisponiveisParaRomaneio.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-neutral-500 font-sans">
                            Nenhum rolo pesado disponível para este cliente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totais do Romaneio */}
              <div className="grid grid-cols-3 gap-3 bg-black/60 p-4 rounded-2xl border border-purple-500/20 text-center font-mono">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase block font-sans">Rolos Selecionados</span>
                  <span className="text-xl font-black text-white">{rolosMarcadosParaRomaneio.length} un</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase block font-sans">Total Metros</span>
                  <span className="text-xl font-black text-blue-400">{totalMetrosRomaneio} m</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase block font-sans">Peso Líquido Total</span>
                  <span className="text-xl font-black text-emerald-400">{totalPesoLiquidoRomaneio.toFixed(2)} kg</span>
                </div>
              </div>

              {/* Dados de Transporte */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Transportadora
                  </label>
                  <input
                    type="text"
                    value={transportadoraInput}
                    onChange={(e) => setTransportadoraInput(e.target.value)}
                    placeholder="Ex: Próprio / Rodonaves"
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Nome do Motorista
                  </label>
                  <input
                    type="text"
                    value={motoristaInput}
                    onChange={(e) => setMotoristaInput(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    value={placaInput}
                    onChange={(e) => setPlacaInput(e.target.value)}
                    placeholder="Ex: ABC-1234"
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Rodapé Romaneio */}
            <div className="border-t border-white/10 p-5 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsRomaneioModalOpen(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={rolosMarcadosParaRomaneio.length === 0}
                  onClick={() => handleEmitirEExpedirRomaneio(false)}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Emitir Apenas
                </button>
                <button
                  type="button"
                  disabled={rolosMarcadosParaRomaneio.length === 0}
                  onClick={() => handleEmitirEExpedirRomaneio(true)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-40 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Emitir & Confirmar Expedição</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FICHA TÉCNICA DO ROLO & ROMANEIO COM PDF E IMPRESSÃO REAL       */}
      {/* ========================================================================= */}
      {romaneioGeradoVisualizar && (
        <FichaTecnicaRomaneioModal
          romaneio={romaneioGeradoVisualizar}
          onClose={() => setRomaneioGeradoVisualizar(null)}
          onExpedir={handleDispararExpedicaoRomaneio}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DECISÃO DE FATURAMENTO APÓS EXPEDIÇÃO (PRIORIDADE 4 E 5)          */}
      {/* ========================================================================= */}
      {romaneioDecidindoFaturamento && (
        <ModalDecisaoFaturamento
          romaneio={romaneioDecidindoFaturamento}
          onConfirmarSim={() => handleConfirmarSimFaturarAgora(romaneioDecidindoFaturamento)}
          onConfirmarNao={() => handleConfirmarNaoFaturarAgora(romaneioDecidindoFaturamento)}
          onClose={() => setRomaneioDecidindoFaturamento(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: TELA FINANCEIRA PARA FATURAMENTO IMEDIATO                        */}
      {/* ========================================================================= */}
      {romaneioFaturando && (
        <ModalFaturarRomaneio
          romaneio={romaneioFaturando}
          onClose={() => setRomaneioFaturando(null)}
          onFaturadoSucesso={(payload) => handleFaturamentoConcluidoSucesso(romaneioFaturando, payload.valorTotal)}
        />
      )}
    </div>
  );
};
