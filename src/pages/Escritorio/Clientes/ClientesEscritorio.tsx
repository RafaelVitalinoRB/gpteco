import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Plus, 
  Package, 
  MapPin, 
  Phone, 
  ArrowRight, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { getTodosMateriais, MateriaPrimaItem } from '../../../services/materiaPrimaService';
import { ClienteModal } from './ClienteModal';
import { NovaEntradaModal } from './NovaEntradaModal';

export default function ClientesEscritorio() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<MateriaPrimaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [isNovaEntradaOpen, setIsNovaEntradaOpen] = useState(false);
  const [clienteSelecionadoEntrada, setClienteSelecionadoEntrada] = useState<any | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.warn('Aviso ao carregar clientes do Supabase:', error);
      }
      setClientes(data || []);
      setMateriais(getTodosMateriais());
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
      toast.error('Erro ao consultar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();

    const handleUpdate = () => {
      setMateriais(getTodosMateriais());
    };

    window.addEventListener('texlog_materia_prima_updated', handleUpdate);
    return () => {
      window.removeEventListener('texlog_materia_prima_updated', handleUpdate);
    };
  }, []);

  const filteredClientes = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.nome && c.nome.toLowerCase().includes(term)) ||
      (c.razao_social && c.razao_social.toLowerCase().includes(term)) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(term)) ||
      (c.cnpj && c.cnpj.includes(term)) ||
      (c.cidade && c.cidade.toLowerCase().includes(term))
    );
  });

  // Calcular métricas gerais
  const totalGeralCaixas = materiais.reduce((acc, m) => acc + (m.saldoCaixas || 0), 0);
  const totalGeralPesoKg = materiais.reduce((acc, m) => acc + (m.saldoAtualKg || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Clientes & Matéria-Prima</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Central de logística administrativa, saldos de matéria-prima e controle operacional
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setClienteSelecionadoEntrada(null);
              setIsNovaEntradaOpen(true);
            }}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-neutral-700 hover:border-neutral-600 text-neutral-200 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2 bg-neutral-950/60"
          >
            <Package className="w-4 h-4 text-blue-400" />
            Nova Entrada
          </button>

          <button
            onClick={() => setIsNovoClienteOpen(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-neutral-400 font-medium block">Total de Clientes</span>
              <span className="text-2xl font-bold text-white tracking-tight">{clientes.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-neutral-400 font-medium block">Saldo de Caixas em Estoque</span>
              <span className="text-2xl font-bold text-white tracking-tight font-mono">{totalGeralCaixas} cx</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-neutral-400 font-medium block">Saldo de Fio em Estoque</span>
              <span className="text-2xl font-bold text-white tracking-tight font-mono">{totalGeralPesoKg.toFixed(2)} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por Razão Social, Nome Fantasia, CNPJ ou Cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-neutral-600 text-sm"
          />
        </div>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClientes.map(cliente => {
          const cId = String(cliente.id);
          const matsCliente = materiais.filter(m => String(m.clienteId) === cId);
          const caixasCliente = matsCliente.reduce((acc, m) => acc + (m.saldoCaixas || 0), 0);
          const pesoCliente = matsCliente.reduce((acc, m) => acc + (m.saldoAtualKg || 0), 0);
          const nomePrincipal = cliente.razao_social || cliente.nome_fantasia || cliente.nome || `Cliente #${cliente.id}`;

          return (
            <div 
              key={cliente.id} 
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate" title={nomePrincipal}>
                      {nomePrincipal}
                    </h3>
                    {cliente.nome_fantasia && cliente.razao_social && (
                      <p className="text-xs text-neutral-400 truncate">{cliente.nome_fantasia}</p>
                    )}
                    <p className="text-xs font-mono text-neutral-500 mt-0.5">
                      CNPJ: {cliente.cnpj || 'Não informado'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {cliente.status || 'ATIVO'}
                  </span>
                </div>

                {/* Localização & Contato */}
                <div className="space-y-1.5 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80 mb-4">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>{cliente.cidade ? `${cliente.cidade} - ${cliente.estado || ''}` : 'Cidade não informada'}</span>
                  </div>
                  {cliente.contato && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-neutral-500">Contato:</span>
                      <span className="text-neutral-300 font-medium">{cliente.contato}</span>
                    </div>
                  )}
                  {cliente.telefone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="font-mono">{cliente.telefone}</span>
                    </div>
                  )}
                </div>

                {/* Saldo de Matéria-Prima deste Cliente */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 flex items-center justify-between mb-1.5">
                    <span>Matéria-Prima</span>
                    <span className="font-mono text-neutral-400">{matsCliente.length} tipos</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-sm">
                    <span className="text-neutral-300 font-bold">{caixasCliente} cx</span>
                    <span className="text-emerald-400 font-bold">{pesoCliente.toFixed(2)} kg</span>
                  </div>
                </div>
              </div>

              {/* Ações do Card */}
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setClienteSelecionadoEntrada({ id: cliente.id, nome: nomePrincipal });
                    setIsNovaEntradaOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1.5"
                  title="Registrar nova entrada para este cliente"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  + Entrada
                </button>

                <Link
                  to={`/escritorio/clientes/${cliente.id}`}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-colors flex items-center justify-center gap-1.5 text-center"
                >
                  <span>Abrir Ficha & Abas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}

        {filteredClientes.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center bg-neutral-900 border border-neutral-800 rounded-2xl">
            <Building2 className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Nenhum cliente encontrado</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6">
              {searchTerm ? 'Nenhum resultado corresponde aos termos da busca.' : 'Cadastre seu primeiro cliente para gerenciar matérias-primas e produções.'}
            </p>
            <button
              onClick={() => setIsNovoClienteOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>
        )}
      </div>

      {/* Modais */}
      {isNovoClienteOpen && (
        <ClienteModal
          isOpen={isNovoClienteOpen}
          onClose={() => setIsNovoClienteOpen(false)}
          onSuccess={() => carregarDados()}
        />
      )}

      {isNovaEntradaOpen && (
        <NovaEntradaModal
          isOpen={isNovaEntradaOpen}
          onClose={() => {
            setIsNovaEntradaOpen(false);
            setClienteSelecionadoEntrada(null);
          }}
          clientePreselecionado={clienteSelecionadoEntrada}
          clientesDisponiveis={clientes}
          onSuccess={() => carregarDados()}
        />
      )}
    </div>
  );
}
