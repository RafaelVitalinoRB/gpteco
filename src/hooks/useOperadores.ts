import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Operador } from '../types';

export interface OperadorSupabase {
  id: string | number;
  nome: string;
  matricula?: string;
  ativo?: boolean;
  status?: 'ATIVO' | 'INATIVO';
  maquinas_autorizadas?: string[];
  criado_em?: string;
  created_at?: string;
  atualizado_em?: string;
  updated_at?: string;
}

export const STORAGE_KEY_OPERADORES = 'texlog_operadores_v1';
export const EVENT_OPERADORES_UPDATED = 'texlog_operadores_updated';

// Sementes padrão conforme Especificação da Sprint 3.4.1:
// Máquina 1: João, Pedro
// Máquina 2: Carlos
// Máquina 3: Marcos
// Máquina 4: José
export const DEFAULT_OPERADORES: OperadorSupabase[] = [
  { id: '1', nome: 'João', matricula: 'OP001', ativo: true, status: 'ATIVO', maquinas_autorizadas: ['MAQUINA 1'] },
  { id: '2', nome: 'Pedro', matricula: 'OP002', ativo: true, status: 'ATIVO', maquinas_autorizadas: ['MAQUINA 1'] },
  { id: '3', nome: 'Carlos', matricula: 'OP003', ativo: true, status: 'ATIVO', maquinas_autorizadas: ['MAQUINA 2'] },
  { id: '4', nome: 'Marcos', matricula: 'OP004', ativo: true, status: 'ATIVO', maquinas_autorizadas: ['MAQUINA 3'] },
  { id: '5', nome: 'José', matricula: 'OP005', ativo: true, status: 'ATIVO', maquinas_autorizadas: ['MAQUINA 4'] },
];

/**
 * Função da ETAPA 2 da SPRINT 2.5.1 / SPRINT 3.4.1:
 * Consulta direta ao Supabase, tabela operadores, com fallback resiliente para usuarios
 * e persistência local garantida com operadores vinculados obrigatoriamente a uma única máquina.
 */
export async function carregarOperadores(apenasAtivos = false): Promise<OperadorSupabase[]> {
  try {
    let query = supabase
      .from('operadores')
      .select('*')
      .order('nome');

    if (apenasAtivos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_OPERADORES, JSON.stringify(data));
      } catch {}
      return data;
    }

    // Se a tabela operadores não foi criada ainda no Supabase (PGRST205)
    // Busca na tabela usuarios existente com tipo = 'OPERADOR'
    if (error && error.code === 'PGRST205') {
      const { data: usuariosData, error: usrErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('tipo', 'OPERADOR')
        .order('nome');

      if (!usrErr && usuariosData && usuariosData.length > 0) {
        const mapped = usuariosData.map((u: any) => ({
          id: u.id,
          nome: u.nome,
          matricula: u.usuario || '',
          ativo: true,
          status: 'ATIVO' as const,
          maquinas_autorizadas: u.maquina ? [u.maquina] : ['MAQUINA 1'],
          criado_em: u.criado_em,
          atualizado_em: u.criado_em,
        }));
        try {
          localStorage.setItem(STORAGE_KEY_OPERADORES, JSON.stringify(mapped));
        } catch {}
        return mapped;
      }
    }

    if (error && error.code !== 'PGRST205') {
      console.warn('Aviso ao consultar operadores do Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Falha na consulta de operadores:', err?.message || err);
  }

  // 1. Tenta carregar do localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPERADORES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (apenasAtivos) {
          return parsed.filter((op: any) => op.status === 'ATIVO' || op.ativo !== false);
        }
        return parsed;
      }
    }
  } catch {}

  // 2. Se não houver dados, inicializa lista padrão conforme Sprint 3.4.1
  try {
    localStorage.setItem(STORAGE_KEY_OPERADORES, JSON.stringify(DEFAULT_OPERADORES));
  } catch {}

  if (apenasAtivos) {
    return DEFAULT_OPERADORES.filter(op => op.status === 'ATIVO' || op.ativo !== false);
  }
  return DEFAULT_OPERADORES;
}

export function useOperadores(options: { apenasAtivos?: boolean } = {}) {
  const { apenasAtivos = false } = options;
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperadores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await carregarOperadores(apenasAtivos);

      const mapped: Operador[] = data.map((op: any) => ({
        id: String(op.id),
        nome: String(op.nome || ''),
        matricula: String(op.matricula || ''),
        status: (op.status || (op.ativo !== false ? 'ATIVO' : 'INATIVO')) as 'ATIVO' | 'INATIVO',
        maquinasAutorizadas: (op.maquinas_autorizadas || op.maquinasAutorizadas || ['MAQUINA 1', 'MAQUINA 2', 'MAQUINA 3', 'MAQUINA 4']) as any[],
        createdAt: op.criado_em || op.created_at || new Date().toISOString(),
        updatedAt: op.atualizado_em || op.updated_at || new Date().toISOString(),
      }));

      setOperadores(mapped);
      setError(null);
    } catch (err: any) {
      console.warn('Aviso no hook useOperadores:', err?.message || err);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [apenasAtivos]);

  useEffect(() => {
    fetchOperadores();

    // Cria um canal único por instância para evitar conflito de callbacks após subscribe
    const channelId = `operadores_${apenasAtivos ? 'act' : 'all'}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operadores',
        },
        () => {
          fetchOperadores();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usuarios',
        },
        () => {
          fetchOperadores();
        }
      )
      .subscribe();

    const handleLocalUpdate = () => {
      fetchOperadores();
    };

    window.addEventListener(EVENT_OPERADORES_UPDATED, handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(EVENT_OPERADORES_UPDATED, handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [fetchOperadores, apenasAtivos]);

  return { operadores, loading, error, refetch: fetchOperadores };
}
