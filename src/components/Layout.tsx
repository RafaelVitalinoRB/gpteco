import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Package, 
  ArrowRightLeft, 
  DollarSign, 
  Menu, 
  X, 
  Play, 
  BarChart3, 
  RotateCcw, 
  FileSpreadsheet, 
  Building2, 
  Scale,
  Truck,
  Cpu,
  Receipt,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Wallet,
  UserCheck,
  ShieldCheck,
  Database,
  Printer,
  Sliders
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import GlobalSearch from './GlobalSearch';
import { logoutUser } from '../services/authService';

interface SubmenuItem {
  id: string;
  name: string;
  icon: any;
  badge?: number;
  alert?: boolean;
}

interface GrupoEscritorio {
  id: string;
  moduloParam: string;
  numero: string;
  name: string;
  badgeCor: string;
  corText: string;
  corBgHover: string;
  corBorderActive: string;
  corHeaderBg: string;
  icon: any;
  submenus: SubmenuItem[];
}

export default function Layout() {
  const { user, logout, rolos } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGrupos, setOpenGrupos] = useState<Record<string, boolean>>({
    expedicao: true,
    producao: false,
    financeiro: false,
    configuracoes: false,
    planejamento: true,
    materiais: false,
    base_operacional: false,
    relatorios: false,
    configuracoes_programador: false
  });

  // Query params da rota atual
  const searchParams = new URLSearchParams(location.search);
  const currentModulo = (searchParams.get('modulo') || (location.pathname.includes('/empresa') ? 'configuracoes' : location.pathname.includes('/clientes') ? 'configuracoes' : location.pathname.includes('/importacoes') ? 'configuracoes' : 'expedicao')).toLowerCase();
  const currentSub = (searchParams.get('sub') || (location.pathname.includes('/empresa') ? 'empresa' : location.pathname.includes('/clientes') ? 'clientes' : location.pathname.includes('/importacoes') ? 'importacoes' : '')).toLowerCase();

  // Contadores em tempo real para badges
  const [pesagemCount, setPesagemCount] = useState<number>(0);
  const [faturamentoCount, setFaturamentoCount] = useState<number>(0);

  useEffect(() => {
    const atualizarContagens = () => {
      let countP = rolos.filter(r => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM').length;
      try {
        const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (raw) {
          const list = JSON.parse(raw);
          countP = list.filter((r: any) => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM').length;
        }
      } catch {}
      setPesagemCount(countP);

      try {
        const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
        if (rawRom) {
          const listRom = JSON.parse(rawRom);
          const pendentes = listRom.filter((r: any) => r.status === 'PENDENTE_FATURAMENTO' || !r.status);
          setFaturamentoCount(pendentes.length);
        }
      } catch {}
    };

    atualizarContagens();
    window.addEventListener('texlog_rolo_pesado', atualizarContagens);
    window.addEventListener('texlog_novo_rolo_pesagem', atualizarContagens);
    window.addEventListener('texlog_faturamento_updated', atualizarContagens);
    window.addEventListener('storage', atualizarContagens);

    return () => {
      window.removeEventListener('texlog_rolo_pesado', atualizarContagens);
      window.removeEventListener('texlog_novo_rolo_pesagem', atualizarContagens);
      window.removeEventListener('texlog_faturamento_updated', atualizarContagens);
      window.removeEventListener('storage', atualizarContagens);
    };
  }, [rolos]);

  // Expandir automaticamente o grupo atual
  useEffect(() => {
    if (currentModulo) {
      setOpenGrupos(prev => ({
        ...prev,
        [currentModulo]: true
      }));
    }
  }, [currentModulo]);

  const toggleGrupo = (grupoId: string) => {
    setOpenGrupos(prev => ({
      ...prev,
      [grupoId]: !prev[grupoId]
    }));
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login', { replace: true });
  };

  // Estrutura Escritório 3.0: 4 Grupos Principais
  const gruposEscritorio: GrupoEscritorio[] = [
    {
      id: 'producao',
      moduloParam: 'producao',
      numero: '1️⃣',
      name: 'PRODUÇÃO',
      badgeCor: '🔵',
      corText: 'text-blue-400',
      corBgHover: 'hover:bg-blue-500/10',
      corBorderActive: 'border-blue-500/30 bg-blue-500/10 text-blue-300 font-bold',
      corHeaderBg: 'bg-blue-950/20 border-blue-500/30 text-blue-400',
      icon: Cpu,
      submenus: [
        { id: 'painel-maquinas', name: 'Painel das Máquinas', icon: Cpu },
        { id: 'em-andamento', name: 'Produções em Andamento', icon: Play },
        { id: 'aguardando-retirada', name: 'Rolos Aguardando Retirada', icon: Clock },
        { id: 'aguardando-pesagem', name: 'Rolos Aguardando Pesagem', icon: Scale, badge: pesagemCount, alert: pesagemCount > 0 },
        { id: 'historico-producao', name: 'Histórico de Produção', icon: Layers },
        { id: 'ocorrencias', name: 'Ocorrências', icon: AlertTriangle }
      ]
    },
    {
      id: 'expedicao',
      moduloParam: 'expedicao',
      numero: '2️⃣',
      name: 'EXPEDIÇÃO',
      badgeCor: '🟢',
      corText: 'text-emerald-400',
      corBgHover: 'hover:bg-emerald-500/10',
      corBorderActive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold',
      corHeaderBg: 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400',
      icon: Truck,
      submenus: [
        { id: 'entrada-fios', name: 'Entrada de Fios', icon: ArrowDownRight },
        { id: 'saida-fios', name: 'Saída de Fios', icon: ArrowUpRight },
        { id: 'pesagem', name: 'Pesagem', icon: Scale, badge: pesagemCount, alert: pesagemCount > 0 },
        { id: 'estoque-rolos', name: 'Estoque de Rolos', icon: Package },
        { id: 'expedicoes', name: 'Expedições', icon: Truck },
        { id: 'romaneios', name: 'Romaneios', icon: FileText },
        { id: 'historico-expedicoes', name: 'Histórico de Expedições', icon: Receipt }
      ]
    },
    {
      id: 'financeiro',
      moduloParam: 'financeiro',
      numero: '3️⃣',
      name: 'FATURAMENTO / FINANCEIRO',
      badgeCor: '🟣',
      corText: 'text-purple-400',
      corBgHover: 'hover:bg-purple-500/10',
      corBorderActive: 'border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold',
      corHeaderBg: 'bg-purple-950/20 border-purple-500/30 text-purple-400',
      icon: DollarSign,
      submenus: [
        { id: 'faturamentos', name: 'Faturamentos', icon: Receipt, badge: faturamentoCount, alert: faturamentoCount > 0 },
        { id: 'contas-receber', name: 'Contas a Receber', icon: ArrowDownRight },
        { id: 'contas-pagar', name: 'Contas a Pagar', icon: ArrowUpRight },
        { id: 'parcelas', name: 'Parcelas', icon: Calendar },
        { id: 'recebimentos', name: 'Recebimentos', icon: CheckCircle2 },
        { id: 'fluxo-caixa', name: 'Fluxo de Caixa', icon: TrendingUp },
        { id: 'despesas', name: 'Despesas da Empresa', icon: Wallet }
      ]
    },
    {
      id: 'configuracoes',
      moduloParam: 'configuracoes',
      numero: '4️⃣',
      name: 'CONFIGURAÇÕES',
      badgeCor: '⚙',
      corText: 'text-neutral-400',
      corBgHover: 'hover:bg-neutral-800',
      corBorderActive: 'border-neutral-600 bg-neutral-800 text-white font-bold',
      corHeaderBg: 'bg-neutral-800/40 border-neutral-700 text-neutral-300',
      icon: Sliders,
      submenus: [
        { id: 'empresa', name: 'Empresa', icon: Building2 },
        { id: 'clientes', name: 'Clientes', icon: Users },
        { id: 'operadores', name: 'Operadores', icon: UserCheck },
        { id: 'maquinas', name: 'Máquinas', icon: Cpu },
        { id: 'especificacoes', name: 'Especificações', icon: FileText },
        { id: 'usuarios', name: 'Usuários', icon: ShieldCheck },
        { id: 'importacoes', name: 'Importações', icon: FileSpreadsheet },
        { id: 'backup', name: 'Backup', icon: Database },
        { id: 'impressoes', name: 'Impressões', icon: Printer },
        { id: 'parametros', name: 'Parâmetros Gerais', icon: Sliders }
      ]
    }
  ];

  // Estrutura Programador UX 1: 5 Grupos Visuais Padronizados
  const gruposProgramador = [
    {
      id: 'planejamento',
      name: 'PLANEJAMENTO',
      badgeCor: '🟦',
      corText: 'text-blue-400',
      corBgHover: 'hover:bg-blue-500/10',
      corBorderActive: 'border-blue-500/30 bg-blue-500/10 text-blue-300 font-bold',
      corHeaderBg: 'bg-blue-950/20 border-blue-500/30 text-blue-400',
      icon: LayoutDashboard,
      submenus: [
        { name: 'Dashboard', path: '/programador', icon: LayoutDashboard },
        { name: 'Agenda de Produção', path: '/programador/maquinas', icon: Calendar },
        { name: 'Ordens de Produção', path: '/programador/ops', icon: FileText },
        { name: 'Prioridades', path: '/programador/ops?filtro=prioridades', icon: TrendingUp }
      ]
    },
    {
      id: 'materiais',
      name: 'MATERIAIS',
      badgeCor: '🟩',
      corText: 'text-emerald-400',
      corBgHover: 'hover:bg-emerald-500/10',
      corBorderActive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold',
      corHeaderBg: 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400',
      icon: Package,
      submenus: [
        { name: 'Estoque dos Clientes', path: '/estoque', icon: Package },
        { name: 'Entradas de Fios', path: '/escritorio?modulo=expedicao&sub=entrada-fios', icon: ArrowDownRight },
        { name: 'Reservas', path: '/estoque?tab=reservas', icon: Layers },
        { name: 'Saldo Disponível', path: '/estoque?tab=CLIENTES', icon: CheckCircle2 }
      ]
    },
    {
      id: 'base_operacional',
      name: 'BASE OPERACIONAL',
      badgeCor: '🟧',
      corText: 'text-amber-400',
      corBgHover: 'hover:bg-amber-500/10',
      corBorderActive: 'border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold',
      corHeaderBg: 'bg-amber-950/20 border-amber-500/30 text-amber-400',
      icon: Users,
      submenus: [
        { name: 'Clientes', path: '/programador/clientes', icon: Users },
        { name: 'Especificações', path: '/programador/especificacoes', icon: FileText },
        { name: 'Títulos de Fio', path: '/programador/titulos', icon: Settings },
        { name: 'Operadores', path: '/programador/operadores', icon: UserCheck },
        { name: 'Máquinas', path: '/programador/maquinas', icon: Cpu }
      ]
    },
    {
      id: 'relatorios',
      name: 'RELATÓRIOS',
      badgeCor: '🟪',
      corText: 'text-purple-400',
      corBgHover: 'hover:bg-purple-500/10',
      corBorderActive: 'border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold',
      corHeaderBg: 'bg-purple-950/20 border-purple-500/30 text-purple-400',
      icon: BarChart3,
      submenus: [
        { name: 'Produção Prevista', path: '/programador/relatorios?tipo=prevista', icon: Calendar },
        { name: 'Produção Realizada', path: '/programador/relatorios', icon: BarChart3 },
        { name: 'Consumo de Fios', path: '/programador/relatorios?tipo=consumo', icon: TrendingUp },
        { name: 'Histórico', path: '/escritorio?modulo=producao&sub=historico-producao', icon: Layers }
      ]
    },
    {
      id: 'configuracoes_programador',
      name: 'CONFIGURAÇÕES',
      badgeCor: '⚙',
      corText: 'text-neutral-400',
      corBgHover: 'hover:bg-neutral-800',
      corBorderActive: 'border-neutral-600 bg-neutral-800 text-white font-bold',
      corHeaderBg: 'bg-neutral-800/40 border-neutral-700 text-neutral-300',
      icon: Sliders,
      submenus: [
        { name: 'Configurações do módulo', path: '/escritorio?modulo=configuracoes&sub=empresa', icon: Sliders },
        { name: 'Reset Operacional', path: '/administracao/reset-operacional', icon: RotateCcw }
      ]
    }
  ];

  const getNavItems = () => {
    switch (user?.role) {
      case 'PROGRAMADOR':
        return [
          { name: 'Dashboard', path: '/programador', icon: LayoutDashboard },
          { name: 'Clientes', path: '/programador/clientes', icon: Users },
          { name: 'Títulos de Fio', path: '/programador/titulos', icon: Settings },
          { name: 'Especificações', path: '/programador/especificacoes', icon: FileText },
          { name: 'Ordens de Produção', path: '/programador/ops', icon: FileText },
          { name: 'Operadores', path: '/programador/operadores', icon: Users },
          { name: 'Monitoramento Máquinas', path: '/programador/maquinas', icon: Play },
          { name: 'Estoque', path: '/estoque', icon: Package },
          { name: 'Escritório', path: '/escritorio', icon: ArrowRightLeft },
          { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
          { name: 'Relatórios', path: '/programador/relatorios', icon: BarChart3 },
        ];
      case 'OPERADOR':
        return [
          { name: 'Minha Máquina', path: '/operador', icon: LayoutDashboard },
        ];
      case 'ESTOQUE':
        return [
          { name: 'Dashboard', path: '/estoque', icon: Package },
        ];
      case 'FINANCEIRO':
        return [
          { name: 'Dashboard', path: '/financeiro', icon: DollarSign },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const isEscritorioRole = user?.role === 'ESCRITORIO';

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-900 border-r border-neutral-800">
        <div className="p-5 flex items-center gap-3 border-b border-neutral-800/80">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-black text-xl">T</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Texlog</h1>
            <p className="text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider">{user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
          
          {/* MODO ESCRITÓRIO: 4 GRUPOS PRINCIPAIS */}
          {isEscritorioRole ? (
            <div className="space-y-3">
              <div className="px-2 pb-1 text-[10px] font-mono font-black uppercase tracking-wider text-neutral-500">
                Processos do Escritório
              </div>

              {gruposEscritorio.map(grupo => {
                const isOpen = openGrupos[grupo.id];
                const isGroupActive = currentModulo === grupo.id;

                return (
                  <div key={grupo.id} className="rounded-2xl overflow-hidden border border-neutral-800/80 bg-neutral-950/40">
                    {/* Header do Grupo com Identidade Visual Padronizada */}
                    <button
                      type="button"
                      onClick={() => toggleGrupo(grupo.id)}
                      className={cn(
                        "w-full px-3 py-2.5 flex items-center justify-between transition-colors text-xs font-bold text-left cursor-pointer",
                        isGroupActive ? grupo.corHeaderBg : "hover:bg-neutral-800/60 text-neutral-300"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs">{grupo.badgeCor}</span>
                        <span className="truncate tracking-tight font-black">{grupo.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {grupo.submenus.some(s => s.badge && s.badge > 0) && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                      </div>
                    </button>

                    {/* Submenus Expansíveis */}
                    {isOpen && (
                      <div className="p-1 space-y-0.5 bg-neutral-900/60">
                        {grupo.submenus.map(sub => {
                          const SubIcon = sub.icon;
                          const isSubActive = isGroupActive && (currentSub === sub.id || (!currentSub && sub.id === grupo.submenus[0].id));

                          return (
                            <Link
                              key={sub.id}
                              to={`/escritorio?modulo=${grupo.moduloParam}&sub=${sub.id}`}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] transition-all",
                                isSubActive
                                  ? grupo.corBorderActive
                                  : cn("text-neutral-400 hover:text-white", grupo.corBgHover)
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{sub.name}</span>
                              </div>
                              {typeof sub.badge === 'number' && sub.badge > 0 && (
                                <span className={cn(
                                  "px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black shrink-0",
                                  sub.alert ? "bg-amber-500 text-black font-bold" : "bg-neutral-800 text-neutral-300"
                                  )}>
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : user?.role === 'PROGRAMADOR' ? (
            /* MODO PROGRAMADOR: 5 GRUPOS VISUAIS PADRONIZADOS */
            <div className="space-y-3">
              <div className="px-2 pb-1 text-[10px] font-mono font-black uppercase tracking-wider text-neutral-500">
                Processos do Programador
              </div>

              {gruposProgramador.map(grupo => {
                const isOpen = openGrupos[grupo.id] !== false; // Padrão aberto se não falseado ou ativo
                const isGroupActive = grupo.submenus.some(s => location.pathname === s.path.split('?')[0]);

                return (
                  <div key={grupo.id} className="rounded-2xl overflow-hidden border border-neutral-800/80 bg-neutral-950/40">
                    {/* Header do Grupo com Identidade Visual Padronizada */}
                    <button
                      type="button"
                      onClick={() => toggleGrupo(grupo.id)}
                      className={cn(
                        "w-full px-3 py-2.5 flex items-center justify-between transition-colors text-xs font-bold text-left cursor-pointer",
                        isGroupActive ? grupo.corHeaderBg : "hover:bg-neutral-800/60 text-neutral-300"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs">{grupo.badgeCor}</span>
                        <span className="truncate tracking-tight font-black">{grupo.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                      </div>
                    </button>

                    {/* Submenus Expansíveis */}
                    {isOpen && (
                      <div className="p-1 space-y-0.5 bg-neutral-900/60">
                        {grupo.submenus.map((sub, idx) => {
                          const SubIcon = sub.icon;
                          const subBase = sub.path.split('?')[0];
                          const isSubActive = location.pathname === subBase && 
                            (!sub.path.includes('?') || location.search.includes(sub.path.split('?')[1]));

                          return (
                            <Link
                              key={`${sub.path}-${idx}`}
                              to={sub.path}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] transition-all",
                                isSubActive
                                  ? grupo.corBorderActive
                                  : cn("text-neutral-400 hover:text-white", grupo.corBgHover)
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{sub.name}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* DEMAIS ROLES (Operador, Estoque, Financeiro) */
            <>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                      isActive 
                        ? "bg-blue-600/10 text-blue-500 font-medium" 
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}

        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-neutral-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">T</span>
          </div>
          <span className="text-white font-bold">Texlog</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-neutral-400">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-neutral-900 z-40 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-4 py-6 space-y-3">
            {isEscritorioRole ? (
              <div className="space-y-3">
                <div className="px-2 text-xs font-mono font-bold uppercase text-neutral-500">
                  Processos do Escritório 3.0
                </div>
                {gruposEscritorio.map(grupo => (
                  <div key={grupo.id} className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950/50">
                    <div className={cn("p-3 font-bold text-sm flex items-center gap-2", grupo.corHeaderBg)}>
                      <span>{grupo.badgeCor}</span>
                      <span>{grupo.name}</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {grupo.submenus.map(sub => (
                        <Link
                          key={sub.id}
                          to={`/escritorio?modulo=${grupo.moduloParam}&sub=${sub.id}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800"
                        >
                          <span>{sub.name}</span>
                          {typeof sub.badge === 'number' && sub.badge > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-bold">
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : user?.role === 'PROGRAMADOR' ? (
              <div className="space-y-3">
                <div className="px-2 text-xs font-mono font-bold uppercase text-neutral-500">
                  Processos do Programador
                </div>
                {gruposProgramador.map(grupo => (
                  <div key={grupo.id} className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950/50">
                    <div className={cn("p-3 font-bold text-sm flex items-center gap-2", grupo.corHeaderBg)}>
                      <span>{grupo.badgeCor}</span>
                      <span>{grupo.name}</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {grupo.submenus.map((sub, idx) => (
                        <Link
                          key={`${sub.path}-${idx}`}
                          to={sub.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800"
                        >
                          <span>{sub.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4 rounded-xl transition-colors text-lg",
                      isActive 
                        ? "bg-blue-600/10 text-blue-500 font-medium" 
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    {item.name}
                  </Link>
                );
              })
            )}
          </nav>
          <div className="p-6 border-t border-neutral-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-4 w-full text-neutral-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors text-lg"
            >
              <LogOut className="w-6 h-6" />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-neutral-950 md:pt-0 pt-16">
        {/* Header with Search */}
        <header className="hidden md:flex h-20 items-center px-8 border-b border-neutral-800 gap-8 bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex-1">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-white">{user?.nome || user?.role}</div>
              <div className="text-xs text-neutral-400">{user?.email || ''}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.nome || user.role} className="w-full h-full object-cover" />
              ) : (
                user?.role?.charAt(0)
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
