import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Filter, 
  CreditCard, 
  Building2, 
  Truck, 
  Edit2, 
  Trash2, 
  Save, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { generateId } from '../../../lib/utils';
import { ModalFaturarRomaneio, ResumoExpedicaoFaturamento, FaturamentoPayload, ParcelaCalculada } from '../ModalFaturamento';

export interface ContaPagarItem {
  id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  vencimento: string;
  valor: number;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO';
  formaPagamento?: string;
  pagoEm?: string;
}

export interface DespesaItem {
  id: string;
  descricao: string;
  categoria: 'ENERGIA' | 'MANUTENCAO' | 'MATERIA_PRIMA' | 'SALARIOS' | 'FRETE' | 'ADMINISTRATIVO' | 'OUTROS';
  valor: number;
  data: string;
  formaPagamento: string;
  observacao?: string;
}

interface FinanceiroModuleProps {
  activeSub: string;
  onNavigateSub: (sub: string) => void;
  expedicaoParaFaturarInicial?: ResumoExpedicaoFaturamento | null;
}

export function FinanceiroModule({ activeSub, onNavigateSub, expedicaoParaFaturarInicial }: FinanceiroModuleProps) {
  const { clientes, saidas } = useStore();
  
  // Expedições e Romaneios
  const [romaneiosList, setRomaneiosList] = useState<any[]>([]);
  const [faturamentosList, setFaturamentosList] = useState<any[]>([]);
  const [expedicaoFaturando, setExpedicaoFaturando] = useState<ResumoExpedicaoFaturamento | null>(expedicaoParaFaturarInicial || null);

  // Contas a Pagar e Despesas (armazenadas com persistência local)
  const [contasPagar, setContasPagar] = useState<ContaPagarItem[]>([]);
  const [despesas, setDespesas] = useState<DespesaItem[]>([]);
  const [isModalContaPagarOpen, setIsModalContaPagarOpen] = useState(false);
  const [isModalDespesaOpen, setIsModalDespesaOpen] = useState(false);

  // Forms
  const [formContaPagar, setFormContaPagar] = useState<Partial<ContaPagarItem>>({
    fornecedor: '',
    descricao: '',
    categoria: 'Insumos Têxteis',
    vencimento: new Date().toISOString().split('T')[0],
    valor: 0,
    status: 'PENDENTE'
  });

  const [formDespesa, setFormDespesa] = useState<Partial<DespesaItem>>({
    descricao: '',
    categoria: 'MANUTENCAO',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    formaPagamento: 'PIX',
    observacao: ''
  });

  const carregarDadosFinanceiros = () => {
    try {
      const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
      if (rawRom) setRomaneiosList(JSON.parse(rawRom));

      const rawFat = localStorage.getItem('texlog_faturamentos_concluidos');
      if (rawFat) setFaturamentosList(JSON.parse(rawFat));

      const rawCp = localStorage.getItem('texlog_contas_pagar');
      if (rawCp) {
        setContasPagar(JSON.parse(rawCp));
      } else {
        // Mock inicial de demonstração se vazio
        const initialCp: ContaPagarItem[] = [
          { id: '1', fornecedor: 'Fiação Santa Catarina', descricao: 'Lote Fio Poliéster 150/48', categoria: 'Matéria-Prima', vencimento: '2026-10-15', valor: 4500, status: 'PENDENTE', formaPagamento: 'Boleto' },
          { id: '2', fornecedor: 'Enel Energia Industrial', descricao: 'Energia Elétrica Unidade Galpão', categoria: 'Energia', vencimento: '2026-10-10', valor: 3200, status: 'PENDENTE', formaPagamento: 'Boleto' }
        ];
        setContasPagar(initialCp);
        localStorage.setItem('texlog_contas_pagar', JSON.stringify(initialCp));
      }

      const rawDesp = localStorage.getItem('texlog_despesas_empresa');
      if (rawDesp) {
        setDespesas(JSON.parse(rawDesp));
      } else {
        const initialDesp: DespesaItem[] = [
          { id: '1', descricao: 'Troca de agulhas e roletes do Tear 2', categoria: 'MANUTENCAO', valor: 850, data: '2026-09-20', formaPagamento: 'PIX' },
          { id: '2', descricao: 'Combustível veículo entrega', categoria: 'FRETE', valor: 340, data: '2026-09-24', formaPagamento: 'PIX' }
        ];
        setDespesas(initialDesp);
        localStorage.setItem('texlog_despesas_empresa', JSON.stringify(initialDesp));
      }
    } catch (e) {
      console.warn('Erro ao carregar dados financeiros:', e);
    }
  };

  useEffect(() => {
    carregarDadosFinanceiros();
    window.addEventListener('texlog_faturamento_updated', carregarDadosFinanceiros);
    window.addEventListener('storage', carregarDadosFinanceiros);
    return () => {
      window.removeEventListener('texlog_faturamento_updated', carregarDadosFinanceiros);
      window.removeEventListener('storage', carregarDadosFinanceiros);
    };
  }, []);

  useEffect(() => {
    if (expedicaoParaFaturarInicial) {
      setExpedicaoFaturando(expedicaoParaFaturarInicial);
    }
  }, [expedicaoParaFaturarInicial]);

  // Romaneios pendentes e faturados
  const pendentesFaturamento = romaneiosList.filter(r => r.status === 'PENDENTE_FATURAMENTO' || r.status === 'EXPEDIDO' || !r.status);
  
  // Totalizações Financeiras
  const totalFaturado = faturamentosList.reduce((acc, f) => acc + (Number(f.valorTotal) || 0), 0);
  const totalPendente = pendentesFaturamento.reduce((acc, r) => {
    const cli = clientes.find(c => c.nomeFantasia === r.clienteNome || c.razaoSocial === r.clienteNome);
    const preco = cli?.valorCobrado || 120.0;
    const qtd = cli?.tipoCobranca === 'METRO' ? (r.totalMetros || 1) : (r.totalRolos || r.rolos?.length || 1);
    return acc + (qtd * preco);
  }, 0);

  // Coleta de todas as parcelas de todos os faturamentos
  const todasParcelas: Array<ParcelaCalculada & { clienteNome: string; codigoExpedicao: string; faturamentoId: string }> = [];
  faturamentosList.forEach(fat => {
    if (Array.isArray(fat.parcelas)) {
      fat.parcelas.forEach((p: ParcelaCalculada) => {
        todasParcelas.push({
          ...p,
          clienteNome: fat.clienteNome,
          codigoExpedicao: fat.codigoExpedicao,
          faturamentoId: fat.id
        });
      });
    }
  });

  const handleSalvarContaPagar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContaPagar.fornecedor || !formContaPagar.valor) {
      toast.error('Preencha fornecedor e valor');
      return;
    }

    const nova: ContaPagarItem = {
      id: generateId(),
      fornecedor: formContaPagar.fornecedor!,
      descricao: formContaPagar.descricao || '',
      categoria: formContaPagar.categoria || 'Geral',
      vencimento: formContaPagar.vencimento!,
      valor: Number(formContaPagar.valor),
      status: 'PENDENTE',
      formaPagamento: formContaPagar.formaPagamento || 'Boleto'
    };

    const atualizada = [nova, ...contasPagar];
    setContasPagar(atualizada);
    localStorage.setItem('texlog_contas_pagar', JSON.stringify(atualizada));
    toast.success('Conta a pagar cadastrada!');
    setIsModalContaPagarOpen(false);
  };

  const handleSalvarDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDespesa.descricao || !formDespesa.valor) {
      toast.error('Preencha descrição e valor');
      return;
    }

    const nova: DespesaItem = {
      id: generateId(),
      descricao: formDespesa.descricao!,
      categoria: formDespesa.categoria || 'MANUTENCAO',
      valor: Number(formDespesa.valor),
      data: formDespesa.data!,
      formaPagamento: formDespesa.formaPagamento || 'PIX',
      observacao: formDespesa.observacao || ''
    };

    const atualizada = [nova, ...despesas];
    setDespesas(atualizada);
    localStorage.setItem('texlog_despesas_empresa', JSON.stringify(atualizada));
    toast.success('Despesa registrada com sucesso!');
    setIsModalDespesaOpen(false);
  };

  const handlePagarConta = (id: string) => {
    const atualizada = contasPagar.map(c => c.id === id ? { ...c, status: 'PAGO' as const, pagoEm: new Date().toISOString() } : c);
    setContasPagar(atualizada);
    localStorage.setItem('texlog_contas_pagar', JSON.stringify(atualizada));
    toast.success('Conta marcada como paga!');
  };

  const handleReceberParcela = (faturamentoId: string, numeroParcela: number) => {
    const fatAtualizado = faturamentosList.map(f => {
      if (f.id === faturamentoId && Array.isArray(f.parcelas)) {
        return {
          ...f,
          parcelas: f.parcelas.map((p: any) => p.numero === numeroParcela ? { ...p, status: 'PAGO' } : p)
        };
      }
      return f;
    });

    setFaturamentosList(fatAtualizado);
    localStorage.setItem('texlog_faturamentos_concluidos', JSON.stringify(fatAtualizado));
    window.dispatchEvent(new Event('texlog_faturamento_updated'));
    toast.success(`Parcela ${numeroParcela} recebida com sucesso!`, { icon: '💰' });
  };

  return (
    <div className="space-y-6">
      
      {/* Submenu do Financeiro com Identidade Roxa */}
      <div className="flex border-b border-neutral-800 overflow-x-auto gap-2 pb-2">
        {[
          { id: 'faturamentos', label: 'Faturamentos', icon: Receipt, count: pendentesFaturamento.length, alert: pendentesFaturamento.length > 0 },
          { id: 'contas-receber', label: 'Contas a Receber', icon: ArrowDownRight },
          { id: 'contas-pagar', label: 'Contas a Pagar', icon: ArrowUpRight, count: contasPagar.filter(c => c.status === 'PENDENTE').length },
          { id: 'parcelas', label: 'Parcelas', icon: Calendar, count: todasParcelas.length },
          { id: 'recebimentos', label: 'Recebimentos', icon: CheckCircle2 },
          { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp },
          { id: 'despesas', label: 'Despesas da Empresa', icon: Wallet }
        ].map(sub => {
          const isActive = activeSub === sub.id;
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => onNavigateSub(sub.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {typeof sub.count === 'number' && sub.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  isActive ? 'bg-white text-purple-900' : sub.alert ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {sub.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Faturado</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-purple-400">
            R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-neutral-500 block mt-1">{faturamentosList.length} faturamentos realizados</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Pendente de Faturamento</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-amber-300">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-neutral-500 block mt-1">{pendentesFaturamento.length} romaneio(s) a faturar</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Contas a Pagar</span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-red-400">
            R$ {contasPagar.filter(c => c.status === 'PENDENTE').reduce((a, b) => a + b.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-neutral-500 block mt-1">{contasPagar.filter(c => c.status === 'PENDENTE').length} boletos em aberto</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Saldo Líquido</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-emerald-400">
            R$ {(totalFaturado - despesas.reduce((a, b) => a + b.valor, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-neutral-500 block mt-1">Resultado operacional apurado</span>
        </div>
      </div>

      {/* 1. FATURAMENTOS (VINCULADO À EXPEDIÇÃO / ROMANEIO) */}
      {activeSub === 'faturamentos' && (
        <div className="space-y-6">
          {/* Romaneios Pendentes de Faturamento */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Expedições / Romaneios Aguardando Faturamento
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  O faturamento é vinculado à Expedição (Romaneio) e gera parcelas com vencimentos e valores totalmente editáveis.
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                {pendentesFaturamento.length} pendentes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Romaneio</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Data Emissão</th>
                    <th className="px-6 py-4 font-medium text-center">Rolos</th>
                    <th className="px-6 py-4 font-medium text-right">Peso Líquido</th>
                    <th className="px-6 py-4 font-medium text-right">Valor Estimado</th>
                    <th className="px-6 py-4 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {pendentesFaturamento.map((rom, idx) => {
                    const cli = clientes.find(c => c.nomeFantasia === rom.clienteNome || c.razaoSocial === rom.clienteNome);
                    const preco = cli?.valorCobrado || 120.0;
                    const totalR = rom.totalRolos || rom.rolos?.length || 1;
                    const totalM = rom.totalMetros || rom.rolos?.reduce((a: number, b: any) => a + (b.metros || 0), 0) || 0;
                    const valorPrevisto = cli?.tipoCobranca === 'METRO' ? (totalM * preco) : (totalR * preco);

                    return (
                      <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-purple-400">
                          {rom.codigoRomaneio}
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {rom.clienteNome}
                        </td>
                        <td className="px-6 py-4 font-mono text-neutral-300">
                          {new Date(rom.dataEmissao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-white">
                          {totalR} un
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                          {(rom.totalPesoLiquido || rom.rolos?.reduce((a: number, b: any) => a + (b.peso_liquido || 0), 0) || 0).toFixed(2)} kg
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-amber-300">
                          R$ {valorPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              const resumo: ResumoExpedicaoFaturamento = {
                                codigo: rom.codigoRomaneio,
                                clienteNome: rom.clienteNome,
                                clienteId: rom.clienteId,
                                totalRolos: totalR,
                                totalMetros: totalM,
                                totalPesoKg: rom.totalPesoLiquido || 0,
                                rolos: rom.rolos || []
                              };
                              setExpedicaoFaturando(resumo);
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                          >
                            Faturar Agora
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {pendentesFaturamento.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                        Nenhuma expedição pendente de faturamento no momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Histórico de Faturamentos Concluídos */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Faturamentos Emitidos com Sucesso
              </h3>
              <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                {faturamentosList.length} faturados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Expedição Ref.</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Forma & Condição</th>
                    <th className="px-6 py-4 font-medium text-center">Parcelas</th>
                    <th className="px-6 py-4 font-medium text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {faturamentosList.map((fat, idx) => (
                    <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        {new Date(fat.faturadoEm).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-purple-400">
                        {fat.codigoExpedicao}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {fat.clienteNome}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-bold text-white uppercase block">{fat.formaPagamento}</span>
                        <span className="text-neutral-400">{fat.condicaoPagamento}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-neutral-300">
                        {fat.parcelas?.length || 1}x
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-emerald-400 text-base">
                        R$ {Number(fat.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  {faturamentosList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                        Nenhum faturamento registrado até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTAS A RECEBER */}
      {activeSub === 'contas-receber' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              Contas a Receber (Vencimentos de Clientes)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Doc / Romaneio</th>
                  <th className="px-6 py-4 font-medium">Parcela</th>
                  <th className="px-6 py-4 font-medium">Vencimento</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {todasParcelas.map((parc, idx) => {
                  const isPaga = parc.status === 'PAGO';
                  return (
                    <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        {parc.clienteNome}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-purple-400">
                        {parc.codigoExpedicao}
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        Parcela {parc.numero}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-neutral-200">
                        {new Date((parc.vencimento || (parc as any).dataVencimento) + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-emerald-400">
                        R$ {parc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          isPaga ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {isPaga ? 'RECEBIDO' : 'EM ABERTO'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isPaga && (
                          <button
                            onClick={() => handleReceberParcela(parc.faturamentoId, parc.numero)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Dar Baixa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {todasParcelas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                      Nenhuma conta a receber pendente. Realize o faturamento das expedições para gerar os recebíveis.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CONTAS A PAGAR */}
      {activeSub === 'contas-pagar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Contas a Pagar (Obrigações & Fornecedores)</h3>
              <p className="text-xs text-neutral-400">Controle de boletos, matérias-primas e serviços operacionais da RB Souza.</p>
            </div>
            <button
              onClick={() => setIsModalContaPagarOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta a Pagar</span>
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Fornecedor</th>
                    <th className="px-6 py-4 font-medium">Descrição</th>
                    <th className="px-6 py-4 font-medium">Categoria</th>
                    <th className="px-6 py-4 font-medium">Vencimento</th>
                    <th className="px-6 py-4 font-medium text-right">Valor</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {contasPagar.map(cp => (
                    <tr key={cp.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        {cp.fornecedor}
                      </td>
                      <td className="px-6 py-4 text-neutral-300">
                        {cp.descricao}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-neutral-400">
                        {cp.categoria}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-neutral-200">
                        {new Date(cp.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-red-400">
                        R$ {cp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          cp.status === 'PAGO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {cp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {cp.status === 'PENDENTE' && (
                          <button
                            onClick={() => handlePagarConta(cp.id)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PARCELAS (MASTER COM DATAS E VALORES EDITÁVEIS) */}
      {activeSub === 'parcelas' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Cronograma Geral de Parcelas
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Vencimentos e valores podem ser ajustados conforme negociação com os clientes.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Parcela</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Romaneio Ref.</th>
                  <th className="px-6 py-4 font-medium">Data de Vencimento</th>
                  <th className="px-6 py-4 font-medium text-right">Valor da Parcela</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {todasParcelas.map((p, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      Parcela {p.numero}
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-200">
                      {p.clienteNome}
                    </td>
                    <td className="px-6 py-4 font-mono text-purple-400 font-bold">
                      {p.codigoExpedicao}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {new Date((p.vencimento || (p as any).dataVencimento) + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-emerald-400">
                      R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        p.status === 'PAGO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {p.status || 'PENDENTE'}
                      </span>
                    </td>
                  </tr>
                ))}

                {todasParcelas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      Nenhuma parcela gerada até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. RECEBIMENTOS */}
      {activeSub === 'recebimentos' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recebimentos e Baixas Confirmadas
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Romaneio</th>
                  <th className="px-6 py-4 font-medium">Parcela</th>
                  <th className="px-6 py-4 font-medium text-right">Valor Recebido</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {todasParcelas.filter(p => p.status === 'PAGO').map((p, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {p.clienteNome}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-purple-400">
                      {p.codigoExpedicao}
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-300">
                      Parcela {p.numero}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-emerald-400">
                      R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        CONFIRMADO
                      </span>
                    </td>
                  </tr>
                ))}

                {todasParcelas.filter(p => p.status === 'PAGO').length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      Nenhum recebimento baixado até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. FLUXO DE CAIXA */}
      {activeSub === 'fluxo-caixa' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">Total de Entradas</span>
              <span className="text-3xl font-black font-mono text-emerald-400">
                R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-neutral-500 mt-2">Recebimentos de faturamento de rolos</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 block mb-1">Total de Saídas</span>
              <span className="text-3xl font-black font-mono text-red-400">
                R$ {despesas.reduce((a, b) => a + b.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-neutral-500 mt-2">Despesas e custos operacionais</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-1">Saldo em Caixa</span>
              <span className="text-3xl font-black font-mono text-white">
                R$ {(totalFaturado - despesas.reduce((a, b) => a + b.valor, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-neutral-500 mt-2">Saldo líquido disponível apurado</p>
            </div>
          </div>
        </div>
      )}

      {/* 7. DESPESAS DA EMPRESA */}
      {activeSub === 'despesas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Despesas Operacionais da Empresa</h3>
              <p className="text-xs text-neutral-400">Custos fixos, manutenção dos teares, matéria-prima e logística.</p>
            </div>
            <button
              onClick={() => setIsModalDespesaOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Despesa</span>
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/40 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Descrição</th>
                    <th className="px-6 py-4 font-medium">Categoria</th>
                    <th className="px-6 py-4 font-medium">Forma Pagto</th>
                    <th className="px-6 py-4 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {despesas.map(d => (
                    <tr key={d.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-neutral-300">
                        {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {d.descricao}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 uppercase font-mono">
                          {d.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-neutral-300">
                        {d.formaPagamento}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-red-400">
                        R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTA A PAGAR */}
      {isModalContaPagarOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Cadastrar Conta a Pagar</h3>
            <form onSubmit={handleSalvarContaPagar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Fornecedor / Beneficiário *</label>
                <input
                  type="text"
                  required
                  value={formContaPagar.fornecedor}
                  onChange={e => setFormContaPagar(p => ({ ...p, fornecedor: e.target.value }))}
                  placeholder="Ex: Fiação Santa Catarina"
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={formContaPagar.descricao}
                  onChange={e => setFormContaPagar(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Compra de matéria-prima"
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formContaPagar.valor || ''}
                    onChange={e => setFormContaPagar(p => ({ ...p, valor: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={formContaPagar.vencimento}
                    onChange={e => setFormContaPagar(p => ({ ...p, vencimento: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalContaPagarOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DESPESA */}
      {isModalDespesaOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Lançar Despesa Operacional</h3>
            <form onSubmit={handleSalvarDespesa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  value={formDespesa.descricao}
                  onChange={e => setFormDespesa(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Peças para manutenção do Tear 1"
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Categoria</label>
                  <select
                    value={formDespesa.categoria}
                    onChange={e => setFormDespesa(p => ({ ...p, categoria: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-bold"
                  >
                    <option value="MANUTENCAO">Manutenção</option>
                    <option value="ENERGIA">Energia</option>
                    <option value="MATERIA_PRIMA">Matéria-Prima</option>
                    <option value="FRETE">Frete / Combustível</option>
                    <option value="SALARIOS">Salários</option>
                    <option value="ADMINISTRATIVO">Administrativo</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formDespesa.valor || ''}
                    onChange={e => setFormDespesa(p => ({ ...p, valor: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formDespesa.data}
                    onChange={e => setFormDespesa(p => ({ ...p, data: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Forma de Pagto</label>
                  <select
                    value={formDespesa.formaPagamento}
                    onChange={e => setFormDespesa(p => ({ ...p, formaPagamento: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs font-bold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalDespesaOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FATURAMENTO DA EXPEDIÇÃO (Assistente em 5 etapas) */}
      {expedicaoFaturando && (
        <ModalFaturarRomaneio
          isOpen={true}
          expedicao={expedicaoFaturando}
          onClose={() => setExpedicaoFaturando(null)}
          onSuccess={() => {
            setExpedicaoFaturando(null);
            carregarDadosFinanceiros();
          }}
          onFaturadoSucesso={() => {
            setExpedicaoFaturando(null);
            carregarDadosFinanceiros();
          }}
        />
      )}

    </div>
  );
}
