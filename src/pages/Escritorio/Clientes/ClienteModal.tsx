import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Search, MapPin, Building, Phone, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteParaEditar?: any | null;
  onSuccess: () => void;
}

export function ClienteModal({
  isOpen,
  onClose,
  clienteParaEditar,
  onSuccess
}: ClienteModalProps) {
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

  const [activeTab, setActiveTab] = useState<'DADOS' | 'ENDERECO' | 'CONTATO' | 'OBSERVACOES'>('DADOS');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSearchedCepRef = useRef<string>('');

  useEffect(() => {
    if (clienteParaEditar) {
      setFormData({
        nome: clienteParaEditar.nome || clienteParaEditar.razao_social || '',
        razao_social: clienteParaEditar.razao_social || clienteParaEditar.nome || '',
        nome_fantasia: clienteParaEditar.nome_fantasia || '',
        cnpj: clienteParaEditar.cnpj || '',
        ie: clienteParaEditar.ie || '',
        cep: clienteParaEditar.cep || '',
        endereco: clienteParaEditar.endereco || '',
        cidade: clienteParaEditar.cidade || '',
        estado: clienteParaEditar.estado || '',
        contato: clienteParaEditar.contato || '',
        telefone: clienteParaEditar.telefone || '',
        email: clienteParaEditar.email || '',
        observacoes_comerciais: clienteParaEditar.observacoes_comerciais || clienteParaEditar.observacoes || '',
        valor_por_rolo: clienteParaEditar.valor_por_rolo || 0,
        tipo_cobranca: clienteParaEditar.tipo_cobranca || 'ROLO',
        status: clienteParaEditar.status || 'ATIVO'
      });
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
    }
  }, [clienteParaEditar, isOpen]);

  const buscarCep = async (cepDigits: string) => {
    if (isSearchingCep) return;
    lastSearchedCepRef.current = cepDigits;

    try {
      setIsSearchingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      if (!res.ok) throw new Error('Falha ao consultar CEP');
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
      console.warn('Erro ao consultar ViaCEP:', err);
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomePrincipal = formData.razao_social.trim() || formData.nome_fantasia.trim() || formData.nome.trim();
    if (!nomePrincipal) {
      toast.error('Informe a Razão Social ou Nome Fantasia');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        ...formData,
        nome: nomePrincipal,
        razao_social: formData.razao_social.trim() || nomePrincipal,
        nome_fantasia: formData.nome_fantasia.trim() || nomePrincipal
      };

      if (clienteParaEditar?.id) {
        const { error } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', Number(clienteParaEditar.id));

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([payload]);

        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar cliente no Supabase:', err);
      toast.error(`Erro ao salvar cliente: ${err.message || 'Falha de gravação'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-950/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {clienteParaEditar ? 'Editar Cliente (Escritório)' : 'Novo Cliente (Escritório)'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Entidade central de logística, estoques e expedição
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de navegação interna */}
        <div className="flex border-b border-neutral-800 px-6 bg-neutral-950/30 gap-2">
          {[
            { id: 'DADOS', label: 'Dados Principais', icon: Building },
            { id: 'ENDERECO', label: 'Endereço', icon: MapPin },
            { id: 'CONTATO', label: 'Contatos', icon: Phone },
            { id: 'OBSERVACOES', label: 'Observações', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* TAB 1: DADOS */}
          {activeTab === 'DADOS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Razão Social <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Ex: Têxtil Brasil Indústria Ltda"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Ex: Têxtil Brasil"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={formData.ie}
                    onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                    placeholder="Ex: 123.456.789.110"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENDEREÇO */}
          {activeTab === 'ENDERECO' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    CEP (Busca Automática)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                    {isSearchingCep && (
                      <span className="absolute right-3 top-3 text-xs text-blue-400 animate-pulse">Buscando...</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, Número, Bairro"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Ex: São Paulo, Americana, Brusque"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    placeholder="SP, SC, MG..."
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 uppercase font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTATO */}
          {activeTab === 'CONTATO' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Pessoa de Contato
                </label>
                <input
                  type="text"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  placeholder="Nome do responsável técnico ou de compras"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OBSERVAÇÕES */}
          {activeTab === 'OBSERVACOES' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Observações Administrativas e Comerciais
                </label>
                <textarea
                  rows={4}
                  value={formData.observacoes_comerciais}
                  onChange={(e) => setFormData({ ...formData, observacoes_comerciais: e.target.value })}
                  placeholder="Instruções de recebimento, faturamento, histórico ou particularidades..."
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
