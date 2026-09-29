import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Package, 
  Play, 
  Disc, 
  DollarSign, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  User, 
  History, 
  Info, 
  Edit2, 
  Layers, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { 
  getEstoquePorCliente,
  EstoqueClienteItem 
} from '../../../services/estoqueClienteService';
import { NovaEntradaModal } from './NovaEntradaModal';
import { ClienteModal } from './ClienteModal';

export function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'INFORMACOES' | 'MATERIA_PRIMA' | 'PRODUCAO' | 'ROLOS' | 'FINANCEIRO'>('INFORMACOES');

  const [estoqueItens, setEstoqueItens] = useState<EstoqueClienteItem[]>([]);
  const [isNovaEntradaOpen, setIsNovaEntradaOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Carregar dados do cliente
  const carregarCliente = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', Number(id))
        .single();

      if (error) {
        console.warn('Erro ao buscar cliente do Supabase:', error);
        setCliente({
          id,
          nome: `Cliente #${id}`,
          razao_social: `Cliente #${id}`,
          nome_fantasia: `Cliente #${id}`
        });
      } else {
        setCliente(data);
      }
    } catch (err) {
      console.error('Falha ao carregar cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar estoque de matéria-prima do cliente
  const carregarEstoque = async () => {
    if (!id) return;
    try {
      const itens = await getEstoquePorCliente(id);
      setEstoqueItens(itens);
    } catch (err) {
      console.error('Erro ao carregar estoque do cliente:', err);
    }
  };

  useEffect(() => {
    carregarCliente();
    carregarEstoque();

    const handleUpdate = () => {
      carregarEstoque();
    };

    window.addEventListener('texlog_estoque_updated', handleUpdate);
    window.addEventListener('texlog_materia_prima_updated', handleUpdate);
    return () => {
      window.removeEventListener('texlog_estoque_updated', handleUpdate);
      window.removeEventListener('texlog_materia_prima_updated', handleUpdate);
    };
  }, [id]);

  if (loading && !cliente) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 text-sm">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Cliente não encontrado</h2>
        <p className="text-neutral-400 text-sm mb-6">O cliente solicitado não foi localizado no cadastro.</p>
        <button
          onClick={() => navigate('/escritorio/clientes')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Lista de Clientes
        </button>
      </div>
    );
  }

  const nomeExibicao = cliente.razao_social || cliente.nome_fantasia || cliente.nome || `Cliente #${id}`;
  const totalCaixas = estoqueItens.reduce((acc, it) => acc + (it.quantidadeCaixas || 0), 0);
  const totalPesoKg = estoqueItens.reduce((acc, it) => acc + (it.pesoKg || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Bar / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/escritorio/clientes')}
              className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition-colors"
              title="Voltar para Clientes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">{nomeExibicao}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {cliente.status || 'ATIVO'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                CNPJ: {cliente.cnpj || 'Não informado'} • ID: {cliente.id}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar Cadastro
          </button>

          <button
            onClick={() => setIsNovaEntradaOpen(true)}
            className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Entrada
          </button>
        </div>
      </div>

      {/* 5 ABAS EXIGIDAS NO ESCOPO DA SPRINT 3.1A */}
      <div className="flex border-b border-neutral-800 overflow-x-auto bg-neutral-900/50 rounded-xl px-2">
        {[
          { id: 'INFORMACOES', label: 'Informações', icon: Info },
          { id: 'MATERIA_PRIMA', label: 'Matéria-Prima', icon: Package, badge: estoqueItens.length > 0 ? estoqueItens.length : undefined },
          { id: 'PRODUCAO', label: 'Produção', icon: Play, tag: 'Em breve' },
          { id: 'ROLOS', label: 'Rolos', icon: Disc, tag: 'Em breve' },
          { id: 'FINANCEIRO', label: 'Financeiro', icon: DollarSign, tag: 'Em breve' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-4 text-sm font-semibold border-b-2 flex items-center gap-2.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {tab.badge}
                </span>
              )}
              {tab.tag && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                  {tab.tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* CONTEÚDO DA ABA 1: INFORMAÇÕES */}
      {activeTab === 'INFORMACOES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Dados Principais */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Dados Cadastrais
              </h3>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Razão Social</span>
                <span className="text-neutral-200 font-medium">{cliente.razao_social || cliente.nome || '-'}</span>
              </div>

              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Nome Fantasia</span>
                <span className="text-neutral-200 font-medium">{cliente.nome_fantasia || '-'}</span>
              </div>

              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">CNPJ</span>
                <span className="text-neutral-200 font-mono">{cliente.cnpj || '-'}</span>
              </div>

              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Inscrição Estadual (IE)</span>
                <span className="text-neutral-200 font-mono">{cliente.ie || '-'}</span>
              </div>
            </div>
          </div>

          {/* Card: Localização */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                Localização & Endereço
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">CEP</span>
                <span className="text-neutral-200 font-mono">{cliente.cep || '-'}</span>
              </div>

              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Cidade / UF</span>
                <span className="text-neutral-200 font-medium">
                  {cliente.cidade ? `${cliente.cidade} - ${cliente.estado || ''}` : '-'}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Endereço Completo</span>
                <span className="text-neutral-200">{cliente.endereco || '-'}</span>
              </div>
            </div>
          </div>

          {/* Card: Contatos */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                Contatos
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Responsável / Contato</span>
                <span className="text-neutral-200 font-medium">{cliente.contato || '-'}</span>
              </div>

              <div>
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Telefone / Celular</span>
                <span className="text-neutral-200 font-mono">{cliente.telefone || '-'}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">E-mail</span>
                <span className="text-neutral-200 font-medium">{cliente.email || '-'}</span>
              </div>
            </div>
          </div>

          {/* Card: Observações */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Observações
              </h3>
            </div>

            <div className="text-sm">
              <p className="text-neutral-300 whitespace-pre-wrap bg-neutral-950 p-4 rounded-xl border border-neutral-800 min-h-[80px]">
                {cliente.observacoes_comerciais || cliente.observacoes || 'Nenhuma observação comercial ou logística registrada.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: MATÉRIA-PRIMA */}
      {activeTab === 'MATERIA_PRIMA' && (
        <div className="space-y-6">
          {/* Métricas do cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block font-medium">Fios em Estoque</span>
                  <span className="text-2xl font-bold text-white tracking-tight">{estoqueItens.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block font-medium">Saldo Total de Caixas</span>
                  <span className="text-2xl font-bold text-white tracking-tight font-mono">{totalCaixas} cx</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block font-medium">Saldo Total em Peso</span>
                  <span className="text-2xl font-bold text-white tracking-tight font-mono">{totalPesoKg.toFixed(2)} kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Matéria-Prima: Fio, Cor, Caixas, Peso (kg) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Estoque de Matéria-Prima</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Saldo atualizado por fio e cor pertencente a este cliente</p>
              </div>

              <button
                onClick={() => setIsNovaEntradaOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                Nova Entrada
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Fio</th>
                    <th className="px-6 py-4 font-semibold">Cor</th>
                    <th className="px-6 py-4 font-semibold text-right">Embalagens</th>
                    <th className="px-6 py-4 font-semibold text-right">Cones Totais</th>
                    <th className="px-6 py-4 font-semibold text-right">Peso Médio Cone</th>
                    <th className="px-6 py-4 font-semibold text-right">Peso Líq. (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {estoqueItens.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-blue-400">{item.fioNome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 uppercase font-semibold text-neutral-200">
                        <span className="px-2.5 py-1 rounded-lg text-xs bg-neutral-800 border border-neutral-700">
                          {item.cor}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-white">
                        {item.quantidadeEmbalagens || item.quantidadeCaixas} {item.tipoEmbalagem ? item.tipoEmbalagem.toLowerCase() : 'cx'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-blue-400">
                        {item.totalCones || ((item.quantidadeEmbalagens || item.quantidadeCaixas || 0) * (item.conesPorEmbalagem || 6))} cones
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-purple-400">
                        {item.pesoMedioConeKg ? `${item.pesoMedioConeKg.toFixed(3)} kg` : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-emerald-400">
                        {item.pesoKg.toFixed(2)} kg
                      </td>
                    </tr>
                  ))}

                  {estoqueItens.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                        <div className="max-w-sm mx-auto space-y-3">
                          <Package className="w-10 h-10 text-neutral-600 mx-auto" />
                          <p className="text-sm font-medium text-neutral-400">Nenhum estoque de matéria-prima para este cliente.</p>
                          <p className="text-xs text-neutral-600">
                            Clique no botão "Nova Entrada" acima para lançar uma entrada com os fios cadastrados.
                          </p>
                          <button
                            onClick={() => setIsNovaEntradaOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Registrar Entrada
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: PRODUÇÃO (RESERVADA PARA FUTURAS INTEGRAÇÕES) */}
      {activeTab === 'PRODUCAO' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
            <Play className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Estrutura Reservada para Futuras Integrações
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">Módulo de Produção & OPs</h3>
            <p className="text-sm text-neutral-400">
              Nesta Sprint 3.1A a estrutura foi criada e preservada sem alterar a produção em andamento.
              Nas próximas Sprints este painel exibirá as Ordens de Produção vinculadas, planejamento de tecelagem, voltas/metros e status em tempo real.
            </p>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: ROLOS (RESERVADA PARA FUTURAS INTEGRAÇÕES) */}
      {activeTab === 'ROLOS' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto">
            <Disc className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Estrutura Reservada para Futuras Integrações
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">Histórico e Rastreamento de Rolos</h3>
            <p className="text-sm text-neutral-400">
              Área reservada para o inventário, conferência, pesagem física e rastreamento completo de rolos finalizados pertencentes a este cliente.
            </p>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 5: FINANCEIRO (RESERVADA PARA FUTURAS INTEGRAÇÕES) */}
      {activeTab === 'FINANCEIRO' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
            <DollarSign className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Estrutura Reservada para Futuras Integrações
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">Gestão Financeira & Cobrança</h3>
            <p className="text-sm text-neutral-400">
              Área reservada para tabelas de precificação acordadas (por rolo/metro), fechamentos periódicos, notas fiscais e relatórios financeiros por cliente.
            </p>
          </div>
        </div>
      )}

      {/* Modais */}
      {isNovaEntradaOpen && (
        <NovaEntradaModal
          isOpen={isNovaEntradaOpen}
          onClose={() => setIsNovaEntradaOpen(false)}
          clientePreselecionado={{ id: cliente.id, nome: nomeExibicao }}
          onSuccess={() => carregarEstoque()}
        />
      )}

      {isEditModalOpen && (
        <ClienteModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          clienteParaEditar={cliente}
          onSuccess={() => carregarCliente()}
        />
      )}
    </div>
  );
}
