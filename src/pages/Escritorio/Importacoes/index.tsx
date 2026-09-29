import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Sparkles, 
  Building2, 
  RefreshCw, 
  Eye, 
  Download, 
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  ChevronRight,
  Database,
  Layers,
  Copy,
  Clock,
  Calendar,
  AlertCircle,
  FolderArchive,
  Brain,
  ListOrdered,
  Plus,
  Trash2,
  HelpCircle,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  BookmarkPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { 
  analisarPlanilha, 
  ResultadoLeituraPlanilha, 
  RegistroPlanilhaLido,
  getHistoricoImportacoes,
  salvarNoHistorico,
  atualizarStatusHistorico,
  HistoricoImportacao,
  gerarPlanilhaAmostra,
  compararComSistema,
  DiagnosticoComparacaoSistema,
  TipoLayout,
  StatusImportacao,
  RegraAprendizado,
  getRegrasAprendizado,
  salvarRegraAprendizado,
  removerRegraAprendizado,
  ItemFilaImportacao,
  getFilaImportacao,
  salvarItemFilaImportacao,
  atualizarStatusFila,
  removerItemFila,
  calcularIndiceConfiabilidade
} from '../../../services/planilhaReaderService';

// Tipagem das etapas do Wizard
type WizardStep = 1 | 2 | 3 | 4 | 5;

const WIZARD_STEPS = [
  { id: 1, label: 'Selecionar Arquivo', short: 'Arquivo' },
  { id: 2, label: 'Leitura', short: 'Leitura' },
  { id: 3, label: 'Validação', short: 'Validação' },
  { id: 4, label: 'Homologação', short: 'Homologação' },
  { id: 5, label: 'Fila de Importação', short: 'Fila' }
];

