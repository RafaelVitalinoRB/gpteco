import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  UserCheck, 
  Cpu, 
  FileText, 
  ShieldCheck, 
  FileSpreadsheet, 
  Database, 
  Printer, 
  Sliders, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { useEmpresa, formatarEnderecoEmpresa, DEFAULT_EMPRESA } from '../../../services/empresaService';
import { ClienteModal } from '../Clientes/ClienteModal';
import { supabase } from '../../../lib/supabase';
import { ClienteOficial, fetchClientesOficiais } from '../../../services/clienteService';
import { carregarOperadores, DEFAULT_OPERADORES, STORAGE_KEY_OPERADORES } from '../../../hooks/useOperadores';
import { generateId } from '../../../lib/utils';
import EmpresaEscritorio from '../Empresa';
import ImportacoesEscritorio from '../Importacoes';

interface ConfiguracoesModuleProps {
  activeSub: string;
  onNavigateSub: (sub: string) => void;
}

export function ConfiguracoesModule({ activeSub, onNavigateSub }: ConfiguracoesModuleProps) {
  const { 
    clientes: storeClientes, 
    especificacoes: storeEspecificacoes
  } = useStore();

  const { empresa, atualizar: atualizarEmpresa } = useEmpresa();
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);

  // Operadores
  const [operadoresList, setOperadoresList] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_OPERADORES);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_OPERADORES;
  });

  // Parâmetros Gerais
  const [seedRolo, setSeedRolo] = useState<string>(() => localStorage.getItem('texlog_param_seed_rolo') || '1000000000');
  const [taraPadrao, setTaraPadrao] = useState<string>(() => localStorage.getItem('texlog_param_tara_padrao') || '1.80');
  const [diasTolerancia, setDiasTolerancia] = useState<string>(() => localStorage.getItem('texlog_param_dias_tolerancia') || '30');
  const [condicoesPadrao, setCondicoesPadrao] = useState<string>(() => localStorage.getItem('texlog_param_condicoes') || 'À Vista, 28 dias, 30 dias, 30/60, 30/60/90');

  // Impressões
  const [formatoRomaneio, setFormatoRomaneio] = useState<string>(() => localStorage.getItem('texlog_print_formato') || 'A4');
  const [imprimirLogoRomaneio, setImprimirLogoRomaneio] = useState<boolean>(() => localStorage.getItem('texlog_print_logo') !== 'false');
  const [tamanhoEtiqueta, setTamanhoEtiqueta] = useState<string>(() => localStorage.getItem('texlog_print_etiqueta') || '100x150');
  const [viasImpressao, setViasImpressao] = useState<number>(() => Number(localStorage.getItem('texlog_print_vias')) || 2);

  // Operadores Form
  const [isNovoOperadorModalOpen, setIsNovoOperadorModalOpen] = useState(false);
  const [nomeOperadorInput, setNomeOperadorInput] = useState('');
  const [turnoOperadorInput, setTurnoOperadorInput] = useState<'MANHA' | 'TARDE' | 'NOITE'>('MANHA');
  const [maquinaOperadorInput, setMaquinaOperadorInput] = useState<string>('MAQUINA 1');

  // Usuários do Sistema
  const [usuariosList, setUsuariosList] = useState<any[]>([
    { id: '1', nome: 'Administrador RB', email: 'admin@rbsouza.com.br', papel: 'PROGRAMADOR', status: 'ATIVO' },
    { id: '2', nome: 'Operador Fabril 01', email: 'op1@rbsouza.com.br', papel: 'OPERADOR', status: 'ATIVO' },
    { id: '3', nome: 'Operador Fabril 02', email: 'op2@rbsouza.com.br', papel: 'OPERADOR', status: 'ATIVO' },
    { id: '4', nome: 'Escritório & Expedição', email: 'escritorio@rbsouza.com.br', papel: 'ESCRITORIO', status: 'ATIVO' },
    { id: '5', nome: 'Controle de Estoque', email: 'estoque@rbsouza.com.br', papel: 'ESTOQUE', status: 'ATIVO' },
    { id: '6', nome: 'Financeiro Central', email: 'financeiro@rbsouza.com.br', papel: 'FINANCEIRO', status: 'ATIVO' }
  ]);

  const carregarClientes = async () => {
    try {
      const { data } = await supabase.from('clientes').select('*').order('id', { ascending: false });
      if (data && data.length > 0) {
        setClientesList(data);
      } else {
        const oficiais = await fetchClientesOficiais();
        setClientesList(oficiais);
      }
    } catch {
      setClientesList(storeClientes);
    }
  };

  useEffect(() => {
    carregarClientes();
    window.addEventListener('texlog_clientes_updated', carregarClientes);
    return () => window.removeEventListener('texlog_clientes_updated', carregarClientes);
  }, []);

  // Salvar Parâmetros Gerais
  const handleSalvarParametros = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('texlog_param_seed_rolo', seedRolo);
    localStorage.setItem('texlog_param_tara_padrao', taraPadrao);
    localStorage.setItem('texlog_param_dias_tolerancia', diasTolerancia);
    localStorage.setItem('texlog_param_condicoes', condicoesPadrao);
    toast.success('Parâmetros gerais salvos com sucesso!', { icon: '⚙️' });
  };

  // Salvar Configurações de Impressão
  const handleSalvarImpressoes = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('texlog_print_formato', formatoRomaneio);
    localStorage.setItem('texlog_print_logo', String(imprimirLogoRomaneio));
    localStorage.setItem('texlog_print_etiqueta', tamanhoEtiqueta);
    localStorage.setItem('texlog_print_vias', String(viasImpressao));
    toast.success('Configurações de impressão salvas com sucesso!', { icon: '🖨️' });
  };

  // Criar Operador
  const handleCriarOperador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeOperadorInput.trim()) {
      toast.error('Informe o nome do operador');
      return;
    }

    const novoOp = {
      id: generateId(),
      nome: nomeOperadorInput.trim(),
      turno: turnoOperadorInput,
      maquinas_autorizadas: [maquinaOperadorInput],
      ativo: true,
      status: 'ATIVO',
      createdAt: new Date().toISOString()
    };

    const atualizada = [novoOp, ...operadoresList];
    setOperadoresList(atualizada);
    localStorage.setItem(STORAGE_KEY_OPERADORES, JSON.stringify(atualizada));

    toast.success('Operador cadastrado com sucesso!');
    setNomeOperadorInput('');
    setIsNovoOperadorModalOpen(false);
  };

  const handleRemoverOperador = (id: string, nome: string) => {
    if (window.confirm(`Remover operador ${nome}?`)) {
      const atualizada = operadoresList.filter(o => String(o.id) !== String(id));
      setOperadoresList(atualizada);
      localStorage.setItem(STORAGE_KEY_OPERADORES, JSON.stringify(atualizada));
      toast.success('Operador removido');
    }
  };

  // Backup Export
  const handleExportarBackup = () => {
    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('texlog') || key.startsWith('app_'))) {
        try {
          backupData[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          backupData[key] = localStorage.getItem(key);
        }
      }
    }

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_texlog_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado com sucesso!', { icon: '💾' });
  };

  // Backup Import
  const handleImportarBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (typeof json === 'object' && json !== null) {
          Object.keys(json).forEach(key => {
            const val = typeof json[key] === 'string' ? json[key] : JSON.stringify(json[key]);
            localStorage.setItem(key, val);
          });
          toast.success('Backup restaurado! Recarregando sistema...', { icon: '🔄' });
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch {
        toast.error('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      
      {/* Submenu de Configurações com Identidade Cinza (⚙ Cinza) */}
      <div className="flex border-b border-neutral-800 overflow-x-auto gap-2 pb-2">
        {[
          { id: 'empresa', label: 'Empresa', icon: Building2 },
          { id: 'clientes', label: 'Clientes', icon: Users, count: clientesList.length },
          { id: 'operadores', label: 'Operadores', icon: UserCheck, count: operadoresList.length },
          { id: 'maquinas', label: 'Máquinas', icon: Cpu, count: 4 },
          { id: 'especificacoes', label: 'Especificações', icon: FileText, count: storeEspecificacoes.length },
          { id: 'usuarios', label: 'Usuários', icon: ShieldCheck, count: usuariosList.length },
          { id: 'importacoes', label: 'Importações', icon: FileSpreadsheet },
          { id: 'backup', label: 'Backup', icon: Database },
          { id: 'impressoes', label: 'Impressões', icon: Printer },
          { id: 'parametros', label: 'Parâmetros Gerais', icon: Sliders }
        ].map(sub => {
          const isActive = activeSub === sub.id;
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => onNavigateSub(sub.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive 
                  ? 'bg-neutral-600 text-white shadow-lg shadow-neutral-500/20' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {typeof sub.count === 'number' && sub.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  isActive ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {sub.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. EMPRESA */}
      {activeSub === 'empresa' && (
        <EmpresaEscritorio />
      )}

      {/* 2. CLIENTES */}
      {activeSub === 'clientes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-white">Cadastro e Configurações de Clientes</h3>
              <p className="text-xs text-neutral-400">Controle de cadastros, modalidades de cobrança e contratos têxteis.</p>
            </div>
            <button
              onClick={() => setIsNovoClienteOpen(true)}
              className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
            <input 
              type="text"
              placeholder="Buscar por nome, razão social, CNPJ ou cidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">CNPJ</th>
                    <th className="px-6 py-4 font-medium">Cidade / UF</th>
                    <th className="px-6 py-4 font-medium">Cobrança</th>
                    <th className="px-6 py-4 font-medium text-right">Valor Unitário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {clientesList.filter(c => {
                    const term = searchTerm.toLowerCase();
                    return (
                      (c.nome && c.nome.toLowerCase().includes(term)) ||
                      (c.razao_social && c.razao_social.toLowerCase().includes(term)) ||
                      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(term)) ||
                      (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(term))
                    );
                  }).map(cli => (
                    <tr key={cli.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{cli.nome_fantasia || cli.nomeFantasia || cli.nome || cli.razaoSocial}</div>
                        <div className="text-xs text-neutral-500">{cli.razao_social || cli.razaoSocial || '—'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-neutral-300">
                        {cli.cnpj || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-300">
                        {cli.cidade ? `${cli.cidade} / ${cli.estado || 'SC'}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono text-[10px] font-bold">
                          {cli.tipoCobranca || cli.tipo_cobranca || 'METRO'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-right font-bold text-white">
                        R$ {(cli.valorCobrado || cli.valor_cobrado || 0.85).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. OPERADORES */}
      {activeSub === 'operadores' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-white">Operadores Fabris Cadastrados</h3>
              <p className="text-xs text-neutral-400">Controle de escala, turnos e alocação de maquinário.</p>
            </div>
            <button
              onClick={() => setIsNovoOperadorModalOpen(true)}
              className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Operador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operadoresList.map(op => (
              <div key={op.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-bold">
                    {op.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{op.nome}</h4>
                    <span className="text-xs text-neutral-400 block">Turno: {op.turno || 'Geral'}</span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {Array.isArray(op.maquinas_autorizadas) ? op.maquinas_autorizadas.join(', ') : (op.maquinaPadrao || 'Todas as Máquinas')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${op.ativo !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {op.ativo !== false ? 'Ativo' : 'Inativo'}
                  </span>
                  <button 
                    onClick={() => handleRemoverOperador(op.id, op.nome)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MÁQUINAS */}
      {activeSub === 'maquinas' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-white">Configuração do Parque Fabril</h3>
            <p className="text-xs text-neutral-400">Definições técnicas, unidade de contagem e velocidade dos teares e urdideiras.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'MAQUINA 1', nome: 'Máquina 1 (Urdideira Direta)', tipo: 'METROS', velocidade: '350 m/min', status: 'OPERACIONAL' },
              { id: 'MAQUINA 2', nome: 'Máquina 2 (Urdideira Seccional)', tipo: 'METROS', velocidade: '400 m/min', status: 'OPERACIONAL' },
              { id: 'MAQUINA 3', nome: 'Máquina 3 (Urdideira Contínua)', tipo: 'VOLTAS', velocidade: '1200 rpm', status: 'OPERACIONAL' },
              { id: 'MAQUINA 4', nome: 'Máquina 4 (Urdideira Alta Velocidade)', tipo: 'VOLTAS', velocidade: '1500 rpm', status: 'OPERACIONAL' }
            ].map(m => (
              <div key={m.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center font-mono font-black text-neutral-300">
                      {m.id.split(' ')[1]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{m.nome}</h4>
                      <span className="text-[10px] text-neutral-500 font-mono">ID: {m.id}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase font-mono">
                    {m.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950/60 p-3 rounded-xl border border-white/5 font-mono">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Unidade de Medição</span>
                    <span className="text-white font-bold">{m.tipo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Velocidade Padrão</span>
                    <span className="text-white font-bold">{m.velocidade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ESPECIFICAÇÕES */}
      {activeSub === 'especificacoes' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-white">Especificações & Fichas Técnicas de Fio</h3>
            <p className="text-xs text-neutral-400">Padrões de engenharia têxtil por cliente, título e número de fios.</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Título do Fio</th>
                    <th className="px-6 py-4 font-medium text-center">Total de Fios</th>
                    <th className="px-6 py-4 font-medium text-right">Metragem Padrão</th>
                    <th className="px-6 py-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {storeEspecificacoes.map(esp => {
                    const cliEncontrado = clientesList.find(c => String(c.id) === String(esp.clienteId))
                      || storeClientes.find(c => String(c.id) === String(esp.clienteId));
                    const clienteNome = cliEncontrado?.nome_fantasia || cliEncontrado?.nomeFantasia || cliEncontrado?.razao_social || 'Cliente Cadastrado';

                    return (
                      <tr key={esp.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">
                          {clienteNome}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-neutral-200">
                          {esp.tituloFio}
                        </td>
                        <td className="px-6 py-4 font-mono text-center text-white">
                          {esp.totalFios} fios
                        </td>
                        <td className="px-6 py-4 font-mono text-right text-neutral-300">
                          {esp.largura ? `${esp.largura} mm` : 'Padrão'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-black uppercase font-mono">
                            HOMOLOGADA
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. USUÁRIOS */}
      {activeSub === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-white">Usuários e Permissões do ERP</h3>
              <p className="text-xs text-neutral-400">Acesso por perfil operacional: Programador, Escritório, Operador, Estoque e Financeiro.</p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nome</th>
                    <th className="px-6 py-4 font-medium">Email / Login</th>
                    <th className="px-6 py-4 font-medium">Perfil / Role</th>
                    <th className="px-6 py-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {usuariosList.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-neutral-400" />
                        <span>{u.nome}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-300 text-xs">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-mono font-bold">
                          {u.papel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase font-mono">
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. IMPORTAÇÕES */}
      {activeSub === 'importacoes' && (
        <ImportacoesEscritorio />
      )}

      {/* 8. BACKUP */}
      {activeSub === 'backup' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-black text-white">Backup e Integridade do Sistema</h3>
            <p className="text-xs text-neutral-400">Exporte ou restaure todos os dados do ERP, incluindo cadastros, histórico de produção e expedições.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
                <Download className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Exportar Cópia de Segurança</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Gera um arquivo JSON estruturado contendo todos os dados operacionais, romaneios, movimentações de matéria-prima e configurações.
              </p>
              <button
                onClick={handleExportarBackup}
                className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo</span>
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Restaurar Cópia de Segurança</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Carrega um arquivo JSON de backup previamente gerado para restaurar registros no sistema.
              </p>
              <label className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border border-neutral-700">
                <Upload className="w-4 h-4" />
                <span>Selecionar Arquivo JSON</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportarBackup} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 9. IMPRESSÕES */}
      {activeSub === 'impressoes' && (
        <form onSubmit={handleSalvarImpressoes} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-black text-white">Configurações de Impressão e Documentos</h3>
            <p className="text-xs text-neutral-400">Padronização de romaneios, vias físicas e etiquetas térmicas.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1.5">Formato do Romaneio</label>
              <select
                value={formatoRomaneio}
                onChange={e => setFormatoRomaneio(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
              >
                <option value="A4">A4 Padrão (Oficial RB Souza)</option>
                <option value="CARTA">Carta (Letter)</option>
                <option value="COMPACTO">Compacto Folha A5</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1.5">Número de Vias Físicas</label>
              <input
                type="number"
                min="1"
                max="5"
                value={viasImpressao}
                onChange={e => setViasImpressao(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1.5">Etiqueta Térmica de Rolo</label>
              <select
                value={tamanhoEtiqueta}
                onChange={e => setTamanhoEtiqueta(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
              >
                <option value="100x150">100mm x 150mm (Padrão Logístico)</option>
                <option value="100x80">100mm x 80mm</option>
                <option value="75x50">75mm x 50mm</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 text-xs text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={imprimirLogoRomaneio}
                  onChange={e => setImprimirLogoRomaneio(e.target.checked)}
                  className="rounded bg-neutral-950 border-neutral-800 text-neutral-600 focus:ring-0"
                />
                <span>Imprimir Logotipo da RB Souza nos Romaneios</span>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800 flex justify-end">
            <button
              type="submit"
              className="bg-neutral-700 hover:bg-neutral-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Parâmetros de Impressão</span>
            </button>
          </div>
        </form>
      )}

      {/* 10. PARÂMETROS GERAIS */}
      {activeSub === 'parametros' && (
        <form onSubmit={handleSalvarParametros} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-black text-white">Parâmetros Operacionais Gerais</h3>
            <p className="text-xs text-neutral-400">Numeração oficial de rolos, tara padrão e condições financeiras do ERP.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                Seed Numeração Oficial do Rolo
              </label>
              <input
                type="text"
                value={seedRolo}
                onChange={e => setSeedRolo(e.target.value)}
                placeholder="1000000000"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Ponto de partida sequencial único para identificação indelével.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                Tara Padrão do Rolete (kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={taraPadrao}
                onChange={e => setTaraPadrao(e.target.value)}
                placeholder="1.80"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Subtraído do peso bruto no momento da pesagem oficial.
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                Condições de Pagamento Homologadas
              </label>
              <input
                type="text"
                value={condicoesPadrao}
                onChange={e => setCondicoesPadrao(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Separadas por vírgula: À Vista, 28 dias, 30 dias, 30/60, 30/60/90, Personalizado
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 flex justify-end">
            <button
              type="submit"
              className="bg-neutral-700 hover:bg-neutral-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Parâmetros Gerais</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal Criar Operador */}
      {isNovoOperadorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Cadastrar Novo Operador</h3>
            <form onSubmit={handleCriarOperador} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={nomeOperadorInput}
                  onChange={e => setNomeOperadorInput(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-400 block mb-1">Turno</label>
                  <select
                    value={turnoOperadorInput}
                    onChange={e => setTurnoOperadorInput(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                  >
                    <option value="MANHA">Manhã</option>
                    <option value="TARDE">Tarde</option>
                    <option value="NOITE">Noite</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-400 block mb-1">Máquina Padrão</label>
                  <select
                    value={maquinaOperadorInput}
                    onChange={e => setMaquinaOperadorInput(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                  >
                    <option value="MAQUINA 1">Máquina 1</option>
                    <option value="MAQUINA 2">Máquina 2</option>
                    <option value="MAQUINA 3">Máquina 3</option>
                    <option value="MAQUINA 4">Máquina 4</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNovoOperadorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-neutral-700 hover:bg-neutral-600 text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Cliente */}
      <ClienteModal
        isOpen={isNovoClienteOpen}
        onClose={() => {
          setIsNovoClienteOpen(false);
          carregarClientes();
        }}
        onSuccess={() => {
          setIsNovoClienteOpen(false);
          carregarClientes();
        }}
      />

    </div>
  );
}
