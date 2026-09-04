import React, { useState, useEffect } from 'react';
import { calcularPente } from '../../lib/calculations';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export default function Especificacoes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [especificacoes, setEspecificacoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [titulosFio, setTitulosFio] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: clientesData } = await supabase.from('clientes').select('id, nome, razao_social, nome_fantasia').order('nome');
      setClientes(clientesData || []);

      const { data: titulosData } = await supabase.from('titulos_fio').select('*').order('titulo');
      setTitulosFio(titulosData || []);

      const { data: espData, error: espErr } = await supabase
        .from('especificacoes')
        .select('*, clientes(nome, razao_social, nome_fantasia), titulos_fio(titulo, tipo)')
        .order('id', { ascending: false });
      
      if (espErr) throw espErr;
      setEspecificacoes(espData || []);
    } catch (err: any) {
      console.error('Erro ao buscar especificações:', err);
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [formData, setFormData] = useState<any>({
    cliente_id: '',
    titulo_fio_id: '',
    total_fios: 0,
    pente: 0,
    avanco: 0,
    abertura: 0,
    largura: 0,
    faca: 0,
    is_desenho: false,
    observacoes_tecnicas: '',
    composicao: []
  });

  const [inputValues, setInputValues] = useState({
    faca: '',
    avanco: '',
    abertura: '',
    largura: '',
    pente: ''
  });

  const handleOpenModal = (esp?: any) => {
    if (esp) {
      setFormData({
        cliente_id: esp.cliente_id?.toString() || '',
        titulo_fio_id: esp.titulo_fio_id?.toString() || '',
        total_fios: esp.total_fios || 0,
        pente: esp.pente || 0,
        avanco: esp.avanco || 0,
        abertura: esp.abertura || 0,
        largura: esp.largura || 0,
        faca: esp.faca || 0,
        is_desenho: esp.is_desenho || false,
        observacoes_tecnicas: esp.observacoes_tecnicas || '',
        composicao: esp.composicao || []
      });
      setInputValues({
        faca: esp.faca?.toString() || '',
        avanco: esp.avanco?.toString() || '',
        abertura: esp.abertura?.toString() || '',
        largura: esp.largura?.toString() || '',
        pente: esp.pente?.toString() || ''
      });
      setEditingId(esp.id);
    } else {
      setFormData({
        cliente_id: '',
        titulo_fio_id: '',
        total_fios: 0,
        pente: 0,
        avanco: 0,
        abertura: 0,
        largura: 0,
        faca: 0,
        is_desenho: false,
        observacoes_tecnicas: '',
        composicao: []
      });
      setInputValues({
        faca: '',
        avanco: '',
        abertura: '',
        largura: '',
        pente: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const parseDecimal = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(',', '.'));
  };

  const handleInputChange = (field: string, value: string) => {
    setInputValues(prev => ({ ...prev, [field]: value }));
    const numValue = parseDecimal(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const filteredEsp = especificacoes.filter(e => {
    const search = searchTerm.toLowerCase();
    const clienteNome = (e.clientes?.nome || e.clientes?.razao_social || '').toLowerCase();
    const tituloFio = (e.titulos_fio?.titulo || '').toLowerCase();
    return clienteNome.includes(search) || tituloFio.includes(search);
  });

  const handleCalculatePente = () => {
    const titulo = titulosFio.find(t => t.id.toString() === formData.titulo_fio_id.toString());
    if (formData.total_fios && formData.largura) {
      const resultado = calcularPente(formData.total_fios, formData.largura, titulo?.tipo);
      
      // Extract numeric value safely if it's an object or a number/string
      const valorBruto = typeof resultado === 'object' && resultado !== null
        ? ((resultado as any).pente ?? (resultado as any).valor ?? 0)
        : resultado;

      const valorNumerico = typeof valorBruto === 'number'
        ? valorBruto
        : parseFloat(String(valorBruto)) || 0;

      // Exibir o resultado com no máximo 2 casas decimais, converting . to ,
      const penteFormatado = Number(valorNumerico.toFixed(2)).toString().replace('.', ',');

      setFormData(prev => ({ ...prev, pente: Number(valorNumerico.toFixed(2)) }));
      setInputValues(prev => ({ ...prev, pente: penteFormatado }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.titulo_fio_id) {
      toast.error('Selecione o Cliente e o Título do Fio');
      return;
    }

    try {
      const { error } = editingId
        ? await supabase.from('especificacoes').update(formData).eq('id', Number(editingId))
        : await supabase.from('especificacoes').insert([formData]);

      if (error) throw error;
      toast.success(editingId ? 'Especificação atualizada' : 'Especificação criada');
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar: ' + err.message);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Excluir esta especificação?')) return;
    try {
      const { error } = await supabase.from('especificacoes').delete().eq('id', Number(id));
      if (error) throw error;
      toast.success('Especificação excluída');
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      toast.error('Erro ao excluir: ' + err.message);
    }
  };

  const availableTitulos = titulosFio.filter(t => t.cliente_id?.toString() === formData.cliente_id.toString());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Especificações Técnicas</h1>
          <p className="text-neutral-400 mt-1">Configurações de tecelagem por título de fio</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Nova Especificação
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por cliente ou título de fio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-neutral-500 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Carregando especificações...
          </div>
        ) : filteredEsp.map(esp => (
          <div key={esp.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-1">
                  {esp.clientes?.nome || 'Cliente Removido'}
                </h3>
                <div className="flex flex-col">
                  <p className="text-2xl font-black text-white">{esp.titulos_fio?.titulo || 'Título Removido'}</p>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">{esp.titulos_fio?.tipo}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(esp)} className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(esp.id)} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10px] flex-1 bg-black/20 p-4 rounded-xl border border-white/5 mt-4 font-black uppercase tracking-widest text-neutral-500">
              <div className="flex flex-col">
                <span>Fios</span>
                <span className="text-white text-base">{esp.total_fios}</span>
              </div>
              <div className="flex flex-col">
                <span>Pente</span>
                <span className="text-white text-base">{esp.pente}</span>
              </div>
              <div className="flex flex-col">
                <span>Largura</span>
                <span className="text-white text-base">{esp.largura}cm</span>
              </div>
              <div className="flex flex-col">
                <span>Avanço</span>
                <span className="text-white text-base">{esp.avanco}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden mt-8 mb-8">
            <div className="flex justify-between items-center p-8 border-b border-neutral-800/50 bg-neutral-950/50">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {editingId ? 'Editar Especificação' : 'Nova Especificação Técnica'}
                </h2>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Setup técnico de tecelagem</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Cliente *</label>
                  <select
                    required
                    value={formData.cliente_id}
                    onChange={e => setFormData({...formData, cliente_id: e.target.value, titulo_fio_id: ''})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome || c.razao_social}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Título do Fio *</label>
                  <select
                    required
                    disabled={!formData.cliente_id}
                    value={formData.titulo_fio_id}
                    onChange={e => setFormData({...formData, titulo_fio_id: e.target.value})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold disabled:opacity-50"
                  >
                    <option value="">Selecione o Título</option>
                    {availableTitulos.map(t => (
                      <option key={t.id} value={t.id}>{t.titulo} ({t.tipo})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Total Fios</label>
                    <input type="number" value={formData.total_fios || ''} onChange={e => setFormData({...formData, total_fios: parseInt(e.target.value) || 0})} onBlur={handleCalculatePente} className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Largura (cm)</label>
                    <input type="text" value={inputValues.largura} onChange={e => handleInputChange('largura', e.target.value)} onBlur={handleCalculatePente} className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={handleCalculatePente} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-2xl font-black text-[8px] uppercase tracking-widest transition-colors mb-0.5">
                      Recalcular Pente
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 md:col-span-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Pente</label>
                    <input type="text" value={inputValues.pente} onChange={e => handleInputChange('pente', e.target.value)} className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-center" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Faca</label>
                    <input type="text" value={inputValues.faca} onChange={e => handleInputChange('faca', e.target.value)} className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold text-center" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Avanço</label>
                    <input type="text" value={inputValues.avanco} onChange={e => handleInputChange('avanco', e.target.value)} className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold text-center" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Abertura</label>
                    <input type="text" value={inputValues.abertura} onChange={e => handleInputChange('abertura', e.target.value)} className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold text-center" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Observações Técnicas</label>
                  <textarea value={formData.observacoes_tecnicas} onChange={e => setFormData({...formData, observacoes_tecnicas: e.target.value})} className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold resize-none h-20" placeholder="Ex: Ajuste de tensão do fio..." />
                </div>

                <div className="flex items-center md:col-span-2">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <input type="checkbox" checked={formData.is_desenho} onChange={e => setFormData({...formData, is_desenho: e.target.checked})} className="w-6 h-6 rounded-lg border-neutral-800 bg-black text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900 transition-all cursor-pointer" />
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Ativar Composição de Desenho</span>
                  </label>
                </div>

                {formData.is_desenho && (
                  <div className="md:col-span-2 space-y-4 bg-black/50 p-6 rounded-3xl border border-neutral-800">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Estrutura do Desenho</h4>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, composicao: [...(formData.composicao || []), { fio: '', quantidade: 0 }]})}
                        className="text-[9px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Fio
                      </button>
                    </div>
                    {formData.composicao?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 items-end bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/50">
                        <div className="flex-1">
                          <label className="block text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Título do Fio</label>
                          <input type="text" value={item.fio} onChange={e => {
                            const newComp = [...(formData.composicao || [])];
                            newComp[idx].fio = e.target.value;
                            setFormData({...formData, composicao: newComp});
                          }} className="w-full bg-black border border-neutral-800 text-white rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold text-xs" />
                        </div>
                        <div className="w-24">
                          <label className="block text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Qtd Fios</label>
                          <input type="number" value={item.quantidade || ''} onChange={e => {
                            const newComp = [...(formData.composicao || [])];
                            newComp[idx].quantidade = parseInt(e.target.value) || 0;
                            setFormData({...formData, composicao: newComp});
                          }} className="w-full bg-black border border-neutral-800 text-white rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold text-xs" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, composicao: formData.composicao?.filter((_: any, i: number) => i !== idx)})}
                          className="p-2 text-neutral-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-6 pt-6 border-t border-neutral-800/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-neutral-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                  Concluir Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
