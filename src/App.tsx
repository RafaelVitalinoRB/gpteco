/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { generateSpecKey } from './lib/utils';
import { fetchClientesOficiais } from './services/clienteService';
import { supabase } from './lib/supabase';
import { validateSupabaseUser, logoutUser, getDashboardPathForRole } from './services/authService';
import LoadingScreen from './components/LoadingScreen';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Layout from './components/Layout';

// Programador
import DashboardProgramador from './pages/Programador/Dashboard';
import Clientes from './pages/Programador/Clientes';
import TitulosFio from './pages/Programador/TitulosFio';
import Especificacoes from './pages/Programador/Especificacoes';
import OPs from './pages/Programador/OPs';
import Operadores from './pages/Programador/Operadores';

// Operador
import DashboardOperador from './pages/Operador/Dashboard';

// Relatorios
import Relatorios from './pages/Programador/Relatorios';
import MaquinasProgramador from './pages/Programador/Maquinas';

// Administracao
import ResetOperacional from './pages/Administracao/ResetOperacional';

// Escritorio
import DashboardEscritorio from './pages/Escritorio/Dashboard';
import EmpresaEscritorio from './pages/Escritorio/Empresa';
import ClientesEscritorio from './pages/Escritorio/Clientes/ClientesEscritorio';
import { ClienteDetalhes } from './pages/Escritorio/Clientes/ClienteDetalhes';
import ImportacoesEscritorio from './pages/Escritorio/Importacoes';

// Estoque
import DashboardEstoque from './pages/Estoque/Dashboard';

// Financeiro
import DashboardFinanceiro from './pages/Financeiro/Dashboard';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const user = useStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }
  return <>{children}</>;
}

