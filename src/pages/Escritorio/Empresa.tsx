import React, { useState } from 'react';
import { 
  Building2, 
  Save, 
  Upload, 
  Globe, 
  Mail, 
  Phone, 
  Smartphone, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Info,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useEmpresa, formatarEnderecoEmpresa, DEFAULT_EMPRESA } from '../../services/empresaService';
import { Empresa } from '../../types';

export default function EmpresaEscritorio() {
  const { empresa, atualizar } = useEmpresa();
  const [formData, setFormData] = useState<Empresa>(empresa);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (campo: keyof Empresa, valor: string) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem do logotipo deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleChange('logotipo', reader.result);
          toast.success('Logotipo carregado com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial.trim()) {
      toast.error('Razão Social é obrigatória.');
      return;
    }
    if (!formData.cnpj.trim()) {
      toast.error('CNPJ é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      atualizar(formData);
      toast.success('Dados da Empresa atualizados com sucesso!', {
        icon: '🏢',
        duration: 4000
      });
    } catch {
      toast.error('Erro ao salvar dados da empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestaurarPadrao = () => {
    if (window.confirm('Deseja restaurar as informações padrão da empresa de demonstração?')) {
      setFormData(DEFAULT_EMPRESA);
      atualizar(DEFAULT_EMPRESA);
      toast.success('Valores padrão restaurados.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Dados da Empresa
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Entidade institucional utilizada em romaneios, etiquetas, relatórios e documentos do ERP
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestaurarPadrao}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restaurar Padrão</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo de Regra Institucional */}
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <h4 className="font-bold text-blue-200 uppercase tracking-wider text-[11px]">
            Regra Fundamental do Sistema (Sprint Escritório 1)
          </h4>
          <p className="text-blue-300/80">
            Nenhum documento do ERP possui o nome da empresa fixo em código. Todos os romaneios, etiquetas, ordens, relatórios de expedição e lançamentos financeiros utilizam dinamicamente os dados cadastrados nesta tela.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Card: Identificação Jurídica */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2 border-b border-neutral-800 pb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Identificação Jurídica</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={formData.razaoSocial}
                  onChange={(e) => handleChange('razaoSocial', e.target.value)}
                  placeholder="Ex: INDÚSTRIA TÊXTIL EXEMPLO LTDA"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nomeFantasia}
                  onChange={(e) => handleChange('nomeFantasia', e.target.value)}
                  placeholder="Ex: TEXLOG TÊXTIL"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Inscrição Estadual (IE) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.inscricaoEstadual}
                  onChange={(e) => handleChange('inscricaoEstadual', e.target.value)}
                  placeholder="000.000.000.000"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Logotipo da Empresa
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl text-neutral-300 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Carregar Arquivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.logotipo && (
                    <button
                      type="button"
                      onClick={() => handleChange('logotipo', '')}
                      className="px-3 py-2.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 rounded-xl text-xs font-semibold"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Localização / Endereço */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2 border-b border-neutral-800 pb-3">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Endereço Comercial</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Logradouro / Rodovia / Rua *
                </label>
                <input
                  type="text"
                  required
                  value={formData.endereco}
                  onChange={(e) => handleChange('endereco', e.target.value)}
                  placeholder="Ex: Rodovia BR-101"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Número *
                </label>
                <input
                  type="text"
                  required
                  value={formData.numero}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  placeholder="Ex: 1500 ou S/N"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Bairro *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bairro}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  placeholder="Ex: Distrito Industrial"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Cidade *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  placeholder="Ex: Joinville"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Estado (UF) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={formData.estado}
                  onChange={(e) => handleChange('estado', e.target.value.toUpperCase())}
                  placeholder="SC"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm uppercase font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  CEP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cep}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Card: Contato & Comunicação */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Phone className="w-4 h-4 text-purple-400" />
              <span>Contatos & Comunicação</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Telefone Fixo *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.telefone}
                    onChange={(e) => handleChange('telefone', e.target.value)}
                    placeholder="(00) 0000-0000"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Celular / WhatsApp *
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.celular}
                    onChange={(e) => handleChange('celular', e.target.value)}
                    placeholder="(00) 90000-0000"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  E-mail Comercial / Financeiro *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Website (Opcional)
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.site || ''}
                    onChange={(e) => handleChange('site', e.target.value)}
                    placeholder="www.empresa.com.br"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Salvar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Dados da Empresa'}</span>
            </button>
          </div>
        </form>

        {/* Pré-visualização do Cabeçalho Oficial de Documentos */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Prévia no Romaneio e Relatórios</span>
            </h3>

            {/* Document Header Mockup */}
            <div className="bg-white text-neutral-900 rounded-2xl p-6 shadow-2xl space-y-4 text-xs font-sans">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-neutral-200 pb-4">
                {/* Logotipo da Empresa (Aprox. 20-25% de largura) */}
                <div className="w-full sm:w-[24%] max-w-[140px] flex items-center justify-center sm:justify-start shrink-0">
                  {formData.logotipo ? (
                    <img
                      src={formData.logotipo}
                      alt={formData.nomeFantasia}
                      className="w-full max-h-20 object-contain object-left"
                    />
                  ) : (
                    <div className="w-full aspect-[16/9] max-h-20 rounded-xl bg-neutral-950 text-white flex flex-col items-center justify-center p-2 border border-neutral-800">
                      <span className="text-xl font-black font-mono">
                        {(formData.nomeFantasia || formData.razaoSocial || 'TEX').slice(0, 3).toUpperCase()}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-neutral-400 font-bold">
                        Logomarca
                      </span>
                    </div>
                  )}
                </div>

                {/* Identidade Institucional: Nome em Fonte Maior e Mais Forte */}
                <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                  <h4 className="font-black text-xl uppercase tracking-tight text-neutral-950 leading-tight">
                    {formData.nomeFantasia || 'NOME FANTASIA DA EMPRESA'}
                  </h4>
                  {formData.razaoSocial && (
                    <p className="text-[11px] text-neutral-700 font-bold uppercase">
                      {formData.razaoSocial}
                    </p>
                  )}
                  
                  {/* Endereço, Telefones, CNPJ e E-mail mantidos abaixo do nome */}
                  <div className="text-[10px] text-neutral-600 space-y-0.5 pt-1 border-t border-neutral-200 mt-1.5">
                    <p className="font-medium text-neutral-800">
                      {formatarEnderecoEmpresa(formData) || 'Endereço da empresa, Número, Bairro, Cidade - UF'}
                    </p>
                    <p className="font-mono text-[10px] text-neutral-700">
                      <b>CNPJ:</b> {formData.cnpj || '—'} &nbsp;|&nbsp; <b>IE:</b> {formData.inscricaoEstadual || '—'}
                    </p>
                    <div className="flex flex-wrap gap-x-3 text-neutral-600">
                      <span><b>Tel:</b> {formData.telefone || '—'}</span>
                      {formData.celular && <span>• <b>Cel:</b> {formData.celular}</span>}
                      {formData.email && <span>• <b>E-mail:</b> {formData.email}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cabeçalho simples: ROMANEIO DE PRODUÇÃO e número */}
              <div className="bg-neutral-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-[11px] font-bold text-neutral-800 border border-neutral-200">
                <span className="font-black tracking-wider uppercase">ROMANEIO DE PRODUÇÃO</span>
                <span className="font-mono text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-300">
                  Nº ROM-2026-0001
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Esta é a visualização exata de como as informações institucionais serão aplicadas nos documentos impressos, romaneios e relatórios gerados.
            </p>
          </div>

          {/* Card Resumo de Status */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Status da Entidade
            </h4>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuração Ativa no ERP</span>
            </div>
            <div className="text-[11px] text-neutral-500 space-y-1">
              <p>Última atualização: {new Date(empresa.atualizadoEm || Date.now()).toLocaleString('pt-BR')}</p>
              <p>Módulos integrados: Romaneio, Balança, Faturamento, Relatórios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
