import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert, 
  Database, 
  Check, 
  X, 
  RefreshCw,
  Layers,
  FileSpreadsheet,
  Users,
  Settings,
  Scale,
  Package,
  Activity,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { 
  obterStatusOperacional, 
  executarResetOperacional, 
  OperationalCounts, 
  ResetStepProgress 
} from '../../services/resetOperacionalService';

export default function ResetOperacional() {
  const user = useStore(state => state.user);
  const navigate = useNavigate();

  // Estados de dados e contagens
  const [counts, setCounts] = useState<OperationalCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  // Estados do Modal de Confirmação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  
  // Estados de Execução do Reset
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ResetStepProgress | null>(null);
  const [resetCompleted, setResetCompleted] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Proteção de Acesso no nível do componente
  const isAdmin = user?.role === 'PROGRAMADOR';

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Acesso restrito a administradores.');
      navigate('/');
      return;
    }
    carregarContagens();
  }, [isAdmin, navigate]);

  const carregarContagens = async () => {
    setIsLoadingCounts(true);
    try {
      const data = await obterStatusOperacional();
      setCounts(data);
    } catch (err) {
      console.error('Erro ao buscar status operacional:', err);
      toast.error('Erro ao obter contagens operacionais');
    } finally {
      setIsLoadingCounts(false);
    }
  };

  const handleOpenModal = () => {
    setConfirmationText('');
    setExecutionError(null);
    setCurrentProgress(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isExecuting) return; // Não fechar durante execução
    setIsModalOpen(false);
    setConfirmationText('');
    setExecutionError(null);
  };

  const handleConfirmReset = async () => {
    if (confirmationText.trim() !== 'RESET') {
      toast.error('Digite a palavra RESET para confirmar.');
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);

    try {
      const resultado = await executarResetOperacional((progress) => {
        setCurrentProgress(progress);
      });

      if (resultado.success) {
        setResetCompleted(true);
        setIsModalOpen(false);
        toast.success(resultado.message, { duration: 5000 });
        await carregarContagens();
      }
    } catch (err: any) {
      console.error('Falha no Reset Operacional:', err);
      const msgErro = err?.message || 'Erro durante a limpeza do banco de dados';
      setExecutionError(msgErro);
      toast.error(`Falha no Reset Operacional: ${msgErro}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-red-500">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-800 text-neutral-400 rounded-md border border-neutral-700">
              Administração
            </span>
            <span className="text-xs text-neutral-500">›</span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-500/10 text-red-400 rounded-md border border-red-500/20">
              Reset Operacional
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mt-2 flex items-center gap-3">
            <RotateCcw className="w-8 h-8 text-red-500" />
            Reset Operacional para Homologação
          </h1>
          <p className="text-neutral-400 mt-1">
            Sprint Admin 1.0 — Prepara o TEXLOG ERP para nova homologação em ambiente real sem perder cadastros mestres.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={carregarContagens}
            disabled={isLoadingCounts || isExecuting}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl border border-neutral-800 transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCounts ? 'animate-spin text-blue-400' : ''}`} />
            Atualizar Diagnóstico
          </button>
          
          <button
            onClick={handleOpenModal}
            disabled={isExecuting}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-red-600/20 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Operacional
          </button>
        </div>
      </div>

      {/* Banner de Sucesso pós-reset */}
      {resetCompleted && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-emerald-200 animate-fade-in shadow-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Reset operacional concluído com sucesso.</h3>
              <p className="text-emerald-300/90 mt-1">
                Sistema preparado para nova homologação em chão de fábrica. Todos os registros de produção de teste foram eliminados com integridade referencial preservada.
              </p>
              
              <div className="mt-4 pt-4 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="w-4 h-4" /> Clientes intactos ({counts?.cadastrosMestres.clientes ?? 0})
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="w-4 h-4" /> Especificações ({counts?.cadastrosMestres.especificacoes ?? 0})
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="w-4 h-4" /> Títulos/Fios ({counts?.cadastrosMestres.titulos ?? 0})
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="w-4 h-4" /> Operadores ({counts?.cadastrosMestres.operadores ?? 0})
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="w-4 h-4" /> Máquinas ({counts?.cadastrosMestres.maquinas ?? 4})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Informativo das Regras do Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Cadastros que NUNCA serão apagados */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              DADOS PRESERVADOS (Cadastro Permanente)
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              100% Intactos
            </span>
          </div>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Estes registros constituem a inteligência permanente do ERP e <strong>nunca</strong> serão afetados pela rotina de reset:
          </p>

          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Users className="w-4 h-4 text-emerald-400" /> Clientes e observações comerciais
              </span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                {counts ? `${counts.cadastrosMestres.clientes} cadastrados` : 'Preservado'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Especificações técnicas
              </span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                {counts ? `${counts.cadastrosMestres.especificacoes} cadastradas` : 'Preservado'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Layers className="w-4 h-4 text-emerald-400" /> Títulos e tipos de fios
              </span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                {counts ? `${counts.cadastrosMestres.titulos} cadastrados` : 'Preservado'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Users className="w-4 h-4 text-emerald-400" /> Operadores de máquina
              </span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                {counts ? `${counts.cadastrosMestres.operadores} operadores` : 'Preservado'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Settings className="w-4 h-4 text-emerald-400" /> Configuração das máquinas e tablets vinculados
              </span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                4 máquinas
              </span>
            </li>
          </ul>
        </div>

        {/* Lado Direito: Dados Operacionais que serão REMOVIDOS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              DADOS QUE SERÃO REMOVIDOS (Limpeza Total)
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
              Eliminação Total
            </span>
          </div>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Elimina todos os registros de teste e devolve o ERP ao estado exato de <strong>"primeiro dia de produção"</strong>:
          </p>

          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <FileSpreadsheet className="w-4 h-4 text-red-400" /> Ordens de Produção (todas as OPs)
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${counts && counts.opsCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 bg-neutral-800'}`}>
                {counts ? `${counts.opsCount} registros` : '...'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Layers className="w-4 h-4 text-red-400" /> Rolos (todos os rolos de teste)
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${counts && counts.rolosCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 bg-neutral-800'}`}>
                {counts ? `${counts.rolosCount} registros` : '...'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Activity className="w-4 h-4 text-red-400" /> Produção e ciclos operacionais
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${counts && counts.producaoCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 bg-neutral-800'}`}>
                {counts ? `${counts.producaoCount} ciclos` : '...'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Scale className="w-4 h-4 text-red-400" /> Fila de Pesagem e Escritório
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${counts && counts.pesagensCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 bg-neutral-800'}`}>
                {counts ? `${counts.pesagensCount} aguardando` : '...'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <History className="w-4 h-4 text-red-400" /> Ocorrências e auditoria operacional
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${counts && counts.ocorrenciasCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 bg-neutral-800'}`}>
                {counts ? `${counts.ocorrenciasCount} ocorrências` : 'Limpar'}
              </span>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
              <span className="flex items-center gap-2.5 text-neutral-300">
                <Package className="w-4 h-4 text-red-400" /> Estoque de produtos acabados
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${counts && counts.estoqueRolosCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 bg-neutral-800'}`}>
                {counts ? `${counts.estoqueRolosCount} rolos em estoque` : 'Limpar'}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Painel de Ação Destacado */}
      <div className="bg-neutral-900 border border-red-950/60 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Pronto para a nova homologação de fábrica?
              </h2>
              <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                Esta ação executará a limpeza atômica em transação respeitando as chaves estrangeiras (filhas → pais) e notificará todos os tablets e telas em tempo real.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenModal}
            disabled={isExecuting}
            className="w-full md:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-600/30 whitespace-nowrap cursor-pointer text-base"
          >
            <RotateCcw className="w-5 h-5" />
            Reset Operacional
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL OFICIAL DE CONFIRMAÇÃO EXIGIDO PELA SPRINT ADMIN 1.0 */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header com Alerta Amarelo/Vermelho */}
            <div className="bg-gradient-to-b from-red-500/20 to-transparent p-6 border-b border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-wide">
                    ATENÇÃO
                  </h3>
                  <p className="text-xs text-red-400 font-medium">
                    Esta operação removerá TODOS os dados operacionais.
                  </p>
                </div>
              </div>
            </div>

            {/* Corpo com a lista exata solicitada na especificação */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Serão preservados */}
                <div className="bg-neutral-950/70 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Serão preservados:
                  </div>
                  <ul className="space-y-1.5 text-neutral-300 font-medium">
                    <li className="flex items-center gap-1.5">✔ Clientes</li>
                    <li className="flex items-center gap-1.5">✔ Especificações</li>
                    <li className="flex items-center gap-1.5">✔ Operadores</li>
                    <li className="flex items-center gap-1.5">✔ Configurações</li>
                  </ul>
                </div>

                {/* Serão removidos */}
                <div className="bg-neutral-950/70 border border-red-500/20 rounded-2xl p-4">
                  <div className="font-bold text-red-400 mb-2 flex items-center gap-1.5">
                    <X className="w-4 h-4" /> Serão removidos:
                  </div>
                  <ul className="space-y-1.5 text-neutral-300">
                    <li>• OPs</li>
                    <li>• Rolos</li>
                    <li>• Produção</li>
                    <li>• Ocorrências</li>
                    <li>• Pesagens</li>
                    <li>• Histórico</li>
                    <li>• Estoque de produtos acabados</li>
                  </ul>
                </div>
              </div>

              {/* Pergunta oficial */}
              <div className="text-center font-bold text-base text-neutral-200">
                Deseja continuar?
              </div>

              {/* Instrução de Confirmação Obrigatória */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <div className="text-xs text-neutral-400 text-center">
                  Para confirmar com segurança, digite <strong className="text-white bg-neutral-800 px-2 py-0.5 rounded font-mono">RESET</strong> abaixo:
                </div>
                
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                  disabled={isExecuting}
                  placeholder="Digite RESET"
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl py-3 px-4 text-center font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Progresso de Execução caso esteja rodando */}
              {isExecuting && currentProgress && (
                <div className="bg-neutral-950 border border-blue-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-neutral-400">
                    <span className="font-semibold text-blue-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Etapa {currentProgress.step} de {currentProgress.totalSteps}
                    </span>
                    <span>{Math.round((currentProgress.step / currentProgress.totalSteps) * 100)}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-2 transition-all duration-300"
                      style={{ width: `${(currentProgress.step / currentProgress.totalSteps) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-neutral-300 font-medium truncate">
                    {currentProgress.title}
                  </div>
                </div>
              )}

              {/* Mensagem de Erro de Execução se houver */}
              {executionError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  <strong>Erro:</strong> {executionError}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={isExecuting}
                className="px-5 py-3 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmReset}
                disabled={confirmationText.trim() !== 'RESET' || isExecuting}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executando Limpeza...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    CONFIRMAR RESET
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
