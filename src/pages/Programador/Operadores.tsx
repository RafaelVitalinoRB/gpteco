import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Operador } from '../../types';
import { Plus, Search, Edit2, Trash2, X, RefreshCw, AlertCircle, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { carregarOperadores as fetchOperadoresSupabase } from '../../hooks/useOperadores';

export default function Operadores() {
  const { rolos, ops, eventosProducao } = useStore();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingOp, setViewingOp] = useState<Operador | null>(null);
  const [viewTab, setViewTab] = useState<'DESEMPENHO' | 'DETALHES'>('DESEMPENHO');

  const [formData, setFormData] = useState<Partial<Operador>>({
    nome: '',
    maquinasAutorizadas: [],
    status: 'ATIVO',
  });

  const carregarOperadores = async () => {
    try {
      setIsLoading(true);
      const data = await fetchOperadoresSupabase(false);
      const mapped: Operador[] = (data || []).map((op: any) => ({
        id: String(op.id),
        nome: String(op.nome || ''),
        matricula: String(op.matricula || ''),
        status: (op.status || (op.ativo !== false ? 'ATIVO' : 'INATIVO')) as 'ATIVO' | 'INATIVO',
        maquinasAutorizadas: (op.maquinas_autorizadas || op.maquinasAutorizadas || ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4']) as any[],
        createdAt: op.criado_em || op.created_at || new Date().toISOString(),
        updatedAt: op.atualizado_em || op.updated_at || new Date().toISOString()
      }));
      setOperadores(mapped);
      setDbError(null);
    } catch (err: any) {
      console.warn('Aviso ao carregar operadores do Supabase:', err);
      setDbError(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarOperadores();

    const channelId = `admin_operadores_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operadores'
        },
        () => carregarOperadores()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usuarios'
        },
        () => carregarOperadores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getOpStats = (opId: string) => {
    const events = eventosProducao.filter(e => e.operadorId === opId);
    const portadasTotais = events.reduce((acc, e) => acc + (e.portadasNoEvento || 0), 0);
    const rolosProduzidos = events.filter(e => e.tipoEvento === 'FINALIZAR_ROLO').length;
    const rolosParticipados = Array.from(new Set(events.map(e => e.roloId))).length;
    return { portadasTotais, rolosProduzidos, rolosParticipados };
  };

  const filteredOperadores = operadores.filter(o => 
    o.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (op?: Operador) => {
    if (op) {
      setFormData({
        nome: op.nome,
        maquinasAutorizadas: op.maquinasAutorizadas || [],
        status: op.status
      });
      setEditingId(op.id);
    } else {
      setFormData({
        nome: '',
        maquinasAutorizadas: ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'],
        status: 'ATIVO',
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingId) {
        let { error } = await supabase
          .from('operadores')
          .update({
            nome: formData.nome.trim(),
            status: formData.status || 'ATIVO',
            ativo: formData.status === 'ATIVO',
            maquinas_autorizadas: formData.maquinasAutorizadas || ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'],
            atualizado_em: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error && error.code === 'PGRST205') {
          // Fallback para usuarios
          const { error: usrErr } = await supabase
            .from('usuarios')
            .update({
              nome: formData.nome.trim(),
              maquina: formData.maquinasAutorizadas?.[0] || 'MAQUINA 1'
            })
            .eq('id', editingId);
          if (usrErr) throw usrErr;
        } else if (error) {
          throw error;
        }

        toast.success('Operador atualizado no Supabase');
      } else {
        let { error } = await supabase
          .from('operadores')
          .insert([{
            nome: formData.nome.trim(),
            status: formData.status || 'ATIVO',
            ativo: formData.status === 'ATIVO',
            maquinas_autorizadas: formData.maquinasAutorizadas || ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4']
          }]);

        if (error && error.code === 'PGRST205') {
          // Fallback para usuarios
          const { error: usrErr } = await supabase
            .from('usuarios')
            .insert([{
              nome: formData.nome.trim(),
              usuario: formData.nome.toLowerCase().replace(/\s+/g, ''),
              senha: '123',
              tipo: 'OPERADOR',
              maquina: formData.maquinasAutorizadas?.[0] || 'MAQUINA 1'
            }]);
          if (usrErr) throw usrErr;
        } else if (error) {
          throw error;
        }

        toast.success('Operador cadastrado no Supabase');
      }
      setIsModalOpen(false);
      await carregarOperadores();
    } catch (err: any) {
      console.warn('Aviso ao salvar operador:', err);
      toast.error(`Erro ao salvar no Supabase: ${err.message || 'Falha na gravação'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja realmente excluir este operador do Supabase?')) {
      try {
        let { error } = await supabase
          .from('operadores')
          .delete()
          .eq('id', id);

        if (error && error.code === 'PGRST205') {
          const { error: usrErr } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', id);
          if (usrErr) throw usrErr;
        } else if (error) {
          throw error;
        }

        toast.success('Operador excluído do Supabase');
        await carregarOperadores();
      } catch (err: any) {
        console.warn('Aviso ao excluir operador:', err);
        toast.error(`Erro ao excluir no Supabase: ${err.message || 'Falha ao excluir'}`);
      }
    }
  };

  const toggleMaquina = (maquina: string) => {
    const current = formData.maquinasAutorizadas || [];
    if (current.includes(maquina as any)) {
      setFormData({ ...formData, maquinasAutorizadas: current.filter(m => m !== maquina) as any[] });
    } else {
      setFormData({ ...formData, maquinasAutorizadas: [...current, maquina] as any[] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Operadores</h1>
          <p className="text-neutral-400 mt-1">Gerencie os operadores e visualize o desempenho</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Operador
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {dbError && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 text-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-bold text-amber-300">Tabela de Operadores no Supabase</h3>
              <p className="text-sm text-amber-200/90 leading-relaxed">
                {dbError.includes('schema cache') || dbError.includes('not find')
                  ? 'A tabela public.operadores ainda precisa ser criada no Supabase SQL Editor. O script completo de migração já foi gerado em supabase/migrations/20260922_create_operadores.sql com suporte a Realtime.'
                  : `Erro de comunicação com o Supabase: ${dbError}`}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => carregarOperadores()}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-neutral-400 text-sm font-medium">Carregando operadores do Supabase...</p>
        </div>
      ) : filteredOperadores.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
          <p className="text-neutral-400 font-medium">Nenhum operador cadastrado.</p>
          <p className="text-neutral-500 text-xs mt-1">Clique em "Novo Operador" para cadastrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOperadores.map(op => (
            <div key={op.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
            {(() => {
              const stats = getOpStats(op.id);
              return (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{op.nome}</h3>
                      <div className="flex gap-1 mt-1">
                        {(op.maquinasAutorizadas || []).map(m => (
                          <span key={m} className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-xs">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setViewingOp(op)} className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors">
                        <Search className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenModal(op)} className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(op.id)} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center border-t border-neutral-800 pt-4 mt-4">
                    <div>
                      <span className="text-2xl font-bold text-white">{stats.portadasTotais}</span>
                      <span className="text-xs text-neutral-500 block mt-1">Portadas</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-blue-400">{stats.rolosProduzidos}</span>
                      <span className="text-xs text-neutral-500 block mt-1">Rolos</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-purple-400">{stats.rolosParticipados}</span>
                      <span className="text-xs text-neutral-500 block mt-1">Participações</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>)}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md my-8">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h2 className="text-2xl font-bold text-white">{editingId ? 'Editar Operador' : 'Novo Operador'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Nome *</label>
                <input type="text" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Máquinas Habilitadas</label>
                <div className="grid grid-cols-2 gap-3">
                  {['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4'].map(m => (
                    <label key={m} className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-colors ${formData.maquinasAutorizadas?.includes(m as any) ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}>
                      <input type="checkbox" className="hidden" checked={formData.maquinasAutorizadas?.includes(m as any)} onChange={() => toggleMaquina(m)} />
                      <span className="text-sm font-medium">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-neutral-400 hover:text-white font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingOp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <div>
                <h2 className="text-2xl font-bold text-white">{viewingOp.nome}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${viewingOp.status === 'ATIVO' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20'}`}>
                    {viewingOp.status}
                  </span>
                  {viewingOp.maquinasAutorizadas?.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setViewingOp(null)} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex border-b border-neutral-800">
              <button
                onClick={() => setViewTab('DESEMPENHO')}
                className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${viewTab === 'DESEMPENHO' ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                Desempenho
              </button>
              <button
                onClick={() => setViewTab('DETALHES')}
                className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${viewTab === 'DETALHES' ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                Detalhes (Histórico)
              </button>
            </div>

            <div className="p-6">
              {viewTab === 'DESEMPENHO' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {(() => {
                    const stats = getOpStats(viewingOp.id);
                    return (
                      <>
                        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 text-center">
                          <span className="text-4xl font-bold text-white block mb-2">{stats.portadasTotais}</span>
                          <span className="text-sm text-neutral-500">Portadas Totais</span>
                        </div>
                        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 text-center">
                          <span className="text-4xl font-bold text-blue-400 block mb-2">{stats.rolosProduzidos}</span>
                          <span className="text-sm text-neutral-500">Rolos Finalizados</span>
                        </div>
                        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 text-center">
                          <span className="text-4xl font-bold text-purple-400 block mb-2">{stats.rolosParticipados}</span>
                          <span className="text-sm text-neutral-500">Rolos Participados</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="bg-neutral-900/50 text-xs uppercase text-neutral-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Data/Hora</th>
                        <th className="px-6 py-4 font-medium">OP</th>
                        <th className="px-6 py-4 font-medium">Máquina</th>
                        <th className="px-6 py-4 font-medium">Rolo</th>
                        <th className="px-6 py-4 font-medium">Portadas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {rolos.filter(r => r.operadores.some(o => o.operadorId === viewingOp.id)).map(rolo => {
                        const op = ops.find(o => o.id === rolo.opId);
                        const opData = rolo.operadores.find(o => o.operadorId === viewingOp.id);
                        return (
                          <tr key={rolo.id} className="hover:bg-neutral-900 transition-colors">
                            <td className="px-6 py-4">{rolo.finalizadoEm ? new Date(rolo.finalizadoEm).toLocaleString() : (rolo.iniciadoEm ? new Date(rolo.iniciadoEm).toLocaleString() : '-')}</td>
                            <td className="px-6 py-4 text-white">{op?.codigo}</td>
                            <td className="px-6 py-4">{op?.maquina}</td>
                            <td className="px-6 py-4">Nº {rolo.numeroRolo}</td>
                            <td className="px-6 py-4 font-medium text-emerald-400">{opData?.portadas}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
