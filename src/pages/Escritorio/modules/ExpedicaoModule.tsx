import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Scale, 
  Package, 
  FileText, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  Receipt, 
  Building2, 
  Trash2, 
  AlertCircle,
  Eye,
  CheckSquare,
  Square,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { Entrada, Saida, Rolo } from '../../../types';
import { TIPOS_FIO } from '../../../lib/calculations';
import { generateId } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { FilaRolosAguardandoPesagem } from '../FilaRolosAguardandoPesagem';
import { NovaEntradaModal } from '../Clientes/NovaEntradaModal';
import { ModalDecisaoFaturamento, ModalFaturarRomaneio, ResumoExpedicaoFaturamento } from '../ModalFaturamento';
import { 
  buscarRolosEmEstoque, 
  buscarRolosAptosExpedicao, 
  RoloAptoExpedicao 
} from '../../../services/roloOficialService';
import { getLocalEntradas, RegistroEntradaSalva } from '../../../services/estoqueClienteService';
import { fetchClientesOficiais, ClienteOficial } from '../../../services/clienteService';
import { VisualizadorRomaneioModal, RomaneioExpedicaoDados } from './VisualizadorRomaneioModal';

interface ExpedicaoModuleProps {
  activeSub: string;
  onNavigateSub: (sub: string) => void;
  onAbrirFaturamentoDireto?: (expedicao: ResumoExpedicaoFaturamento) => void;
}

