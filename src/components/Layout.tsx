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
  RotateCcw
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import GlobalSearch from './GlobalSearch';

export default function Layout() {
  const { user, logout } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
      case 'ESCRITORIO':
        return [
          { name: 'Dashboard', path: '/escritorio', icon: LayoutDashboard },
          { name: 'Clientes', path: '/escritorio/clientes', icon: Users },
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

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-900 border-r border-neutral-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Texlog</h1>
            <p className="text-xs text-neutral-400">{user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
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

          {user?.role === 'PROGRAMADOR' && (
            <div className="pt-3 mt-3 border-t border-neutral-800/80">
              <div className="px-4 mb-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase flex items-center justify-between">
                <span>Administração</span>
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">ADMIN</span>
              </div>
              <Link
                to="/administracao/reset-operacional"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  location.pathname === "/administracao/reset-operacional"
                    ? "bg-red-500/10 text-red-400 font-medium border border-red-500/20"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                )}
              >
                <RotateCcw className="w-5 h-5 text-red-400" />
                Reset Operacional
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-neutral-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
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
        <div className="md:hidden fixed inset-0 top-16 bg-neutral-900 z-40 flex flex-col">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
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
            })}

            {user?.role === 'PROGRAMADOR' && (
              <div className="pt-4 mt-2 border-t border-neutral-800">
                <div className="px-4 mb-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  Administração
                </div>
                <Link
                  to="/administracao/reset-operacional"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl transition-colors text-lg",
                    location.pathname === "/administracao/reset-operacional"
                      ? "bg-red-500/10 text-red-400 font-medium" 
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  )}
                >
                  <RotateCcw className="w-6 h-6 text-red-400" />
                  Reset Operacional
                </Link>
              </div>
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
              <div className="text-sm font-medium text-white">{user?.role}</div>
              <div className="text-xs text-neutral-500">rafael.rbsouza.RV@gmail.com</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
              {user?.role?.charAt(0)}
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
