import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Receipt, 
  Clock, 
  CreditCard, 
  CheckCircle2, 
  Building2, 
  FileText 
} from 'lucide-react';
import { FaturamentoPayload, ParcelaFaturamento } from '../Escritorio/ModalFaturamento';

export default function DashboardFinanceiro() {
  const { clientes, ops, rolos, saidas } = useStore();
  const [faturamentosList, setFaturamentosList] = useState<FaturamentoPayload[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'PARCELAS' | 'FATURAS' | 'RANKING'>('PARCELAS');

  const carregarFaturamentos = () => {
    try {
      const raw = localStorage.getItem('texlog_faturamentos_concluidos');
      if (raw) {
        setFaturamentosList(JSON.parse(raw));
      }
    } catch {}
  };

  useEffect(() => {
    carregarFaturamentos();
    window.addEventListener('texlog_faturamento_updated', carregarFaturamentos);
    window.addEventListener('storage', carregarFaturamentos);
    return () => {
      window.removeEventListener('texlog_faturamento_updated', carregarFaturamentos);
      window.removeEventListener('storage', carregarFaturamentos);
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  // 1. Totais consolidados
  const totalFaturadoHistorico = faturamentosList.reduce((acc, f) => acc + (Number(f.valorTotal) || 0), 0);
  const totalFaturadoSaidas = saidas
    .filter(s => s.tipoLancamento === 'ROLETES')
    .reduce((acc, s) => acc + (s.valorCobrado || 0), 0);

  const faturamentoTotal = Math.max(totalFaturadoHistorico, totalFaturadoSaidas);

  // 2. Extração de todas as parcelas emitidas para controle de Contas a Receber
  interface ParcelaDetalhada extends ParcelaFaturamento {
    clienteNome: string;
    numeroFatura: string;
    formaPagamento: string;
    condicaoPagamento: string;
    totalParcelas: number;
    faturadoEm: string;
  }

  const todasParcelas: ParcelaDetalhada[] = [];
  faturamentosList.forEach(fat => {
    if (Array.isArray(fat.parcelas)) {
      fat.parcelas.forEach(p => {
        todasParcelas.push({
          ...p,
          clienteNome: fat.clienteNome,
          numeroFatura: fat.numeroFatura,
          formaPagamento: fat.formaPagamento,
          condicaoPagamento: fat.condicaoPagamento,
          totalParcelas: fat.parcelas.length,
          faturadoEm: fat.faturadoEm
        });
      });
    }
  });

  // Ordena parcelas por vencimento
  todasParcelas.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

  // Total a receber e parcelas do mês
  const totalReceber = todasParcelas.reduce((acc, p) => acc + (p.valor || 0), 0);
  const parcelasMes = todasParcelas.filter(p => p.vencimento?.startsWith(thisMonth));
  const faturamentoMes = parcelasMes.reduce((acc, p) => acc + (p.valor || 0), 0);
  const faturamentoDia = todasParcelas.filter(p => p.vencimento === today).reduce((acc, p) => acc + (p.valor || 0), 0);

  // Rolos faturados
  const totalRolosFaturados = faturamentosList.reduce((acc, f) => acc + (f.totalRolos || 0), 0) 
    || rolos.filter(r => r.status === 'FATURADO' || r.status === 'EXPEDIDO').length;

  const valorMedioRolo = totalRolosFaturados > 0 ? faturamentoTotal / totalRolosFaturados : 0;

  // Ranking de clientes
  const faturamentoPorClienteMap = new Map<string, { valor: number; rolos: number }>();
  faturamentosList.forEach(f => {
    const atual = faturamentoPorClienteMap.get(f.clienteNome) || { valor: 0, rolos: 0 };
    faturamentoPorClienteMap.set(f.clienteNome, {
      valor: atual.valor + (f.valorTotal || 0),
      rolos: atual.rolos + (f.totalRolos || 0)
    });
  });

  const rankingClientes = Array.from(faturamentoPorClienteMap.entries())
    .map(([clienteNome, dados]) => ({
      clienteNome,
      valor: dados.valor,
      rolos: dados.rolos
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Financeiro</h1>
        <p className="text-neutral-400 mt-1">
          Faturamento com múltiplas parcelas e contas a receber (RB Souza)
        </p>
      </div>

      {/* 1. Indicadores Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Faturado</span>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono text-emerald-400">
            R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-neutral-500 mt-1 block">Receita total confirmada</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Vencimentos no Mês</span>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono text-blue-400">
            R$ {faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-neutral-500 mt-1 block">{parcelasMes.length} parcela(s) no mês</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Parcelado</span>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-400">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono text-purple-400">
            {todasParcelas.length} parcelas
          </p>
          <span className="text-xs text-neutral-500 mt-1 block">
            R$ {totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em carteira
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Valor Médio por Rolo</span>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-400">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono text-white">
            R$ {valorMedioRolo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-neutral-500 mt-1 block">{totalRolosFaturados} rolos faturados</span>
        </div>
      </div>

      {/* 2. Sub-abas de Visualização Financeira */}
      <div className="flex border-b border-neutral-800 gap-3">
        <button
          type="button"
          onClick={() => setAbaAtiva('PARCELAS')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'PARCELAS'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Parcelas a Receber</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            abaAtiva === 'PARCELAS' ? 'bg-purple-500 text-white' : 'bg-neutral-800 text-neutral-400'
          }`}>
            {todasParcelas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('FATURAS')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'FATURAS'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Faturas Emitidas</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            abaAtiva === 'FATURAS' ? 'bg-emerald-500 text-black font-black' : 'bg-neutral-800 text-neutral-400'
          }`}>
            {faturamentosList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('RANKING')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'RANKING'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ranking de Clientes</span>
        </button>
      </div>

      {/* 3. Conteúdo da Aba Selecionada */}
      {abaAtiva === 'PARCELAS' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          {todasParcelas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950/60 text-[10px] uppercase text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-bold">Fatura</th>
                    <th className="px-6 py-4 font-bold">Cliente</th>
                    <th className="px-6 py-4 font-bold text-center">Parcela</th>
                    <th className="px-6 py-4 font-bold">Vencimento</th>
                    <th className="px-6 py-4 font-bold">Forma de Pagamento</th>
                    <th className="px-6 py-4 font-bold">Condição</th>
                    <th className="px-6 py-4 font-bold text-right">Valor da Parcela</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {todasParcelas.map((parc, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-black text-purple-400">
                        {parc.numeroFatura}
                      </td>
                      <td className="px-6 py-4 font-sans font-bold text-white">
                        {parc.clienteNome}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-white font-bold">
                          {parc.numero}ª de {parc.totalParcelas}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-400">
                        {parc.vencimento ? new Date(parc.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-6 py-4 font-sans text-neutral-300">
                        {parc.formaPagamento}
                      </td>
                      <td className="px-6 py-4 font-sans text-neutral-400">
                        {parc.condicaoPagamento}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-400 text-sm">
                        R$ {Number(parc.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-500">
              Nenhuma parcela gerada ainda. As parcelas são geradas automaticamente ao faturar uma expedição.
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'FATURAS' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          {faturamentosList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950/60 text-[10px] uppercase text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-bold">Fatura</th>
                    <th className="px-6 py-4 font-bold">Data Emissão</th>
                    <th className="px-6 py-4 font-bold">Cliente</th>
                    <th className="px-6 py-4 font-bold text-center">Rolos</th>
                    <th className="px-6 py-4 font-bold text-right">Metros</th>
                    <th className="px-6 py-4 font-bold">Forma de Pagamento</th>
                    <th className="px-6 py-4 font-bold">Condição</th>
                    <th className="px-6 py-4 font-bold text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {faturamentosList.map(fat => (
                    <tr key={fat.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-black text-purple-400 text-sm">
                        {fat.numeroFatura}
                      </td>
                      <td className="px-6 py-4 text-neutral-400">
                        {fat.faturadoEm ? new Date(fat.faturadoEm).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-6 py-4 font-sans font-bold text-white">
                        {fat.clienteNome}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-white font-bold">
                          {fat.totalRolos} un
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-blue-400">
                        {fat.totalMetros ? Number(fat.totalMetros).toLocaleString('pt-BR') : '—'} m
                      </td>
                      <td className="px-6 py-4 font-sans text-neutral-300">
                        {fat.formaPagamento}
                      </td>
                      <td className="px-6 py-4 font-sans text-neutral-400">
                        {fat.condicaoPagamento} ({fat.parcelas?.length || 1}x)
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-400 text-sm">
                        R$ {Number(fat.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-500">
              Nenhuma fatura emitida até o momento.
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'RANKING' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium text-center">Rolos Faturados</th>
                <th className="px-6 py-4 font-medium text-right">Valor Total Faturado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rankingClientes.map(({ clienteNome, valor, rolos }) => (
                <tr key={clienteNome} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{clienteNome}</td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-white">{rolos} un</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-bold font-mono">
                    R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {rankingClientes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                    Nenhum faturamento registrado no ranking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
