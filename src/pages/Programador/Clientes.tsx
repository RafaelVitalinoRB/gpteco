import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Cliente } from '../../types';
import { generateId } from '../../lib/utils';
import { TIPOS_FIO } from '../../lib/calculations';
import { Search, Eye, X, Building2, Info, ArrowUpRight } from 'lucide-react';
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

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const lastSearchedCepRef = useRef<string>('');

  const buscarCep = async (cepDigits: string) => {
    if (isSearchingCep) return;
    lastSearchedCepRef.current = cepDigits;

    try {
      setIsSearchingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      if (!res.ok) {
        throw new Error('Falha ao consultar CEP');
      }
      const data = await res.json();

      if (data.erro === true || data.erro === 'true') {
        toast.error('CEP não encontrado');
        return;
      }

      const logradouro = data.logradouro || '';
      const bairro = data.bairro || '';
      const enderecoMontado = logradouro && bairro 
        ? `${logradouro} - ${bairro}` 
        : (logradouro || bairro);

      setFormData(prev => ({
        ...prev,
        endereco: enderecoMontado || prev.endereco,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado
      }));

      toast.success('Endereço preenchido!');
    } catch (err) {
      console.error('Erro ao consultar ViaCEP:', err);
      // Em caso de erro, permitir preenchimento manual sem bloquear o cadastro
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setFormData(prev => ({ ...prev, cep: rawValue }));

    const cleanCep = rawValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      if (cleanCep !== lastSearchedCepRef.current) {
        buscarCep(cleanCep);
      }
    } else {
      lastSearchedCepRef.current = '';
    }
  };

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
        observacoes_comerciais: cliente.observacoes_comerciais || cliente.observacoes || '',
        valor_por_rolo: cliente.valor_por_rolo || 0,
        tipo_cobranca: cliente.tipo_cobranca || 'ROLO',
        status: cliente.status || 'ATIVO'
      });
      setEditingId(cliente.id);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clientes</h1>
          <p className="text-neutral-400 mt-1">Consulta aos clientes cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/escritorio/clientes"
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Gerenciar no Escritório</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
          </Link>
        </div>
      </div>

      {/* Aviso informativo de centralização da Sprint 3.1A */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between text-xs text-blue-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Modo Consulta (Programador):</strong> A criação, edição e gestão de clientes e estoques de matéria-prima foram centralizadas no módulo <strong>Escritório</strong>.
          </span>
        </div>
        <Link to="/escritorio/clientes" className="font-semibold underline hover:text-white shrink-0 ml-4">
          Ir para Escritório &rarr;
        </Link>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por razão social ou nome fantasia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClientes.map(cliente => (
          <div key={cliente.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-white truncate">{cliente.razao_social || cliente.nome_fantasia || cliente.nome || 'Cliente sem nome'}</h3>
                  <p className="text-sm font-mono text-neutral-400">{cliente.cnpj || 'CNPJ não informado'}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleOpenModal(cliente)} 
                  className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                  title="Visualizar dados do cliente"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Contato:</span>
                  <span className="text-neutral-300">{cliente.contato || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Telefone:</span>
                  <span className="text-neutral-300 font-mono">{cliente.telefone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cidade:</span>
                  <span className="text-neutral-300">{cliente.cidade || '-'}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-neutral-800/80 flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-mono">ID: {cliente.id}</span>
              <button
                type="button"
                onClick={() => handleOpenModal(cliente)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver Detalhes
              </button>
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
              <div>
                <h2 className="text-2xl font-bold text-white">Visualizar Ficha do Cliente</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Modo somente leitura para o perfil Programador</p>
              </div>
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
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Razão Social</label>
                      <input type="text" readOnly value={formData.razao_social} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 focus:outline-none cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Nome Fantasia</label>
                      <input type="text" readOnly value={formData.nome_fantasia} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 focus:outline-none cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">CNPJ</label>
                      <input type="text" readOnly value={formData.cnpj} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 font-mono cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Inscrição Estadual</label>
                      <input type="text" readOnly value={formData.ie} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 font-mono cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Status</label>
                      <input type="text" readOnly value={formData.status} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 cursor-default font-semibold" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'endereco' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">CEP</label>
                      <input 
                        type="text" 
                        readOnly
                        value={formData.cep} 
                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 font-mono cursor-default" 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Endereço</label>
                      <input type="text" readOnly value={formData.endereco} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Cidade</label>
                      <input type="text" readOnly value={formData.cidade} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Estado</label>
                      <input type="text" readOnly value={formData.estado} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 uppercase cursor-default" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comercial' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Contato</label>
                      <input type="text" readOnly value={formData.contato} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Telefone</label>
                      <input type="text" readOnly value={formData.telefone} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 font-mono cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">E-mail</label>
                      <input type="email" readOnly value={formData.email} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 cursor-default" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Observações Comerciais</label>
                      <textarea readOnly value={formData.observacoes_comerciais} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 h-24 resize-none cursor-default" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cobranca' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Tipo de Cobrança</label>
                      <input type="text" readOnly value={formData.tipo_cobranca === 'ROLO' ? 'Por Rolo' : 'Por Metro'} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Valor (R$)</label>
                      <input type="text" readOnly value={`R$ ${formData.valor_por_rolo.toFixed(2)}`} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl py-3 px-4 font-mono cursor-default" />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-between items-center border-t border-neutral-800 pt-6">
                <span className="text-xs text-neutral-500">
                  Para alterar cadastros ou gerenciar matéria-prima, acesse o módulo <strong>Escritório</strong>.
                </span>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-medium transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
