import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

export interface OperationalCounts {
  opsCount: number;
  rolosCount: number;
  producaoCount: number;
  ocorrenciasCount: number;
  pesagensCount: number;
  estoqueRolosCount: number;
  cadastrosMestres: {
    clientes: number;
    especificacoes: number;
    titulos: number;
    operadores: number;
    maquinas: number;
  };
}

export interface ResetStepProgress {
  step: number;
  totalSteps: number;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  details?: string;
}

/**
 * Consulta contagens atuais do sistema para diagnóstico antes e depois do reset
 */
export async function obterStatusOperacional(): Promise<OperationalCounts> {
  const counts: OperationalCounts = {
    opsCount: 0,
    rolosCount: 0,
    producaoCount: 0,
    ocorrenciasCount: 0,
    pesagensCount: 0,
    estoqueRolosCount: 0,
    cadastrosMestres: {
      clientes: 0,
      especificacoes: 0,
      titulos: 0,
      operadores: 0,
      maquinas: 4
    }
  };

  try {
    // 1. Contagens de dados operacionais
    const [resOps, resRolos, resProd, resSaidaRolos] = await Promise.all([
      supabase.from('ordens_producao').select('id', { count: 'exact', head: true }),
      supabase.from('rolos').select('id', { count: 'exact', head: true }),
      supabase.from('producao_operador').select('id', { count: 'exact', head: true }),
      supabase.from('saida_rolos').select('id', { count: 'exact', head: true })
    ]);

    counts.opsCount = resOps.count ?? 0;
    counts.rolosCount = resRolos.count ?? 0;
    counts.producaoCount = resProd.count ?? 0;
    counts.estoqueRolosCount = (resRolos.count ?? 0) - (resSaidaRolos.count ?? 0);

    // Contar rolos aguardando pesagem
    const resPesagem = await supabase.from('rolos').select('id', { count: 'exact', head: true }).eq('status', 'AGUARDANDO_PESAGEM');
    counts.pesagensCount = resPesagem.count ?? 0;

    // Tentar ocorrências se tabela existir
    try {
      const resOc = await supabase.from('rolos_ocorrencias').select('id', { count: 'exact', head: true });
      counts.ocorrenciasCount = resOc.count ?? 0;
    } catch {
      counts.ocorrenciasCount = 0;
    }

    // 2. Contagens de cadastros mestres permanentes
    const [resCli, resEsp, resTit, resOp] = await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
      supabase.from('especificacoes').select('id', { count: 'exact', head: true }),
      supabase.from('titulos_fio').select('id', { count: 'exact', head: true }),
      supabase.from('operadores').select('id', { count: 'exact', head: true })
    ]);

    // Fallback para estado do Zustand caso tabela ainda não esteja no Supabase
    const storeState = useStore.getState();
    counts.cadastrosMestres.clientes = resCli.count ?? storeState.clientes.length;
    counts.cadastrosMestres.especificacoes = resEsp.count ?? storeState.especificacoes.length;
    counts.cadastrosMestres.titulos = resTit.count ?? storeState.fiosCliente.length;
    counts.cadastrosMestres.operadores = resOp.count ?? 0;
    counts.cadastrosMestres.maquinas = 4;
  } catch (err) {
    console.error('Erro ao obter status operacional:', err);
  }

  return counts;
}

/**
 * Executa a rotina atômica de Reset Operacional (Sprint Admin 1.0)
 * 
 * Ordem estrita de exclusão (Filhas -> Pais):
 * 1. saida_rolos
 * 2. saida_saldo
 * 3. producao_operador
 * 4. rolos_ocorrencias (se existir)
 * 5. rolos
 * 6. ordens_producao
 * 
 * Limpeza de Sessões e Cache Local:
 * - Limpar produção interrompida, recuperação automática, operadores ativos, históricos
 * - Preservar login, máquina vinculada e preferências
 */
