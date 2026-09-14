import React, { useState, useEffect, useMemo } from 'react';
import { OP, MachineCode, FioTipo, Especificacao, Cliente } from '../../types';
import { generateSpecKey, calculateGramatura, calculatePesoEstimado, formatPeso, formatGramatura } from '../../lib/utils';
import { Plus, Search, Trash2, X, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

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
