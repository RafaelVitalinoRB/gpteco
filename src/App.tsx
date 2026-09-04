/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { generateSpecKey } from './lib/utils';
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

import Relatorios from './pages/Programador/Relatorios';
import MaquinasProgramador from './pages/Programador/Maquinas';

// Escritorio
import DashboardEscritorio from './pages/Escritorio/Dashboard';

// Estoque
import DashboardEstoque from './pages/Estoque/Dashboard';

// Financeiro
import DashboardFinanceiro from './pages/Financeiro/Dashboard';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const user = useStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const user = useStore(state => state.user);
  const especificacoes = useStore(state => state.especificacoes);
  const clientes = useStore(state => state.clientes);
  const updateEspecificacao = useStore(state => state.updateEspecificacao);

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
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'PROGRAMADOR' ? <Navigate to="/programador" replace /> :
          user.role === 'OPERADOR' ? <Navigate to="/operador" replace /> :
          user.role === 'ESCRITORIO' ? <Navigate to="/escritorio" replace /> :
          user.role === 'ESTOQUE' ? <Navigate to="/estoque" replace /> :
          <Navigate to="/financeiro" replace />
        } />

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

          {/* Estoque Routes */}
          <Route path="/estoque" element={<ProtectedRoute allowedRoles={['ESTOQUE', 'PROGRAMADOR']}><DashboardEstoque /></ProtectedRoute>} />

          {/* Financeiro Routes */}
          <Route path="/financeiro" element={<ProtectedRoute allowedRoles={['FINANCEIRO', 'PROGRAMADOR']}><DashboardFinanceiro /></ProtectedRoute>} />

          {/* Relatorios Route */}
          <Route path="/programador/relatorios" element={<ProtectedRoute allowedRoles={['PROGRAMADOR']}><Relatorios /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}

