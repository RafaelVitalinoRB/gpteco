import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import LoadingScreen from '../components/LoadingScreen';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { signInWithGoogle, getDashboardPathForRole } from '../services/authService';

/**
 * SPRINT AUTH 1.1 — Correção definitiva do Login Google
 * 
 * Requisitos:
 * - Apenas Login Google oficial (Supabase signInWithOAuth)
 * - Nenhum login automático indevido
 * - Nenhum usuário mock ou bypass
 * - Nenhuma autenticação por e-mail manual
 * - Todo acesso depende exclusivamente de:
 *   Google OAuth -> Tabela usuarios -> status = ATIVO
 * - Se não autorizado: "Acesso não autorizado. Solicite acesso ao administrador."
 */
export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Conectando ao TEXLOG...');
  const [authError, setAuthError] = useState<string | null>(null);

  const user = useStore(state => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  // Captura erro transmitido pela validação da aplicação
  useEffect(() => {
    if (location.state?.error) {
      setAuthError(location.state.error);
    }
  }, [location.state]);

  // Se o usuário já possuir sessão ativa e validada, direciona para o seu dashboard
  useEffect(() => {
    if (user) {
      navigate(getDashboardPathForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  // Disparo do Login Oficial do Google via Supabase OAuth
  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setIsLoading(true);
      setLoadingMessage('Conectando com o Google...');

      const { error } = await signInWithGoogle();
      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Erro ao acionar login Google:', err);
      setIsLoading(false);
      setAuthError('Não foi possível conectar ao Google. Tente novamente.');
      toast.error('Erro ao iniciar login com Google');
    }
  };

  if (isLoading) {
    return <LoadingScreen mensagem={loadingMessage} />;
  }

  return (
    <div className="min-h-screen bg-[#121417] text-neutral-100 flex flex-col justify-between items-center p-6 select-none relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Topo com botão voltar para a Splash */}
      <div className="w-full flex justify-between items-center max-w-md mx-auto pt-2 z-10">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Splash</span>
        </Link>
        <span className="text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
          AUTENTICAÇÃO
        </span>
      </div>

      {/* Card Central de Login */}
      <div className="w-full max-w-md mx-auto bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-xl z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Identidade TEXLOG */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center shadow-xl shadow-cyan-900/30 border border-cyan-500/30 mb-4">
            <span className="text-white font-black text-3xl tracking-tighter">T</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            TEXLOG ERP
          </h1>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-mono">
            Controle Total da Produção Têxtil
          </p>
        </div>

        {/* Mensagem de Erro de Permissão / Não Autorizado */}
        {authError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-left animate-in fade-in">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">
                Acesso não autorizado
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {authError}
              </p>
            </div>
          </div>
        )}

        {/* Botão Oficial: Entrar com o Google */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-neutral-100 active:scale-[0.98] text-neutral-900 font-bold text-sm transition-all duration-200 shadow-xl flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Entrar com Google</span>
          </button>

          {/* Validação de Segurança & Consulta de Permissão */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-neutral-400">
              O acesso é restrito aos usuários previamente autorizados e ativos no banco de dados.
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé Oficial */}
      <footer className="w-full text-center py-4 z-10">
        <p className="text-xs text-neutral-400 font-mono tracking-wide">
          © 2026 RB Souza
        </p>
      </footer>
    </div>
  );
}
