import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Package, 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Calculator,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { 
  salvarEntradaMercadoria, 
  CLASSIFICACOES_MATERIA_PRIMA 
} from '../../../services/estoqueClienteService';
import { ClassificacaoMateriaPrima } from '../../../types';

const TIPOS_EMBALAGEM = ['Caixa', 'Fardo', 'Caixote', 'Outro'];

interface ItemFormRow {
  id: string;
  fioId: string | number;
  fioNome: string;
  tipo: string;
  cor: string;
  lote: string;
  tipoEmbalagem: string;
  quantidadeEmbalagens: string;
  conesPorEmbalagem: string;
  pesoKg: string;
  classificacao: ClassificacaoMateriaPrima;
}

interface FioTecnico {
  id: number;
  cliente_id?: number | null;
  titulo: string;
  tipo: string;
  cor?: string | null;
}

interface NovaEntradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientePreselecionado?: { id: string | number; nome: string } | null;
  onSuccess?: () => void;
  clientesDisponiveis?: Array<{ id: string | number; nome: string; razao_social?: string; nome_fantasia?: string }>;
}

export function NovaEntradaModal({
  isOpen,
  onClose,
  clientePreselecionado,
  onSuccess,
  clientesDisponiveis = []
}: NovaEntradaModalProps) {
  const [clientes, setClientes] = useState<any[]>(clientesDisponiveis);
  const [fiosTecnicos, setFiosTecnicos] = useState<FioTecnico[]>([]);
  const [isLoadingFios, setIsLoadingFios] = useState(false);

  // Campos do Cabeçalho da Entrada
  const [clienteId, setClienteId] = useState<string | number>('');
  const [numeroNf, setNumeroNf] = useState<string>('');
  const [dataEntrada, setDataEntrada] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Lista de Itens da Entrada
  const [itens, setItens] = useState<ItemFormRow[]>([
    {
      id: 'item_1',
      fioId: '',
      fioNome: '',
      tipo: '',
      cor: '',
      lote: '',
      tipoEmbalagem: 'Caixa',
      quantidadeEmbalagens: '1',
      conesPorEmbalagem: '6',
      pesoKg: '',
      classificacao: 'MATERIAL_NOVO'
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar lista de clientes se não foram passados
  useEffect(() => {
    if (clientesDisponiveis.length > 0) {
      setClientes(clientesDisponiveis);
    } else {
      supabase.from('clientes').select('id, nome, razao_social, nome_fantasia').order('nome').then(({ data }) => {
        if (data) setClientes(data);
      });
    }
  }, [clientesDisponiveis]);

  // Pré-selecionar cliente se fornecido
  useEffect(() => {
    if (clientePreselecionado) {
      setClienteId(clientePreselecionado.id);
    } else if (clientes.length > 0 && !clienteId) {
      setClienteId(clientes[0].id);
    }
  }, [clientePreselecionado, clientes]);

  // Carregar o cadastro técnico de fios existente (titulos_fio)
  useEffect(() => {
    async function carregarFios() {
      try {
        setIsLoadingFios(true);
        const { data, error } = await supabase
          .from('titulos_fio')
          .select('id, cliente_id, titulo, tipo, cor')
          .order('titulo', { ascending: true });

        if (error) {
          console.warn('Erro ao carregar titulos_fio:', error);
          return;
        }

        if (data) {
          setFiosTecnicos(data);
        }
      } catch (err) {
        console.error('Erro ao buscar cadastro de fios:', err);
      } finally {
        setIsLoadingFios(false);
      }
    }

    if (isOpen) {
      carregarFios();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrar fios técnicos sugeridos para o cliente selecionado
  const fiosDisponiveis = fiosTecnicos.filter(f => {
    if (!clienteId) return true;
    if (f.cliente_id && String(f.cliente_id) === String(clienteId)) return true;
    if (!f.cliente_id) return true;
    return true;
  });

  // Manipulação dos itens da entrada
  const handleAddItem = () => {
    const embNomeInit = 'Caixa';
    const conesInit = '6';

    setItens(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        fioId: '',
        fioNome: '',
        tipo: '',
        cor: '',
        lote: '',
        tipoEmbalagem: embNomeInit,
        quantidadeEmbalagens: '1',
        conesPorEmbalagem: conesInit,
        pesoKg: '',
        classificacao: 'MATERIAL_NOVO'
      }
    ]);
  };

  const handleRemoveItem = (idToRemove: string) => {
    if (itens.length <= 1) {
      toast.error('A entrada deve conter pelo menos 1 item');
      return;
    }
    setItens(prev => prev.filter(item => item.id !== idToRemove));
  };

  const handleItemChange = (id: string, field: keyof ItemFormRow, value: string) => {
    setItens(prev => prev.map(item => {
      if (item.id !== id) return item;

      if (field === 'fioId') {
        const fioSel = fiosTecnicos.find(f => String(f.id) === String(value));
        if (fioSel) {
          return {
            ...item,
            fioId: fioSel.id,
            fioNome: `${fioSel.titulo} - ${fioSel.tipo}`,
            tipo: fioSel.tipo,
            cor: item.cor || fioSel.cor || ''
          };
        } else {
          return {
            ...item,
            fioId: '',
            fioNome: '',
            tipo: ''
          };
        }
      }

      // Ao trocar o tipo de embalagem
      if (field === 'tipoEmbalagem') {
        return {
          ...item,
          tipoEmbalagem: value
        };
      }

      return {
        ...item,
        [field]: value
      };
    }));
  };

  // Cálculos de totais da entrada
  const totalEmbalagens = itens.reduce((acc, it) => acc + (parseInt(it.quantidadeEmbalagens, 10) || 0), 0);
  const totalConesGeral = itens.reduce((acc, it) => {
    const emb = parseInt(it.quantidadeEmbalagens, 10) || 0;
    const cones = parseInt(it.conesPorEmbalagem, 10) || 0;
    return acc + (emb * cones);
  }, 0);
  const totalPesoKg = itens.reduce((acc, it) => acc + (parseFloat(it.pesoKg.replace(',', '.')) || 0), 0);
  const pesoMedioGeral = totalConesGeral > 0 ? (totalPesoKg / totalConesGeral) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId) {
      toast.error('Selecione o Cliente');
      return;
    }

    if (!numeroNf.trim()) {
      toast.error('Informe o número da Nota Fiscal');
      return;
    }

    if (!dataEntrada) {
      toast.error('Informe a Data de Entrada');
      return;
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item à entrada');
      return;
    }

    // Validar cada item
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      if (!it.fioNome.trim()) {
        toast.error(`Item ${i + 1}: Selecione um Fio do cadastro técnico`);
        return;
      }
      if (!it.cor.trim()) {
        toast.error(`Item ${i + 1}: Informe a Cor do fio`);
        return;
      }
      if (!it.lote.trim()) {
        toast.error(`Item ${i + 1}: Informe o Lote do material`);
        return;
      }
      const emb = parseInt(it.quantidadeEmbalagens, 10);
      if (isNaN(emb) || emb <= 0) {
        toast.error(`Item ${i + 1}: Quantidade de embalagens deve ser maior que zero`);
        return;
      }
      const conesPorEmb = parseInt(it.conesPorEmbalagem, 10);
      if (isNaN(conesPorEmb) || conesPorEmb <= 0) {
        toast.error(`Item ${i + 1}: Cones por embalagem deve ser maior que zero`);
        return;
      }
      const peso = parseFloat(it.pesoKg.replace(',', '.'));
      if (isNaN(peso) || peso <= 0) {
        toast.error(`Item ${i + 1}: Peso em kg deve ser maior que zero`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const clienteSel = clientes.find(c => String(c.id) === String(clienteId));
      const clienteNome = clientePreselecionado?.nome || clienteSel?.nome || clienteSel?.razao_social || clienteSel?.nome_fantasia || 'Cliente';

      await salvarEntradaMercadoria({
        clienteId,
        clienteNome,
        numeroNf: numeroNf.trim(),
        dataEntrada,
        itens: itens.map(it => {
          const qtdEmb = parseInt(it.quantidadeEmbalagens, 10);
          const conesEmb = parseInt(it.conesPorEmbalagem, 10);
          const totalCones = qtdEmb * conesEmb;
          const pesoKg = parseFloat(it.pesoKg.replace(',', '.'));
          const pesoMedioConeKg = totalCones > 0 ? pesoKg / totalCones : 0;

          return {
            fioId: it.fioId || undefined,
            fioNome: it.fioNome.trim(),
            tipo: it.tipo || undefined,
            cor: it.cor.trim().toUpperCase(),
            lote: it.lote.trim().toUpperCase(),
            tipoEmbalagem: it.tipoEmbalagem || 'Caixa',
            quantidadeEmbalagens: qtdEmb,
            conesPorEmbalagem: conesEmb,
            totalCones,
            pesoKg,
            pesoMedioConeKg: Number(pesoMedioConeKg.toFixed(4)),
            classificacao: it.classificacao || 'MATERIAL_NOVO',
            quantidadeCaixas: qtdEmb
          };
        })
      });

      toast.success('Entrada de mercadoria registrada e lotes inteligentes atualizados com sucesso!');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar entrada:', err);
      toast.error('Erro ao registrar entrada: ' + (err.message || 'Falha desconhecida'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const clienteAtual = clientes.find(c => String(c.id) === String(clienteId));
  const nomeClienteExibicao = clientePreselecionado?.nome || clienteAtual?.razao_social || clienteAtual?.nome_fantasia || clienteAtual?.nome;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-5xl my-4 flex flex-col max-h-[94vh] shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Package className="w-5 h-5 text-blue-500" />
              Entrada Inteligente de Matéria-Prima
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Sprint 3.4 — Lançamento de NF com lote, tipo de embalagem, cones e cálculo automático do peso médio por cone
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com scroll interno */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Dados Gerais da Nota Fiscal */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Cabeçalho da Nota Fiscal
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cliente */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Cliente <span className="text-blue-400">*</span>
                </label>
                {clientePreselecionado ? (
                  <div className="w-full bg-neutral-900 border border-neutral-700/80 text-white rounded-xl py-3 px-4 text-sm font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">{nomeClienteExibicao}</span>
                  </div>
                ) : (
                  <select
                    required
                    value={clienteId}
                    onChange={e => setClienteId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.razao_social || c.nome_fantasia || c.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Nota Fiscal */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Nota Fiscal <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: NF-10482"
                    value={numeroNf}
                    onChange={e => setNumeroNf(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Data da Entrada */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Data de Entrada <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="date"
                    required
                    value={dataEntrada}
                    onChange={e => setDataEntrada(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Múltiplos Itens de Matéria-Prima */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Itens da Entrada ({itens.length})
                </h3>
                <p className="text-xs text-neutral-400">
                  Preencha os dados do material. Cones totais e peso médio são calculados automaticamente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Outro Fio
              </button>
            </div>

            {/* Lista de cards de itens */}
            <div className="space-y-4">
              {itens.map((item, index) => {
                const qtdEmbNum = parseInt(item.quantidadeEmbalagens, 10) || 0;
                const conesEmbNum = parseInt(item.conesPorEmbalagem, 10) || 0;
                const totalConesCalc = qtdEmbNum * conesEmbNum;
                const pesoKgNum = parseFloat(item.pesoKg.replace(',', '.')) || 0;
                const pesoMedioCalc = totalConesCalc > 0 ? (pesoKgNum / totalConesCalc) : 0;

                return (
                  <div
                    key={item.id}
                    className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 space-y-4 transition-colors hover:border-neutral-700/80"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-black flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                          Item de Matéria-Prima
                        </span>
                      </div>

                      {itens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-neutral-500 hover:text-red-400 text-xs flex items-center gap-1 p-1 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover item
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Fio */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                          Fio (Cadastro Técnico) *
                        </label>
                        <select
                          required
                          value={item.fioId}
                          onChange={e => handleItemChange(item.id, 'fioId', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione o fio existente...</option>
                          {fiosDisponiveis.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.titulo} - {f.tipo} {f.cor ? `(${f.cor})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cor */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                          Cor *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: BRANCO, PRETO, CRU"
                          value={item.cor}
                          onChange={e => handleItemChange(item.id, 'cor', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 px-3 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Lote */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                          Lote *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: LT-44910"
                          value={item.lote}
                          onChange={e => handleItemChange(item.id, 'lote', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 px-3 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Tipo de Embalagem */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                          Tipo de Embalagem *
                        </label>
                        <select
                          required
                          value={item.tipoEmbalagem}
                          onChange={e => handleItemChange(item.id, 'tipoEmbalagem', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TIPOS_EMBALAGEM.map(tipo => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantidade de Embalagens */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                          Qtd. Embalagens *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          placeholder="Ex: 10"
                          value={item.quantidadeEmbalagens}
                          onChange={e => handleItemChange(item.id, 'quantidadeEmbalagens', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 px-3 text-sm font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Cones por Embalagem (Editável) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                            Cones / Embalagem *
                          </label>
                          <span className="text-[9px] text-blue-400 font-bold uppercase">Editável</span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          placeholder="Cones"
                          value={item.conesPorEmbalagem}
                          onChange={e => handleItemChange(item.id, 'conesPorEmbalagem', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 px-3 text-sm font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Peso Líquido (kg) */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                          Peso Líquido (kg) *
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.01"
                          required
                          placeholder="0.000"
                          value={item.pesoKg}
                          onChange={e => handleItemChange(item.id, 'pesoKg', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 px-3 text-sm font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Classificação da Matéria-Prima (Item 3) */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                          Classificação da Matéria-Prima *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {CLASSIFICACOES_MATERIA_PRIMA.map(c => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => handleItemChange(item.id, 'classificacao', c.value)}
                              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center truncate ${
                                item.classificacao === c.value
                                  ? `${c.badgeColor} border-current ring-1 ring-current`
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inteligência Automática do Item (Total Cones + Peso Médio) */}
                      <div className="sm:col-span-2 bg-blue-950/30 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-blue-400 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total de Cones</span>
                            <span className="text-sm font-mono font-black text-white">
                              {totalConesCalc} <span className="text-xs font-normal text-neutral-400">cones</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Peso Médio do Cone</span>
                          <span className="text-sm font-mono font-black text-emerald-400">
                            {pesoMedioCalc > 0 ? `${pesoMedioCalc.toFixed(3)} kg` : '—'}
                          </span>
                          <span className="text-[9px] text-neutral-500 block">Calculado automaticamente</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totais Consolidados da Entrada */}
          <div className="bg-gradient-to-r from-blue-950/40 via-neutral-950/60 to-neutral-950/40 border border-blue-500/20 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-neutral-300 text-xs">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <p className="font-bold text-white">Cálculo Inteligente de Estoque</p>
                <p className="text-neutral-400 text-[11px]">
                  Os lotes serão disponibilizados imediatamente com rastreabilidade total para o Programador simular a produção.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-mono shrink-0 ml-auto">
              <div className="text-right">
                <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">Total Embalagens</span>
                <span className="text-base font-bold text-white">{totalEmbalagens} un</span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">Total de Cones</span>
                <span className="text-base font-bold text-blue-400">{totalConesGeral} cones</span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">Peso Líquido Total</span>
                <span className="text-base font-black text-emerald-400">{totalPesoKg.toFixed(3)} kg</span>
              </div>
              <div className="text-right border-l border-neutral-800 pl-4">
                <span className="text-neutral-400 block text-[10px] uppercase font-sans font-bold">Média do Cone</span>
                <span className="text-base font-black text-purple-400">{pesoMedioGeral.toFixed(3)} kg</span>
              </div>
            </div>
          </div>
        </form>

        {/* Rodapé do Modal */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Registrando Entrada...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Entrada ({itens.length} {itens.length === 1 ? 'item' : 'itens'})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