export function ExpedicaoModule({ activeSub, onNavigateSub, onAbrirFaturamentoDireto }: ExpedicaoModuleProps) {
  const { clientes, rolos, entradas, saidas, addSaida, updateRolo } = useStore();
  const [clientesOficiais, setClientesOficiais] = useState<ClienteOficial[]>([]);
  const [entradasSalvas, setEntradasSalvas] = useState<RegistroEntradaSalva[]>([]);
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);

  // Estado da Expedição
  const [clienteExpedicaoId, setClienteExpedicaoId] = useState<string>('');
  const [filtroEstoqueClienteId, setFiltroEstoqueClienteId] = useState<string>('');
  const [buscaEstoque, setBuscaEstoque] = useState<string>('');
  const [rolosEmEstoque, setRolosEmEstoque] = useState<RoloAptoExpedicao[]>([]);
  const [rolosAptosDisponiveis, setRolosAptosDisponiveis] = useState<RoloAptoExpedicao[]>([]);
  const [rolosSelecionadosExpedicao, setRolosSelecionadosExpedicao] = useState<string[]>([]);
  
  // Romaneios e Histórico
  const [romaneiosList, setRomaneiosList] = useState<any[]>([]);
  const [romaneioVisualizar, setRomaneioVisualizar] = useState<RomaneioExpedicaoDados | null>(null);

  // Modais de Faturamento
  const [expedicaoDecidindoFaturamento, setExpedicaoDecidindoFaturamento] = useState<ResumoExpedicaoFaturamento | null>(null);
  const [expedicaoFaturando, setExpedicaoFaturando] = useState<ResumoExpedicaoFaturamento | null>(null);

  // Form Saída de Matéria-Prima (Fios/Caixas)
  const [saidaForm, setSaidaForm] = useState<Partial<Saida>>({
    clienteId: '',
    tipoLancamento: 'CAIXAS',
    quantidade: 0,
    pesoLiquido: 0,
    tipoFio: TIPOS_FIO[0],
    tituloFio: '',
    nfNumero: '',
    dataLancamento: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  const carregarClientes = async () => {
    try {
      const list = await fetchClientesOficiais();
      setClientesOficiais(list);
    } catch (e) {
      console.warn('Erro ao carregar clientes:', e);
    }
  };

  const carregarDadosEstoqueERolos = () => {
    setEntradasSalvas(getLocalEntradas());
    const emEstoque = buscarRolosEmEstoque();
    setRolosEmEstoque(emEstoque);

    const aptos = buscarRolosAptosExpedicao(clienteExpedicaoId);
    setRolosAptosDisponiveis(aptos);

    try {
      const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
      if (rawRom) setRomaneiosList(JSON.parse(rawRom));
    } catch {}
  };

  useEffect(() => {
    carregarClientes();
    carregarDadosEstoqueERolos();

    const handleAtualizacao = () => carregarDadosEstoqueERolos();
    window.addEventListener('texlog_rolo_pesado', handleAtualizacao);
    window.addEventListener('texlog_novo_rolo_pesagem', handleAtualizacao);
    window.addEventListener('texlog_saida_updated', handleAtualizacao);
    window.addEventListener('texlog_estoque_updated', handleAtualizacao);
    window.addEventListener('storage', handleAtualizacao);

    return () => {
      window.removeEventListener('texlog_rolo_pesado', handleAtualizacao);
      window.removeEventListener('texlog_novo_rolo_pesagem', handleAtualizacao);
      window.removeEventListener('texlog_saida_updated', handleAtualizacao);
      window.removeEventListener('texlog_estoque_updated', handleAtualizacao);
      window.removeEventListener('storage', handleAtualizacao);
    };
  }, [clienteExpedicaoId]);

  // Contadores para badges
  const rolosAguardandoPesagemCount = rolos.filter(r => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM').length;

  // -------------------------------------------------------------
  // REGISTRAR EXPEDIÇÃO MULTI-ROLOS + GERAR ROMANEIO RB SOUZA
  // -------------------------------------------------------------
  const handleRegistrarExpedicao = async () => {
    if (rolosSelecionadosExpedicao.length === 0) {
      toast.error('Selecione pelo menos um rolo no estoque para expedir.');
      return;
    }

    const rolosMarcados = rolosAptosDisponiveis.filter(r => 
      rolosSelecionadosExpedicao.includes(r.numero_rolo) || rolosSelecionadosExpedicao.includes(r.id)
    );

    if (rolosMarcados.length === 0) {
      toast.error('Nenhum rolo válido selecionado.');
      return;
    }

    const agora = new Date().toISOString();
    const clienteAlvo = clientesOficiais.find(c => String(c.id) === String(clienteExpedicaoId))
      || clientes.find(c => String(c.id) === String(clienteExpedicaoId))
      || { nomeFantasia: rolosMarcados[0].cliente_nome, id: clienteExpedicaoId, nome: rolosMarcados[0].cliente_nome };

    const clienteNomeFinal = clienteAlvo.nomeFantasia || (clienteAlvo as any).nome || rolosMarcados[0].cliente_nome || 'Cliente';
    const totalMetros = rolosMarcados.reduce((acc, r) => acc + (r.metros || 0), 0);
    const totalPesoLiquido = rolosMarcados.reduce((acc, r) => acc + (r.peso_liquido || 0), 0);
    const codigosRolos = rolosMarcados.map(r => r.numero_rolo);
    const codigoRomaneio = `ROM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    // Criar Romaneio com múltiplos rolos conforme RB Souza
    const novoRomaneio: RomaneioExpedicaoDados = {
      id: generateId(),
      codigoRomaneio,
      clienteNome: clienteNomeFinal,
      dataEmissao: agora,
      motoristaPlaca: 'Veículo da Empresa / Expedição Oficial',
      observacoes: `Expedição de ${rolosMarcados.length} rolos beneficiados.`,
      rolos: rolosMarcados.map(r => ({
        numero_rolo: r.numero_rolo,
        titulo_fio: r.titulo_fio,
        tipo_fio: r.tipo_fio || 'POLIÉSTER',
        cor: r.cor,
        total_fios: 600, // padrão ou snapshot
        metros: r.metros,
        peso_bruto: Number((r.peso_liquido + 1.8).toFixed(2)),
        tara: 1.8,
        peso_liquido: r.peso_liquido,
        rolete: 'T-100',
        voltas: r.voltas || 2200,
        op_codigo: r.op_codigo
      }))
    };

    // 1. Salvar Romaneio no localStorage
    try {
      const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
      const listRom = rawRom ? JSON.parse(rawRom) : [];
      listRom.unshift({
        ...novoRomaneio,
        totalRolos: rolosMarcados.length,
        totalMetros,
        totalPesoLiquido,
        status: 'PENDENTE_FATURAMENTO'
      });
      localStorage.setItem('texlog_romaneios_emitidos', JSON.stringify(listRom));
    } catch (e) {
      console.warn('Erro ao salvar romaneio:', e);
    }

    // 2. Atualizar status dos rolos para EXPEDIDO
    try {
      const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
      if (raw) {
        const list = JSON.parse(raw);
        const atualizados = list.map((item: any) => {
          if (codigosRolos.includes(item.numero_rolo) || codigosRolos.includes(String(item.id))) {
            return {
              ...item,
              status: 'EXPEDIDO',
              expedido_em: agora,
              romaneio_id: codigoRomaneio
            };
          }
          return item;
        });
        localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(atualizados));
      }
    } catch (e) {
      console.warn('Erro ao atualizar rolos no storage:', e);
    }

    // 3. Atualizar no Supabase
    try {
      await supabase
        .from('rolos')
        .update({ status: 'EXPEDIDO' })
        .in('numero_rolo', codigosRolos);

      for (const r of rolosMarcados) {
        await supabase.from('saida_rolos').insert([{
          rolo_id: !isNaN(Number(r.id)) ? Number(r.id) : null,
          cliente_id: !isNaN(Number(clienteAlvo.id)) ? Number(clienteAlvo.id) : null,
          data_saida: agora
        }]);
      }
    } catch (errSb) {
      console.warn('Aviso Supabase update rolos:', errSb);
    }

    // 4. Registrar saídas para rastreabilidade
    rolosMarcados.forEach(r => {
      addSaida({
        id: generateId(),
        clienteId: String(clienteAlvo.id || clienteNomeFinal),
        tipoLancamento: 'ROLETES',
        roloId: r.numero_rolo,
        quantidade: 1,
        opId: String(r.op_id || r.op_codigo),
        tipoFio: (r.tipo_fio as any) || 'POLIESTER',
        tituloFio: r.titulo_fio,
        nfNumero: codigoRomaneio,
        metros: r.metros,
        voltas: r.voltas,
        pesoLiquido: r.peso_liquido,
        valorCobrado: 0,
        dataLancamento: agora.split('T')[0],
        createdAt: agora,
        observacao: `Expedição de Rolo Nº Oficial ${r.numero_rolo} • Romaneio ${codigoRomaneio}`,
        isRetroativo: false
      });
    });

    setRolosSelecionadosExpedicao([]);
    carregarDadosEstoqueERolos();

    window.dispatchEvent(new Event('texlog_saida_updated'));
    window.dispatchEvent(new Event('texlog_rolo_pesado'));
    window.dispatchEvent(new Event('texlog_faturamento_updated'));

    toast.success(`Expedição registrada! Romaneio ${codigoRomaneio} gerado com ${rolosMarcados.length} rolo(s).`, { icon: '🚚' });

    // 5. Pergunta obrigatória de Faturamento: Deseja faturar esta expedição agora?
    const resumo: ResumoExpedicaoFaturamento = {
      codigo: codigoRomaneio,
      clienteNome: clienteNomeFinal,
      clienteId: clienteAlvo.id,
      totalRolos: rolosMarcados.length,
      totalMetros,
      totalPesoKg: Number(totalPesoLiquido.toFixed(2)),
      rolos: rolosMarcados.map(r => ({ numero_rolo: r.numero_rolo, id: r.id }))
    };

    setExpedicaoDecidindoFaturamento(resumo);
  };

  const handleSaidaCaixasSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saidaForm.clienteId || !saidaForm.nfNumero) {
      toast.error('Preencha cliente e NF');
      return;
    }

    addSaida({
      ...saidaForm,
      id: generateId(),
      createdAt: new Date().toISOString()
    } as Saida);

    toast.success('Saída de caixas de fio registrada com sucesso!');
    setIsSaidaModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Submenu da Expedição com Identidade Verde */}
      <div className="flex border-b border-neutral-800 overflow-x-auto gap-2 pb-2">
        {[
          { id: 'entrada-fios', label: 'Entrada de Fios', icon: ArrowDownRight },
          { id: 'saida-fios', label: 'Saída de Fios', icon: ArrowUpRight },
          { id: 'pesagem', label: 'Pesagem', icon: Scale, count: rolosAguardandoPesagemCount, alert: rolosAguardandoPesagemCount > 0 },
          { id: 'estoque-rolos', label: 'Estoque de Rolos', icon: Package, count: rolosEmEstoque.length },
          { id: 'expedicoes', label: 'Expedições', icon: Truck, count: rolosAptosDisponiveis.length },
          { id: 'romaneios', label: 'Romaneios', icon: FileText, count: romaneiosList.length },
          { id: 'historico-expedicoes', label: 'Histórico de Expedições', icon: Receipt }
        ].map(sub => {
          const isActive = activeSub === sub.id;
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => onNavigateSub(sub.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {typeof sub.count === 'number' && sub.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  isActive ? 'bg-white text-emerald-900' : sub.alert ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {sub.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. ENTRADA DE FIOS */}
      {activeSub === 'entrada-fios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Entrada de Matéria-Prima (Fios de Clientes)</h3>
              <p className="text-xs text-neutral-400">Registro de NF, caixas, lotes e peso de fios entregues para produção.</p>
            </div>
            <button
              onClick={() => setIsNovaEntradaModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Entrada de Fios</span>
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">NF</th>
                    <th className="px-6 py-4 font-medium">Itens de Fio (Lote / Cones / Cor)</th>
                    <th className="px-6 py-4 font-medium text-right">Embalagens</th>
                    <th className="px-6 py-4 font-medium text-right">Peso Líq. (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {entradasSalvas.map(ent => (
                    <tr key={ent.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        {new Date(ent.dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{ent.clienteNome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                        {ent.numeroNf}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {ent.itens.map((it, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2 text-xs bg-black/40 p-2 rounded-xl border border-white/5">
                              <span className="font-mono text-neutral-200 font-bold">{it.fioNome}</span>
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-bold uppercase text-[10px]">
                                {it.cor}
                              </span>
                              {it.lote && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
                                  LOTE: {it.lote}
                                </span>
                              )}
                              <span className="text-emerald-400 font-mono font-bold text-[11px]">
                                {it.pesoKg.toFixed(2)} kg
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-right font-bold text-white">
                        {ent.totalEmbalagens || ent.totalCaixas} emb
                      </td>
                      <td className="px-6 py-4 font-mono text-right font-bold text-emerald-400">
                        {ent.totalPesoKg.toFixed(2)} kg
                      </td>
                    </tr>
                  ))}

                  {entradasSalvas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                        Nenhuma entrada de fios cadastrada até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. SAÍDA DE FIOS */}
      {activeSub === 'saida-fios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Saída / Devolução de Matéria-Prima</h3>
              <p className="text-xs text-neutral-400">Registro de devolução de sobras de fios ou cones aos clientes.</p>
            </div>
            <button
              onClick={() => setIsSaidaModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Saída de Fios</span>
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">NF / Doc</th>
                    <th className="px-6 py-4 font-medium">Título do Fio</th>
                    <th className="px-6 py-4 font-medium text-right">Quantidade</th>
                    <th className="px-6 py-4 font-medium text-right">Peso Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {saidas.filter(s => s.tipoLancamento === 'CAIXAS').map(s => {
                    const cli = clientes.find(c => c.id === s.clienteId);
                    return (
                      <tr key={s.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-neutral-300">
                          {new Date(s.dataLancamento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {cli?.nomeFantasia || cli?.razaoSocial || 'Cliente'}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                          {s.nfNumero || '—'}
                        </td>
                        <td className="px-6 py-4 font-mono text-neutral-300">
                          {s.tituloFio} ({s.tipoFio})
                        </td>
                        <td className="px-6 py-4 font-mono text-right text-white">
                          {s.quantidade} cx
                        </td>
                        <td className="px-6 py-4 font-mono text-right font-bold text-emerald-400">
                          {s.pesoLiquido?.toFixed(2)} kg
                        </td>
                      </tr>
                    );
                  })}

                  {saidas.filter(s => s.tipoLancamento === 'CAIXAS').length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                        Nenhuma saída de caixas de fio registrada até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PESAGEM */}
      {activeSub === 'pesagem' && (
        <FilaRolosAguardandoPesagem />
      )}

      {/* 4. ESTOQUE DE ROLOS */}
      {activeSub === 'estoque-rolos' && (
        <div className="space-y-6">
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-300">Estoque de Rolos Pesados</h3>
                <p className="text-xs text-neutral-400">
                  Após a pesagem o rolo permanece em Estoque de Rolos aguardando ser selecionado para uma futura expedição.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSub('expedicoes')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Ir para Expedição por Cliente</span>
            </button>
          </div>

          {/* Cards de Resumo do Estoque */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Total de Rolos em Estoque</span>
              <span className="text-2xl font-black font-mono text-white mt-1 block">{rolosEmEstoque.length} rolos</span>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Metragem Total em Estoque</span>
              <span className="text-2xl font-black font-mono text-blue-400 mt-1 block">
                {rolosEmEstoque.reduce((acc, r) => acc + (r.metros || 0), 0).toLocaleString('pt-BR')} m
              </span>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Peso Líquido Total em Estoque</span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                {rolosEmEstoque.reduce((acc, r) => acc + (r.peso_liquido || 0), 0).toFixed(2)} kg
              </span>
            </div>
          </div>

          {/* Filtros do Estoque */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar por Número Oficial (ex: 25561), fio, cor..."
                value={buscaEstoque}
                onChange={e => setBuscaEstoque(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="w-full sm:w-72">
              <select
                value={filtroEstoqueClienteId}
                onChange={e => setFiltroEstoqueClienteId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              >
                <option value="">Todos os Clientes</option>
                {clientesOficiais.map(c => (
                  <option key={c.id} value={c.id}>{c.nomeFantasia || c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela do Estoque de Rolos */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-black">Nº Oficial Rolo</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Título do Fio & Cor</th>
                    <th className="px-6 py-4 font-medium text-right">Metros</th>
                    <th className="px-6 py-4 font-medium text-right">Peso Líquido</th>
                    <th className="px-6 py-4 font-medium">Data Pesagem</th>
                    <th className="px-6 py-4 font-medium text-right">OP de Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {rolosEmEstoque
                    .filter(r => {
                      if (filtroEstoqueClienteId) {
                        const termo = filtroEstoqueClienteId.toLowerCase();
                        const matchId = String(r.cliente_id || '').toLowerCase() === termo;
                        const matchNome = (r.cliente_nome || '').toLowerCase().includes(termo);
                        if (!matchId && !matchNome) return false;
                      }
                      if (buscaEstoque) {
                        const b = buscaEstoque.toLowerCase();
                        return (
                          r.numero_rolo.toLowerCase().includes(b) ||
                          r.cliente_nome.toLowerCase().includes(b) ||
                          r.titulo_fio.toLowerCase().includes(b) ||
                          r.cor.toLowerCase().includes(b)
                        );
                      }
                      return true;
                    })
                    .map(r => (
                      <tr key={r.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-white text-base">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {r.numero_rolo}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {r.cliente_nome}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="font-mono text-neutral-200 font-bold block">{r.titulo_fio}</span>
                          <span className="text-neutral-500 uppercase">{r.tipo_fio || 'POLIÉSTER'} • {r.cor}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-right text-neutral-300 font-bold">
                          {r.metros?.toLocaleString('pt-BR')} m
                        </td>
                        <td className="px-6 py-4 font-mono text-right font-black text-emerald-400 text-sm">
                          {r.peso_liquido.toFixed(2)} kg
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                          {new Date(r.pesado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-mono text-right text-xs text-neutral-500">
                          {r.op_codigo || '—'}
                        </td>
                      </tr>
                    ))}

                  {rolosEmEstoque.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                        Nenhum rolo disponível em estoque. Realize pesagens para abastecer o estoque de rolos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. EXPEDIÇÕES (SELEÇÃO POR CLIENTE + REGISTRO MULTI-ROLOS) */}
      {activeSub === 'expedicoes' && (
        <div className="space-y-6">
          {/* Seletor de Cliente */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              <div className="lg:col-span-2 space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-emerald-400">
                  1. Selecionar Cliente para Expedição *
                </label>
                <select
                  value={clienteExpedicaoId}
                  onChange={(e) => {
                    setClienteExpedicaoId(e.target.value);
                    setRolosSelecionadosExpedicao([]);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="">Selecione um cliente para carregar seus rolos liberados</option>
                  {clientesOficiais.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia && c.nomeFantasia !== c.nome ? `${c.nomeFantasia} (${c.nome})` : c.nome}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500">
                  O sistema localiza automaticamente todos os rolos aptos daquele cliente em Estoque de Rolos.
                </p>
              </div>

              <div className="bg-neutral-950/70 border border-white/5 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Carga Selecionada
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Rolos Marcados:</span>
                  <span className="font-mono font-black text-emerald-400">{rolosSelecionadosExpedicao.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Peso Total:</span>
                  <span className="font-mono font-black text-white">
                    {rolosAptosDisponiveis
                      .filter(r => rolosSelecionadosExpedicao.includes(r.numero_rolo))
                      .reduce((acc, r) => acc + r.peso_liquido, 0).toFixed(2)} kg
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Rolos Aptos */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-neutral-950/40 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (rolosSelecionadosExpedicao.length === rolosAptosDisponiveis.length) {
                      setRolosSelecionadosExpedicao([]);
                    } else {
                      setRolosSelecionadosExpedicao(rolosAptosDisponiveis.map(r => r.numero_rolo));
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
                >
                  {rolosSelecionadosExpedicao.length === rolosAptosDisponiveis.length && rolosAptosDisponiveis.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-500" />
                  )}
                  <span>Selecionar Todos ({rolosAptosDisponiveis.length})</span>
                </button>
              </div>

              {rolosSelecionadosExpedicao.length > 0 && (
                <button
                  onClick={handleRegistrarExpedicao}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Gerar Romaneio e Registrar Expedição ({rolosSelecionadosExpedicao.length})</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">Sel.</th>
                    <th className="px-6 py-4 font-black">Nº Oficial Rolo</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Título do Fio & Cor</th>
                    <th className="px-6 py-4 font-medium text-right">Metros</th>
                    <th className="px-6 py-4 font-medium text-right">Peso Líquido</th>
                    <th className="px-6 py-4 font-medium">Data Pesagem</th>
                    <th className="px-6 py-4 font-medium text-right">OP Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {rolosAptosDisponiveis.map(r => {
                    const isSelected = rolosSelecionadosExpedicao.includes(r.numero_rolo);
                    return (
                      <tr 
                        key={r.id} 
                        onClick={() => {
                          if (isSelected) {
                            setRolosSelecionadosExpedicao(prev => prev.filter(x => x !== r.numero_rolo));
                          } else {
                            setRolosSelecionadosExpedicao(prev => [...prev, r.numero_rolo]);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-950/20' : 'hover:bg-neutral-800/40'
                        }`}
                      >
                        <td className="px-6 py-4 text-center">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400 inline" />
                          ) : (
                            <Square className="w-5 h-5 text-neutral-600 inline" />
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-white text-base">
                          {r.numero_rolo}
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {r.cliente_nome}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="font-mono text-neutral-200 font-bold">{r.titulo_fio}</span>
                          <span className="text-neutral-500 block">{r.cor}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-right text-neutral-300 font-bold">
                          {r.metros?.toLocaleString('pt-BR')} m
                        </td>
                        <td className="px-6 py-4 font-mono text-right font-black text-emerald-400 text-sm">
                          {r.peso_liquido.toFixed(2)} kg
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                          {new Date(r.pesado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-mono text-right text-xs text-neutral-500">
                          {r.op_codigo || '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {rolosAptosDisponiveis.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                        {clienteExpedicaoId 
                          ? 'Nenhum rolo liberado em estoque para este cliente.' 
                          : 'Selecione um cliente acima para visualizar todos os rolos liberados para expedição.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. ROMANEIOS */}
      {activeSub === 'romaneios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Romaneios Oficiais de Expedição</h3>
              <p className="text-xs text-neutral-400">
                Cada Romaneio representa uma EXPEDIÇÃO com múltiplos rolos e totalizações completas.
              </p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Código Romaneio</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Data Emissão</th>
                    <th className="px-6 py-4 font-medium text-center">Total de Rolos</th>
                    <th className="px-6 py-4 font-medium text-right">Metros</th>
                    <th className="px-6 py-4 font-medium text-right">Peso Total (kg)</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {romaneiosList.map((rom, idx) => (
                    <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                        {rom.codigoRomaneio}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {rom.clienteNome}
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        {new Date(rom.dataEmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-white">
                        {rom.rolos?.length || rom.totalRolos || 1} rolos
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-neutral-300 font-bold">
                        {(rom.totalMetros || rom.rolos?.reduce((a: number, b: any) => a + (b.metros || 0), 0) || 0).toLocaleString('pt-BR')} m
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-emerald-400">
                        {(rom.totalPesoLiquido || rom.rolos?.reduce((a: number, b: any) => a + (b.peso_liquido || b.pesoLiquidoKg || 0), 0) || 0).toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setRomaneioVisualizar({
                            id: rom.id || String(idx),
                            codigoRomaneio: rom.codigoRomaneio,
                            clienteNome: rom.clienteNome,
                            dataEmissao: rom.dataEmissao,
                            rolos: rom.rolos || []
                          })}
                          className="bg-neutral-800 hover:bg-neutral-700 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Visualizar / Imprimir</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {romaneiosList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                        Nenhum romaneio de expedição emitido até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. HISTÓRICO DE EXPEDIÇÕES */}
      {activeSub === 'historico-expedicoes' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Histórico Consolidado de Saídas e Expedições
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Data Saída</th>
                  <th className="px-6 py-4 font-medium">Nº Oficial Rolo</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Romaneio / NF</th>
                  <th className="px-6 py-4 font-medium text-right">Metros</th>
                  <th className="px-6 py-4 font-medium text-right">Peso Líquido</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {saidas.filter(s => s.tipoLancamento === 'ROLETES').map(s => {
                  const cli = clientes.find(c => c.id === s.clienteId);
                  return (
                    <tr key={s.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        {new Date(s.dataLancamento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-white text-base">
                        {s.roloId || '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {cli?.nomeFantasia || cli?.razaoSocial || s.clienteId}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-emerald-400 font-bold">
                        {s.nfNumero || 'EXPEDIÇÃO'}
                      </td>
                      <td className="px-6 py-4 font-mono text-right text-neutral-300">
                        {s.metros ? `${s.metros.toLocaleString('pt-BR')} m` : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-right font-bold text-emerald-400">
                        {s.pesoLiquido?.toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          EXPEDIDO
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {saidas.filter(s => s.tipoLancamento === 'ROLETES').length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                      Nenhuma expedição de rolos registrada até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NOVA ENTRADA DE FIOS */}
      <NovaEntradaModal
        isOpen={isNovaEntradaModalOpen}
        onClose={() => {
          setIsNovaEntradaModalOpen(false);
          carregarDadosEstoqueERolos();
        }}
        onSuccess={() => carregarDadosEstoqueERolos()}
      />

      {/* MODAL SAÍDA DE FIOS (CAIXAS) */}
      {isSaidaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Registrar Saída de Fios (Caixas)</h3>
            <form onSubmit={handleSaidaCaixasSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Cliente *</label>
                <select
                  value={saidaForm.clienteId}
                  onChange={e => setSaidaForm(prev => ({ ...prev, clienteId: e.target.value }))}
                  required
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-bold"
                >
                  <option value="">Selecione o Cliente</option>
                  {clientesOficiais.map(c => (
                    <option key={c.id} value={c.id}>{c.nomeFantasia || c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Número da NF *</label>
                <input
                  type="text"
                  required
                  value={saidaForm.nfNumero}
                  onChange={e => setSaidaForm(prev => ({ ...prev, nfNumero: e.target.value }))}
                  placeholder="Ex: NF-10442"
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Qtd. Caixas *</label>
                  <input
                    type="number"
                    required
                    value={saidaForm.quantidade || ''}
                    onChange={e => setSaidaForm(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Peso Líq. (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={saidaForm.pesoLiquido || ''}
                    onChange={e => setSaidaForm(prev => ({ ...prev, pesoLiquido: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Título do Fio</label>
                <input
                  type="text"
                  value={saidaForm.tituloFio}
                  onChange={e => setSaidaForm(prev => ({ ...prev, tituloFio: e.target.value }))}
                  placeholder="Ex: 150/48 Poliéster"
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaidaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  Salvar Saída
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISUALIZADOR OFICIAL DE ROMANEIO (PDF / IMPRESSÃO) */}
      <VisualizadorRomaneioModal
        romaneio={romaneioVisualizar}
        onClose={() => setRomaneioVisualizar(null)}
      />

      {/* MODAL DECISÃO FATURAMENTO: "Deseja faturar esta expedição? SIM / NÃO" */}
      {expedicaoDecidindoFaturamento && (
        <ModalDecisaoFaturamento
          isOpen={true}
          resumo={expedicaoDecidindoFaturamento}
          onClose={() => setExpedicaoDecidindoFaturamento(null)}
          onDecidir={(faturarAgora) => {
            const dados = expedicaoDecidindoFaturamento;
            setExpedicaoDecidindoFaturamento(null);
            if (faturarAgora && dados) {
              setExpedicaoFaturando(dados);
            } else {
              toast('Expedição registrada! Romaneio pronto para faturamento no Financeiro.', { icon: '📋' });
            }
          }}
        />
      )}

      {/* MODAL DE FATURAMENTO DA EXPEDIÇÃO (Assistente em 5 etapas) */}
      {expedicaoFaturando && (
        <ModalFaturarRomaneio
          isOpen={true}
          expedicao={expedicaoFaturando}
          onClose={() => {
            setExpedicaoFaturando(null);
            onNavigateSub('expedicoes');
          }}
          onSuccess={() => {
            setExpedicaoFaturando(null);
            carregarDadosEstoqueERolos();
            onNavigateSub('expedicoes');
          }}
          onFaturadoSucesso={() => {
            setExpedicaoFaturando(null);
            carregarDadosEstoqueERolos();
            onNavigateSub('expedicoes');
          }}
        />
      )}

    </div>
  );
}
