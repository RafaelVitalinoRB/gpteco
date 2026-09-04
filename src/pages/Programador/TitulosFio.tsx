import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const TIPOS_FIO = [
  'ALGODÃO',
  'POLIÉSTER',
  'MONOFILAMENTO',
  'ETIQUETA TORÇÃO S',
  'ETIQUETA TORÇÃO Z',
  'NYLON',
  'ELASTANO'
];

export default function TitulosFio() {
  const [titulos, setTitulos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cliente_id: '',
    titulo: '',
    tipo: 'POLIÉSTER',
    cor: '',
    observacoes: ''
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: clientesData, error: clientesErr } = await supabase
        .from('clientes')
        .select('id, nome, razao_social, nome_fantasia')
        .order('nome', { ascending: true });
      if (clientesErr) throw clientesErr;
      setClientes(clientesData || []);

      const { data: titulosData, error: titulosErr } = await supabase
        .from('titulos_fio')
        .select('*, clientes(nome, razao_social, nome_fantasia)')
        .order('criado_em', { ascending: false });
      if (titulosErr) throw titulosErr;
      setTitulos(titulosData || []);
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (titulo?: any) => {
    if (titulo) {
      setFormData({
        cliente_id: titulo.cliente_id?.toString() || '',
        titulo: titulo.titulo || '',
        tipo: titulo.tipo || 'POLIÉSTER',
        cor: titulo.cor || '',
        observacoes: titulo.observacoes || ''
      });
      setEditingId(titulo.id);
    } else {
      setFormData({
        cliente_id: '',
        titulo: '',
        tipo: 'POLIÉSTER',
        cor: '',
        observacoes: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.titulo || !formData.tipo) {
      toast.error('Preencha os campos obrigatórios (*)');
      return;
    }

    try {
      const dbData = {
        cliente_id: formData.cliente_id,
        titulo: formData.titulo.trim().toUpperCase(),
        tipo: formData.tipo,
        cor: formData.cor || null,
        observacoes: formData.observacoes || null
      };

      const { error } = editingId
        ? await supabase.from('titulos_fio').update(dbData).eq('id', Number(editingId))
        : await supabase.from('titulos_fio').insert([dbData]);

      if (error) throw error;

      toast.success(editingId ? 'Título atualizado' : 'Título criado');
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar título:', err);
      toast.error('Erro ao salvar: ' + err.message);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Excluir este título de fio? Isso pode afetar especificações vinculadas.')) return;
    try {
      const { error } = await supabase.from('titulos_fio').delete().eq('id', Number(id));
      if (error) throw error;
      toast.success('Título excluído');
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao excluir título:', err);
      toast.error('Erro ao excluir: ' + err.message);
    }
  };

  const filteredTitulos = titulos.filter(t => {
    const search = searchTerm.toLowerCase();
    const clienteNome = (t.clientes?.nome || t.clientes?.razao_social || '').toLowerCase();
    return t.titulo?.toLowerCase().includes(search) || 
           t.tipo?.toLowerCase().includes(search) ||
           clienteNome.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Títulos de Fio</h1>
          <p className="text-neutral-400 mt-1">Gerencie os títulos por cliente</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Título
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, título ou tipo..."
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
            Carregando títulos...
          </div>
        ) : filteredTitulos.map(titulo => (
          <div key={titulo.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-1">
                  {titulo.clientes?.nome || titulo.clientes?.nome_fantasia || 'Cliente Removido'}
                </h3>
                <div className="flex flex-col">
                  <p className="text-2xl font-black text-white">{titulo.titulo}</p>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">{titulo.tipo}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(titulo)} className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(titulo.id)} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm flex-1 bg-black/20 p-4 rounded-xl border border-white/5 mt-4">
              <div>
                <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest block mb-1">Cor</span>
                <span className="text-white font-bold">{titulo.cor || '-'}</span>
              </div>
              {titulo.observacoes && (
                <div>
                  <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest block mb-1">Observações</span>
                  <span className="text-neutral-300 text-xs">{titulo.observacoes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {!isLoading && filteredTitulos.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500">
            Nenhum título encontrado.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-neutral-800/50 bg-neutral-950/50">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {editingId ? 'Editar Título' : 'Novo Título de Fio'}
                </h2>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Configuração básica do fio</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white p-2 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Cliente *</label>
                  <select
                    required
                    value={formData.cliente_id}
                    onChange={e => setFormData({...formData, cliente_id: e.target.value})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome || c.razao_social}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Tipo de Fio *</label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={e => setFormData({...formData, tipo: e.target.value})}
                      className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-bold"
                    >
                      {TIPOS_FIO.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Título *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 150/48"
                      value={formData.titulo}
                      onChange={e => setFormData({...formData, titulo: e.target.value})}
                      className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Cor</label>
                    <input
                      type="text"
                      placeholder="Ex: Natural"
                      value={formData.cor}
                      onChange={e => setFormData({...formData, cor: e.target.value})}
                      className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={e => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold resize-none h-24"
                    placeholder="Notas adicionais sobre o fio..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-6 pt-6 border-t border-neutral-800/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-neutral-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                  Salvar Título
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
