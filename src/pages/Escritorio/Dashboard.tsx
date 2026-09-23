import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Plus, Search, ArrowDownRight, ArrowUpRight, X, Trash2, Edit2, Scale, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateId } from '../../lib/utils';
import { Entrada, Saida } from '../../types';
import { TIPOS_FIO } from '../../lib/calculations';
import { FilaRolosAguardandoPesagem } from './FilaRolosAguardandoPesagem';

export default function DashboardEscritorio() {
  const { user, clientes, fiosCliente, ops, rolos, entradas, saidas, addEntrada, updateEntrada, deleteEntrada, addSaida, updateSaida, deleteSaida, addEventoProducao } = useStore();
  const [activeTab, setActiveTab] = useState<'PESAGEM' | 'ENTRADAS' | 'SAIDAS' | 'FATURAMENTO'>('PESAGEM');
  const [saidaTab, setSaidaTab] = useState<'SALDO' | 'ROLOS'>('SALDO');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [editingEntradaId, setEditingEntradaId] = useState<string | null>(null);
  const [editingSaidaId, setEditingSaidaId] = useState<string | null>(null);
  const [rolosAguardandoCount, setRolosAguardandoCount] = useState<number>(0);

  // Calcular contagem de rolos aguardando pesagem
  useEffect(() => {
    const recalcularCount = () => {
      let count = rolos.filter(r => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM').length;
      try {
        const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (raw) {
          const list = JSON.parse(raw);
          const locais = list.filter((r: any) => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM').length;
          count = Math.max(count, locais);
        }
      } catch {}
      setRolosAguardandoCount(count);
    };

    recalcularCount();
    window.addEventListener('storage', recalcularCount);
    window.addEventListener('texlog_novo_rolo_pesagem', recalcularCount);
    const interval = setInterval(recalcularCount, 4000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', recalcularCount);
      window.removeEventListener('texlog_novo_rolo_pesagem', recalcularCount);
    };
  }, [rolos]);

  const [entradaForm, setEntradaForm] = useState<Partial<Entrada>>({
    clienteId: '',
    tipoFio: TIPOS_FIO[0],
    tituloFio: '',
    nfNumero: '',
    tipoLancamento: 'CAIXAS',
    quantidade: 0,
    pesoBruto: 0,
    pesoLiquido: 0,
    isRetroativo: false,
    dataLancamento: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  const [saidaForm, setSaidaForm] = useState<Partial<Saida>>({
    clienteId: '',
    tipoLancamento: 'CAIXAS',
    quantidade: 0,
    pesoLiquido: 0,
    tipoFio: TIPOS_FIO[0],
    tituloFio: '',
    nfNumero: '',
    opId: '',
    roloId: '',
    metros: 0,
    voltas: 0,
    valorCobrado: 0,
    isRetroativo: false,
    dataLancamento: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  const handleEntradaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entradaForm.clienteId || !entradaForm.nf) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (editingEntradaId) {
      updateEntrada(editingEntradaId, entradaForm);
      toast.success('Entrada atualizada com sucesso');
    } else {
      addEntrada({
        ...entradaForm,
        id: generateId(),
        dataLancamento: entradaForm.isRetroativo ? new Date(entradaForm.dataLancamento!).toISOString() : new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as Entrada);
      toast.success('Entrada registrada com sucesso');
    }

    setIsModalOpen(false);
    setEditingEntradaId(null);
  };

  const handleSaidaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saidaForm.clienteId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (editingSaidaId) {
      updateSaida(editingSaidaId, saidaForm);
      toast.success('Saída atualizada com sucesso');
    } else {
      addSaida({
        ...saidaForm,
        id: generateId(),
        dataLancamento: saidaForm.isRetroativo ? new Date(saidaForm.dataLancamento!).toISOString() : new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as Saida);

      if (saidaForm.tipoLancamento === 'ROLETES' && saidaForm.roloId) {
        // Use addEventoProducao if it's a roll finalized or similar?
        // Actually this seems like just logging the exit.
        addEventoProducao({
          id: generateId(),
          opId: saidaForm.opId!,
          roloId: saidaForm.roloId,
          operadorId: user?.machine || 'admin',
          machineCode: 'MAQUINA 1', // fallback
          tipoEvento: 'FINALIZAR_ROLO',
          portadasNoEvento: 0,
          timestampInicio: new Date().toISOString(),
          observacao: `Saída registrada na NF ${saidaForm.nfNumero}. Peso: ${saidaForm.pesoLiquido}kg`,
          createdAt: new Date().toISOString()
        });
      }

      toast.success('Saída registrada com sucesso');
    }

    setIsSaidaModalOpen(false);
    setEditingSaidaId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Escritório</h1>
          <p className="text-neutral-400 mt-1">Controle de entradas, saídas e faturamento</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/escritorio/clientes"
            className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors text-sm"
          >
            <Building2 className="w-4 h-4" />
            <span>Módulo Clientes</span>
          </Link>
          {activeTab === 'ENTRADAS' && (
            <button
              onClick={() => {
                setEditingEntradaId(null);
                setEntradaForm({
                  clienteId: '',
                  tipoFio: TIPOS_FIO[0],
                  tituloFio: '',
                  nfNumero: '',
                  tipoLancamento: 'CAIXAS',
                  quantidade: 0,
                  pesoBruto: 0,
                  pesoLiquido: 0
                });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
              Nova Entrada
            </button>
          )}
          {activeTab === 'SAIDAS' && (
            <button
              onClick={() => {
                setEditingSaidaId(null);
                setSaidaForm({
                  clienteId: '',
                  tipoLancamento: 'CAIXAS',
                  quantidade: 0,
                  pesoLiquido: 0,
                  tipoFio: TIPOS_FIO[0],
                  tituloFio: '',
                  nfNumero: '',
                  opId: '',
                  roloId: '',
                  metros: 0,
                  voltas: 0,
                  valorCobrado: 0
                });
                setIsSaidaModalOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-5 h-5" />
              Nova Saída
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-neutral-800 overflow-x-auto">
        {[
          { id: 'PESAGEM', label: 'Rolos aguardando pesagem', count: rolosAguardandoCount, icon: Scale },
          { id: 'ENTRADAS', label: 'Entradas' },
          { id: 'SAIDAS', label: 'Saídas' },
          { id: 'FATURAMENTO', label: 'Faturamento' }
        ].map(tab => {
          const isPesagem = tab.id === 'PESAGEM';
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2.5 cursor-pointer ${
                isActive
                  ? isPesagem
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-blue-500 text-blue-500 bg-blue-500/5'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              {tab.icon && <tab.icon className={`w-4 h-4 ${isPesagem && tab.count > 0 ? 'text-amber-400 animate-pulse' : ''}`} />}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500 text-black">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'PESAGEM' && (
        <FilaRolosAguardandoPesagem />
      )}

      {activeTab === 'ENTRADAS' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">NF</th>
                <th className="px-6 py-4 font-medium">Tipo de Fio</th>
                <th className="px-6 py-4 font-medium">Título do Fio</th>
                <th className="px-6 py-4 font-medium">Tipo Entrada</th>
                <th className="px-6 py-4 font-medium">Qtd</th>
                <th className="px-6 py-4 font-medium">Peso Líq.</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {entradas.map(entrada => {
                const cliente = clientes.find(c => c.id === entrada.clienteId);
                return (
                  <tr key={entrada.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">{new Date(entrada.dataLancamento).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-white">{cliente?.nomeFantasia}</td>
                    <td className="px-6 py-4">{entrada.nfNumero}</td>
                    <td className="px-6 py-4">{entrada.tipoFio}</td>
                    <td className="px-6 py-4 text-white">{entrada.tituloFio}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${entrada.tipoLancamento === 'CAIXAS' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {entrada.tipoLancamento}
                      </span>
                    </td>
                    <td className="px-6 py-4">{entrada.quantidade}</td>
                    <td className="px-6 py-4">{entrada.pesoLiquido ? `${entrada.pesoLiquido}kg` : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingEntradaId(entrada.id);
                            setEntradaForm(entrada);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-neutral-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user?.role === 'PROGRAMADOR' && (
                          <button 
                            onClick={() => {
                              if (window.confirm('Deseja realmente excluir este registro?')) {
                                deleteEntrada(entrada.id);
                                toast.success('Entrada excluída');
                              }
                            }}
                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {entradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">Nenhuma entrada registrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'SAIDAS' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSaidaTab('SALDO')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saidaTab === 'SALDO' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50'}`}
            >
              Saldo (Caixas)
            </button>
            <button
              onClick={() => setSaidaTab('ROLOS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saidaTab === 'ROLOS' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50'}`}
            >
              Rolos
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            {saidaTab === 'SALDO' ? (
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Tipo de Fio</th>
                    <th className="px-6 py-4 font-medium">Título do Fio</th>
                    <th className="px-6 py-4 font-medium">NF</th>
                    <th className="px-6 py-4 font-medium">Qtd Caixas</th>
                    <th className="px-6 py-4 font-medium">Peso Líq.</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {saidas.filter(s => s.tipoLancamento === 'CAIXAS').map(saida => {
                    const cliente = clientes.find(c => c.id === saida.clienteId);
                    return (
                      <tr key={saida.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">{new Date(saida.dataLancamento).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-white">{cliente?.nomeFantasia}</td>
                        <td className="px-6 py-4">{saida.tipoFio}</td>
                        <td className="px-6 py-4 text-white">{saida.tituloFio}</td>
                        <td className="px-6 py-4">{saida.nfNumero}</td>
                        <td className="px-6 py-4">{saida.quantidade}</td>
                        <td className="px-6 py-4">{saida.pesoLiquido}kg</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingSaidaId(saida.id);
                                setSaidaForm(saida);
                                setIsSaidaModalOpen(true);
                              }}
                              className="p-2 text-neutral-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user?.role === 'PROGRAMADOR' && (
                              <button 
                                onClick={() => {
                                  if (window.confirm('Deseja realmente excluir este registro?')) {
                                    deleteSaida(saida.id);
                                    toast.success('Saída excluída');
                                  }
                                }}
                                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {saidas.filter(s => s.tipoLancamento === 'CAIXAS').length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">Nenhuma saída de caixa registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">OP</th>
                    <th className="px-6 py-4 font-medium">Rolo</th>
                    <th className="px-6 py-4 font-medium">Metros/Voltas</th>
                    <th className="px-6 py-4 font-medium">Peso Líq.</th>
                    <th className="px-6 py-4 font-medium">Valor</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {saidas.filter(s => s.tipoLancamento === 'ROLETES').map(saida => {
                    const cliente = clientes.find(c => c.id === saida.clienteId);
                    const op = ops.find(o => o.id === saida.opId);
                    const rolo = rolos.find(r => r.id === saida.roloId);
                    return (
                      <tr key={saida.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">{new Date(saida.dataLancamento).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-white">{cliente?.nomeFantasia}</td>
                        <td className="px-6 py-4">{op?.codigo}</td>
                        <td className="px-6 py-4">{rolo?.numeroRolo}</td>
                        <td className="px-6 py-4">{saida.metros ? `${saida.metros}m` : `${saida.voltas}v`}</td>
                        <td className="px-6 py-4">{saida.pesoLiquido}kg</td>
                        <td className="px-6 py-4 text-emerald-400">R$ {saida.valorCobrado?.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingSaidaId(saida.id);
                                setSaidaForm(saida);
                                setIsSaidaModalOpen(true);
                              }}
                              className="p-2 text-neutral-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user?.role === 'PROGRAMADOR' && (
                              <button 
                                onClick={() => {
                                  if (window.confirm('Deseja realmente excluir este registro?')) {
                                    deleteSaida(saida.id);
                                    toast.success('Saída excluída');
                                  }
                                }}
                                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {saidas.filter(s => s.tipoLancamento === 'ROLETES').length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">Nenhuma saída de rolo registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'FATURAMENTO' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clientes.map(cliente => {
            const saidasCliente = saidas.filter(s => s.clienteId === cliente.id && s.tipoLancamento === 'ROLETES');
            
            let valorTotal = saidasCliente.reduce((acc, s) => acc + (s.valorCobrado || 0), 0);

            if (valorTotal === 0) return null;

            return (
              <div key={cliente.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-2">{cliente.nomeFantasia}</h3>
                <div className="text-sm text-neutral-400 mb-4">
                  Cobrança por {cliente.tipoCobranca.toLowerCase()} (R$ {cliente.valorCobrado.toFixed(2)})
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-neutral-500 block text-sm">Valor Faturado</span>
                    <span className="text-3xl font-bold text-emerald-400">R$ {valorTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-white block">{saidasCliente.length} rolos</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h2 className="text-2xl font-bold text-white">{editingEntradaId ? 'Editar Entrada' : 'Nova Entrada'}</h2>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingEntradaId(null);
              }} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEntradaSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Cliente *</label>
                  <select required value={entradaForm.clienteId} onChange={e => setEntradaForm({...entradaForm, clienteId: e.target.value, tipoFio: '', tituloFio: ''})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="">Selecione um cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Tipo de Fio *</label>
                  <select required disabled={!entradaForm.clienteId} value={entradaForm.tipoFio} onChange={e => setEntradaForm({...entradaForm, tipoFio: e.target.value, tituloFio: ''})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50">
                    <option value="">Selecione o tipo de fio</option>
                    {entradaForm.clienteId && Array.from(new Set(fiosCliente.filter(f => f.clienteId === entradaForm.clienteId).map(f => f.tipoFio))).filter(Boolean).map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Título do Fio *</label>
                  <select required disabled={!entradaForm.tipoFio} value={entradaForm.tituloFio} onChange={e => setEntradaForm({...entradaForm, tituloFio: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50">
                    <option value="">Selecione o título do fio</option>
                    {entradaForm.tipoFio && fiosCliente.filter(f => f.clienteId === entradaForm.clienteId && f.tipoFio === entradaForm.tipoFio).map(f => (
                      <option key={f.id} value={f.tituloFio}>{f.tituloFio}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Nota Fiscal *</label>
                  <input type="text" required value={entradaForm.nfNumero} onChange={e => setEntradaForm({...entradaForm, nfNumero: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Tipo *</label>
                  <select required value={entradaForm.tipoLancamento} onChange={e => setEntradaForm({...entradaForm, tipoLancamento: e.target.value as any})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="CAIXAS">Caixas</option>
                    <option value="ROLETES">Roletes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Quantidade *</label>
                  <input type="number" required min="1" value={entradaForm.quantidade || ''} onChange={e => setEntradaForm({...entradaForm, quantidade: parseInt(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="retroativo-entrada"
                    checked={entradaForm.isRetroativo}
                    onChange={e => setEntradaForm({...entradaForm, isRetroativo: e.target.checked})}
                    className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="retroativo-entrada" className="text-sm font-medium text-neutral-300">Lançamento retroativo</label>
                </div>

                {entradaForm.isRetroativo && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Data do Lançamento *</label>
                    <input 
                      type="date" 
                      required 
                      value={entradaForm.dataLancamento} 
                      onChange={e => setEntradaForm({...entradaForm, dataLancamento: e.target.value})} 
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                )}

                <div className={entradaForm.isRetroativo ? "" : "md:col-span-2"}>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Observação</label>
                  <input 
                    type="text" 
                    value={entradaForm.observacao || ''} 
                    onChange={e => setEntradaForm({...entradaForm, observacao: e.target.value})} 
                    placeholder="Ex: Lançamento de histórico"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                {entradaForm.tipo === 'CAIXAS' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Peso Bruto (kg)</label>
                      <input type="number" step="0.01" value={entradaForm.pesoBruto || ''} onChange={e => setEntradaForm({...entradaForm, pesoBruto: parseFloat(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Peso Líquido (kg)</label>
                      <input type="number" step="0.01" value={entradaForm.pesoLiquido || ''} onChange={e => setEntradaForm({...entradaForm, pesoLiquido: parseFloat(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Qtd. Roletes (se houver)</label>
                      <input type="number" value={entradaForm.quantidadeRoletes || ''} onChange={e => setEntradaForm({...entradaForm, quantidadeRoletes: parseInt(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-neutral-400 hover:text-white font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20">
                  Registrar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSaidaModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h2 className="text-2xl font-bold text-white">{editingSaidaId ? 'Editar Saída' : 'Nova Saída'}</h2>
              <button onClick={() => {
                setIsSaidaModalOpen(false);
                setEditingSaidaId(null);
              }} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaidaSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Tipo de Saída *</label>
                  <select required value={saidaForm.tipoLancamento} onChange={e => setSaidaForm({...saidaForm, tipoLancamento: e.target.value as any})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="CAIXAS">Saldo (Caixas)</option>
                    <option value="ROLETES">Rolos</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Cliente *</label>
                  <select required value={saidaForm.clienteId} onChange={e => setSaidaForm({...saidaForm, clienteId: e.target.value, tipoFio: '', tituloFio: ''})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="">Selecione um cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                    ))}
                  </select>
                </div>

                {saidaForm.tipoLancamento === 'CAIXAS' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Tipo de Fio *</label>
                      <select required disabled={!saidaForm.clienteId} value={saidaForm.tipoFio} onChange={e => setSaidaForm({...saidaForm, tipoFio: e.target.value, tituloFio: ''})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50">
                        <option value="">Selecione o tipo de fio</option>
                        {saidaForm.clienteId && Array.from(new Set(fiosCliente.filter(f => f.clienteId === saidaForm.clienteId).map(f => f.tipoFio))).filter(Boolean).map(tipo => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Título do Fio *</label>
                      <select required disabled={!saidaForm.tipoFio} value={saidaForm.tituloFio} onChange={e => setSaidaForm({...saidaForm, tituloFio: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50">
                        <option value="">Selecione o título do fio</option>
                        {saidaForm.tipoFio && fiosCliente.filter(f => f.clienteId === saidaForm.clienteId && f.tipoFio === saidaForm.tipoFio).map(f => (
                          <option key={f.id} value={f.tituloFio}>{f.tituloFio}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">NF *</label>
                      <input type="text" required value={saidaForm.nfNumero} onChange={e => setSaidaForm({...saidaForm, nfNumero: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Quantidade de Caixas *</label>
                      <input type="number" required min="1" value={saidaForm.quantidade || ''} onChange={e => setSaidaForm({...saidaForm, quantidade: parseInt(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Peso Líquido (kg) *</label>
                      <input type="number" step="0.01" required value={saidaForm.pesoLiquido || ''} onChange={e => setSaidaForm({...saidaForm, pesoLiquido: parseFloat(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">OP *</label>
                      <select required value={saidaForm.opId} onChange={e => setSaidaForm({...saidaForm, opId: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        <option value="">Selecione a OP</option>
                        {ops.filter(o => o.clienteId === saidaForm.clienteId).map(o => (
                          <option key={o.id} value={o.id}>{o.codigo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Rolo *</label>
                      <select required value={saidaForm.roloId} onChange={e => setSaidaForm({...saidaForm, roloId: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        <option value="">Selecione o Rolo</option>
                        {rolos.filter(r => r.opId === saidaForm.opId && r.status === 'FINALIZADO').map(r => (
                          <option key={r.id} value={r.id}>Rolo {r.numeroRolo}</option>
                        ))}
                      </select>
                    </div>
                    {(() => {
                      const selectedOp = ops.find(o => o.id === saidaForm.opId);
                      const isM3M4 = selectedOp?.maquina === 'MAQUINA 3' || selectedOp?.maquina === 'MAQUINA 4';
                      return (
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">{isM3M4 ? 'Voltas *' : 'Metros *'}</label>
                          <input type="number" required value={isM3M4 ? (saidaForm.voltas || '') : (saidaForm.metros || '')} onChange={e => {
                            const val = parseInt(e.target.value);
                            const cliente = clientes.find(c => c.id === saidaForm.clienteId);
                            // Se for cobrança por metro e for M3/M4 (voltas), como cobrar?
                            // O prompt diz: "Faturamento: por rolo (qtd * valor) ou por metro (metros * valor)."
                            // Vamos assumir que se for voltas, a cobrança por metro usa voltas como base ou não se aplica.
                            const valorCobrado = cliente?.tipoCobranca === 'METRO' ? val * (cliente.valorCobrado || 0) : (cliente?.valorCobrado || 0);
                            if (isM3M4) {
                              setSaidaForm({...saidaForm, voltas: val, metros: 0, valorCobrado});
                            } else {
                              setSaidaForm({...saidaForm, metros: val, voltas: 0, valorCobrado});
                            }
                          }} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      );
                    })()}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Peso Líquido (kg) *</label>
                      <input type="number" step="0.01" required value={saidaForm.pesoLiquido || ''} onChange={e => setSaidaForm({...saidaForm, pesoLiquido: parseFloat(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Valor Cobrado (R$)</label>
                      <input type="number" step="0.01" readOnly value={saidaForm.valorCobrado || ''} className="w-full bg-neutral-950 border border-neutral-800 text-neutral-400 rounded-xl py-3 px-4 focus:outline-none" />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="retroativo-saida"
                    checked={saidaForm.isRetroativo}
                    onChange={e => setSaidaForm({...saidaForm, isRetroativo: e.target.checked})}
                    className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="retroativo-saida" className="text-sm font-medium text-neutral-300">Lançamento retroativo</label>
                </div>

                {saidaForm.isRetroativo && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Data do Lançamento *</label>
                    <input 
                      type="date" 
                      required 
                      value={saidaForm.dataLancamento} 
                      onChange={e => setSaidaForm({...saidaForm, dataLancamento: e.target.value})} 
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                )}

                <div className={saidaForm.isRetroativo ? "" : "md:col-span-2"}>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Observação</label>
                  <input 
                    type="text" 
                    value={saidaForm.observacao || ''} 
                    onChange={e => setSaidaForm({...saidaForm, observacao: e.target.value})} 
                    placeholder="Ex: Lançamento de histórico"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsSaidaModalOpen(false)} className="px-6 py-3 text-neutral-400 hover:text-white font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/20">
                  Registrar Saída
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
