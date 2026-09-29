import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Cpu, 
  Truck, 
  DollarSign, 
  Settings, 
  ArrowRight, 
  Clock, 
  Scale, 
  Package, 
  FileText, 
  Receipt, 
  CheckCircle2, 
  Building2,
  ChevronRight,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ProducaoModule } from './modules/ProducaoModule';
import { ExpedicaoModule } from './modules/ExpedicaoModule';
import { FinanceiroModule } from './modules/FinanceiroModule';
import { ConfiguracoesModule } from './modules/ConfiguracoesModule';
import { ResumoExpedicaoFaturamento } from './ModalFaturamento';
import { buscarRolosEmEstoque } from '../../services/roloOficialService';

export type ModuloEscritorio = 'PRODUCAO' | 'EXPEDICAO' | 'FINANCEIRO' | 'CONFIGURACOES';

export default function DashboardEscritorio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { rolos, ops } = useStore();

  // Mapear parâmetros da URL
  const paramModulo = (searchParams.get('modulo') || '').toUpperCase() as ModuloEscritorio;
  const paramSub = searchParams.get('sub') || '';

  const [activeModulo, setActiveModulo] = useState<ModuloEscritorio>(() => {
    if (['PRODUCAO', 'EXPEDICAO', 'FINANCEIRO', 'CONFIGURACOES'].includes(paramModulo)) {
      return paramModulo;
    }
    return 'EXPEDICAO'; // Expedição é o módulo principal operacional do Escritório
  });

  const [activeSub, setActiveSub] = useState<string>(() => {
    if (paramSub) return paramSub;
    if (paramModulo === 'PRODUCAO') return 'painel-maquinas';
    if (paramModulo === 'FINANCEIRO') return 'faturamentos';
    if (paramModulo === 'CONFIGURACOES') return 'empresa';
    return 'estoque-rolos'; // Padrão da Expedição
  });

  // Expedição sendo faturada diretamente após pergunta "Deseja faturar esta expedição?"
  const [expedicaoFaturandoDireto, setExpedicaoFaturandoDireto] = useState<ResumoExpedicaoFaturamento | null>(null);

  // Contadores para badges e KPIs em tempo real
  const [rolosAguardandoPesagemCount, setRolosAguardandoPesagemCount] = useState<number>(0);
  const [rolosEmEstoqueCount, setRolosEmEstoqueCount] = useState<number>(0);
  const [romaneiosPendentesCount, setRomaneiosPendentesCount] = useState<number>(0);

  const atualizarContadores = () => {
    // 1. Rolos aguardando pesagem
    let countPesagem = rolos.filter(r => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM').length;
    try {
      const raw = localStorage.getItem('texlog_historico_rolos_produzidos');
      if (raw) {
        const list = JSON.parse(raw);
        countPesagem = list.filter((r: any) => (r.status || '').toUpperCase() === 'AGUARDANDO_PESAGEM').length;
      }
    } catch {}
    setRolosAguardandoPesagemCount(countPesagem);

    // 2. Rolos em estoque
    const estoque = buscarRolosEmEstoque();
    setRolosEmEstoqueCount(estoque.length);

    // 3. Romaneios pendentes
    try {
      const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
      if (rawRom) {
        const listRom = JSON.parse(rawRom);
        const pendentes = listRom.filter((r: any) => r.status === 'PENDENTE_FATURAMENTO' || !r.status);
        setRomaneiosPendentesCount(pendentes.length);
      }
    } catch {}
  };

  useEffect(() => {
    atualizarContadores();
    const handleRecarregar = () => atualizarContadores();
    window.addEventListener('texlog_rolo_pesado', handleRecarregar);
    window.addEventListener('texlog_novo_rolo_pesagem', handleRecarregar);
    window.addEventListener('texlog_saida_updated', handleRecarregar);
    window.addEventListener('texlog_faturamento_updated', handleRecarregar);
    window.addEventListener('storage', handleRecarregar);
    const interval = setInterval(atualizarContadores, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('texlog_rolo_pesado', handleRecarregar);
      window.removeEventListener('texlog_novo_rolo_pesagem', handleRecarregar);
      window.removeEventListener('texlog_saida_updated', handleRecarregar);
      window.removeEventListener('texlog_faturamento_updated', handleRecarregar);
      window.removeEventListener('storage', handleRecarregar);
    };
  }, [rolos]);

  // Sincronizar estado com a URL quando muda externamente
  useEffect(() => {
    if (paramModulo && ['PRODUCAO', 'EXPEDICAO', 'FINANCEIRO', 'CONFIGURACOES'].includes(paramModulo)) {
      if (paramModulo !== activeModulo) {
        setActiveModulo(paramModulo);
      }
    }
    if (paramSub && paramSub !== activeSub) {
      setActiveSub(paramSub);
    }
  }, [paramModulo, paramSub]);

  // Navegar entre Módulos
  const handleSelecionarModulo = (mod: ModuloEscritorio) => {
    setActiveModulo(mod);
    let defaultSub = 'painel-maquinas';
    if (mod === 'EXPEDICAO') defaultSub = 'estoque-rolos';
    if (mod === 'FINANCEIRO') defaultSub = 'faturamentos';
    if (mod === 'CONFIGURACOES') defaultSub = 'empresa';
    
    setActiveSub(defaultSub);
    setSearchParams({ modulo: mod.toLowerCase(), sub: defaultSub });
  };

  // Navegar entre Submenus
  const handleNavigateSub = (sub: string) => {
    setActiveSub(sub);
    setSearchParams({ modulo: activeModulo.toLowerCase(), sub });
  };

  // Transição do módulo de Produção para Pesagem na Expedição
  const handleIrParaPesagem = () => {
    setActiveModulo('EXPEDICAO');
    setActiveSub('pesagem');
    setSearchParams({ modulo: 'expedicao', sub: 'pesagem' });
  };

  // Transição da Expedição (Romaneio gerado e usuário respondeu SIM) para Faturamento
  const handleAbrirFaturamentoDireto = (expedicao: ResumoExpedicaoFaturamento) => {
    setExpedicaoFaturandoDireto(expedicao);
    setActiveModulo('FINANCEIRO');
    setActiveSub('faturamentos');
    setSearchParams({ modulo: 'financeiro', sub: 'faturamentos' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* CABEÇALHO ESCRITÓRIO 3.0: 4 GRANDES PROCESSOS ADMINISTRATIVOS DA RB SOUZA */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
            <span>TEXLOG ERP</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-white">Módulo Escritório 3.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Gestão Operacional & Administrativa
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl">
            Estrutura baseada nos quatro grandes processos da empresa: Produção, Expedição, Faturamento e Configurações.
          </p>
        </div>

        {/* Resumo Rápido de Status */}
        <div className="flex flex-wrap items-center gap-2">
          {rolosAguardandoPesagemCount > 0 && (
            <button
              onClick={() => {
                setActiveModulo('EXPEDICAO');
                handleNavigateSub('pesagem');
              }}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm animate-pulse"
            >
              <Scale className="w-4 h-4" />
              <span>{rolosAguardandoPesagemCount} rolo(s) aguardando pesagem</span>
            </button>
          )}

          {romaneiosPendentesCount > 0 && (
            <button
              onClick={() => {
                setActiveModulo('FINANCEIRO');
                handleNavigateSub('faturamentos');
              }}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              <span>{romaneiosPendentesCount} romaneio(s) a faturar</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 GRANDES GRUPOS PRINCIPAIS COM IDENTIDADE VISUAL PADRONIZADA              */}
      {/* 1️⃣ PRODUÇÃO (🔵 Azul)                                                     */}
      {/* 2️⃣ EXPEDIÇÃO (🟢 Verde)                                                    */}
      {/* 3️⃣ FATURAMENTO / FINANCEIRO (🟣 Roxo)                                     */}
      {/* 4️⃣ CONFIGURAÇÕES (⚙ Cinza)                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* 1️⃣ PRODUÇÃO (🔵 Azul) */}
        <button
          onClick={() => handleSelecionarModulo('PRODUCAO')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeModulo === 'PRODUCAO'
              ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/15 ring-1 ring-blue-500/50'
              : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              activeModulo === 'PRODUCAO' ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              1. ACOMPANHAMENTO
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Produção</span>
              <span className="text-blue-400 text-xs font-mono">🔵</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
              Máquinas, OPs, retiradas, pesagens e ocorrências
            </p>
          </div>
        </button>

        {/* 2️⃣ EXPEDIÇÃO (🟢 Verde) - Principal Módulo Operacional */}
        <button
          onClick={() => handleSelecionarModulo('EXPEDICAO')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeModulo === 'EXPEDICAO'
              ? 'bg-emerald-600/15 border-emerald-500 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/50'
              : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              activeModulo === 'EXPEDICAO' ? 'bg-emerald-600 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <Truck className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              2. OPERACIONAL
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Expedição</span>
              <span className="text-emerald-400 text-xs font-mono">🟢</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
              Fios, pesagem, estoque de rolos e romaneios
            </p>
          </div>
        </button>

        {/* 3️⃣ FATURAMENTO / FINANCEIRO (🟣 Roxo) */}
        <button
          onClick={() => handleSelecionarModulo('FINANCEIRO')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeModulo === 'FINANCEIRO'
              ? 'bg-purple-600/15 border-purple-500 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/50'
              : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              activeModulo === 'FINANCEIRO' ? 'bg-purple-600 text-white' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              3. FINANCEIRO
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Faturamento</span>
              <span className="text-purple-400 text-xs font-mono">🟣</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
              Faturas por romaneio, parcelas e fluxo de caixa
            </p>
          </div>
        </button>

        {/* 4️⃣ CONFIGURAÇÕES (⚙ Cinza) */}
        <button
          onClick={() => handleSelecionarModulo('CONFIGURACOES')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeModulo === 'CONFIGURACOES'
              ? 'bg-neutral-700/30 border-neutral-500 shadow-lg shadow-neutral-500/10 ring-1 ring-neutral-500/50'
              : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              activeModulo === 'CONFIGURACOES' ? 'bg-neutral-600 text-white' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
            }`}>
              <Sliders className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
              4. GESTÃO
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Configurações</span>
              <span className="text-neutral-400 text-xs font-mono">⚙</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
              Empresa, clientes, usuários, backup e parâmetros
            </p>
          </div>
        </button>

      </div>

      {/* ========================================================================= */}
      {/* FLUXO OPERACIONAL ESPERADO DA EMPRESA RB SOUZA                            */}
      {/* Entrada de Fios ↓ Programação ↓ Produção ↓ Retirada ↓ Pesagem ↓ Estoque de Rolos ↓ Expedição ↓ Romaneio */}
      {/* ========================================================================= */}
      <div className="bg-black/40 border border-neutral-800/80 rounded-2xl p-4 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max text-[11px] font-mono">
          <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px] mr-2">
            Fluxo Físico & Administrativo:
          </span>

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'EXPEDICAO' && activeSub === 'entrada-fios'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            1. Entrada de Fios
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-500 border border-neutral-800 font-medium">
            2. Programação
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'PRODUCAO'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            3. Produção
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'PRODUCAO' && activeSub === 'aguardando-retirada'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            4. Retirada
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'EXPEDICAO' && activeSub === 'pesagem'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            5. Pesagem
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'EXPEDICAO' && activeSub === 'estoque-rolos'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            6. Estoque de Rolos
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'EXPEDICAO' && activeSub === 'expedicoes'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            7. Expedição
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'EXPEDICAO' && activeSub === 'romaneios'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            8. Romaneio
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            activeModulo === 'FINANCEIRO'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}>
            9. Faturamento
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RENDERIZAÇÃO DO MÓDULO SELECIONADO                                        */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl">
        {activeModulo === 'PRODUCAO' && (
          <ProducaoModule 
            activeSub={activeSub} 
            onNavigateSub={handleNavigateSub}
            onIrParaPesagem={handleIrParaPesagem}
          />
        )}

        {activeModulo === 'EXPEDICAO' && (
          <ExpedicaoModule 
            activeSub={activeSub} 
            onNavigateSub={handleNavigateSub}
            onAbrirFaturamentoDireto={handleAbrirFaturamentoDireto}
          />
        )}

        {activeModulo === 'FINANCEIRO' && (
          <FinanceiroModule 
            activeSub={activeSub} 
            onNavigateSub={handleNavigateSub}
            expedicaoParaFaturarInicial={expedicaoFaturandoDireto}
          />
        )}

        {activeModulo === 'CONFIGURACOES' && (
          <ConfiguracoesModule 
            activeSub={activeSub} 
            onNavigateSub={handleNavigateSub}
          />
        )}
      </div>

    </div>
  );
}
