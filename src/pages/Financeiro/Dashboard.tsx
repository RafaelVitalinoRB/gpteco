import { useStore } from '../../store/useStore';
import { DollarSign, TrendingUp, Users, Calendar, BarChart3 } from 'lucide-react';

export default function DashboardFinanceiro() {
  const { clientes, ops, rolos } = useStore();

  let faturamentoTotal = 0;
  let faturamentoDia = 0;
  let faturamentoMes = 0;
  let rolosFaturados = 0;

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const faturamentoPorCliente = clientes.map(cliente => {
    const opsCliente = ops.filter(op => op.clienteId === cliente.id);
    const rolosCliente = rolos.filter(r => opsCliente.some(op => op.id === r.opId) && r.status === 'FINALIZADO');
    
    let valorTotal = 0;
    
    rolosCliente.forEach(r => {
      const op = opsCliente.find(o => o.id === r.opId);
      let valorRolo = 0;
      if (cliente.tipoCobranca === 'ROLO') {
        valorRolo = cliente.valorCobrado;
      } else {
        valorRolo = (op?.metros || 0) * cliente.valorCobrado;
      }
      
      valorTotal += valorRolo;
      
      if (r.finalizadoEm?.startsWith(today)) {
        faturamentoDia += valorRolo;
      }
      if (r.finalizadoEm?.startsWith(thisMonth)) {
        faturamentoMes += valorRolo;
      }
    });

    faturamentoTotal += valorTotal;
    rolosFaturados += rolosCliente.length;

    return {
      cliente,
      valor: valorTotal,
      rolos: rolosCliente.length
    };
  }).filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor);

  const valorMedioRolo = rolosFaturados > 0 ? faturamentoTotal / rolosFaturados : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Financeiro</h1>
        <p className="text-neutral-400 mt-1">Resumo de faturamento e produção</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <h3 className="text-neutral-400 font-medium">Faturamento Total</h3>
          <p className="text-3xl font-bold text-white mt-1">R$ {faturamentoTotal.toFixed(2)}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-neutral-400 font-medium">Faturamento no Mês</h3>
          <p className="text-3xl font-bold text-white mt-1">R$ {faturamentoMes.toFixed(2)}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10">
              <TrendingUp className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <h3 className="text-neutral-400 font-medium">Faturamento Hoje</h3>
          <p className="text-3xl font-bold text-white mt-1">R$ {faturamentoDia.toFixed(2)}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10">
              <BarChart3 className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-neutral-400 font-medium">Valor Médio por Rolo</h3>
          <p className="text-3xl font-bold text-white mt-1">R$ {valorMedioRolo.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden mt-8">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-xl font-bold text-white">Ranking de Clientes</h2>
        </div>
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Tipo de Cobrança</th>
              <th className="px-6 py-4 font-medium">Rolos Produzidos</th>
              <th className="px-6 py-4 font-medium text-right">Valor Faturado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {faturamentoPorCliente.map(({ cliente, valor, rolos }) => (
              <tr key={cliente.id} className="hover:bg-neutral-800/50 transition-colors">
                <td className="px-6 py-4 text-white font-medium">{cliente.nomeFantasia}</td>
                <td className="px-6 py-4">Por {cliente.tipoCobranca.toLowerCase()}</td>
                <td className="px-6 py-4">{rolos}</td>
                <td className="px-6 py-4 text-right text-emerald-400 font-bold">R$ {valor.toFixed(2)}</td>
              </tr>
            ))}
            {faturamentoPorCliente.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">Nenhum faturamento registrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
