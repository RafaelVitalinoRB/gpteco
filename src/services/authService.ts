import { supabase } from '../lib/supabase';
import { Role, User } from '../types';
import { useStore } from '../store/useStore';

export interface AuthValidationResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * SPRINT AUTH 1.1 — Correção definitiva do Login Google
 * 
 * Mapeia o papel do usuário para a rota padrão do seu dashboard correspondente.
 */
export function getDashboardPathForRole(role?: Role | null): string {
  switch (role) {
    case 'PROGRAMADOR':
      return '/programador';
    case 'OPERADOR':
      return '/operador';
    case 'ESCRITORIO':
      return '/escritorio';
    case 'ESTOQUE':
      return '/estoque';
    case 'FINANCEIRO':
      return '/financeiro';
    default:
      return '/programador';
  }
}

/**
 * Validação rigorosa na tabela `usuarios` do Supabase:
 * - Deve existir na tabela `usuarios` com o email informado
 * - Status deve ser obrigatoriamente 'ATIVO'
 * - Papel (role) deve ser válido
 * 
 * Se não existir ou não estiver ativo:
 * Retorna: "Acesso não autorizado. Solicite acesso ao administrador."
 */
export async function validateSupabaseUser(email: string, userMeta?: any): Promise<AuthValidationResult> {
  try {
    const emailNormalizado = email.trim().toLowerCase();

    // 1. Consultar tabela usuarios no Supabase
    const { data: usuariosData, error: dbError } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('email', emailNormalizado)
      .limit(1);

    if (dbError) {
      console.warn('Erro ao consultar tabela usuarios:', dbError);
    }

    const usuarioEncontrado = usuariosData && usuariosData.length > 0 ? usuariosData[0] : null;

    // 2. Validar se o usuário existe
    if (!usuarioEncontrado) {
      return {
        success: false,
        error: 'Acesso não autorizado. Solicite acesso ao administrador.'
      };
    }

    // 3. Validar se o status é ATIVO
    if (usuarioEncontrado.status !== 'ATIVO') {
      return {
        success: false,
        error: 'Acesso não autorizado. Solicite acesso ao administrador.'
      };
    }

    // 4. Carregar perfil completo do usuário
    const roleMapeado: Role = (usuarioEncontrado.papel as Role) || 'PROGRAMADOR';
    const usuarioLogado: User = {
      role: roleMapeado,
      machine: usuarioEncontrado.maquina || undefined,
      email: usuarioEncontrado.email,
      nome: usuarioEncontrado.nome || userMeta?.full_name,
      avatarUrl: usuarioEncontrado.avatar_url || userMeta?.avatar_url
    };

    // Atualizar último login de forma assíncrona
    supabase
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', usuarioEncontrado.id)
      .then(() => {});

    return {
      success: true,
      user: usuarioLogado
    };
  } catch (err: any) {
    console.error('Falha ao validar usuário no Supabase:', err);
    return {
      success: false,
      error: 'Falha ao autenticar. Tente novamente.'
    };
  }
}

/**
 * Fluxo oficial de autenticação Supabase com Google OAuth
 * queryParams: prompt=select_account
 * redirectTo: window.location.origin
 */
export async function signInWithGoogle() {
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: 'select_account'
      }
    }
  });
}

/**
 * Logout do sistema:
 * - signOut no Supabase
 * - Limpeza no Zustand
 * - Limpeza de persistência local de autenticação
 */
export async function logoutUser() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Erro ao deslogar do Supabase:', err);
  }
  useStore.getState().logout();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}
