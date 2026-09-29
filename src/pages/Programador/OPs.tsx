import React, { useState, useEffect, useMemo } from 'react';
import { OP, MachineCode, FioTipo, Especificacao, Cliente } from '../../types';
import { generateSpecKey, calculateGramatura, calculatePesoEstimado, formatPeso, formatGramatura } from '../../lib/utils';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Edit2, 
  Sparkles, 
  Package, 
  Calculator, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Info,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  getLotesDisponiveis, 
  LoteMateriaPrima, 
  EVENT_MATERIA_PRIMA_UPDATED 
} from '../../services/estoqueClienteService';

type NormalizedCliente = Cliente & { nome?: string };

export default function OPs() {
  const navigate = useNavigate();
  const [ops, setOps] = useState<OP[]>([]);
  const [clientes, setClientes] = useState<NormalizedCliente[]>([]);
  const [especificacoes, setEspecificacoes] = useState<Especificacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: clientesData, error: clientesErr } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');

      if (clientesErr) throw clientesErr;

      const normalizedClientes: NormalizedCliente[] = (clientesData || []).map((c: any) => ({
        id: c.id?.toString() || '',
        nome: c.nome || c.razao_social || c.nome_fantasia || '',
        razaoSocial: c.razao_social || c.nome || '',
        nomeFantasia: c.nome_fantasia || c.nome || c.razao_social || '',
        cnpj: c.cnpj || '',
        ie: c.ie || '',
        cep: c.cep || '',
        endereco: c.endereco || '',
        cidade: c.cidade || '',
        estado: c.estado || '',
        contato: c.contato || '',
        telefone: c.telefone || '',
        email: c.email || '',
        observacoesComerciais: c.observacoes_comerciais || '',
        valorCobrado: c.valor_por_rolo || 0,
        tipoCobranca: 'ROLO' as const,
        status: (c.status as any) || 'ATIVO',
        createdAt: c.criado_em || c.created_at || '',
        updatedAt: c.criado_em || c.created_at || ''
      }));
      setClientes(normalizedClientes);

      const { data: espData, error: espErr } = await supabase
        .from('especificacoes')
        .select('*, titulos_fio(titulo, tipo)')
        .order('id', { ascending: false });

      if (espErr) throw espErr;

      const normalizedEsps: Especificacao[] = (espData || []).map((e: any) => {
        const clienteId = e.cliente_id?.toString() || '';
        const tituloFio = e.titulos_fio?.titulo || '';
        const tipoFio = (e.titulos_fio?.tipo as FioTipo) || 'POLIESTER';
        const totalFios = Number(e.total_fios) || 0;
        const specKey = generateSpecKey(clienteId, tituloFio, totalFios);

        return {
          id: e.id?.toString() || '',
          clienteId,
          fioClienteId: e.titulo_fio_id?.toString() || '',
          tipoFio,
          tituloFio,
          totalFios,
          faca: Number(e.faca) || 0,
          avanco: Number(e.avanco) || 0,
          pente: Number(e.pente) || 0,
          abertura: Number(e.abertura) || 0,
          largura: Number(e.largura) || 0,
          isDesenho: Boolean(e.is_desenho),
          composicao: e.composicao || [],
          specKey,
          createdAt: e.created_at || e.criado_em || '',
          updatedAt: e.updated_at || e.criado_em || ''
        };
      });
      setEspecificacoes(normalizedEsps);

      const { data: opsData, error: opsErr } = await supabase
        .from('ordens_producao')
        .select('*')
        .order('id', { ascending: false });

      if (opsErr) throw opsErr;

      const normalizedOPs: OP[] = (opsData || []).map((o: any) => ({
        id: o.id?.toString() || '',
        codigo: o.codigo || '',
        clienteId: o.cliente_id?.toString() || '',
        tipoFio: (o.tipo_fio as FioTipo) || 'POLIESTER',
        tituloFio: o.titulo_fio || '',
        totalFios: Number(o.total_fios) || 0,
        especificacaoId: o.especificacao_id?.toString() || '',
        maquina: (o.maquina as MachineCode) || 'MAQUINA 1',
        urgencia: (o.urgencia as any) || 'BAIXA',
        rolete: o.rolete || '',
        qtdRolos: Number(o.quantidade_planejada || o.quantidade_rolos) || 1,
        unidadeProducao: (o.unidade_producao as any) || 'METROS',
        metros: o.metros != null ? Number(o.metros) : undefined,
        voltas: o.voltas != null ? Number(o.voltas) : undefined,
        faca: Number(o.faca) || 0,
        avanco: Number(o.avanco) || 0,
        pente: Number(o.pente) || 0,
        abertura: Number(o.abertura) || 0,
        largura: Number(o.largura) || 0,
        isDesenho: Boolean(o.is_desenho),
        composicao: o.composicao || [],
        gramatura: Number(o.gramatura) || 0,
        pesoEstimadoKg: Number(o.peso_estimado) || 0,
        fiosPorPortada: o.fios_por_portada != null ? Number(o.fios_por_portada) : undefined,
        portadasPrevistas: o.portadas_previstas != null ? Number(o.portadas_previstas) : undefined,
        observacoesProducao: o.observacoes_producao || '',
        status: (o.status as any) || 'PENDENTE',
        createdAt: o.criado_em || '',
        updatedAt: o.atualizado_em || o.criado_em || ''
      }));
      setOps(normalizedOPs);
    } catch (err: any) {
      console.error('Erro ao carregar dados do Supabase:', err);
      toast.error('Erro ao carregar dados: ' + (err?.message || 'Falha na conexão'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleResetEvent = () => {
      fetchData();
    };
    window.addEventListener('texlog_reset_operacional', handleResetEvent);

    return () => {
      window.removeEventListener('texlog_reset_operacional', handleResetEvent);
    };
  }, []);

  const [formData, setFormData] = useState<Partial<OP>>({
    clienteId: '',
    tipoFio: 'POLIESTER',
    tituloFio: '',
    totalFios: 0,
    metros: 0,
    voltas: 0,
    qtdRolos: 1,
    rolete: '',
    maquina: 'MAQUINA 1',
    urgencia: 'BAIXA',
    unidadeProducao: 'METROS',
    fiosPorPortada: undefined,
    observacoesProducao: ''
  });

  const [foundEsps, setFoundEsps] = useState<Especificacao[]>([]);
  const [selectedEspId, setSelectedEspId] = useState<string>('');

  const foundEsp = useMemo(() => {
    if (selectedEspId) {
      return especificacoes.find(e => e.id === selectedEspId) || null;
    }
    return foundEsps[0] || null;
  }, [selectedEspId, foundEsps, especificacoes]);

  useEffect(() => {
    if (formData.clienteId && formData.tituloFio && formData.totalFios) {
      const specKey = generateSpecKey(
        formData.clienteId.toString(),
        formData.tituloFio,
        formData.totalFios
      );

      const matches = especificacoes.filter(e => e.specKey === specKey);
      setFoundEsps(matches);
      
      if (matches.length === 1) {
        setSelectedEspId(matches[0].id);
      } else if (matches.length > 1 && !selectedEspId) {
        setSelectedEspId(matches[0].id); // Default to first
      } else if (matches.length === 0) {
        setSelectedEspId('');
      }
    } else {
      setFoundEsps([]);
      setSelectedEspId('');
    }
  }, [formData.clienteId, formData.tituloFio, formData.totalFios, especificacoes]);

  // Sync unidadeProducao with machine selection
  useEffect(() => {
    if (formData.maquina === 'MAQUINA 1' || formData.maquina === 'MAQUINA 2') {
      setFormData(prev => ({ ...prev, unidadeProducao: 'METROS', voltas: undefined }));
    } else {
      setFormData(prev => ({ ...prev, unidadeProducao: 'VOLTAS', metros: undefined }));
    }
  }, [formData.maquina]);

  // Cálculos automáticos do Planejamento Operacional
  const operationalPlanning = useMemo(() => {
    const totalFios = foundEsp?.totalFios || Number(formData.totalFios) || 0;
    const fiosPorPortada = Number(formData.fiosPorPortada) || 0;
    const tituloFio = foundEsp?.tituloFio || formData.tituloFio || '';
    const tipoFio = foundEsp?.tipoFio || formData.tipoFio || 'POLIESTER';
    const metros = Number(formData.metros) || 0;

    let portadasPrevistas = 0;
    if (totalFios > 0 && fiosPorPortada > 0) {
      portadasPrevistas = Math.ceil(totalFios / fiosPorPortada);
    }

    let pesoEstimadoPortada = 0;
    if (fiosPorPortada > 0 && tituloFio && metros > 0) {
      const gramaturaPortada = calculateGramatura(fiosPorPortada, tituloFio, tipoFio);
      pesoEstimadoPortada = calculatePesoEstimado(gramaturaPortada, metros);
    }

    return {
      portadasPrevistas,
      pesoEstimadoPortada
    };
  }, [foundEsp, formData.totalFios, formData.fiosPorPortada, formData.tituloFio, formData.tipoFio, formData.metros]);

  // Sprint 3.4 — Inteligência de Matéria-Prima & Simulação
  const [lotesMateriaPrima, setLotesMateriaPrima] = useState<LoteMateriaPrima[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [reservaTecnicaPercentual, setReservaTecnicaPercentual] = useState<number>(10);

  // Carregar lotes disponíveis de matéria-prima para o cliente
  useEffect(() => {
    const carregarLotes = () => {
      const lotes = getLotesDisponiveis(formData.clienteId, formData.tituloFio);
      setLotesMateriaPrima(lotes);
      if (lotes.length > 0) {
        if (!selectedLoteId || !lotes.some(l => l.id === selectedLoteId)) {
          setSelectedLoteId(lotes[0].id);
        }
      } else {
        setSelectedLoteId('');
      }
    };

    if (formData.clienteId) {
      carregarLotes();
    } else {
      setLotesMateriaPrima([]);
      setSelectedLoteId('');
    }

    window.addEventListener(EVENT_MATERIA_PRIMA_UPDATED, carregarLotes);
    return () => {
      window.removeEventListener(EVENT_MATERIA_PRIMA_UPDATED, carregarLotes);
    };
  }, [formData.clienteId, formData.tituloFio, isModalOpen]);

  const selectedLote = useMemo(() => {
    return lotesMateriaPrima.find(l => l.id === selectedLoteId) || null;
  }, [selectedLoteId, lotesMateriaPrima]);

  // Simulação Inteligente e Reserva Técnica (Sprint 3.4 - Itens 6, 7 e 8)
  const simulacaoMateriaPrima = useMemo(() => {
    const pesoDisponivel = selectedLote ? selectedLote.pesoDisponivelKg : 0;
    const reservaPercent = Number(reservaTecnicaPercentual) || 0;
    const reservaKg = pesoDisponivel * (reservaPercent / 100);
    // Todos os cálculos utilizam apenas o peso utilizável! (Item 7)
    const pesoUtilizavel = Math.max(0, pesoDisponivel - reservaKg);

    const totalFios = foundEsp?.totalFios || Number(formData.totalFios) || 0;
    const tituloFio = foundEsp?.tituloFio || formData.tituloFio || '';
    const tipoFio = foundEsp?.tipoFio || formData.tipoFio || 'POLIESTER';

    // Gramatura calculada (g/m)
    const gramatura = calculateGramatura(totalFios, tituloFio, tipoFio);
    const pesoMetroKg = gramatura / 1000;

    const isM3M4 = formData.maquina === 'MAQUINA 3' || formData.maquina === 'MAQUINA 4';
    let metrosPorRolo = 0;
    if (isM3M4) {
      const voltas = Number(formData.voltas) || 0;
      const avanco = foundEsp?.avanco && foundEsp.avanco > 0 ? (foundEsp.avanco / 100) : 4.5;
      metrosPorRolo = voltas * avanco;
    } else {
      metrosPorRolo = Number(formData.metros) || 0;
    }

    const pesoPorRoloKg = pesoMetroKg * metrosPorRolo;

    // Quantidade estimada de rolos completos (Item 6)
    const rolosCompletosEstimados = (pesoPorRoloKg > 0 && pesoUtilizavel > 0)
      ? Math.floor(pesoUtilizavel / pesoPorRoloKg)
      : 0;

    // Metragem máxima disponível (Item 6)
    const metragemMaximaDisponivel = (pesoMetroKg > 0 && pesoUtilizavel > 0)
      ? Math.floor(pesoUtilizavel / pesoMetroKg)
      : 0;

    // Consumo previsto da OP
    const qtdRolos = Number(formData.qtdRolos) || 1;
    const consumoTotalPrevistoKg = qtdRolos * pesoPorRoloKg;

    // Saldo previsto após a produção (Item 6)
    const saldoUtilizavelPrevistoKg = pesoUtilizavel - consumoTotalPrevistoKg;
    const saldoTotalPrevistoKg = pesoDisponivel - consumoTotalPrevistoKg;

    const pesoMedioCone = selectedLote?.pesoMedioConeKg || (selectedLote && selectedLote.totalCones > 0 ? selectedLote.pesoLiquido / selectedLote.totalCones : 0);
    const conesConsumidosPrevistos = pesoMedioCone > 0 ? Math.ceil(consumoTotalPrevistoKg / pesoMedioCone) : 0;
    const saldoConesPrevisto = (selectedLote?.totalCones || 0) - conesConsumidosPrevistos;

    const isViavel = pesoUtilizavel >= consumoTotalPrevistoKg && pesoUtilizavel > 0;

    return {
      selectedLote,
      pesoDisponivel,
      reservaPercent,
      reservaKg,
      pesoUtilizavel,
      pesoMetroKg,
      pesoPorRoloKg,
      rolosCompletosEstimados,
      metragemMaximaDisponivel,
      consumoTotalPrevistoKg,
      saldoUtilizavelPrevistoKg,
      saldoTotalPrevistoKg,
      pesoMedioCone,
      saldoConesPrevisto,
      isViavel
    };
  }, [selectedLote, reservaTecnicaPercentual, foundEsp, formData.totalFios, formData.tituloFio, formData.tipoFio, formData.maquina, formData.metros, formData.voltas, formData.qtdRolos]);

  const filteredOPs = ops.filter(op => {
    const cliente = clientes.find(c => c.id.toString() === op.clienteId?.toString());
    const search = searchTerm.toLowerCase();
    return (cliente?.razaoSocial || '').toLowerCase().includes(search) ||
           (cliente?.nomeFantasia || '').toLowerCase().includes(search) ||
           (cliente?.nome || '').toLowerCase().includes(search) ||
           op.codigo.toLowerCase().includes(search);
  });

  const handleOpenModal = (op?: OP) => {
    if (op) {
      setFormData(op);
      setEditingId(op.id);
      try {
        const rawSim = localStorage.getItem('texlog_ops_simulacao_mp');
        if (rawSim) {
          const simMap = JSON.parse(rawSim);
          const saved = simMap[op.id] || simMap[op.codigo];
          if (saved) {
            setSelectedLoteId(saved.loteId || '');
            setReservaTecnicaPercentual(saved.reservaPercentual !== undefined ? saved.reservaPercentual : 10);
          } else {
            setSelectedLoteId('');
            setReservaTecnicaPercentual(10);
          }
        }
      } catch {
        setSelectedLoteId('');
        setReservaTecnicaPercentual(10);
      }
    } else {
      setFormData({
        clienteId: '',
        tipoFio: 'POLIESTER',
        tituloFio: '',
        totalFios: 0,
        metros: 0,
        voltas: 0,
        qtdRolos: 1,
        rolete: '',
        maquina: 'MAQUINA 1',
        urgencia: 'BAIXA',
        unidadeProducao: 'METROS',
        fiosPorPortada: undefined,
        observacoesProducao: ''
      });
      setFoundEsps([]);
      setSelectedEspId('');
      setEditingId(null);
      setSelectedLoteId('');
      setReservaTecnicaPercentual(10);
    }
    setIsModalOpen(true);
  };

  const parseDecimal = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(',', '.'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isM3M4 = formData.maquina === 'MAQUINA 3' || formData.maquina === 'MAQUINA 4';

    const missingFields: string[] = [];
    if (!formData.clienteId) missingFields.push('Cliente');
    if (!formData.tipoFio) missingFields.push('Tipo de Fio');
    if (!formData.tituloFio) missingFields.push('Título do Fio');
    if (!formData.totalFios) missingFields.push('Total de Fios');
    if (!formData.maquina) missingFields.push('Máquina');
    if (!formData.qtdRolos || formData.qtdRolos <= 0) missingFields.push('Quantidade de Rolos');
    if (!formData.urgencia) missingFields.push('Urgência');
    if (!formData.fiosPorPortada || formData.fiosPorPortada <= 0) missingFields.push('Fios por Portada (Gaiola)');

    if (isM3M4) {
      if (!formData.voltas || formData.voltas <= 0) missingFields.push('Voltas por Rolo');
    } else {
      if (!formData.metros || formData.metros <= 0) missingFields.push('Metros por Rolo');
    }

    if (!foundEsp) {
      toast.error('Especificação técnica não encontrada para esta combinação.');
      return;
    }

    if (missingFields.length > 0) {
      toast.error(`Campo obrigatório faltando: ${missingFields[0]}`);
      return;
    }

    const gramatura = calculateGramatura(foundEsp.totalFios, foundEsp.tituloFio, foundEsp.tipoFio);
    const pesoEstimado = calculatePesoEstimado(gramatura, formData.metros || 0);
    const qtdRolosInformada = Number(formData.qtdRolos) || 1;

    const fiosPorPortadaNum = Number(formData.fiosPorPortada) || 0;
    const portadasPrevistasCalc = fiosPorPortadaNum > 0 ? Math.ceil(foundEsp.totalFios / fiosPorPortadaNum) : null;

    try {
      if (editingId) {
        const updatePayload = {
          cliente_id: Number(formData.clienteId) || null,
          especificacao_id: Number(foundEsp.id) || null,
          titulo_id: Number(foundEsp.fioClienteId) || null,
          titulo_fio: foundEsp.tituloFio,
          tipo_fio: foundEsp.tipoFio,
          total_fios: foundEsp.totalFios,
          maquina: formData.maquina,
          urgencia: formData.urgencia,
          rolete: formData.rolete || '',
          quantidade_rolos: qtdRolosInformada,
          quantidade_planejada: qtdRolosInformada,
          quantidade_pendente: qtdRolosInformada,
          unidade_producao: isM3M4 ? 'VOLTAS' : 'METROS',
          metros: isM3M4 ? null : (formData.metros || null),
          voltas: isM3M4 ? (formData.voltas || null) : null,
          faca: foundEsp.faca,
          avanco: isM3M4 ? foundEsp.avanco : 0,
          pente: foundEsp.pente,
          abertura: foundEsp.abertura,
          largura: foundEsp.largura,
          is_desenho: foundEsp.isDesenho,
          composicao: foundEsp.composicao,
          gramatura,
          peso_estimado: pesoEstimado,
          fios_por_portada: fiosPorPortadaNum,
          portadas_previstas: portadasPrevistasCalc,
          observacoes_producao: formData.observacoesProducao?.trim() || null,
          status: formData.status || 'PENDENTE',
          atualizado_em: new Date().toISOString()
        };

        const { error } = await supabase
          .from('ordens_producao')
          .update(updatePayload)
          .eq('id', Number(editingId));

        if (error) throw error;
        toast.success('OP atualizada com sucesso');
      } else {
        const opNumber = ops.length > 0 
          ? Math.max(...ops.map(o => parseInt(o.codigo.replace('OP-', '')) || 0)) + 1 
          : 1;
        const codigo = `OP-${opNumber.toString().padStart(4, '0')}`;

        const insertPayload = {
          codigo,
          cliente_id: Number(formData.clienteId) || null,
          especificacao_id: Number(foundEsp.id) || null,
          titulo_id: Number(foundEsp.fioClienteId) || null,
          titulo_fio: foundEsp.tituloFio,
          tipo_fio: foundEsp.tipoFio,
          total_fios: foundEsp.totalFios,
          maquina: formData.maquina,
          urgencia: formData.urgencia,
          rolete: formData.rolete || '',
          quantidade_rolos: qtdRolosInformada,
          quantidade_planejada: qtdRolosInformada,
          quantidade_produzida: 0,
          quantidade_pendente: qtdRolosInformada,
          unidade_producao: isM3M4 ? 'VOLTAS' : 'METROS',
          metros: isM3M4 ? null : (formData.metros || null),
          voltas: isM3M4 ? (formData.voltas || null) : null,
          faca: foundEsp.faca,
          avanco: isM3M4 ? foundEsp.avanco : 0,
          pente: foundEsp.pente,
          abertura: foundEsp.abertura,
          largura: foundEsp.largura,
          is_desenho: foundEsp.isDesenho,
          composicao: foundEsp.composicao,
          gramatura,
          peso_estimado: pesoEstimado,
          fios_por_portada: fiosPorPortadaNum,
          portadas_previstas: portadasPrevistasCalc,
          observacoes_producao: formData.observacoesProducao?.trim() || null,
          status: 'PENDENTE',
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };

        const { error } = await supabase
          .from('ordens_producao')
          .insert([insertPayload]);

        if (error) throw error;
        toast.success('Ordem de Produção criada com sucesso.');
      }

      // Salvar snapshot da Simulação Inteligente de Matéria-Prima (Sprint 3.4)
      const opIdKey = editingId ? String(editingId) : (ops.length > 0 ? `OP-${(Math.max(...ops.map(o => parseInt(o.codigo.replace('OP-', '')) || 0)) + 1).toString().padStart(4, '0')}` : 'OP-0001');
      const simRecord = {
        opId: opIdKey,
        opCodigo: editingId ? (ops.find(o => o.id === editingId)?.codigo || opIdKey) : opIdKey,
        loteId: selectedLote?.id || null,
        loteNumero: selectedLote?.lote || null,
        clienteId: formData.clienteId,
        materialNome: selectedLote?.fioNome || formData.tituloFio,
        cor: selectedLote?.cor || '',
        tipoEmbalagem: selectedLote?.tipoEmbalagem || '',
        classificacao: selectedLote?.classificacao || '',
        pesoDisponivelKg: simulacaoMateriaPrima.pesoDisponivel,
        reservaPercentual: simulacaoMateriaPrima.reservaPercent,
        reservaKg: simulacaoMateriaPrima.reservaKg,
        pesoUtilizavelKg: simulacaoMateriaPrima.pesoUtilizavel,
        totalCones: selectedLote?.totalCones || 0,
        pesoMedioConeKg: simulacaoMateriaPrima.pesoMedioCone,
        metragemMaximaDisponivel: simulacaoMateriaPrima.metragemMaximaDisponivel,
        rolosCompletosEstimados: simulacaoMateriaPrima.rolosCompletosEstimados,
        consumoTotalPrevistoKg: simulacaoMateriaPrima.consumoTotalPrevistoKg,
        saldoTotalPrevistoKg: simulacaoMateriaPrima.saldoTotalPrevistoKg,
        saldoConesPrevisto: simulacaoMateriaPrima.saldoConesPrevisto,
        isViavel: simulacaoMateriaPrima.isViavel,
        salvoEm: new Date().toISOString()
      };

      try {
        const rawSim = localStorage.getItem('texlog_ops_simulacao_mp');
        const simMap = rawSim ? JSON.parse(rawSim) : {};
        simMap[opIdKey] = simRecord;
        if (editingId) {
          const foundOp = ops.find(o => o.id === editingId);
          if (foundOp) simMap[foundOp.codigo] = simRecord;
        }
        localStorage.setItem('texlog_ops_simulacao_mp', JSON.stringify(simMap));
      } catch (e) {
        console.error('Erro ao salvar simulação de matéria-prima:', e);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar OP:', err);
      toast.error('Erro ao salvar OP: ' + (err?.message || 'Falha ao salvar'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja realmente excluir esta OP e todos os seus registros de produção relacionados? Esta ação é irreversível.')) {
      try {
        const { error } = await supabase
          .from('ordens_producao')
          .delete()
          .eq('id', Number(id));

        if (error) throw error;
        toast.success('OP excluída com sucesso');
        await fetchData();
      } catch (err: any) {
        console.error('Erro ao excluir OP:', err);
        toast.error('Erro ao excluir OP: ' + (err?.message || 'Falha ao excluir'));
      }
    }
  };

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'ALTA': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'MEDIA': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EM_ANDAMENTO': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'PENDENTE': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'PARADA': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'FINALIZADA': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-center sm:text-left">Ordens de Produção</h1>
          <p className="text-neutral-400 mt-1">Snapshot técnico e rastreabilidade total</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Nova OP
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, OP ou título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOPs.map(op => {
          const cliente = clientes.find(c => c.id.toString() === op.clienteId?.toString());
          return (
            <div key={op.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors flex flex-col group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-white tracking-tighter">{op.codigo}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${getUrgenciaColor(op.urgencia)}`}>
                      {op.urgencia}
                    </span>
                  </div>
                  <h3 className="text-neutral-300 font-bold uppercase text-xs truncate max-w-[200px]">{cliente?.nomeFantasia || cliente?.razaoSocial || cliente?.nome || 'N/D'}</h3>
                  <div className="mt-2">
                    <p className="text-xl font-black text-white leading-none">{op.tituloFio}</p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">{op.totalFios} FIOS • {op.tipoFio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenModal(op)} className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(op.id)} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6 flex-1 bg-black/20 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-neutral-600 text-[9px] font-black uppercase tracking-widest block mb-1">Máquina</span>
                  <span className="text-white font-bold">{op.maquina}</span>
                </div>
                <div>
                  <span className="text-neutral-600 text-[9px] font-black uppercase tracking-widest block mb-1">Meta</span>
                  <span className="text-white font-bold">{op.unidadeProducao === 'METROS' ? `${op.metros}m` : `${op.voltas} Voltas`}</span>
                </div>
                <div>
                  <span className="text-neutral-600 text-[9px] font-black uppercase tracking-widest block mb-1">Rolos</span>
                  <span className="text-white font-bold">{op.qtdRolos} un</span>
                </div>
                <div>
                  <span className="text-neutral-600 text-[9px] font-black uppercase tracking-widest block mb-1">Status</span>
                  <span className={`text-[10px] font-bold ${getStatusColor(op.status).split(' ')[0]}`}>
                    {op.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-white/5 flex justify-between">
                   <div>
                      <span className="text-neutral-600 text-[9px] font-black uppercase tracking-widest block mb-1">Peso Est. Total</span>
                      <span className="text-emerald-500 font-black">{formatPeso(op.pesoEstimadoKg)}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-neutral-600 text-[9px] font-black uppercase tracking-widest block mb-1">Gramatura</span>
                      <span className="text-white font-bold">{formatGramatura(op.gramatura)}</span>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl my-auto shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-neutral-800/50 bg-neutral-950/50">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {editingId ? 'Refatorar OP' : 'Nova Ordem de Produção'}
                </h2>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Preenchimento técnico obrigatório</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Cliente *</label>
                  <select 
                    required 
                    value={formData.clienteId} 
                    onChange={e => setFormData({...formData, clienteId: e.target.value, tituloFio: '', totalFios: 0})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold"
                  >
                    <option value="">Selecione o cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial || c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Título do Fio *</label>
                  <select 
                    required 
                    disabled={!formData.clienteId}
                    value={formData.tituloFio} 
                    onChange={e => setFormData({...formData, tituloFio: e.target.value, totalFios: 0})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold disabled:opacity-30"
                  >
                    <option value="">Escolha o título</option>
                    {formData.clienteId && especificacoes
                      .filter(e => e.clienteId === formData.clienteId)
                      .map(e => e.tituloFio)
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map(titulo => (
                        <option key={titulo} value={titulo}>{titulo}</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Total de Fios *</label>
                  <select 
                    required 
                    disabled={!formData.tituloFio}
                    value={formData.totalFios || ''} 
                    onChange={e => setFormData({...formData, totalFios: parseInt(e.target.value)})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold disabled:opacity-30"
                  >
                    <option value="">Escolha a quantidade</option>
                    {formData.tituloFio && especificacoes
                      .filter(e => e.clienteId === formData.clienteId && e.tituloFio === formData.tituloFio)
                      .map(e => (
                        <option key={e.id} value={e.totalFios}>{e.totalFios} FIOS</option>
                      ))
                    }
                  </select>
                </div>

                {foundEsps.length > 0 ? (
                  <div className="md:col-span-2 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                          {foundEsps.length > 1 ? `${foundEsps.length} Especificações Encontradas` : 'Especificação Técnica Encontrada'}
                        </p>
                      </div>
                      
                      {foundEsps.length > 1 && (
                        <select 
                          value={selectedEspId}
                          onChange={(e) => setSelectedEspId(e.target.value)}
                          className="bg-black border border-emerald-500/30 text-white text-[10px] font-bold py-1 px-3 rounded-lg focus:outline-none"
                        >
                          {foundEsps.map((e, idx) => (
                            <option key={e.id} value={e.id}>Setup #{idx + 1} ({e.isDesenho ? 'Com Desenho' : 'Simples'})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {foundEsp && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                          <span className="text-neutral-600 text-[8px] font-black uppercase tracking-tighter block mb-1">Faca</span>
                          <span className="text-white font-bold text-lg leading-none">{foundEsp.faca}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                          <span className="text-neutral-600 text-[8px] font-black uppercase tracking-tighter block mb-1">Pente</span>
                          <span className="text-white font-bold text-lg leading-none font-mono">{(foundEsp.pente || 0).toFixed(1)}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                          <span className="text-neutral-600 text-[8px] font-black uppercase tracking-tighter block mb-1">Abertura</span>
                          <span className="text-white font-bold text-lg leading-none">{foundEsp.abertura}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                          <span className="text-neutral-600 text-[8px] font-black uppercase tracking-tighter block mb-1">Largura</span>
                          <span className="text-white font-bold text-lg leading-none">{foundEsp.largura}cm</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : formData.totalFios ? (
                  <div className="md:col-span-2 bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center gap-4">
                    <p className="text-red-500 font-black text-[10px] uppercase tracking-widest text-center">Nenhuma especificação para este setup!</p>
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({
                          clienteId: formData.clienteId || '',
                          tituloFio: formData.tituloFio || '',
                          totalFios: (formData.totalFios || 0).toString()
                        });
                        navigate(`/programador/especificacoes?${params.toString()}`);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Criar nova especificação para este setup
                    </button>
                  </div>
                ) : null}

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Máquina *</label>
                  <select 
                    required 
                    value={formData.maquina} 
                    onChange={e => setFormData({...formData, maquina: e.target.value as any})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold"
                  >
                    <option value="MAQUINA 1">MÁQUINA 1 (Metros)</option>
                    <option value="MAQUINA 2">MÁQUINA 2 (Metros)</option>
                    <option value="MAQUINA 3">MÁQUINA 3 (Voltas)</option>
                    <option value="MAQUINA 4">MÁQUINA 4 (Voltas)</option>
                  </select>
                </div>

                <div>
                  {formData.unidadeProducao === 'METROS' ? (
                    <>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Metros por Rolo *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.metros || ''} 
                        onChange={e => setFormData({...formData, metros: parseDecimal(e.target.value)})}
                        className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                        placeholder="Ex: 5000"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Voltas por Rolo *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.voltas || ''} 
                        onChange={e => setFormData({...formData, voltas: parseDecimal(e.target.value)})}
                        className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                        placeholder="Ex: 1200"
                      />
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Qtd de Rolos *</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={formData.qtdRolos || ''} 
                    onChange={e => setFormData({...formData, qtdRolos: parseInt(e.target.value)})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Urgência *</label>
                  <select 
                    required 
                    value={formData.urgencia} 
                    onChange={e => setFormData({...formData, urgencia: e.target.value as any})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Rolete Designado</label>
                  <input 
                    type="text" 
                    value={formData.rolete || ''} 
                    onChange={e => setFormData({...formData, rolete: e.target.value})}
                    placeholder="Identificação do rolete físico"
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>

                {/* Seção: Planejamento Operacional */}
                <div className="md:col-span-2 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-6 space-y-6">
                  <div className="border-b border-neutral-800 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
                      <span>⚙️</span> Planejamento Operacional
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Campo editável: Fios por portada (gaiola) */}
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">
                        Fios por portada (gaiola) *
                      </label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={formData.fiosPorPortada || ''} 
                        onChange={e => setFormData({...formData, fiosPorPortada: e.target.value ? parseInt(e.target.value) : undefined})}
                        placeholder="Ex: 480"
                        className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                      />
                    </div>

                    {/* Campo somente leitura: Portadas previstas */}
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">
                        Portadas previstas (Calculado)
                      </label>
                      <div className="w-full bg-neutral-900/80 border border-neutral-800 text-white rounded-2xl py-4 px-5 font-bold font-mono text-emerald-400 flex items-center justify-between">
                        <span>{operationalPlanning.portadasPrevistas > 0 ? `${operationalPlanning.portadasPrevistas} portadas` : '—'}</span>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-sans">Automático</span>
                      </div>
                    </div>

                    {/* Campo somente leitura: Peso estimado por portada */}
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">
                        Peso estimado por portada (Calculado)
                      </label>
                      <div className="w-full bg-neutral-900/80 border border-neutral-800 text-white rounded-2xl py-4 px-5 font-bold font-mono text-blue-300 flex items-center justify-between">
                        <span>{operationalPlanning.pesoEstimadoPortada > 0 ? formatPeso(operationalPlanning.pesoEstimadoPortada) : '—'}</span>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-sans">Automático</span>
                      </div>
                    </div>

                    {/* Campo editável: Observações de Produção */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">
                        Observações de Produção
                      </label>
                      <textarea 
                        rows={3}
                        value={formData.observacoesProducao || ''} 
                        onChange={e => setFormData({...formData, observacoesProducao: e.target.value})}
                        placeholder="Instruções operacionais para o operador da máquina..."
                        className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SPRINT 3.4 — SEÇÃO: INTELIGÊNCIA DE MATÉRIA-PRIMA & SIMULAÇÃO */}
                <div className="md:col-span-2 bg-gradient-to-br from-neutral-950 via-blue-950/20 to-neutral-950 border border-blue-500/30 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
                        <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black uppercase tracking-[0.15em] text-white">
                            Inteligência de Matéria-Prima
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                            Sprint 3.4
                          </span>
                        </div>
                        <p className="text-neutral-400 text-xs mt-0.5">
                          Planejamento e simulação com base no material disponível em estoque antes de produzir
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                        simulacaoMateriaPrima.isViavel
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {simulacaoMateriaPrima.isViavel ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Produção Viável
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Atenção ao Saldo
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 1. Seleção do Lote de Matéria-Prima (Item 5) */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-blue-400" />
                          Selecionar Lote de Matéria-Prima *
                        </label>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {lotesMateriaPrima.length} {lotesMateriaPrima.length === 1 ? 'lote disponível' : 'lotes disponíveis'}
                        </span>
                      </div>

                      {lotesMateriaPrima.length > 0 ? (
                        <select
                          value={selectedLoteId}
                          onChange={(e) => setSelectedLoteId(e.target.value)}
                          className="w-full bg-black border border-blue-500/40 text-white rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        >
                          <option value="">Selecione o lote do cliente...</option>
                          {lotesMateriaPrima.map(lote => (
                            <option key={lote.id} value={lote.id}>
                              {lote.lote} — {lote.fioNome} ({lote.cor}) • Disp: {lote.pesoDisponivelKg.toFixed(2)} kg ({lote.totalCones} cones em {lote.quantidadeEmbalagens} {lote.tipoEmbalagem}) • {lote.numeroNf}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-200/90">
                            <p className="font-bold">Nenhum lote registrado para este cliente nas entradas de NF.</p>
                            <p className="text-neutral-400 text-[11px] mt-0.5">
                              Lançamentos de Nota Fiscal realizados no Escritório aparecem automaticamente aqui com rastreabilidade total.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Apresentação do Material Selecionado (Item 5) */}
                    {selectedLote && (
                      <div className="bg-black/50 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center justify-between">
                          <span>Material Selecionado para Produção</span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">
                            NF: {selectedLote.numeroNf}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div className="bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-wider block mb-1">Cliente</span>
                            <span className="text-white font-bold text-xs truncate block" title={selectedLote.clienteNome}>
                              {clientes.find(c => c.id.toString() === formData.clienteId?.toString())?.nome || selectedLote.clienteNome}
                            </span>
                          </div>

                          <div className="bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-wider block mb-1">Material / Cor</span>
                            <span className="text-white font-bold text-xs truncate block" title={`${selectedLote.fioNome} - ${selectedLote.cor}`}>
                              {selectedLote.fioNome} ({selectedLote.cor})
                            </span>
                          </div>

                          <div className="bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-wider block mb-1">Qtd. Embalagens</span>
                            <span className="text-white font-mono font-bold text-sm">
                              {selectedLote.quantidadeEmbalagens} <span className="text-[10px] text-neutral-400 font-normal">{selectedLote.tipoEmbalagem}</span>
                            </span>
                          </div>

                          <div className="bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-wider block mb-1">Total de Cones</span>
                            <span className="text-blue-400 font-mono font-black text-sm">
                              {selectedLote.totalCones} cones
                            </span>
                          </div>

                          <div className="bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-wider block mb-1">Peso Disponível</span>
                            <span className="text-emerald-400 font-mono font-black text-sm">
                              {selectedLote.pesoDisponivelKg.toFixed(2)} kg
                            </span>
                          </div>

                          <div className="bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-wider block mb-1">Peso Médio Cone</span>
                            <span className="text-purple-400 font-mono font-black text-sm">
                              {selectedLote.pesoMedioConeKg.toFixed(3)} kg
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Reserva Técnica (Item 7) */}
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-blue-400" />
                          <h5 className="text-xs font-black uppercase tracking-wider text-white">
                            Reserva Técnica (Descontada dos Cálculos)
                          </h5>
                        </div>
                        <p className="text-[11px] text-neutral-400">
                          Margem de segurança percentual descontada do peso disponível antes de calcular metragem e rolos.
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-black border border-neutral-800 rounded-xl px-3 py-2">
                          <label className="text-xs font-bold text-neutral-400 uppercase">Reserva:</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="1"
                            value={reservaTecnicaPercentual}
                            onChange={(e) => setReservaTecnicaPercentual(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                            className="w-14 bg-transparent text-white font-mono font-black text-sm focus:outline-none text-right"
                          />
                          <span className="text-xs font-bold text-neutral-400">%</span>
                        </div>

                        <div className="text-right border-l border-neutral-800 pl-4">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Dedução em Peso</span>
                          <span className="text-xs font-mono font-black text-amber-400">
                            - {simulacaoMateriaPrima.reservaKg.toFixed(2)} kg
                          </span>
                        </div>

                        <div className="text-right border-l border-neutral-800 pl-4">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Peso Utilizável</span>
                          <span className="text-base font-mono font-black text-emerald-400">
                            {simulacaoMateriaPrima.pesoUtilizavel.toFixed(2)} kg
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Simulação Inteligente (Item 6) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-blue-400" />
                        Resultados da Simulação Inteligente (Baseada no Peso Utilizável)
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {foundEsp ? `Gramatura: ${formatGramatura(calculateGramatura(foundEsp.totalFios, foundEsp.tituloFio, foundEsp.tipoFio))} g/m` : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Metragem máxima disponível */}
                      <div className="bg-black/60 border border-white/5 rounded-2xl p-4">
                        <span className="text-neutral-500 text-[10px] font-black uppercase tracking-wider block mb-1">
                          Metragem Máxima Disponível
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-mono font-black text-white">
                            {simulacaoMateriaPrima.metragemMaximaDisponivel.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-xs text-neutral-400 font-bold">metros</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 mt-1 block">
                          Com o peso utilizável de {simulacaoMateriaPrima.pesoUtilizavel.toFixed(2)} kg
                        </span>
                      </div>

                      {/* Quantidade estimada de rolos completos */}
                      <div className="bg-black/60 border border-white/5 rounded-2xl p-4">
                        <span className="text-neutral-500 text-[10px] font-black uppercase tracking-wider block mb-1">
                          Rolos Completos Estimados
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-mono font-black text-blue-400">
                            {simulacaoMateriaPrima.rolosCompletosEstimados}
                          </span>
                          <span className="text-xs text-neutral-400 font-bold">rolos</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 mt-1 block">
                          Meta planejada nesta OP: {formData.qtdRolos || 1} rolo(s)
                        </span>
                      </div>

                      {/* Saldo previsto após a produção */}
                      <div className="bg-black/60 border border-white/5 rounded-2xl p-4">
                        <span className="text-neutral-500 text-[10px] font-black uppercase tracking-wider block mb-1">
                          Saldo Previsto Após Produção
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-xl font-mono font-black ${
                            simulacaoMateriaPrima.saldoTotalPrevistoKg >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {simulacaoMateriaPrima.saldoTotalPrevistoKg.toFixed(2)}
                          </span>
                          <span className="text-xs text-neutral-400 font-bold">kg</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 mt-1 block">
                          Saldo de cones: ~{simulacaoMateriaPrima.saldoConesPrevisto} cones
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Quadro Informativo Pré-Confirmação da OP (Item 8) */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-purple-400" />
                        <h5 className="text-xs font-black uppercase tracking-wider text-white">
                          Informações Exibidas ao Programador Pré-Confirmação
                        </h5>
                      </div>
                      <span className="text-[10px] text-neutral-500 uppercase font-mono">
                        Conferência Técnica Obrigatória
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">1. Cliente</span>
                        <span className="text-white font-bold truncate block">
                          {clientes.find(c => c.id.toString() === formData.clienteId?.toString())?.nomeFantasia || 
                           clientes.find(c => c.id.toString() === formData.clienteId?.toString())?.nome || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">2. Material Disponível</span>
                        <span className="text-white font-bold truncate block">
                          {selectedLote ? `${selectedLote.fioNome} (${selectedLote.cor})` : formData.tituloFio || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">3. Peso Disponível</span>
                        <span className="text-white font-mono font-bold">
                          {simulacaoMateriaPrima.pesoDisponivel > 0 ? `${simulacaoMateriaPrima.pesoDisponivel.toFixed(2)} kg` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">4. Reserva Técnica</span>
                        <span className="text-amber-400 font-mono font-bold">
                          {simulacaoMateriaPrima.reservaPercent}% ({simulacaoMateriaPrima.reservaKg.toFixed(2)} kg)
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">5. Peso Utilizável</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          {simulacaoMateriaPrima.pesoUtilizavel > 0 ? `${simulacaoMateriaPrima.pesoUtilizavel.toFixed(2)} kg` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">6. Qtd. de Cones</span>
                        <span className="text-blue-400 font-mono font-bold">
                          {selectedLote ? `${selectedLote.totalCones} cones` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">7. Peso Médio / Cone</span>
                        <span className="text-purple-400 font-mono font-bold">
                          {simulacaoMateriaPrima.pesoMedioCone > 0 ? `${simulacaoMateriaPrima.pesoMedioCone.toFixed(3)} kg` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">8. Metragem Estimada</span>
                        <span className="text-white font-mono font-bold">
                          {simulacaoMateriaPrima.metragemMaximaDisponivel > 0 ? `${simulacaoMateriaPrima.metragemMaximaDisponivel.toLocaleString('pt-BR')} m` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">9. Qtd. Estimada Rolos</span>
                        <span className="text-blue-400 font-mono font-bold">
                          {simulacaoMateriaPrima.rolosCompletosEstimados} rolos completos
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">10. Saldo Previsto</span>
                        <span className={`font-mono font-bold ${simulacaoMateriaPrima.saldoTotalPrevistoKg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {simulacaoMateriaPrima.saldoTotalPrevistoKg.toFixed(2)} kg
                        </span>
                      </div>
                    </div>

                    {/* Alerta de Decisão para o Programador */}
                    <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
                      simulacaoMateriaPrima.isViavel
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                    }`}>
                      {simulacaoMateriaPrima.isViavel ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span>
                        {simulacaoMateriaPrima.isViavel
                          ? `Produção 100% Viável: O lote possui peso utilizável de ${simulacaoMateriaPrima.pesoUtilizavel.toFixed(2)} kg, suficiente para produzir os ${formData.qtdRolos || 1} rolo(s) planejados (consumo previsto: ${simulacaoMateriaPrima.consumoTotalPrevistoKg.toFixed(2)} kg).`
                          : `Atenção na decisão: O consumo previsto desta OP (${simulacaoMateriaPrima.consumoTotalPrevistoKg.toFixed(2)} kg) excede o peso utilizável de ${simulacaoMateriaPrima.pesoUtilizavel.toFixed(2)} kg deste lote. Avalie reduzir a quantidade de rolos ou ajustar a reserva técnica antes de iniciar a produção.`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-6 pt-6 border-t border-neutral-800/50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-8 py-4 text-neutral-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                >
                  {editingId ? 'Salvar Edição' : 'Gerar Ordem de Produção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
