import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Package, ArrowDownRight, ArrowUpRight, Users, AlertTriangle } from 'lucide-react';

export default function DashboardEstoque() {
  const { entradas, saidas, clientes, ops, rolos } = useStore();
  const [activeTab, setActiveTab] = useState<'RESUMO' | 'RECEBIMENTOS' | 'SAIDAS' | 'CLIENTES' | 'ROLETES'>('RESUMO');
  const [saidaTab, setSaidaTab] = useState<'ROLOS' | 'CAIXAS'>('ROLOS');

  const totalCaixas = entradas.filter(e => e.tipoLancamento === 'CAIXAS').reduce((acc, e) => acc + e.quantidade, 0) - 
                      saidas.filter(s => s.tipoLancamento === 'CAIXAS').reduce((acc, s) => acc + (s.quantidade || 0), 0);
  
  const totalPeso = entradas.filter(e => e.tipoLancamento === 'CAIXAS').reduce((acc, e) => acc + (e.pesoLiquido || 0), 0) -
                    saidas.filter(s => s.tipoLancamento === 'CAIXAS').reduce((acc, s) => acc + (s.pesoLiquido || 0), 0);
  
  const totalRolos = rolos.filter(r => r.status === 'FINALIZADO').length - 
                     saidas.filter(s => s.tipoLancamento === 'ROLETES').length;

  const totalRoletes = entradas.filter(e => e.tipoLancamento === 'ROLETES').reduce((acc, e) => acc + e.quantidade, 0);

  const alertas = useMemo(() => {
    const alerts = [];

    // Alerta de roletes baixos
    if (totalRoletes < 10) {
      alerts.push({ tipo: 'ROLETES', mensagem: `Estoque de roletes muito baixo (${totalRoletes} restantes)` });
    }

    // Alerta de saldo baixo por cliente
    clientes.forEach(cliente => {
      const entradasCliente = entradas.filter(e => e.clienteId === cliente.id);
      const saidasCliente = saidas.filter(s => s.clienteId === cliente.id);
      const caixas = entradasCliente.filter(e => e.tipoLancamento === 'CAIXAS').reduce((acc, e) => acc + e.quantidade, 0) -
                     saidasCliente.filter(s => s.tipoLancamento === 'CAIXAS').reduce((acc, s) => acc + (s.quantidade || 0), 0);
      
      if (caixas > 0 && caixas < 5) {
        alerts.push({ tipo: 'SALDO', mensagem: `Cliente ${cliente.nomeFantasia} com saldo baixo de caixas (${caixas})` });
      }
    });

    // Alerta de divergência de peso
    saidas.filter(s => s.tipoLancamento === 'ROLETES').forEach(saida => {
      const op = ops.find(o => o.id === saida.opId);
      if (op && op.pesoEstimadoKg) {
        const pesoEsperado = op.pesoEstimadoKg / op.qtdRolos;
        const diff = Math.abs((saida.pesoLiquido || 0) - pesoEsperado);
        if (diff > pesoEsperado * 0.1) { // 10% de divergência
          alerts.push({ 
            tipo: 'PESO', 
            mensagem: `Divergência de peso no Rolo ${saida.roloId} da OP ${op.codigo}. Esperado: ${pesoEsperado.toFixed(2)}kg, Real: ${saida.pesoLiquido}kg` 
          });
        }
      }
    });

    return alerts;
  }, [entradas, saidas, clientes, ops, totalRoletes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Estoque</h1>
        <p className="text-neutral-400 mt-1">Controle de materiais e produtos acabados</p>
      </div>

      <div className="flex border-b border-neutral-800 overflow-x-auto">
        {['RESUMO', 'RECEBIMENTOS', 'SAIDAS', 'CLIENTES', 'ROLETES'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {activeTab === 'RESUMO' && (
        <div className="space-y-8">
          {alertas.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-orange-500 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" />
                Alertas do Sistema
              </h2>
              <div className="space-y-3">
                {alertas.map((alerta, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-orange-200/80 bg-orange-500/5 p-3 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5"></div>
                    <p>{alerta.mensagem}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <h3 className="text-neutral-400 font-medium">Total de Caixas</h3>
            <p className="text-3xl font-bold text-white mt-1">{totalCaixas}</p>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10">
                <ArrowDownRight className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-neutral-400 font-medium">Peso Total (kg)</h3>
            <p className="text-3xl font-bold text-white mt-1">{totalPeso.toFixed(2)}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10">
                <ArrowUpRight className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-neutral-400 font-medium">Rolos em Estoque</h3>
            <p className="text-3xl font-bold text-white mt-1">{totalRolos}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10">
                <Package className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <h3 className="text-neutral-400 font-medium">Roletes Disponíveis</h3>
            <p className="text-3xl font-bold text-white mt-1">{totalRoletes}</p>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'RECEBIMENTOS' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">NF</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Qtd</th>
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
                    <td className="px-6 py-4">{entrada.tipoLancamento}</td>
                    <td className="px-6 py-4">{entrada.quantidade}</td>
                  </tr>
                );
              })}
              {entradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Nenhum recebimento registrado.</td>
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
              onClick={() => setSaidaTab('ROLOS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saidaTab === 'ROLOS' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50'}`}
            >
              Rolos
            </button>
            <button
              onClick={() => setSaidaTab('CAIXAS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saidaTab === 'CAIXAS' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50'}`}
            >
              Caixas
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            {saidaTab === 'CAIXAS' ? (
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Fio</th>
                    <th className="px-6 py-4 font-medium">NF</th>
                    <th className="px-6 py-4 font-medium">Qtd Caixas</th>
                    <th className="px-6 py-4 font-medium">Peso Líq.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {saidas.filter(s => s.tipoLancamento === 'CAIXAS').map(saida => {
                    const cliente = clientes.find(c => c.id === saida.clienteId);
                    return (
                      <tr key={saida.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">{new Date(saida.dataLancamento).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-white">{cliente?.nomeFantasia}</td>
                        <td className="px-6 py-4">{saida.tituloFio}</td>
                        <td className="px-6 py-4">{saida.nfNumero}</td>
                        <td className="px-6 py-4">{saida.quantidade}</td>
                        <td className="px-6 py-4">{saida.pesoLiquido}kg</td>
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
                      </tr>
                    );
                  })}
                  {saidas.filter(s => s.tipoLancamento === 'ROLETES').length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">Nenhuma saída de rolo registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'CLIENTES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clientes.map(cliente => {
            const entradasCliente = entradas.filter(e => e.clienteId === cliente.id);
            const saidasCliente = saidas.filter(s => s.clienteId === cliente.id);
            
            const caixas = entradasCliente.filter(e => e.tipoLancamento === 'CAIXAS').reduce((acc, e) => acc + e.quantidade, 0) -
                           saidasCliente.filter(s => s.tipoLancamento === 'CAIXAS').reduce((acc, s) => acc + (s.quantidade || 0), 0);
            
            const roletes = entradasCliente.filter(e => e.tipoLancamento === 'ROLETES').reduce((acc, e) => acc + e.quantidade, 0);
            
            const nfs = Array.from(new Set([...entradasCliente.map(e => e.nfNumero), ...saidasCliente.map(s => s.nfNumero).filter(Boolean)])).join(', ');
            const rolosProduzidos = rolos.filter(r => r.status === 'FINALIZADO' && ops.find(o => o.id === r.opId)?.clienteId === cliente.id).length;
            const opsCliente = ops.filter(o => o.clienteId === cliente.id).length;

            if (caixas === 0 && roletes === 0 && rolosProduzidos === 0 && opsCliente === 0) return null;

            return (
              <div key={cliente.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">{cliente.nomeFantasia}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">NFs</span>
                    <span className="text-white font-medium truncate max-w-[150px]">{nfs || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">Saldo Atual (Caixas)</span>
                    <span className="text-white font-medium">{caixas}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">Saldo Atual (Roletes)</span>
                    <span className="text-white font-medium">{roletes}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span className="text-neutral-500">Rolos Produzidos</span>
                    <span className="text-blue-400 font-medium">{rolosProduzidos}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-neutral-500">Total de OPs</span>
                    <span className="text-purple-400 font-medium">{opsCliente}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'ROLETES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Saldo por Cliente</h3>
            <div className="space-y-4">
              {clientes.map(cliente => {
                const roletes = entradas.filter(e => e.clienteId === cliente.id && e.tipoLancamento === 'ROLETES').reduce((acc, e) => acc + e.quantidade, 0);
                if (roletes === 0) return null;
                return (
                  <div key={cliente.id} className="flex justify-between items-center p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                    <span className="text-white font-medium">{cliente.nomeFantasia}</span>
                    <span className="text-orange-400 font-bold text-lg">{roletes} roletes</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Movimentações</h3>
            <div className="space-y-4">
              {entradas.filter(e => e.tipoLancamento === 'ROLETES').map(entrada => {
                const cliente = clientes.find(c => c.id === entrada.clienteId);
                return (
                  <div key={entrada.id} className="flex justify-between items-center p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                    <div>
                      <span className="text-white font-medium block">{cliente?.nomeFantasia}</span>
                      <span className="text-neutral-500 text-xs">{new Date(entrada.dataLancamento).toLocaleDateString()} - NF: {entrada.nfNumero}</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-lg">+{entrada.quantidade}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
