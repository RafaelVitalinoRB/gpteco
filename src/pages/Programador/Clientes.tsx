import React, { useState, useEffect } from 'react';
import { Cliente } from '../../types';
import { generateId } from '../../lib/utils';
import { TIPOS_FIO } from '../../lib/calculations';
import { Plus, Search, Edit2, Trash2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('gerais');
  const [fiosCliente, setFiosCliente] = useState<any[]>([]);
  const [fioFormData, setFioFormData] = useState({
    titulo: '',
    tipo: '',
    cor: '',
    observacoes: ''
  });

  const [formData, setFormData] = useState({
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    ie: '',
    cep: '',
    endereco: '',
    cidade: '',
    estado: '',
    contato: '',
    telefone: '',
    email: '',
    observacoes_comerciais: '',
    valor_por_rolo: 0,
    tipo_cobranca: 'ROLO',
    status: 'ATIVO'
  });

  const fetchClientes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (err: any) {
      console.error('Erro Supabase clientes:', err);
      toast.error('Erro ao buscar clientes: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const filteredClientes = clientes.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (cliente?: any) => {
    setActiveTab('dados');
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        razao_social: cliente.razao_social || '',
        nome_fantasia: cliente.nome_fantasia || '',
        cnpj: cliente.cnpj || '',
        ie: cliente.ie || '',
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        contato: cliente.contato || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        observacoes_comerciais: cliente.observacoes_comerciais || '',
        valor_por_rolo: cliente.valor_por_rolo || 0,
        tipo_cobranca: cliente.tipo_cobranca || 'ROLO',
        status: cliente.status || 'ATIVO'
      });
      setEditingId(cliente.id);
    } else {
      setFormData({
        nome: '',
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        ie: '',
        cep: '',
        endereco: '',
        cidade: '',
        estado: '',
        contato: '',
        telefone: '',
        email: '',
        observacoes_comerciais: '',
        valor_por_rolo: 0,
        tipo_cobranca: 'ROLO',
        status: 'ATIVO'
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const nomeCliente = formData.nome || formData.razao_social || formData.nome_fantasia;
    if (!nomeCliente || nomeCliente.trim() === '') {
      alert('Informe o nome do cliente');
      return;
    }

    try {
      console.log('Enviando payload para clientes:', formData);

      const { error } = editingId
        ? await supabase.from('clientes').update(formData).eq('id', Number(editingId))
        : await supabase.from('clientes').insert([formData]);

      if (error) {
        console.error('Supabase error:', error);
        console.error('Supabase error message:', error.message);
        console.error('Supabase error details:', error.details);
        console.error('Supabase error hint:', error.hint);
        console.error('Supabase error code:', error.code);
        toast.error('Erro ao salvar cliente: ' + error.message);
        return;
      }

      toast.success('Cliente salvo com sucesso');
      setIsModalOpen(false);
      fetchClientes();
    } catch (err: any) {
      console.error('Exceção nome (err.name):', err?.name);
      console.error('Exceção mensagem (err.message):', err?.message);
      console.error('Exceção completa:', err);
      toast.error('Erro ao salvar cliente: ' + (err?.message || JSON.stringify(err)));
    }
  };

  const excluirCliente = async (id: string | number) => {
    console.log('CLIQUE DETECTADO', id);
    const confirmar = window.confirm('Deseja realmente excluir este cliente?');
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error('Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente: ' + error.message);
        return;
      }

      toast.success('Cliente excluído');
      await fetchClientes();
    } catch (err: any) {
      console.error('Erro Supabase clientes:', err);
      toast.error('Erro ao excluir cliente: ' + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clientes</h1>
          <p className="text-neutral-400 mt-1">Gerencie os clientes da empresa</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por razão social ou nome fantasia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClientes.map(cliente => (
          <div key={cliente.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{cliente.razao_social || cliente.nome_fantasia || cliente.nome || 'Cliente sem nome'}</h3>
                <p className="text-sm text-neutral-400">{cliente.cnpj}</p>
              </div>
              <div className="flex gap-2 relative z-10">
                <button type="button" onClick={() => handleOpenModal(cliente)} className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors cursor-pointer relative z-10">
                  <Edit2 className="w-4 h-4" pointerEvents="none" />
                </button>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); excluirCliente(cliente.id); }} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer relative z-10">
                  <Trash2 className="w-4 h-4" pointerEvents="none" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Contato:</span>
                <span className="text-neutral-300">{cliente.contato || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Telefone:</span>
                <span className="text-neutral-300">{cliente.telefone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Cidade:</span>
                <span className="text-neutral-300">{cliente.cidade || '-'}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredClientes.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h2 className="text-2xl font-bold text-white">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex border-b border-neutral-800 px-6 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('dados')}
                className={`py-4 mr-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dados' ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                Dados
              </button>
              <button
                onClick={() => setActiveTab('endereco')}
                className={`py-4 mr-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'endereco' ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                Endereço
              </button>
              <button
                onClick={() => setActiveTab('comercial')}
                className={`py-4 mr-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'comercial' ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                Comercial
              </button>
              <button
                onClick={() => setActiveTab('cobranca')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'cobranca' ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                Cobrança
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'dados' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Razão Social *</label>
                      <input type="text" required value={formData.razao_social} onChange={e => setFormData({...formData, razao_social: e.target.value, nome: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Nome Fantasia</label>
                      <input type="text" value={formData.nome_fantasia} onChange={e => setFormData({...formData, nome_fantasia: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">CNPJ</label>
                      <input type="text" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Inscrição Estadual</label>
                      <input type="text" value={formData.ie} onChange={e => setFormData({...formData, ie: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        <option value="ATIVO">Ativo</option>
                        <option value="INATIVO">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'endereco' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">CEP</label>
                      <input type="text" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Endereço</label>
                      <input type="text" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Cidade</label>
                      <input type="text" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Estado</label>
                      <input type="text" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comercial' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Contato</label>
                      <input type="text" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Telefone</label>
                      <input type="text" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">E-mail</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Observações Comerciais</label>
                      <textarea value={formData.observacoes_comerciais} onChange={e => setFormData({...formData, observacoes_comerciais: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cobranca' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Tipo de Cobrança</label>
                      <select value={formData.tipo_cobranca} onChange={e => setFormData({...formData, tipo_cobranca: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        <option value="ROLO">Por Rolo</option>
                        <option value="METRO">Por Metro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Valor (R$)</label>
                      <input type="number" step="0.01" value={formData.valor_por_rolo} onChange={e => setFormData({...formData, valor_por_rolo: parseFloat(e.target.value) || 0})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-4 border-t border-neutral-800 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-neutral-400 hover:text-white font-medium transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20">
                  {editingId ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