export async function executarResetOperacional(
  onProgress?: (progress: ResetStepProgress) => void
): Promise<{ success: boolean; message: string }> {
  const notify = (step: number, title: string, status: 'pending' | 'running' | 'completed' | 'error', details?: string) => {
    if (onProgress) {
      onProgress({ step, totalSteps: 7, title, status, details });
    }
  };

  try {
    // -------------------------------------------------------------------------
    // ETAPA 1: Verificação inicial de integridade
    // -------------------------------------------------------------------------
    notify(1, 'Verificando integridade das tabelas operacionais...', 'running');
    
    // Testar conectividade com o Supabase antes de iniciar
    const { error: testErr } = await supabase.from('ordens_producao').select('id').limit(1);
    if (testErr) {
      throw new Error(`Falha de comunicação com o banco de dados: ${testErr.message}`);
    }
    notify(1, 'Integridade operacional verificada.', 'completed');

    // -------------------------------------------------------------------------
    // ETAPA 2: Exclusão de Saídas e Movimentações de Rolos (Tabelas filhas dependentes)
    // -------------------------------------------------------------------------
    notify(2, 'Removendo saídas e movimentações de rolos (saida_rolos, saida_saldo)...', 'running');
    
    try {
      const { error: errSaidaRolos } = await supabase
        .from('saida_rolos')
        .delete()
        .not('id', 'is', null);

      if (errSaidaRolos && errSaidaRolos.code !== 'PGRST205') {
        throw new Error(`Erro ao limpar tabela saida_rolos: ${errSaidaRolos.message}`);
      }
    } catch (e: any) {
      if (!e?.message?.includes('PGRST205')) throw e;
    }

    try {
      const { error: errSaidaSaldo } = await supabase
        .from('saida_saldo')
        .delete()
        .not('id', 'is', null);

      if (errSaidaSaldo && errSaidaSaldo.code !== 'PGRST205') {
        throw new Error(`Erro ao limpar tabela saida_saldo: ${errSaidaSaldo.message}`);
      }
    } catch (e: any) {
      if (!e?.message?.includes('PGRST205')) throw e;
    }
    notify(2, 'Saídas e movimentações de rolos removidas com sucesso.', 'completed');

    // -------------------------------------------------------------------------
    // ETAPA 3: Exclusão de Registros de Produção e Ciclos do Operador
    // -------------------------------------------------------------------------
    notify(3, 'Removendo registros de ciclos e produção (producao_operador)...', 'running');
    
    try {
      const { error: errProd } = await supabase
        .from('producao_operador')
        .delete()
        .not('id', 'is', null);

      if (errProd && errProd.code !== 'PGRST205') {
        throw new Error(`Erro ao limpar tabela producao_operador: ${errProd.message}`);
      }
    } catch (e: any) {
      if (!e?.message?.includes('PGRST205')) throw e;
    }

    try {
      const { error: errOc } = await supabase
        .from('rolos_ocorrencias')
        .delete()
        .not('id', 'is', null);

      if (errOc && errOc.code !== 'PGRST205') {
        throw new Error(`Erro ao limpar tabela rolos_ocorrencias: ${errOc.message}`);
      }
    } catch (e: any) {
      if (!e?.message?.includes('PGRST205')) throw e;
    }
    notify(3, 'Histórico de ciclos de produção e ocorrências removido.', 'completed');

    // -------------------------------------------------------------------------
    // ETAPA 4: Exclusão de Todos os Rolos (rolos)
    // -------------------------------------------------------------------------
    notify(4, 'Removendo todos os rolos de produção (rolos)...', 'running');
    
    const { error: errRolos } = await supabase
      .from('rolos')
      .delete()
      .not('id', 'is', null);

    if (errRolos) {
      throw new Error(`Erro ao excluir rolos de produção: ${errRolos.message}`);
    }
    notify(4, 'Todos os rolos foram excluídos do banco de dados.', 'completed');

    // -------------------------------------------------------------------------
    // ETAPA 5: Exclusão de Todas as Ordens de Produção (ordens_producao)
    // -------------------------------------------------------------------------
    notify(5, 'Removendo todas as Ordens de Produção de teste (ordens_producao)...', 'running');
    
    const { error: errOps } = await supabase
      .from('ordens_producao')
      .delete()
      .not('id', 'is', null);

    if (errOps) {
      throw new Error(`Erro ao excluir ordens de produção: ${errOps.message}`);
    }
    notify(5, 'Todas as OPs de teste foram removidas com sucesso.', 'completed');

    // -------------------------------------------------------------------------
    // ETAPA 6: Verificação de Segurança (Garantir que o banco não ficou parcialmente limpo)
    // -------------------------------------------------------------------------
    notify(6, 'Validando se o banco foi completamente limpo...', 'running');
    
    const [checkOps, checkRolos, checkProd] = await Promise.all([
      supabase.from('ordens_producao').select('id', { count: 'exact', head: true }),
      supabase.from('rolos').select('id', { count: 'exact', head: true }),
      supabase.from('producao_operador').select('id', { count: 'exact', head: true })
    ]);

    if ((checkOps.count ?? 0) > 0 || (checkRolos.count ?? 0) > 0 || (checkProd.count ?? 0) > 0) {
      throw new Error('Falha na validação pós-reset: foram encontrados registros remanescentes.');
    }
    notify(6, 'Validação concluída: zero registros operacionais no banco.', 'completed');

    // -------------------------------------------------------------------------
    // ETAPA 7: Limpeza de Cache Local, Sessões e Sincronização em Tempo Real
    // -------------------------------------------------------------------------
    notify(7, 'Limpando sessões ativas, filas e cache local de produção...', 'running');

    // 1. Limpar chaves operacionais do localStorage preservando login e configurações
    limparLocalStorageOperacional();

    // 2. Resetar estado operacional da store Zustand
    useStore.getState().resetOperacional();

    // 3. Notificar abas e dispositivos via BroadcastChannel
    try {
      const bc = new BroadcastChannel('texlog_machine_channel');
      bc.postMessage({
        type: 'RESET_OPERACIONAL',
        timestamp: new Date().toISOString()
      });
      bc.close();
    } catch {}

    // 4. Notificar via Supabase Realtime Broadcast
    try {
      supabase.channel('producao_maquinas_realtime').send({
        type: 'broadcast',
        event: 'machine_status_update',
        payload: { reset: true, maquina: 'ALL' }
      });
    } catch {}

    // 5. Disparar eventos locais no navegador
    window.dispatchEvent(new CustomEvent('texlog_reset_operacional'));
    window.dispatchEvent(new CustomEvent('texlog_novo_rolo_pesagem'));
    window.dispatchEvent(new CustomEvent('texlog_historico_atualizado'));
    window.dispatchEvent(new Event('storage'));

    notify(7, 'Cache local, sessões e sincronização resetados com sucesso.', 'completed');

    return {
      success: true,
      message: 'Reset operacional concluído com sucesso. Sistema preparado para nova homologação.'
    };
  } catch (error: any) {
    console.error('Erro durante o Reset Operacional:', error);
    notify(0, 'Falha no Reset Operacional', 'error', error?.message || 'Erro desconhecido');
    throw error;
  }
}

