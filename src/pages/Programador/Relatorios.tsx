import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useOperadores } from '../../hooks/useOperadores';
import { useEmpresa, formatarEnderecoEmpresa } from '../../services/empresaService';
import { FileText, Download, Calendar, TrendingUp, Users, Package, DollarSign, Building2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const { ops, rolos, entradas, saidas, clientes } = useStore();
  const { operadores } = useOperadores();
  const { empresa } = useEmpresa();
  const [startDate, setStartDate] = useState(format(new Date().setDate(1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const filteredRolos = rolos.filter(r => {
    if (r.status !== 'FINALIZADO' || !r.finalizadoEm) return false;
    const date = new Date(r.finalizadoEm);
    return date >= new Date(startDate) && date <= new Date(endDate + 'T23:59:59');
  });

  const filteredSaidas = saidas.filter(s => {
    const date = new Date(s.dataLancamento);
    return date >= new Date(startDate) && date <= new Date(endDate + 'T23:59:59');
  });

  const stats = {
    totalRolos: filteredRolos.length,
    totalPortadas: filteredRolos.reduce((acc, r) => acc + (r.portadasTotal || 0), 0),
    totalPeso: filteredSaidas.reduce((acc, s) => acc + (s.pesoLiquido || 0), 0),
    totalFaturamento: filteredSaidas.reduce((acc, s) => acc + (s.valorCobrado || 0), 0)
  };

  const producaoPorMaquina = filteredRolos.reduce((acc, r) => {
    const op = ops.find(o => o.id === r.opId);
    if (op) {
      acc[op.maquina] = (acc[op.maquina] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const producaoPorOperador = filteredRolos.reduce((acc, r) => {
    r.operadores.forEach(opRel => {
      const op = operadores.find(o => o.id === opRel.operadorId);
      if (op) {
        acc[op.nome] = (acc[op.nome] || 0) + opRel.portadas;
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const faturamentoPorCliente = filteredSaidas.reduce((acc, s) => {
    const cliente = clientes.find(c => c.id === s.clienteId);
    if (cliente) {
      acc[cliente.nomeFantasia] = (acc[cliente.nomeFantasia] || 0) + (s.valorCobrado || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional Oficial da Empresa */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {empresa.logotipo ? (
            <img 
              src={empresa.logotipo} 
              alt={empresa.nomeFantasia} 
              className="w-14 h-14 rounded-2xl object-cover border border-neutral-700 bg-white p-1" 
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-7 h-7" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                {empresa.nomeFantasia || empresa.razaoSocial}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                CNPJ: {empresa.cnpj || '—'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {empresa.razaoSocial} • IE: {empresa.inscricaoEstadual || '—'}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {formatarEnderecoEmpresa(empresa)} • Tel: {empresa.telefone || empresa.celular || '—'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleExportPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Exportar PDF / Imprimir</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Relatórios e Fechamento</h1>
          <p className="text-neutral-400 text-xs mt-0.5">Análise consolidada de produção e faturamento por período</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-400">Período:</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-neutral-600">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-neutral-400 font-medium">Rolos Produzidos</h3>
          <p className="text-3xl font-bold text-white mt-1">{stats.totalRolos}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-neutral-400 font-medium">Total Portadas</h3>
          <p className="text-3xl font-bold text-white mt-1">{stats.totalPortadas}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-neutral-400 font-medium">Peso Expedido (kg)</h3>
          <p className="text-3xl font-bold text-white mt-1">{stats.totalPeso.toFixed(2)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-yellow-500" />
          </div>
          <h3 className="text-neutral-400 font-medium">Faturamento Total</h3>
          <p className="text-3xl font-bold text-white mt-1">R$ {stats.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Produção por Operador (Portadas)
          </h3>
          <div className="space-y-4">
            {Object.entries(producaoPorOperador).sort((a, b) => b[1] - a[1]).map(([nome, portadas]) => (
              <div key={nome} className="flex items-center gap-4">
                <div className="w-32 text-sm text-neutral-400 truncate">{nome}</div>
                <div className="flex-1 h-3 bg-neutral-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${(portadas / stats.totalPortadas) * 100}%` }}
                  ></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-white">{portadas}</div>
              </div>
            ))}
            {Object.keys(producaoPorOperador).length === 0 && (
              <p className="text-center text-neutral-500 py-4">Nenhuma produção no período.</p>
            )}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Produção por Máquina (Rolos)
          </h3>
          <div className="space-y-4">
            {Object.entries(producaoPorMaquina).sort((a, b) => b[1] - a[1]).map(([maquina, rolos]) => (
              <div key={maquina} className="flex items-center gap-4">
                <div className="w-32 text-sm text-neutral-400 truncate">{maquina}</div>
                <div className="flex-1 h-3 bg-neutral-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ width: `${(rolos / stats.totalRolos) * 100}%` }}
                  ></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-white">{rolos}</div>
              </div>
            ))}
            {Object.keys(producaoPorMaquina).length === 0 && (
              <p className="text-center text-neutral-500 py-4">Nenhuma produção no período.</p>
            )}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            Faturamento por Cliente
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="pb-4 font-medium">Cliente</th>
                  <th className="pb-4 font-medium text-right">Peso Total (kg)</th>
                  <th className="pb-4 font-medium text-right">Valor Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {Object.entries(faturamentoPorCliente).sort((a, b) => b[1] - a[1]).map(([nome, valor]) => {
                  const peso = filteredSaidas
                    .filter(s => clientes.find(c => c.id === s.clienteId)?.nomeFantasia === nome)
                    .reduce((acc, s) => acc + (s.pesoLiquido || 0), 0);
                  return (
                    <tr key={nome}>
                      <td className="py-4 text-white font-medium">{nome}</td>
                      <td className="py-4 text-right text-neutral-400">{peso.toFixed(2)} kg</td>
                      <td className="py-4 text-right text-emerald-400 font-bold">
                        R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {Object.keys(faturamentoPorCliente).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-neutral-500">Nenhum faturamento no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
