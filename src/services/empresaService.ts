import { useState, useEffect } from 'react';
import { Empresa } from '../types';

export const STORAGE_KEY_EMPRESA = 'texlog_empresa_v1';
export const EVENT_EMPRESA_UPDATED = 'texlog_empresa_updated';

export const DEFAULT_EMPRESA: Empresa = {
  id: 'empresa-principal',
  razaoSocial: 'TEXLOG INDÚSTRIA E BENEFICIAMENTO TÊXTIL LTDA',
  nomeFantasia: 'TEXLOG TÊXTIL',
  logotipo: '',
  cnpj: '12.345.678/0001-90',
  inscricaoEstadual: '123.456.789.110',
  endereco: 'Rodovia BR-101, Km 42',
  numero: '1500',
  bairro: 'Distrito Industrial Norte',
  cidade: 'Joinville',
  estado: 'SC',
  cep: '89219-500',
  telefone: '(47) 3456-7890',
  celular: '(47) 99876-5432',
  email: 'escritorio@texlog.com.br',
  site: 'www.texlog.com.br',
  atualizadoEm: new Date().toISOString()
};

/**
 * Retorna os dados da Empresa cadastrada no sistema.
 * Se não existir no localStorage, inicializa com os dados institucionais padrão.
 */
export function getEmpresa(): Empresa {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMPRESA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_EMPRESA,
          ...parsed
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar dados da empresa do localStorage:', e);
  }

  // Inicializa dados padrão
  try {
    localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(DEFAULT_EMPRESA));
  } catch {}

  return DEFAULT_EMPRESA;
}

/**
 * Salva e propaga atualizações dos dados institucionais da Empresa.
 * Nenhum documento do ERP terá nome de empresa fixo, utilizando sempre esta entidade.
 */
export function salvarEmpresa(dados: Partial<Empresa>): Empresa {
  const atual = getEmpresa();
  const novaEmpresa: Empresa = {
    ...atual,
    ...dados,
    id: atual.id || 'empresa-principal',
    atualizadoEm: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(novaEmpresa));
    window.dispatchEvent(new CustomEvent(EVENT_EMPRESA_UPDATED, { detail: novaEmpresa }));
  } catch (e) {
    console.warn('Erro ao salvar dados da empresa no localStorage:', e);
  }

  return novaEmpresa;
}

/**
 * Hook React para obter os dados da Empresa de forma reativa e atualizada em tempo real.
 */
export function useEmpresa(): { empresa: Empresa; atualizar: (d: Partial<Empresa>) => Empresa } {
  const [empresa, setEmpresa] = useState<Empresa>(getEmpresa);

  useEffect(() => {
    const handleUpdate = () => {
      setEmpresa(getEmpresa());
    };

    window.addEventListener(EVENT_EMPRESA_UPDATED, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_EMPRESA_UPDATED, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    empresa,
    atualizar: salvarEmpresa
  };
}

/**
 * Retorna o endereço formatado da Empresa para impressões, romaneios e relatórios.
 */
export function formatarEnderecoEmpresa(empresa: Empresa): string {
  const partes = [
    empresa.endereco ? `${empresa.endereco}, ${empresa.numero || 'S/N'}` : '',
    empresa.bairro,
    empresa.cidade && empresa.estado ? `${empresa.cidade} - ${empresa.estado}` : empresa.cidade,
    empresa.cep ? `CEP: ${empresa.cep}` : ''
  ].filter(Boolean);

  return partes.join(' • ');
}