export default function ImportacoesEscritorio() {
  const { user } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navegação Principal: Leitor | Fila de Importação | Central de Importações
  const [activeTab, setActiveTab] = useState<'LEITOR' | 'FILA' | 'HISTORICO'>('LEITOR');
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Estados de Upload & Processamento
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Resultado da Leitura Atual
  const [resultadoAtual, setResultadoAtual] = useState<ResultadoLeituraPlanilha | null>(null);
  const [observacoesImportacao, setObservacoesImportacao] = useState('');

  // Filtros da Tabela de Validação (Todos, Válidos, Pendentes, Inconsistências)
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'VALIDOS' | 'PENDENTES' | 'INCONSISTENCIAS'>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Comparar com Sistema (Diagnóstico)
  const [isCompararModalOpen, setIsCompararModalOpen] = useState(false);
  const [isComparando, setIsComparando] = useState(false);
  const [diagnosticoSistema, setDiagnosticoSistema] = useState<DiagnosticoComparacaoSistema | null>(null);

  // Central de Importações (Histórico)
  const [historico, setHistorico] = useState<HistoricoImportacao[]>([]);
  const [filtroStatusHistorico, setFiltroStatusHistorico] = useState<StatusImportacao | 'TODOS'>('TODOS');

  // Fila de Importação
  const [filaImportacao, setFilaImportacao] = useState<ItemFilaImportacao[]>([]);

  // Aprendizado do Leitor
  const [regrasAprendizado, setRegrasAprendizado] = useState<RegraAprendizado[]>([]);
  const [isModalAprendizadoOpen, setIsModalAprendizadoOpen] = useState(false);
  const [isModalEnsinarLinhaOpen, setIsModalEnsinarLinhaOpen] = useState(false);
  const [linhaParaEnsinar, setLinhaParaEnsinar] = useState<RegistroPlanilhaLido | null>(null);
  const [termoAssociadoInput, setTermoAssociadoInput] = useState('');
  const [tipoFioAssociadoInput, setTipoFioAssociadoInput] = useState('Poliéster');
  const [memorizarAssociacao, setMemorizarAssociacao] = useState(true);

  // Modal de Homologação de Layout Desconhecido
  const [isModalLayoutDesconhecidoOpen, setIsModalLayoutDesconhecidoOpen] = useState(false);

  // Carregar dados de persistência local
  const recarregarTudo = () => {
    setHistorico(getHistoricoImportacoes());
    setFilaImportacao(getFilaImportacao());
    setRegrasAprendizado(getRegrasAprendizado());
  };

  useEffect(() => {
    recarregarTudo();
    const handleHistUpdate = () => setHistorico(getHistoricoImportacoes());
    const handleFilaUpdate = () => setFilaImportacao(getFilaImportacao());
    const handleAprendizadoUpdate = () => setRegrasAprendizado(getRegrasAprendizado());

    window.addEventListener('texlog_importacao_salva', handleHistUpdate);
    window.addEventListener('texlog_fila_atualizada', handleFilaUpdate);
    window.addEventListener('texlog_aprendizado_atualizado', handleAprendizadoUpdate);

    return () => {
      window.removeEventListener('texlog_importacao_salva', handleHistUpdate);
      window.removeEventListener('texlog_fila_atualizada', handleFilaUpdate);
      window.removeEventListener('texlog_aprendizado_atualizado', handleAprendizadoUpdate);
    };
  }, []);

  // Processar arquivo selecionado
  const processarArquivo = async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error('Formato não suportado. Por favor, envie arquivos XLSX, XLS ou CSV.');
      return;
    }

    try {
      setIsProcessing(true);
      const resultado = await analisarPlanilha(file, file.name);
      setResultadoAtual(resultado);
      setObservacoesImportacao('');
      setFiltroStatus('TODOS');
      setBuscaTexto('');

      // Salva no histórico inicial com status 'Lida'
      salvarNoHistorico(
        resultado, 
        'Lida', 
        user?.role || 'Escritório',
        ''
      );

      // Avança diretamente para o Passo 2: Leitura / Layout Detectado
      setCurrentStep(2);
      toast.success(`Arquivo lido! Confiabilidade: ${resultado.indiceConfiabilidade}%`);
    } catch (err: any) {
      console.error('Erro na análise da planilha:', err);
      toast.error('Falha ao ler planilha: ' + (err.message || 'Arquivo corrompido ou ilegível'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processarArquivo(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  // Carregar Planilha de Amostra de Teste
  const handleCarregarAmostra = async (tipo: 'ALAMO' | 'BAT' | 'RB_SOUZA' | 'DESCONHECIDO') => {
    try {
      setIsProcessing(true);
      const amostra = gerarPlanilhaAmostra(tipo);
      const resultado = await analisarPlanilha(amostra.buffer, amostra.nomeArquivo);
      setResultadoAtual(resultado);
      setObservacoesImportacao('');
      setFiltroStatus('TODOS');
      setBuscaTexto('');

      salvarNoHistorico(
        resultado, 
        'Lida', 
        user?.role || 'Escritório',
        ''
      );

      // Avança para o Passo 2: Leitura / Layout Detectado
      setCurrentStep(2);
      toast.success(`Amostra "${amostra.nomeArquivo}" carregada!`);
    } catch (err: any) {
      toast.error('Erro ao carregar amostra: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAmostra = (tipo: 'ALAMO' | 'BAT' | 'RB_SOUZA' | 'DESCONHECIDO', e: React.MouseEvent) => {
    e.stopPropagation();
    const amostra = gerarPlanilhaAmostra(tipo);
    const blob = new Blob([amostra.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = amostra.nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Download de ${amostra.nomeArquivo} concluído!`);
  };

  // Executar "Comparar com Sistema"
  const handleExecutarComparacao = async () => {
    if (!resultadoAtual) return;
    try {
      setIsComparando(true);
      const diag = await compararComSistema(resultadoAtual);
      setDiagnosticoSistema(diag);
      setIsCompararModalOpen(true);
    } catch (err: any) {
      toast.error('Erro ao comparar com sistema: ' + err.message);
    } finally {
      setIsComparando(false);
    }
  };

  // Homologar e Enviar para a Fila de Importação (Passo 4 -> Passo 5)
  const handleHomologarParaFila = () => {
    if (!resultadoAtual) return;

    // Salva na Central de Importações como 'Homologada'
    salvarNoHistorico(
      resultadoAtual,
      'Homologada',
      user?.role || 'Escritório',
      observacoesImportacao
    );

    // Salva na Fila de Importação
    salvarItemFilaImportacao({
      id: resultadoAtual.id,
      nomeArquivo: resultadoAtual.nomeArquivo,
      clienteNome: resultadoAtual.clienteGeralIdentificado,
      layoutDetectado: resultadoAtual.layoutDetectado,
      layoutNome: resultadoAtual.layoutNome,
      totalRegistros: resultadoAtual.totalLinhasLidas,
      totalCaixas: resultadoAtual.totalCaixas,
      totalPesoKg: resultadoAtual.totalPesoKg,
      indiceConfiabilidade: resultadoAtual.indiceConfiabilidade,
      status: 'Homologada',
      dataLeitura: new Date().toISOString(),
      observacoes: observacoesImportacao,
      resultadoOriginal: resultadoAtual
    });

    toast.success('Planilha homologada e adicionada à Fila de Importação!');
    setCurrentStep(5);
  };

  // Simular Importação na Fila (Modo Preparatório da Sprint 3.3.1)
  const handleSimularImportacaoFila = (item: ItemFilaImportacao) => {
    atualizarStatusFila(item.id, 'Importada');
    atualizarStatusHistorico(item.id, 'Importada');
    toast.success(
      `Status atualizado para "Importada" (Preparatório). Nenhum dado foi inserido no banco de dados.`
    );
  };

  // Abrir modal de ensinar leitor para uma linha específica
  const handleAbrirEnsinarLinha = (reg: RegistroPlanilhaLido) => {
    setLinhaParaEnsinar(reg);
    setTermoAssociadoInput(reg.fioTitulo || reg.fio || '');
    setTipoFioAssociadoInput(reg.fioTipo || reg.tipoFio || 'Poliéster');
    setMemorizarAssociacao(true);
    setIsModalEnsinarLinhaOpen(true);
  };

  // Salvar ensinamento / regra aprendida
  const handleSalvarEnsinamento = () => {
    if (!linhaParaEnsinar || !termoAssociadoInput.trim()) {
      toast.error('Informe o termo canônico correspondente.');
      return;
    }

    const termoOriginal = linhaParaEnsinar.fio;

    if (memorizarAssociacao) {
      salvarRegraAprendizado({
        tipo: 'FIO',
        de: termoOriginal,
        para: termoAssociadoInput.trim(),
        fioId: 37,
        fioTipo: tipoFioAssociadoInput
      });
    }

    // Atualiza imediatamente todas as linhas da planilha que possuam esse mesmo termo original
    if (resultadoAtual) {
      const novosRegistros = resultadoAtual.registros.map(r => {
        if (r.fio === termoOriginal) {
          const novasInc = r.inconsistencias.filter(i => i.tipo !== 'FIO_NAO_ENCONTRADO');
          const temImpeditivo = novasInc.some(i => i.impeditivo);
          return {
            ...r,
            fioTitulo: termoAssociadoInput.trim(),
            fioTipo: tipoFioAssociadoInput,
            fioId: 37,
            fioValido: true,
            fioAprendido: true,
            status: temImpeditivo ? 'INCONSISTENTE' : (novasInc.length > 0 ? 'PENDENTE' : 'VALIDO'),
            acaoSugerida: 'Utilizar cadastro existente.',
            inconsistencias: novasInc
          } as RegistroPlanilhaLido;
        }
        return r;
      });

      const totalValidos = novosRegistros.filter(r => r.status === 'VALIDO').length;
      const totalPendentes = novosRegistros.filter(r => r.status === 'PENDENTE').length;
      const totalComInconsistencias = novosRegistros.filter(r => r.status === 'INCONSISTENTE').length;
      const totalFiosValidos = novosRegistros.filter(r => r.fioValido).length;
      const totalImpeditivos = novosRegistros.reduce((acc, r) => acc + r.inconsistencias.filter(i => i.impeditivo).length, 0);

      const novaConfiabilidade = calcularIndiceConfiabilidade({
        layoutDetectado: resultadoAtual.layoutDetectado,
        layoutConfianca: resultadoAtual.layoutConfianca,
        colunasEncontradas: { nf: true, caixas: true, peso: true, fio: true },
        clienteIdentificado: !!resultadoAtual.clienteGeralIdentificado,
        clienteCadastrado: !!resultadoAtual.clienteGeralId,
        totalLinhas: novosRegistros.length,
        totalFiosValidos,
        totalInconsistenciasImpeditivas: totalImpeditivos
      });

      setResultadoAtual({
        ...resultadoAtual,
        registros: novosRegistros,
        totalValidos,
        totalPendentes,
        totalComInconsistencias,
        totalNovosFios: Math.max(0, resultadoAtual.totalNovosFios - 1),
        indiceConfiabilidade: novaConfiabilidade.indice,
        detalhesConfiabilidade: novaConfiabilidade.detalhes
      });
    }

    setIsModalEnsinarLinhaOpen(false);
    toast.success(`Associação memorizada com sucesso! O leitor reutilizará esta regra.`);
  };

  // Filtragem dos registros da prévia
  const registrosFiltrados = (resultadoAtual?.registros || []).filter(reg => {
    if (filtroStatus === 'VALIDOS' && reg.status !== 'VALIDO') return false;
    if (filtroStatus === 'PENDENTES' && reg.status !== 'PENDENTE') return false;
    if (filtroStatus === 'INCONSISTENCIAS' && reg.status !== 'INCONSISTENTE') return false;

    if (buscaTexto.trim()) {
      const q = buscaTexto.toLowerCase();
      const match = 
        reg.clienteNome.toLowerCase().includes(q) ||
        reg.numeroNf.toLowerCase().includes(q) ||
        reg.fio.toLowerCase().includes(q) ||
        (reg.fioTitulo && reg.fioTitulo.toLowerCase().includes(q)) ||
        (reg.fioTipo && reg.fioTipo.toLowerCase().includes(q)) ||
        reg.cor.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Filtragem do Histórico
  const historicoFiltrado = historico.filter(item => {
    if (filtroStatusHistorico === 'TODOS') return true;
    return item.status === filtroStatusHistorico;
  });

  // Resetar assistente para novo arquivo
  const reiniciarAssistente = () => {
    setResultadoAtual(null);
    setObservacoesImportacao('');
    setCurrentStep(1);
    setDiagnosticoSistema(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Superior com Navegação das 3 Abas Principais e Botão do Aprendizado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Leitor Inteligente de Planilhas
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  Sprint 3.3.1
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Reconhecimento desacoplado, índice de confiabilidade, aprendizado contínuo e fila preparatória
              </p>
            </div>
          </div>
        </div>

        {/* Abas e Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão Dicionário de Aprendizado */}
          <button
            type="button"
            onClick={() => setIsModalAprendizadoOpen(true)}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Brain className="w-4 h-4 text-purple-400" />
            <span>Aprendizado ({regrasAprendizado.length})</span>
          </button>

          {/* Seletor de Abas Principais */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('LEITOR')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'LEITOR'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Assistente</span>
            </button>

            <button
              onClick={() => setActiveTab('FILA')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'FILA'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Fila de Importação</span>
              {filaImportacao.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-white">
                  {filaImportacao.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('HISTORICO')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'HISTORICO'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Central de Importações</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: ASSISTENTE EM ETAPAS (WIZARD 1 A 5)               */}
      {/* ======================================================== */}
      {activeTab === 'LEITOR' && (
        <div className="space-y-6">
          {/* BARRA DO WIZARD: 5 ETAPAS */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between max-w-4xl mx-auto relative">
              <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-neutral-800 -z-0" />
              <div 
                className="absolute top-1/2 left-6 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 -z-0"
                style={{ width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 96}%` }}
              />

              {WIZARD_STEPS.map((step) => {
                const isPassed = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const isClickable = resultadoAtual && step.id <= Math.max(currentStep, 2);

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isClickable && !isCurrent}
                    onClick={() => {
                      if (isClickable) setCurrentStep(step.id as WizardStep);
                    }}
                    className={`relative z-10 flex flex-col items-center group transition-all ${
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div 
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/20 scale-110 shadow-lg shadow-blue-600/30'
                          : isPassed
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-neutral-900 text-neutral-500 border-neutral-700'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <span 
                      className={`text-[11px] font-semibold mt-2 transition-colors hidden sm:block ${
                        isCurrent ? 'text-blue-400 font-bold' : isPassed ? 'text-neutral-300' : 'text-neutral-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span 
                      className={`text-[10px] font-semibold mt-1 transition-colors sm:hidden ${
                        isCurrent ? 'text-blue-400 font-bold' : isPassed ? 'text-neutral-300' : 'text-neutral-500'
                      }`}
                    >
                      {step.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RESUMO EXECUTIVO COM ÍNDICE DE CONFIABILIDADE (PERSISTENTE NAS ETAPAS 3, 4 E 5) */}
          {resultadoAtual && currentStep >= 3 && (
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-4 shadow-md">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                      Resumo Executivo da Planilha
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">
                        {resultadoAtual.clienteGeralIdentificado || 'Multi-cliente'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-blue-400 font-medium border border-neutral-700">
                        {resultadoAtual.layoutNome}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas do Cartão Executivo */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 w-full md:w-auto">
                  {/* Confiabilidade */}
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold mb-0.5">
                      <span>Confiabilidade</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-base font-extrabold font-mono ${
                        resultadoAtual.indiceConfiabilidade >= 90 ? 'text-emerald-400' :
                        resultadoAtual.indiceConfiabilidade >= 75 ? 'text-blue-400' : 'text-amber-400'
                      }`}>
                        {resultadoAtual.indiceConfiabilidade}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full ${
                          resultadoAtual.indiceConfiabilidade >= 90 ? 'bg-emerald-500' :
                          resultadoAtual.indiceConfiabilidade >= 75 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${resultadoAtual.indiceConfiabilidade}%` }}
                      />
                    </div>
                  </div>

                  {/* Registros */}
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Registros</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {resultadoAtual.totalLinhasLidas}
                    </span>
                  </div>

                  {/* Peso Total */}
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Peso Total</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {resultadoAtual.totalPesoKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                    </span>
                  </div>

                  {/* Caixas */}
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Caixas</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {resultadoAtual.totalCaixas} cx
                    </span>
                  </div>

                  {/* Novos Fios */}
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Novos Fios</span>
                    <span className={`text-sm font-bold font-mono ${resultadoAtual.totalNovosFios > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
                      {resultadoAtual.totalNovosFios}
                    </span>
                  </div>

                  {/* Inconsistências */}
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Inconsistências</span>
                    <span className={`text-sm font-bold font-mono ${resultadoAtual.totalComInconsistencias > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {resultadoAtual.totalComInconsistencias}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 1: SELECIONAR ARQUIVO                              */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dropzone de Upload */}
              <div className="lg:col-span-2">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
                      : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />

                  <div className="w-16 h-16 bg-neutral-800/80 rounded-2xl flex items-center justify-center text-blue-400 mb-4 shadow-inner">
                    {isProcessing ? (
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                    ) : (
                      <UploadCloud className="w-8 h-8" />
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1.5">
                    {isProcessing ? 'Lendo e identificando planilha...' : 'Selecione ou arraste a planilha'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-md mb-4">
                    Suporte completo a arquivos <strong className="text-neutral-300">.XLSX, .XLS e .CSV</strong>. Reconhece estrutura de colunas e identifica o cliente correspondente.
                  </p>

                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 bg-neutral-950/70 px-4 py-2 rounded-xl border border-neutral-800">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Etapa 1 de 5: Seleção de Arquivo e Leitura
                  </div>
                </div>
              </div>

              {/* Planilhas de Amostra Reais e Desconhecida */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Amostras de Teste (1 Clique)
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">
                    Carregue uma das amostras para testar o leitor nos layouts conhecidos ou no modo desconhecido:
                  </p>

                  <div className="space-y-2.5">
                    {/* Amostra ALAMO */}
                    <div className="p-2.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl hover:border-neutral-700 transition-colors flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Layout Tecelagem</span>
                        <span className="text-[10px] text-neutral-400">Cliente ALAMO • NF, Artigo, Lote, Caixas, Peso</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCarregarAmostra('ALAMO')}
                          disabled={isProcessing}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Testar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadAmostra('ALAMO', e)}
                          className="p-1 text-neutral-500 hover:text-neutral-300 rounded"
                          title="Baixar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Amostra BAT */}
                    <div className="p-2.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl hover:border-neutral-700 transition-colors flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Layout Remessa Industrial</span>
                        <span className="text-[10px] text-neutral-400">Cliente BAT • Emissão, Produto, Peso Líquido</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCarregarAmostra('BAT')}
                          disabled={isProcessing}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Testar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadAmostra('BAT', e)}
                          className="p-1 text-neutral-500 hover:text-neutral-300 rounded"
                          title="Baixar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Amostra RB SOUZA */}
                    <div className="p-2.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl hover:border-neutral-700 transition-colors flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Layout Entrada Matéria-Prima</span>
                        <span className="text-[10px] text-neutral-400">Cliente RB SOUZA • Fio/Título, Tipo, Obs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCarregarAmostra('RB_SOUZA')}
                          disabled={isProcessing}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Testar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadAmostra('RB_SOUZA', e)}
                          className="p-1 text-neutral-500 hover:text-neutral-300 rounded"
                          title="Baixar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Amostra Layout Desconhecido (Requisito 5) */}
                    <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-colors flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-300 block">Layout Desconhecido</span>
                        <span className="text-[10px] text-neutral-400">Estrutura não catalogada • Leitura genérica</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCarregarAmostra('DESCONHECIDO')}
                          disabled={isProcessing}
                          className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Testar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadAmostra('DESCONHECIDO', e)}
                          className="p-1 text-neutral-500 hover:text-neutral-300 rounded"
                          title="Baixar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Nenhum dado é gravado no banco nesta Sprint.</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 2: LEITURA / LAYOUT DETECTADO (SIMPLIFICADA)       */}
          {/* ======================================================== */}
          {currentStep === 2 && resultadoAtual && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl space-y-6">
                <div className="text-center space-y-2 border-b border-neutral-800 pb-6">
                  <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                    Etapa 2: Diagnóstico Inicial da Leitura
                  </span>
                  <h2 className="text-xl font-bold text-white font-mono">
                    {resultadoAtual.nomeArquivo}
                  </h2>
                </div>

                {/* Banner de Layout Desconhecido (Requisito 5) */}
                {resultadoAtual.layoutDesconhecido && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Layout não reconhecido. Modo de leitura genérica ativado.</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Esta planilha possui colunas diferentes dos layouts homologados (ALAMO, BAT, RB Souza). O sistema ativou o modo genérico para não bloquear sua leitura.
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsModalLayoutDesconhecidoOpen(true)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Sugerir homologação deste novo layout
                      </button>
                    </div>
                  </div>
                )}

                {/* Cartão Sintético Simplificado */}
                <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-6 space-y-4">
                  {/* Confiabilidade da Leitura (Requisito 3) */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-neutral-300 font-medium">Confiabilidade da leitura:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-extrabold font-mono ${
                        resultadoAtual.indiceConfiabilidade >= 90 ? 'text-emerald-400' :
                        resultadoAtual.indiceConfiabilidade >= 75 ? 'text-blue-400' : 'text-amber-400'
                      }`}>
                        {resultadoAtual.indiceConfiabilidade}%
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        ({resultadoAtual.detalhesConfiabilidade.nivel})
                      </span>
                    </div>
                  </div>

                  {/* Layout Reconhecido */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
                    <span className="text-xs text-neutral-400 font-medium">Layout detectado:</span>
                    <div className="flex items-center gap-2">
                      {resultadoAtual.layoutDesconhecido ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-sm font-bold text-white">
                        {resultadoAtual.layoutNome}
                      </span>
                    </div>
                  </div>

                  {/* Cliente Localizado */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
                    <span className="text-xs text-neutral-400 font-medium">Cliente identificado:</span>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-bold text-white">
                        {resultadoAtual.clienteGeralIdentificado || 'Multi-cliente'}
                      </span>
                    </div>
                  </div>

                  {/* Total de Registros Encontrados */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
                    <span className="text-xs text-neutral-400 font-medium">Registros encontrados:</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {resultadoAtual.totalLinhasLidas} registros encontrados
                    </span>
                  </div>
                </div>

                {/* Botões de Navegação */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={reiniciarAssistente}
                    className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Trocar Arquivo
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
                  >
                    <span>{resultadoAtual.layoutDesconhecido ? 'Continuar com Leitura Genérica' : 'Continuar para Validação'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 3: VALIDAÇÃO (COM AÇÕES SUGERIDAS E APRENDIZADO)   */}
          {/* ======================================================== */}
          {currentStep === 3 && resultadoAtual && (
            <div className="space-y-6">
              {/* Barra de Ações Superiores da Validação */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                  <div className="h-4 w-px bg-neutral-800 mx-1" />
                  <span className="text-xs font-semibold text-neutral-300">
                    Etapa 3 de 5: Validação com Ações Recomendadas
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Botão Comparar com Sistema */}
                  <button
                    type="button"
                    onClick={handleExecutarComparacao}
                    disabled={isComparando}
                    className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    {isComparando ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    <span>Comparar com Sistema</span>
                  </button>

                  {/* Avançar para Homologação */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
                  >
                    <span>Avançar para Homologação</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabela de Registros com Filtros: Todos, Válidos, Pendentes, Inconsistências */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                {/* Barra de Filtros */}
                <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-neutral-950/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setFiltroStatus('TODOS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        filtroStatus === 'TODOS'
                          ? 'bg-neutral-800 text-white border border-neutral-700'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Todos ({resultadoAtual.registros.length})
                    </button>
                    <button
                      onClick={() => setFiltroStatus('VALIDOS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        filtroStatus === 'VALIDOS'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Válidos ({resultadoAtual.totalValidos})
                    </button>
                    <button
                      onClick={() => setFiltroStatus('PENDENTES')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        filtroStatus === 'PENDENTES'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Pendentes ({resultadoAtual.totalPendentes})
                    </button>
                    <button
                      onClick={() => setFiltroStatus('INCONSISTENCIAS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        filtroStatus === 'INCONSISTENCIAS'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Inconsistências ({resultadoAtual.totalComInconsistencias})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Filtrar por NF, fio, cor..."
                      value={buscaTexto}
                      onChange={e => setBuscaTexto(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Tabela de Dados com Ações Sugeridas (Requisito 2) e Aprendizado (Requisito 4) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-neutral-950/60 uppercase text-neutral-400 border-b border-neutral-800 font-semibold tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5 text-center w-12">Linha</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Cliente</th>
                        <th className="px-4 py-3.5">Nota Fiscal</th>
                        <th className="px-4 py-3.5">Data</th>
                        <th className="px-4 py-3.5">Identificação do Fio</th>
                        <th className="px-4 py-3.5">Cor</th>
                        <th className="px-4 py-3.5 text-right">Caixas</th>
                        <th className="px-4 py-3.5 text-right">Peso (kg)</th>
                        <th className="px-4 py-3.5">Ação Sugerida</th>
                        <th className="px-4 py-3.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/80">
                      {registrosFiltrados.map((reg, idx) => (
                        <tr 
                          key={idx}
                          className={`hover:bg-neutral-800/40 transition-colors ${
                            reg.status === 'INCONSISTENTE'
                              ? 'bg-red-500/5'
                              : reg.status === 'PENDENTE'
                                ? 'bg-amber-500/5'
                                : ''
                          }`}
                        >
                          {/* Linha */}
                          <td className="px-4 py-3 font-mono text-center text-neutral-500">
                            {reg.linhaOriginal}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {reg.status === 'VALIDO' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Check className="w-3 h-3" />
                                VÁLIDO
                              </span>
                            ) : reg.status === 'PENDENTE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                PENDENTE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                <XCircle className="w-3 h-3" />
                                INCONSISTENTE
                              </span>
                            )}
                          </td>

                          {/* Cliente */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">{reg.clienteNome}</span>
                              {reg.clienteValido ? (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Supabase OK
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" /> Não cadastrado
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Nota Fiscal */}
                          <td className="px-4 py-3 font-mono font-bold text-blue-400">
                            {reg.numeroNf || <span className="text-red-400 font-normal italic">Ausente</span>}
                          </td>

                          {/* Data */}
                          <td className="px-4 py-3 font-mono text-neutral-400">
                            {reg.dataOriginal || reg.data}
                          </td>

                          {/* Identificação do Fio */}
                          <td className="px-4 py-3">
                            {reg.fioValido ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 w-fit">
                                    ✔ ID {reg.fioId || '37'}
                                  </span>
                                  {reg.fioAprendido && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                      🧠 Aprendido
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-white text-xs">
                                  {reg.fioTitulo || reg.fio}
                                </span>
                                <span className="text-[11px] text-neutral-400">
                                  {reg.fioTipo || reg.tipoFio || 'Poliéster'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 w-fit">
                                  ⚠️ Novo Fio
                                </span>
                                <span className="font-mono font-bold text-white text-xs">
                                  {reg.fio}
                                </span>
                                <span className="text-[11px] text-amber-400/80">
                                  {reg.tipoFio || 'Não catalogado'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Cor */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono uppercase text-[11px]">
                              {reg.cor || '-'}
                            </span>
                          </td>

                          {/* Caixas */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-white">
                            {reg.quantidadeCaixas} cx
                          </td>

                          {/* Peso */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                            {reg.pesoKg.toFixed(2)} kg
                          </td>

                          {/* AÇÃO SUGERIDA (Requisito 2) */}
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                reg.status === 'VALIDO' 
                                  ? 'text-emerald-400' 
                                  : reg.status === 'PENDENTE'
                                    ? 'text-amber-300'
                                    : 'text-red-400'
                              }`}>
                                <Sparkles className="w-3 h-3 shrink-0" />
                                {reg.acaoSugerida}
                              </span>
                              {reg.inconsistencias.length > 0 && (
                                <span className="text-[10px] text-neutral-400 block truncate">
                                  {reg.inconsistencias[0].mensagem}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Ação rápida de ensinar / associar fio */}
                          <td className="px-4 py-3 text-right">
                            {!reg.fioValido || reg.status === 'PENDENTE' ? (
                              <button
                                type="button"
                                onClick={() => handleAbrirEnsinarLinha(reg)}
                                className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1"
                                title="Ensinar associação ao leitor"
                              >
                                <Brain className="w-3 h-3" />
                                <span>Ensinar</span>
                              </button>
                            ) : (
                              <span className="text-neutral-500 text-[10px]">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {registrosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-6 py-8 text-center text-neutral-500">
                            Nenhum registro encontrado para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 4: HOMOLOGAÇÃO & OBSERVAÇÕES                       */}
          {/* ======================================================== */}
          {currentStep === 4 && resultadoAtual && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Homologação da Leitura
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Verifique os dados apurados e envie a planilha para a Fila de Importação.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExecutarComparacao}
                    className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Database className="w-4 h-4" />
                    Comparar com Sistema
                  </button>
                </div>

                {/* Grade de Homologação */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-neutral-950/70 border border-neutral-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold uppercase text-neutral-400 block mb-1">Layout & Cliente</span>
                    <span className="text-sm font-bold text-white block">{resultadoAtual.layoutNome}</span>
                    <span className="text-xs text-blue-400 font-medium">{resultadoAtual.clienteGeralIdentificado}</span>
                  </div>

                  <div className="bg-neutral-950/70 border border-neutral-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold uppercase text-neutral-400 block mb-1">Confiabilidade</span>
                    <span className="text-sm font-bold font-mono text-emerald-400 block">
                      {resultadoAtual.indiceConfiabilidade}%
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {resultadoAtual.detalhesConfiabilidade.descricao}
                    </span>
                  </div>

                  <div className="bg-neutral-950/70 border border-neutral-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold uppercase text-neutral-400 block mb-1">Status das Linhas</span>
                    <span className="text-sm font-bold text-white block">
                      {resultadoAtual.totalLinhasLidas} registros lidos
                    </span>
                    <span className="text-xs text-emerald-400 font-medium">
                      {resultadoAtual.totalValidos} válidos • {resultadoAtual.totalPendentes} pendentes
                    </span>
                  </div>

                  <div className="bg-neutral-950/70 border border-neutral-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold uppercase text-neutral-400 block mb-1">Carga Física</span>
                    <span className="text-sm font-bold font-mono text-white block">{resultadoAtual.totalCaixas} caixas</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {resultadoAtual.totalPesoKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                    </span>
                  </div>
                </div>

                {/* Campo Opcional: Observações da Importação */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Observações da Importação (Opcional)</span>
                    <span className="text-[11px] text-neutral-500 font-normal">Ficará registrado na Central e na Fila</span>
                  </label>
                  <textarea
                    rows={3}
                    value={observacoesImportacao}
                    onChange={(e) => setObservacoesImportacao(e.target.value)}
                    placeholder="Ex: Planilha enviada pelo cliente. Remessa Setembro. Importação parcial."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para Validação
                  </button>

                  <button
                    type="button"
                    onClick={handleHomologarParaFila}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
                  >
                    <span>Homologar e Enviar para Fila de Importação</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 5: FILA DE IMPORTAÇÃO (VISUAL PREPARATÓRIA)         */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-5">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Etapa 5: Fila Visual de Importação
                    </span>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <ListOrdered className="w-5 h-5 text-blue-400" />
                      Planilhas Prontas na Fila de Importação
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Arquivos validados e homologados aguardando a futura rotina de importação definitiva.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={reiniciarAssistente}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ler Outra Planilha</span>
                  </button>
                </div>

                {/* Banner de Conformidade Sprint 3.3.1 */}
                <div className="mt-4 p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Regra da Sprint 3.3.1:</strong> A fila é visual e o status "Importada" é preparatório. Nenhum dado é inserido no Supabase ou no estoque.
                  </span>
                </div>

                {/* Tabela da Fila */}
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-neutral-950/60 uppercase text-neutral-400 border-b border-neutral-800 font-semibold tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5">Nome do Arquivo</th>
                        <th className="px-4 py-3.5">Cliente</th>
                        <th className="px-4 py-3.5">Layout Identificado</th>
                        <th className="px-4 py-3.5 text-center">Qtd Registros</th>
                        <th className="px-4 py-3.5 text-right">Volume</th>
                        <th className="px-4 py-3.5 text-center">Confiabilidade</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Data da Leitura</th>
                        <th className="px-4 py-3.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/80">
                      {filaImportacao.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                          {/* Nome do Arquivo */}
                          <td className="px-4 py-4 font-mono font-bold text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{item.nomeArquivo}</span>
                          </td>

                          {/* Cliente */}
                          <td className="px-4 py-4 font-semibold text-white">
                            {item.clienteNome}
                          </td>

                          {/* Layout */}
                          <td className="px-4 py-4">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-800 text-blue-300 border border-neutral-700">
                              {item.layoutNome}
                            </span>
                          </td>

                          {/* Qtd Registros */}
                          <td className="px-4 py-4 text-center font-mono font-bold text-white">
                            {item.totalRegistros}
                          </td>

                          {/* Volume */}
                          <td className="px-4 py-4 text-right font-mono">
                            <span className="text-white block font-bold">{item.totalCaixas} cx</span>
                            <span className="text-emerald-400 text-[10px] block">{item.totalPesoKg.toFixed(2)} kg</span>
                          </td>

                          {/* Confiabilidade */}
                          <td className="px-4 py-4 text-center font-mono font-bold text-emerald-400">
                            {item.indiceConfiabilidade || 98}%
                          </td>

                          {/* Status da Fila */}
                          <td className="px-4 py-4">
                            {item.status === 'Importada' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                IMPORTADA (PREP.)
                              </span>
                            ) : item.status === 'Homologada' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                HOMOLOGADA
                              </span>
                            ) : item.status === 'Cancelada' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                                CANCELADA
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                LIDA
                              </span>
                            )}
                          </td>

                          {/* Data Leitura */}
                          <td className="px-4 py-4 font-mono text-neutral-400 text-[11px]">
                            {new Date(item.dataLeitura).toLocaleDateString('pt-BR')}
                          </td>

                          {/* Ações */}
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status !== 'Importada' && (
                                <button
                                  type="button"
                                  onClick={() => handleSimularImportacaoFila(item)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                  title="Simular Importação"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Importar</span>
                                </button>
                              )}

                              {item.resultadoOriginal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResultadoAtual(item.resultadoOriginal!);
                                    setObservacoesImportacao(item.observacoes || '');
                                    setCurrentStep(3);
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                  title="Reabrir Validação"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  removerItemFila(item.id);
                                  toast.success('Arquivo removido da fila.');
                                }}
                                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                                title="Remover da Fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filaImportacao.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-6 py-10 text-center text-neutral-500">
                            Nenhum arquivo na fila no momento. Homologue uma planilha na Etapa 4 para vê-la listada aqui.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: VISÃO DEDICADA DA FILA DE IMPORTAÇÃO (REQUISITO 1)*/}
      {/* ======================================================== */}
      {activeTab === 'FILA' && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-blue-400" />
                  Fila Visual de Importação
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Controle de arquivos lidos e homologados aguardando processamento
                </p>
              </div>
              <button
                onClick={() => {
                  reiniciarAssistente();
                  setActiveTab('LEITOR');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Leitura</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950/60 uppercase text-neutral-400 border-b border-neutral-800 font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Nome do Arquivo</th>
                    <th className="px-6 py-3.5">Cliente</th>
                    <th className="px-6 py-3.5">Layout Identificado</th>
                    <th className="px-6 py-3.5 text-center">Quantidade de Registros</th>
                    <th className="px-6 py-3.5 text-center">Confiabilidade</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Data da Leitura</th>
                    <th className="px-6 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {filaImportacao.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{item.nomeArquivo}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {item.clienteNome}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-800 text-blue-300 border border-neutral-700">
                          {item.layoutNome}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-white">
                        {item.totalRegistros}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-400">
                        {item.indiceConfiabilidade || 98}%
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'Importada' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            IMPORTADA
                          </span>
                        ) : item.status === 'Homologada' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            HOMOLOGADA
                          </span>
                        ) : item.status === 'Cancelada' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                            CANCELADA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            LIDA
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-400">
                        {new Date(item.dataLeitura).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status !== 'Importada' && (
                            <button
                              type="button"
                              onClick={() => handleSimularImportacaoFila(item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>Simular Importação</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              removerItemFila(item.id);
                              toast.success('Item removido da fila.');
                            }}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                            title="Remover da fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filaImportacao.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                        Nenhuma planilha na fila de importação.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: CENTRAL DE IMPORTAÇÕES (COM STATUS DA SPRINT 3.3.1) */}
      {/* ======================================================== */}
      {activeTab === 'HISTORICO' && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderArchive className="w-5 h-5 text-blue-400" />
                  Central de Importações
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Auditoria de arquivos, layouts, clientes, confiabilidade e status operacional
                </p>
              </div>

              {/* Filtro por Status: Todos, Lida, Homologada, Importada, Cancelada */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFiltroStatusHistorico('TODOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filtroStatusHistorico === 'TODOS'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Todos ({historico.length})
                </button>
                <button
                  onClick={() => setFiltroStatusHistorico('Lida')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filtroStatusHistorico === 'Lida'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Lida ({historico.filter(h => h.status === 'Lida').length})
                </button>
                <button
                  onClick={() => setFiltroStatusHistorico('Homologada')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filtroStatusHistorico === 'Homologada'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Homologada ({historico.filter(h => h.status === 'Homologada').length})
                </button>
                <button
                  onClick={() => setFiltroStatusHistorico('Importada')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filtroStatusHistorico === 'Importada'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Importada ({historico.filter(h => h.status === 'Importada').length})
                </button>
                <button
                  onClick={() => setFiltroStatusHistorico('Cancelada')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filtroStatusHistorico === 'Cancelada'
                      ? 'bg-neutral-800 text-neutral-300 border border-neutral-600'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Cancelada ({historico.filter(h => h.status === 'Cancelada').length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950/60 uppercase text-neutral-400 border-b border-neutral-800 font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Data / Hora</th>
                    <th className="px-6 py-3.5">Arquivo</th>
                    <th className="px-6 py-3.5">Layout Detectado</th>
                    <th className="px-6 py-3.5">Cliente</th>
                    <th className="px-6 py-3.5 text-center">Registros</th>
                    <th className="px-6 py-3.5 text-right">Caixas</th>
                    <th className="px-6 py-3.5 text-right">Peso (kg)</th>
                    <th className="px-6 py-3.5 text-center">Confiabilidade</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Observações</th>
                    <th className="px-6 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {historicoFiltrado.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-neutral-400">
                        {new Date(item.dataHora).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-bold text-white font-mono flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{item.nomeArquivo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.layoutNome}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {item.clienteNome}
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        <span className="text-white font-bold">{item.totalLinhas}</span>
                        <span className="text-neutral-500 text-[10px] block">
                          ({item.totalValidos} válidos)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-white">
                        {item.totalCaixas} cx
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                        {item.totalPesoKg.toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-400">
                        {item.indiceConfiabilidade || 98}%
                      </td>
                      {/* Status da Central de Importações (Requisito 6) */}
                      <td className="px-6 py-4">
                        {item.status === 'Importada' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            IMPORTADA
                          </span>
                        ) : item.status === 'Homologada' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            HOMOLOGADA
                          </span>
                        ) : item.status === 'Cancelada' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                            CANCELADA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            LIDA
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-neutral-400 max-w-[150px] truncate text-[11px] italic">
                        {item.observacoesImportacao || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.resultadoCompleto && (
                            <button
                              onClick={() => {
                                setResultadoAtual(item.resultadoCompleto!);
                                setObservacoesImportacao(item.observacoesImportacao || '');
                                setCurrentStep(3); // Abre diretamente na validação
                                setActiveTab('LEITOR');
                              }}
                              className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                              title="Reabrir prévia"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Abrir</span>
                            </button>
                          )}

                          {/* Alternar Status rápido */}
                          <button
                            onClick={() => {
                              const novoStatus: StatusImportacao = 
                                item.status === 'Lida' ? 'Homologada' :
                                item.status === 'Homologada' ? 'Importada' :
                                item.status === 'Importada' ? 'Cancelada' : 'Homologada';
                              atualizarStatusHistorico(item.id, novoStatus);
                              toast.success(`Status alterado para "${novoStatus}"`);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg text-xs"
                            title="Avançar status"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {historicoFiltrado.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-neutral-500">
                        Nenhuma leitura registrada para este status na Central de Importações.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: APRENDIZADO DO LEITOR (REGRAS MEMORIZADAS)        */}
      {/* ======================================================== */}
      {isModalAprendizadoOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Aprendizado do Leitor Inteligente</h3>
                  <p className="text-xs text-neutral-400">
                    Associações memorizadas que são aplicadas automaticamente em novas leituras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalAprendizadoOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
                💡 <strong>Como funciona o aprendizado:</strong> Quando você corrige um termo (ex: <code>15048</code> → <code>150/48</code>), o leitor memoriza essa associação e a reutiliza em todas as planilhas futuras sem exigir correção manual novamente.
              </div>

              <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/60">
                {regrasAprendizado.map((regra) => (
                  <div key={regra.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-300 text-xs font-bold">
                          {regra.de}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                          {regra.para}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">
                          ({regra.tipo})
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block">
                        Reutilizado {regra.vezesUsado} vezes em leituras • {regra.fioTipo || 'Poliéster'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        removerRegraAprendizado(regra.id);
                        toast.success('Regra de aprendizado excluída.');
                      }}
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Excluir regra"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {regrasAprendizado.length === 0 && (
                  <div className="p-8 text-center text-neutral-500 text-xs">
                    Nenhuma regra aprendida ainda. Clique em "Ensinar" nas linhas com fios pendentes para cadastrar associações.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                {regrasAprendizado.length} regras ativas no Leitor Inteligente
              </span>
              <button
                type="button"
                onClick={() => setIsModalAprendizadoOpen(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ENSINAR LEITOR (ASSOCIAR LINHA ESPECÍFICA)         */}
      {/* ======================================================== */}
      {isModalEnsinarLinhaOpen && linhaParaEnsinar && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Ensinar Leitor Inteligente</h3>
              </div>
              <button
                onClick={() => setIsModalEnsinarLinhaOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase">Termo lido na planilha:</span>
                <span className="font-mono text-base font-bold text-amber-400 block">
                  {linhaParaEnsinar.fio}
                </span>
                <span className="text-[11px] text-neutral-500">Linha {linhaParaEnsinar.linhaOriginal} • NF {linhaParaEnsinar.numeroNf}</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-white block">
                  Título canônico correspondente (Ex: 150/48):
                </label>
                <input
                  type="text"
                  value={termoAssociadoInput}
                  onChange={(e) => setTermoAssociadoInput(e.target.value)}
                  placeholder="Ex: 150/48"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-white block">
                  Tipo do fio:
                </label>
                <select
                  value={tipoFioAssociadoInput}
                  onChange={(e) => setTipoFioAssociadoInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Poliéster">Poliéster</option>
                  <option value="Algodão">Algodão</option>
                  <option value="Poliamida">Poliamida</option>
                  <option value="Misto">Misto</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="memorizarAssoc"
                  checked={memorizarAssociacao}
                  onChange={(e) => setMemorizarAssociacao(e.target.checked)}
                  className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="memorizarAssoc" className="text-white font-semibold cursor-pointer">
                  Memorizar esta associação para futuras leituras
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalEnsinarLinhaOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEnsinamento}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/30"
              >
                <Check className="w-4 h-4" />
                <span>Salvar e Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUGESTÃO DE HOMOLOGAÇÃO DE LAYOUT DESCONHECIDO    */}
      {/* ======================================================== */}
      {isModalLayoutDesconhecidoOpen && resultadoAtual && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookmarkPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Homologação de Novo Layout</h3>
              </div>
              <button
                onClick={() => setIsModalLayoutDesconhecidoOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-neutral-300">
              <p>
                O arquivo <strong className="text-white font-mono">{resultadoAtual.nomeArquivo}</strong> foi lido através do motor flexível genérico.
              </p>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                  Estrutura detectada para futuro layout:
                </span>
                <div className="font-mono text-xs text-emerald-400">
                  Total de {resultadoAtual.totalLinhasLidas} linhas • {resultadoAtual.totalCaixas} caixas • {resultadoAtual.totalPesoKg} kg
                </div>
                <div className="text-[11px] text-neutral-400">
                  Cliente sugerido: <strong>{resultadoAtual.clienteGeralIdentificado}</strong>
                </div>
              </div>
              <p className="text-[11px] text-neutral-400">
                Esta estrutura foi pré-registrada para que a equipe técnica implemente o layout nativo na próxima atualização de engenharia.
              </p>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsModalLayoutDesconhecidoOpen(false);
                  toast.success('Solicitação de homologação registrada com sucesso!');
                }}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Confirmar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: COMPARAR COM SISTEMA (DIAGNÓSTICO COM AÇÕES)      */}
      {/* ======================================================== */}
      {isCompararModalOpen && diagnosticoSistema && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Cabeçalho do Modal */}
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Comparar com o Sistema</h3>
                  <p className="text-xs text-neutral-400">Diagnóstico cadastral com sugestões de ação automatizadas</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompararModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo com rolagem */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300">
              {/* Status do Diagnóstico Geral */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                diagnosticoSistema.diagnosticoGeral === 'PRONTO_PARA_IMPORTAR'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : diagnosticoSistema.diagnosticoGeral === 'REQUER_ATENCAO'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  {diagnosticoSistema.diagnosticoGeral === 'PRONTO_PARA_IMPORTAR' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <span className="font-bold block text-sm">
                      {diagnosticoSistema.diagnosticoGeral === 'PRONTO_PARA_IMPORTAR'
                        ? 'Diagnóstico: Pronto para Importação Futura'
                        : diagnosticoSistema.diagnosticoGeral === 'REQUER_ATENCAO'
                          ? 'Diagnóstico: Requer Atenção Cadastral'
                          : 'Diagnóstico: Contém Impedimentos / Duplicidades'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      Análise de {diagnosticoSistema.totalLinhasAnalisadas} registros contra a base Supabase
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Verificação de Clientes */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  1. Verificação de Clientes ({diagnosticoSistema.clientesIdentificados.length})
                </h4>
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 divide-y divide-neutral-800/60">
                  {diagnosticoSistema.clientesIdentificados.map((c, i) => (
                    <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <span className="font-semibold text-white block">{c.nome}</span>
                        <span className="text-[10px] text-neutral-400">
                          {c.cadastrado 
                            ? '💡 Ação sugerida: Utilizar cadastro existente.' 
                            : '💡 Ação sugerida: Criar novo cadastro de cliente.'}
                        </span>
                      </div>
                      {c.cadastrado ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                          <Check className="w-3 h-3" /> Cadastrado (ID {c.id})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                          <AlertCircle className="w-3 h-3" /> Não Cadastrado
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Verificação de Fios */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  2. Verificação de Fios ({diagnosticoSistema.fiosIdentificados.length} identificados)
                </h4>
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 divide-y divide-neutral-800/60">
                  {diagnosticoSistema.fiosIdentificados.map((f, i) => (
                    <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <span className="font-mono font-bold text-white block">{f.termoLido}</span>
                        <span className="text-[10px] text-neutral-400">
                          {f.catalogado 
                            ? `💡 Ação sugerida: Utilizar cadastro técnico existente (${f.titulo} - ID ${f.id}).` 
                            : '💡 Ação sugerida: Criar cadastro técnico de fio.'}
                        </span>
                      </div>
                      {f.catalogado ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                          <Check className="w-3 h-3" /> Catalogado (ID {f.id})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Novo Fio
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Duplicidades Internas */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" />
                  3. Duplicidades Internas na Planilha
                </h4>
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
                  {diagnosticoSistema.duplicidadesInternas.length > 0 ? (
                    <div className="space-y-2">
                      {diagnosticoSistema.duplicidadesInternas.map((dup, idx) => (
                        <div key={idx} className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300">
                          <div className="font-bold font-mono">
                            NF {dup.nf} • {dup.fio} • Cor {dup.cor}
                          </div>
                          <span className="text-[11px] block mt-0.5">
                            Detectada nas linhas: <strong>{dup.linhas.join(', ')}</strong>
                          </span>
                          <span className="text-[10px] text-amber-300 block mt-1 font-semibold">
                            💡 Ação sugerida: Ignorar registro duplicado ou revisar na planilha original.
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold py-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Nenhuma duplicidade interna detectada na planilha.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Registros já existentes no banco */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  4. Registros já Existentes no Sistema (NFs)
                </h4>
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
                  {diagnosticoSistema.registrosExistentesNoSistema.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-amber-400 font-semibold block mb-1">
                        Atenção: As seguintes Notas Fiscais já possuem lançamento prévio no estoque:
                      </span>
                      {diagnosticoSistema.registrosExistentesNoSistema.map((reg, idx) => (
                        <div key={idx} className="p-2 bg-neutral-900 rounded border border-neutral-800 font-mono text-[11px] text-neutral-300 flex justify-between items-center">
                          <span>NF: <strong>{reg.nf}</strong> ({reg.fio || 'Fio'})</span>
                          <span className="text-amber-400 font-sans text-[10px]">
                            💡 Ação sugerida: Ignorar registro ou revisar duplicidade.
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold py-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Nenhum registro anterior destas Notas Fiscais no sistema.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                Nenhuma alteração foi realizada no Supabase nesta Sprint.
              </span>
              <button
                type="button"
                onClick={() => setIsCompararModalOpen(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Fechar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