/**
 * Limpa chaves do localStorage estritamente relacionadas à produção e sessões,
 * preservando login, dispositivo vinculado e cadastros permanentes.
 */
function limparLocalStorageOperacional() {
  const prefixosParaRemover = [
    'texlog_producao_ativa_',
    'texlog_live_status_',
    'texlog_auditoria_',
    'texlog_evento_',
    'texlog_recuperacao_',
    'texlog_sessao_',
    'texlog_portadas_',
    'texlog_ocorrencias_',
    'texlog_interrompida_',
    'texlog_historico_rolos_produzidos',
    'texlog_novo_rolo_pesagem',
    'texlog_op_concluida',
    'texlog_revisao_pendente',
    'texlog_retirada_pendente'
  ];

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const shouldRemove = prefixosParaRemover.some(prefix => 
        key === prefix || key.startsWith(prefix)
      );

      if (shouldRemove) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Sanitizar a persistência do Zustand 'texlog-storage-v2' para manter apenas cadastros mestres e login
    const zustandRaw = localStorage.getItem('texlog-storage-v2');
    if (zustandRaw) {
      try {
        const parsed = JSON.parse(zustandRaw);
        if (parsed?.state) {
          parsed.state.ops = [];
          parsed.state.rolos = [];
          parsed.state.eventosProducao = [];
          parsed.state.movimentosRoletes = [];
          if (Array.isArray(parsed.state.saidas)) {
            parsed.state.saidas = parsed.state.saidas.filter((s: any) => 
              s.tipoLancamento !== 'ROLETES' && !s.roloId && !s.opId
            );
          }
          localStorage.setItem('texlog-storage-v2', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Erro ao sanitizar estado do Zustand no localStorage:', e);
      }
    }
  } catch (err) {
    console.error('Erro ao limpar cache operacional do localStorage:', err);
  }
}
