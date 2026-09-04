import { supabase } from '../lib/supabase';

export async function buscarTabela(tabela: string) {
  const { data, error } = await supabase.from(tabela).select('*');
  if (error) {
    console.error(`Erro ao buscar dados da tabela ${tabela}:`, error);
    throw error;
  }
  return data;
}

export async function inserirRegistro(tabela: string, dados: any) {
  const { data, error } = await supabase.from(tabela).insert([dados]).select();
  if (error) {
    console.error(`Erro ao inserir na tabela ${tabela}:`, error);
    throw error;
  }
  return data;
}

export async function atualizarRegistro(tabela: string, id: string | number, dados: any) {
  const { data, error } = await supabase.from(tabela).update(dados).eq('id', id).select();
  if (error) {
    console.error(`Erro ao atualizar na tabela ${tabela} (ID: ${id}):`, error);
    throw error;
  }
  return data;
}

export async function excluirRegistro(tabela: string, id: string | number) {
  const { data, error } = await supabase.from(tabela).delete().eq('id', id).select();
  if (error) {
    console.error(`Erro ao excluir da tabela ${tabela} (ID: ${id}):`, error);
    throw error;
  }
  return data;
}