/**
 * Gerencia ciclo de vida da sessão Supabase Auth com persistência e validação
 * na tabela `usuarios`.
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = React.useState(true);
  const loginStore = useStore(state => state.login);
  const logoutStore = useStore(state => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    let isMounted = true;

    const processSession = async (session: any) => {
      if (session?.user?.email) {
        const result = await validateSupabaseUser(session.user.email, session.user.user_metadata);
        if (result.success && result.user) {
          if (isMounted) {
            loginStore(result.user);
            // Se estava na raiz (Splash) ou em /login após o OAuth do Google, redireciona ao dashboard
            if (location.pathname === '/' || location.pathname === '/splash' || location.pathname === '/login') {
              navigate(getDashboardPathForRole(result.user.role), { replace: true });
            }
          }
        } else {
          // Não autorizado ou inativo
          await logoutUser();
          if (isMounted) {
            navigate('/login', {
              replace: true,
              state: { error: result.error || 'Acesso não autorizado. Solicite acesso ao administrador.' }
            });
          }
        }
      } else {
        if (useStore.getState().user) {
          logoutStore();
        }
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await processSession(session);
      } catch (err) {
        console.warn('Erro ao restaurar sessão Supabase:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (isMounted) {
          await processSession(session);
        }
      } else if (event === 'SIGNED_OUT') {
        logoutStore();
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (isInitializing) {
    return <LoadingScreen mensagem="Conectando ao TEXLOG..." />;
  }

  return <>{children}</>;
}

export default function App() {
  const user = useStore(state => state.user);
  const especificacoes = useStore(state => state.especificacoes);
  const clientes = useStore(state => state.clientes);
  const updateEspecificacao = useStore(state => state.updateEspecificacao);

  React.useEffect(() => {
    fetchClientesOficiais().catch(err => {
      console.warn('Inicialização dos clientes oficiais:', err);
    });
  }, []);

  React.useEffect(() => {
    especificacoes.forEach(esp => {
      // 1. Check for missing clienteId
      if (!esp.clienteId) {
        console.warn('Specification missing clienteId:', esp.id);
        return;
      }

      // 2. Generate new robust specKey using clienteId
      const newSpecKey = generateSpecKey(
        esp.clienteId,
        esp.tituloFio,
        esp.totalFios
      );

      // 3. Update if different or missing
      if (esp.specKey !== newSpecKey) {
        updateEspecificacao(esp.id, { 
          specKey: newSpecKey,
          tituloFio: (esp.tituloFio || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/')
        });
      }
    });

    // Clean up specifications without clients if they are completely orphaned
    const invalidSpecs = especificacoes.filter(e => !e.clienteId || !clientes.some(c => c.id === e.clienteId));
    if (invalidSpecs.length > 0) {
      console.warn('Found invalid specifications, consider review:', invalidSpecs);
    }
  }, [especificacoes, clientes, updateEspecificacao]);

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 2000 }} />
      <AuthInitializer>
        <Routes>
          {/* SPRINT BETA 1.0: Splash será a primeira tela. Login apenas após clicar em INICIAR. Nunca abrir Dashboard diretamente. */}
          <Route path="/" element={<Splash />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            {/* Programador Routes */}
            <Route path="/programador" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><DashboardProgramador /></ProtectedRoute>} />
            <Route path="/programador/clientes" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><Clientes /></ProtectedRoute>} />
            <Route path="/programador/titulos" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><TitulosFio /></ProtectedRoute>} />
            <Route path="/programador/especificacoes" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><Especificacoes /></ProtectedRoute>} />
            <Route path="/programador/ops" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><OPs /></ProtectedRoute>} />
            <Route path="/programador/operadores" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><Operadores /></ProtectedRoute>} />
            <Route path="/programador/maquinas" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><MaquinasProgramador /></ProtectedRoute>} />

            {/* Operador Routes */}
            <Route path="/operador" element={<ProtectedRoute allowedRoles={['OPERADOR', 'PROGRAMADOR']}><DashboardOperador /></ProtectedRoute>} />

            {/* Escritorio Routes */}
            <Route path="/escritorio" element={<ProtectedRoute allowedRoles={['ESCRITORIO', 'PROGRAMADOR']}><DashboardEscritorio /></ProtectedRoute>} />
            <Route path="/escritorio/empresa" element={<ProtectedRoute allowedRoles={['ESCRITORIO', 'PROGRAMADOR']}><EmpresaEscritorio /></ProtectedRoute>} />
            <Route path="/configuracoes/empresa" element={<ProtectedRoute allowedRoles={['ESCRITORIO', 'PROGRAMADOR']}><EmpresaEscritorio /></ProtectedRoute>} />
            <Route path="/empresa" element={<ProtectedRoute allowedRoles={['ESCRITORIO', 'PROGRAMADOR']}><EmpresaEscritorio /></ProtectedRoute>} />
            <Route path="/escritorio/clientes" element={<ProtectedRoute allowedRoles={['ESCRITORIO', 'PROGRAMADOR']}><ClientesEscritorio /></ProtectedRoute>} />
            <Route path="/escritorio/clientes/:id" element={<ProtectedRoute allowedRoles={['ESCRITORIO', 'PROGRAMADOR']}><ClienteDetalhes /></ProtectedRoute>} />
            <Route path="/escritorio/importacoes" element={<ProtectedRoute allowedRoles={['ESCRITORIO', 'PROGRAMADOR']}><ImportacoesEscritorio /></ProtectedRoute>} />

            {/* Estoque Routes */}
            <Route path="/estoque" element={<ProtectedRoute allowedRoles={['ESTOQUE', 'PROGRAMADOR']}><DashboardEstoque /></ProtectedRoute>} />

            {/* Financeiro Routes */}
            <Route path="/financeiro" element={<ProtectedRoute allowedRoles={['FINANCEIRO', 'PROGRAMADOR']}><DashboardFinanceiro /></ProtectedRoute>} />

            {/* Relatorios Route */}
            <Route path="/programador/relatorios" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><Relatorios /></ProtectedRoute>} />

            {/* Administracao Routes (Sprint Admin 1.0) */}
            <Route path="/administracao/reset-operacional" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><ResetOperacional /></ProtectedRoute>} />
            <Route path="/programador/reset-operacional" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><ResetOperacional /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthInitializer>
    </Router>
  );
}

