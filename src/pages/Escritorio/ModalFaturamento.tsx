import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  X, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ArrowRight, 
  ArrowLeft,
  Receipt, 
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  FileCheck,
  CreditCard,
  Building2,
  Package,
  Layers,
  Sparkles,
  AlertTriangle,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RomaneioItem } from './FilaRolosAguardandoPesagem';
import { useStore } from '../../store/useStore';
import { generateId } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// ============================================================================
// TIPOS E UTILITÁRIOS MONETÁRIOS (PADRÃO 2 CASAS DECIMAIS R$ 0,00)
// ============================================================================
export interface ParcelaFaturamento {
  numero: number;
  vencimento: string; // YYYY-MM-DD
  valor: number;
  observacao?: string;
  status?: string;
}

export type ParcelaCalculada = ParcelaFaturamento;

export type FormaPagamentoTipo = 'PIX' | 'Boleto' | 'Cheque' | 'Depósito' | 'Transferência' | 'Dinheiro' | 'Outro';
export type CondicaoPagamentoTipo = 'À Vista' | '28 dias' | '30 dias' | '30/60' | '30/60/90' | '30 / 60' | '30 / 60 / 90' | 'Personalizado';

export const FORMAS_PAGAMENTO: FormaPagamentoTipo[] = [
  'PIX',
  'Boleto',
  'Cheque',
  'Depósito',
  'Transferência',
  'Dinheiro',
  'Outro'
];

export const CONDICOES_PAGAMENTO: CondicaoPagamentoTipo[] = [
  'À Vista',
  '28 dias',
  '30 dias',
  '30/60',
  '30/60/90',
  'Personalizado'
];

export interface FaturamentoPayload {
  id?: string;
  romaneioId?: string;
  codigoRomaneio?: string;
  clienteNome: string;
  clienteId?: string | number;
  totalRolos: number;
  totalMetros: number;
  totalPesoKg: number;
  rolosCodigos: string[];
  valorTotal: number;
  formaPagamento: FormaPagamentoTipo;
  condicaoPagamento: CondicaoPagamentoTipo;
  parcelas: ParcelaFaturamento[];
  numeroFatura: string;
  observacoes?: string;
  faturadoEm: string;
}

export interface ResumoExpedicaoFaturamento {
  codigo?: string;
  clienteNome: string;
  clienteId?: string | number;
  totalRolos: number;
  totalMetros: number;
  totalPesoKg: number;
  rolos: Array<{ numero_rolo: string; id?: string }>;
}

/**
 * Arredonda qualquer número monetário para exatamente duas casas decimais.
 * Evita valores anômalos como R$ 0,001.
 */
export const arredondarDuasCasas = (valor: number): number => {
  return Math.round((Number(valor) || 0) * 100) / 100;
};

/**
 * Formata um valor numérico para o padrão monetário brasileiro R$ 0,00 (sempre 2 casas decimais).
 */
export const formatarMoeda = (valor: number | string | undefined | null): string => {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) || 0 : Number(valor) || 0;
  return arredondarDuasCasas(num).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

// ============================================================================
// 1. MODAL DE DECISÃO: DESEJA FATURAR ESTA EXPEDIÇÃO? [SIM] [NÃO]
// ============================================================================
export interface ModalDecisaoFaturamentoProps {
  isOpen?: boolean;
  resumo?: ResumoExpedicaoFaturamento | null;
  expedicao?: ResumoExpedicaoFaturamento | null;
  romaneio?: RomaneioItem | null;
  onConfirmarSim?: () => void;
  onConfirmarNao?: () => void;
  onDecidir?: (faturarAgora: boolean) => void;
  onClose: () => void;
}

export const ModalDecisaoFaturamento: React.FC<ModalDecisaoFaturamentoProps> = ({
  isOpen = true,
  resumo,
  expedicao,
  romaneio,
  onConfirmarSim,
  onConfirmarNao,
  onDecidir,
  onClose
}) => {
  if (isOpen === false) return null;

  const dados = resumo || expedicao || (romaneio ? {
    codigo: romaneio.codigoRomaneio,
    clienteNome: romaneio.clienteNome,
    clienteId: romaneio.clienteId,
    totalRolos: romaneio.totalRolos,
    totalMetros: romaneio.totalMetros,
    totalPesoKg: romaneio.totalPesoKg,
    rolos: romaneio.rolos
  } : null);

  if (!dados) return null;

  const handleSim = () => {
    if (typeof onConfirmarSim === 'function') {
      onConfirmarSim();
    } else if (typeof onDecidir === 'function') {
      onDecidir(true);
    }
  };

  const handleNao = () => {
    if (typeof onConfirmarNao === 'function') {
      onConfirmarNao();
    } else if (typeof onDecidir === 'function') {
      onDecidir(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121620] border-2 border-emerald-500/50 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header com Ícone de Expedição Concluída */}
        <div className="bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-transparent border-b border-white/10 p-6 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-0.5 font-mono">
                Etapa 7 & 8 • Expedição Concluída
              </span>
              <h3 className="text-lg font-black uppercase text-white tracking-wide">
                Saída de Rolos Registrada!
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar e descartar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-6">
          
          {/* Indicador Visual do Fluxo Operacional RB Souza */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block text-center">
              Fluxo Operacional Integrado
            </span>
            <div className="flex items-center justify-between text-[11px] font-bold font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pesagem</span>
              </span>
              <ArrowRight className="w-3 h-3 text-neutral-600" />
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Romaneio</span>
              </span>
              <ArrowRight className="w-3 h-3 text-neutral-600" />
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Expedição</span>
              </span>
              <ArrowRight className="w-3 h-3 text-neutral-600" />
              <span className="text-amber-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Faturamento</span>
              </span>
            </div>
          </div>

          {/* Dados Resumidos da Saída */}
          <div className="bg-neutral-900/80 border border-white/5 rounded-2xl p-4 space-y-2 text-xs">
            {dados.codigo && (
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-neutral-400">Número do Romaneio:</span>
                <span className="font-mono font-black text-purple-400">{dados.codigo}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-neutral-400">Cliente:</span>
              <span className="font-bold text-white">{dados.clienteNome}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-neutral-400">Total de Rolos:</span>
              <span className="font-mono font-bold text-white">
                {dados.totalRolos} rolo(s) • {dados.totalMetros.toLocaleString('pt-BR')} m
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Peso Total Líquido:</span>
              <span className="font-mono font-black text-emerald-400">
                {arredondarDuasCasas(dados.totalPesoKg).toFixed(2)} kg
              </span>
            </div>
          </div>

          {/* Pergunta em Destaque: Deseja faturar esta expedição? */}
          <div className="text-center space-y-1.5 pt-1">
            <h4 className="text-xl font-black text-white uppercase tracking-tight">
              Deseja faturar esta expedição?
            </h4>
            <p className="text-xs text-neutral-400">
              Se <strong className="text-emerald-400">SIM</strong>, o assistente de faturamento será aberto agora. Se <strong className="text-amber-400">NÃO</strong>, o registro ficará pendente no módulo Financeiro.
            </p>
          </div>

          {/* Botões [ SIM ] e [ NÃO ] */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleNao}
              className="py-4 px-5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-black text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 border border-white/10 cursor-pointer shadow-md"
            >
              <span>NÃO</span>
              <span className="text-[10px] text-neutral-400 font-normal">Pendente no Financeiro</span>
            </button>

            <button
              type="button"
              onClick={handleSim}
              className="py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <span>SIM</span>
              <span className="text-[10px] text-emerald-100 font-bold">Abrir Faturamento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. ASSISTENTE DE FATURAMENTO EM 5 ETAPAS (WIZARD NO MESMO MODAL)
// Etapa 1: Resumo da Expedição
// Etapa 2: Forma de Pagamento
// Etapa 3: Condição de Pagamento
// Etapa 4: Parcelas
// Etapa 5: Confirmar
// ============================================================================

export interface ModalFaturarProps {
  isOpen?: boolean;
  romaneio?: RomaneioItem | null;
  expedicao?: ResumoExpedicaoFaturamento | null;
  resumo?: ResumoExpedicaoFaturamento | null;
  onClose: () => void;
  onSuccess?: (faturamento?: FaturamentoPayload) => void;
  onFaturadoSucesso?: (faturamento: FaturamentoPayload) => void;
}

export const ModalFaturarRomaneio: React.FC<ModalFaturarProps> = ({
  isOpen = true,
  romaneio,
  expedicao,
  resumo,
  onClose,
  onSuccess,
  onFaturadoSucesso
}) => {
  const { clientes: storeClientes, addSaida } = useStore();

  if (isOpen === false) return null;

  const dados = resumo || expedicao || (romaneio ? {
    codigo: romaneio.codigoRomaneio,
    clienteNome: romaneio.clienteNome,
    clienteId: romaneio.clienteId,
    totalRolos: romaneio.totalRolos,
    totalMetros: romaneio.totalMetros,
    totalPesoKg: romaneio.totalPesoKg,
    rolos: romaneio.rolos
  } : null);

  if (!dados) return null;

  // Localizar cliente e contrato de cobrança
  const clienteObj = storeClientes.find(
    c => c.nomeFantasia === dados.clienteNome || c.razaoSocial === dados.clienteNome || String(c.id) === String(dados.clienteId)
  );

  const tipoCobranca = clienteObj?.tipoCobranca || 'METRO';
  const precoUnitario = arredondarDuasCasas(clienteObj?.valorCobrado || (tipoCobranca === 'METRO' ? 0.85 : 120.0));

  // Valor total calculado automaticamente
  const valorCalculadoPadrao = dados
    ? (tipoCobranca === 'METRO'
        ? arredondarDuasCasas(dados.totalMetros * precoUnitario)
        : arredondarDuasCasas(dados.totalRolos * precoUnitario))
    : 0;

  // Estado do Assistente (Etapas 1 a 5)
  const [etapaAtual, setEtapaAtual] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Estados dos Campos Financeiros
  const [valorTotalInput, setValorTotalInput] = useState<string>(valorCalculadoPadrao.toFixed(2));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoTipo>('Boleto');
  const [condicaoPagamento, setCondicaoPagamento] = useState<CondicaoPagamentoTipo>('30 dias');
  const [parcelas, setParcelas] = useState<ParcelaFaturamento[]>([]);
  const [numeroFatura, setNumeroFatura] = useState<string>(() => {
    const suf = dados.codigo ? dados.codigo.replace('ROM-', '') : Date.now().toString().slice(-4);
    return `FAT-${suf}`;
  });
  const [observacoes, setObservacoes] = useState<string>('');
  const [isSalvando, setIsSalvando] = useState(false);

  // Função auxiliar para somar dias a uma data base
  const somarDias = (dias: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  };

  // Gerador automático de parcelas com arredondamento estrito de 2 casas decimais
  const recalcularParcelasAutomaticas = (condicao: CondicaoPagamentoTipo, totalStr: string) => {
    const total = arredondarDuasCasas(parseFloat(totalStr.replace(',', '.')) || 0);
    if (total <= 0) {
      setParcelas([]);
      return;
    }

    let novasParcelas: ParcelaFaturamento[] = [];

    switch (condicao) {
      case 'À Vista':
        novasParcelas = [
          { numero: 1, vencimento: somarDias(0), valor: total }
        ];
        break;

      case '28 dias':
        novasParcelas = [
          { numero: 1, vencimento: somarDias(28), valor: total }
        ];
        break;

      case '30 dias':
        novasParcelas = [
          { numero: 1, vencimento: somarDias(30), valor: total }
        ];
        break;

      case '30/60':
      case '30 / 60': {
        const p1 = arredondarDuasCasas(total / 2);
        const p2 = arredondarDuasCasas(total - p1);
        novasParcelas = [
          { numero: 1, vencimento: somarDias(30), valor: p1 },
          { numero: 2, vencimento: somarDias(60), valor: p2 }
        ];
        break;
      }

      case '30/60/90':
      case '30 / 60 / 90': {
        const p1 = arredondarDuasCasas(total / 3);
        const p2 = arredondarDuasCasas(total / 3);
        const p3 = arredondarDuasCasas(total - p1 - p2);
        novasParcelas = [
          { numero: 1, vencimento: somarDias(30), valor: p1 },
          { numero: 2, vencimento: somarDias(60), valor: p2 },
          { numero: 3, vencimento: somarDias(90), valor: p3 }
        ];
        break;
      }

      case 'Personalizado':
        if (parcelas.length === 0) {
          novasParcelas = [
            { numero: 1, vencimento: somarDias(30), valor: total }
          ];
        } else {
          return;
        }
        break;
    }

    setParcelas(novasParcelas);
  };

  // Efeito inicial: gera as parcelas automáticas
  useEffect(() => {
    recalcularParcelasAutomaticas(condicaoPagamento, valorTotalInput);
  }, []);

  // Quando mudar a condição, recalcula
  const handleCondicaoChange = (novaCondicao: CondicaoPagamentoTipo) => {
    setCondicaoPagamento(novaCondicao);
    recalcularParcelasAutomaticas(novaCondicao, valorTotalInput);
  };

  // Quando o valor total for alterado manualmente no input principal
  const handleValorTotalChange = (novoValorStr: string) => {
    setValorTotalInput(novoValorStr);
    recalcularParcelasAutomaticas(condicaoPagamento, novoValorStr);
  };

  // Edição manual do vencimento de uma parcela
  const handleEditarVencimentoParcela = (index: number, novoVencimento: string) => {
    setParcelas(prev => {
      const clone = [...prev];
      clone[index] = { ...clone[index], vencimento: novoVencimento };
      return clone;
    });
  };

  // Edição manual do valor de uma parcela
  const handleEditarValorParcela = (index: number, novoValorStr: string) => {
    const val = arredondarDuasCasas(parseFloat(novoValorStr.replace(',', '.')) || 0);
    setParcelas(prev => {
      const clone = [...prev];
      clone[index] = { ...clone[index], valor: val };
      return clone;
    });
  };

  // Adicionar uma nova parcela (muda para Personalizado)
  const handleAdicionarParcela = () => {
    const num = parcelas.length + 1;
    const ultimoVencimento = parcelas.length > 0 ? parcelas[parcelas.length - 1].vencimento : somarDias(30);
    const d = new Date(ultimoVencimento);
    d.setDate(d.getDate() + 30);
    const novoVenc = isNaN(d.getTime()) ? somarDias(30 * num) : d.toISOString().split('T')[0];

    setCondicaoPagamento('Personalizado');
    setParcelas(prev => [
      ...prev,
      { numero: num, vencimento: novoVenc, valor: 0 }
    ]);
  };

  // Remover parcela
  const handleRemoverParcela = (index: number) => {
    if (parcelas.length <= 1) {
      toast.error('O faturamento deve ter pelo menos 1 parcela.');
      return;
    }
    setCondicaoPagamento('Personalizado');
    setParcelas(prev => {
      const filtradas = prev.filter((_, i) => i !== index);
      return filtradas.map((p, i) => ({ ...p, numero: i + 1 }));
    });
  };

  // Soma das parcelas calculada estritamente com duas casas decimais
  const somaParcelas = useMemo(() => {
    const sum = parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    return arredondarDuasCasas(sum);
  }, [parcelas]);

  const valorTotalNum = useMemo(() => {
    return arredondarDuasCasas(parseFloat(valorTotalInput.replace(',', '.')) || 0);
  }, [valorTotalInput]);

  const diferencaParcelas = useMemo(() => {
    return arredondarDuasCasas(Math.abs(somaParcelas - valorTotalNum));
  }, [somaParcelas, valorTotalNum]);

  const isDiferencaSignificativa = diferencaParcelas > 0.01;

  // Ajustar última parcela para bater com o valor total
  const handleAjustarDiferenca = () => {
    if (parcelas.length === 0) return;
    const somaExcetoUltima = parcelas.slice(0, -1).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const resto = Math.max(0, arredondarDuasCasas(valorTotalNum - somaExcetoUltima));
    setParcelas(prev => {
      const clone = [...prev];
      clone[clone.length - 1] = {
        ...clone[clone.length - 1],
        valor: resto
      };
      return clone;
    });
    toast.success(`Última parcela ajustada para R$ ${formatarMoeda(resto)}.`);
  };

  // Validação estrita para habilitar o botão "CONFIRMAR FATURAMENTO"
  const validacaoConfirmacao = useMemo(() => {
    if (valorTotalNum <= 0) {
      return { valido: false, motivo: 'O Valor Total deve ser maior que R$ 0,00.' };
    }
    if (!formaPagamento) {
      return { valido: false, motivo: 'Selecione uma Forma de Pagamento válida.' };
    }
    if (!condicaoPagamento) {
      return { valido: false, motivo: 'Selecione uma Condição de Pagamento.' };
    }
    if (parcelas.length === 0) {
      return { valido: false, motivo: 'Gere ao menos 1 parcela para o faturamento.' };
    }
    const parcelaInvalida = parcelas.find(p => !p.vencimento || p.valor <= 0);
    if (parcelaInvalida) {
      return { valido: false, motivo: 'Todas as parcelas devem ter data de vencimento válida e valor superior a R$ 0,00.' };
    }
    if (isDiferencaSignificativa) {
      return { 
        valido: false, 
        motivo: `A soma das parcelas (R$ ${formatarMoeda(somaParcelas)}) difere do Valor Total (R$ ${formatarMoeda(valorTotalNum)}). Ajuste as parcelas para continuar.` 
      };
    }
    return { valido: true, motivo: '' };
  }, [valorTotalNum, formaPagamento, condicaoPagamento, parcelas, isDiferencaSignificativa, somaParcelas]);

  // Ação de Cancelar
  const handleCancelar = () => {
    onClose();
  };

  // Ação de Fechar (X)
  const handleFecharX = () => {
    onClose();
  };

  // Finalização do Faturamento
  const handleConfirmarFaturamento = async () => {
    if (!validacaoConfirmacao.valido) {
      toast.error(validacaoConfirmacao.motivo);
      return;
    }

    setIsSalvando(true);
    const agora = new Date().toISOString();
    const rolosCodigos = dados.rolos.map(r => r.numero_rolo) || [];

    const payload: FaturamentoPayload = {
      id: `fat-${Date.now()}`,
      romaneioId: romaneio?.id,
      codigoRomaneio: dados.codigo,
      clienteNome: dados.clienteNome || 'Cliente',
      clienteId: clienteObj?.id || dados.clienteId,
      totalRolos: dados.totalRolos || 0,
      totalMetros: dados.totalMetros || 0,
      totalPesoKg: arredondarDuasCasas(dados.totalPesoKg),
      rolosCodigos,
      valorTotal: valorTotalNum,
      formaPagamento,
      condicaoPagamento,
      parcelas,
      numeroFatura: numeroFatura.trim() || `FAT-${Date.now().toString().slice(-4)}`,
      observacoes: observacoes.trim(),
      faturadoEm: agora
    };

    try {
      // 1. Gravar registro de Saída Financeira no Zustand Store
      addSaida({
        id: generateId(),
        clienteId: String(payload.clienteId || payload.clienteNome),
        tipoLancamento: 'ROLETES',
        quantidade: payload.totalRolos,
        pesoLiquido: payload.totalPesoKg,
        tipoFio: 'POLIESTER',
        tituloFio: '150/48',
        nfNumero: payload.numeroFatura,
        metros: payload.totalMetros,
        valorCobrado: valorTotalNum,
        dataLancamento: agora.split('T')[0],
        createdAt: agora,
        observacao: `Faturamento ${payload.numeroFatura} • ${formaPagamento} (${condicaoPagamento}) • ${parcelas.length}x. ${observacoes}`,
        isRetroativo: false
      });

      // 2. Gravar no histórico de faturamentos concluídos (localStorage)
      try {
        const raw = localStorage.getItem('texlog_faturamentos_concluidos');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(payload);
        localStorage.setItem('texlog_faturamentos_concluidos', JSON.stringify(list));
      } catch (errLocal) {
        console.warn('Local storage faturamentos:', errLocal);
      }

      // 3. Atualizar status dos rolos no storage para FATURADO
      try {
        const rawRolos = localStorage.getItem('texlog_historico_rolos_produzidos');
        if (rawRolos) {
          const listRolos = JSON.parse(rawRolos);
          const atualizados = listRolos.map((r: any) => {
            if (rolosCodigos.includes(r.numero_rolo)) {
              return {
                ...r,
                status: 'FATURADO',
                faturado_em: agora,
                fatura_numero: payload.numeroFatura,
                valor_faturado: valorTotalNum
              };
            }
            return r;
          });
          localStorage.setItem('texlog_historico_rolos_produzidos', JSON.stringify(atualizados));
        }
      } catch (errRolos) {
        console.warn('Local storage rolos update:', errRolos);
      }

      // 4. Se houver romaneio associado, marcar como FATURADO
      if (dados.codigo || romaneio?.id) {
        try {
          const rawRom = localStorage.getItem('texlog_romaneios_emitidos');
          if (rawRom) {
            const listRom = JSON.parse(rawRom);
            const atualizados = listRom.map((r: any) => {
              if (r.id === romaneio?.id || r.codigoRomaneio === dados.codigo || r.codigo === dados.codigo) {
                return {
                  ...r,
                  status: 'FATURADO',
                  faturadoEm: agora,
                  valorTotalFaturado: valorTotalNum,
                  numeroFatura: payload.numeroFatura
                };
              }
              return r;
            });
            localStorage.setItem('texlog_romaneios_emitidos', JSON.stringify(atualizados));
          }
        } catch (errRom) {
          console.warn('Local storage romaneios update:', errRom);
        }
      }

      // 5. Atualizar no Supabase se houver rolos correspondentes
      try {
        if (rolosCodigos.length > 0) {
          await supabase
            .from('rolos')
            .update({ status: 'FATURADO' })
            .in('numero_rolo', rolosCodigos);
        }
      } catch (errSupabase) {
        console.warn('Supabase rolos status update:', errSupabase);
      }

      // 6. Broadcast de eventos em tempo real
      window.dispatchEvent(new CustomEvent('texlog_faturamento_updated', { detail: payload }));
      window.dispatchEvent(new Event('texlog_rolo_pesado'));
      window.dispatchEvent(new Event('texlog_saida_updated'));

      // Mensagem padronizada solicitada: "Faturamento realizado com sucesso"
      toast.success('Faturamento realizado com sucesso', { icon: '💰', duration: 4000 });

      // Callbacks seguros: previne "onFaturadoSucesso is not a function"
      if (typeof onFaturadoSucesso === 'function') {
        onFaturadoSucesso(payload);
      }
      if (typeof onSuccess === 'function') {
        onSuccess(payload);
      }

      // Fechar automaticamente e retornar à tela de expedições
      onClose();
    } catch (err: any) {
      toast.error('Erro ao registrar faturamento: ' + (err?.message || 'Falha ao processar'));
      setIsSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#121620] border-2 border-purple-500/50 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* ========================================================================= */}
        {/* HEADER COM IDENTIDADE VISUAL ROXA (FINANCEIRO)                            */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-transparent border-b border-white/10 p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 block mb-0.5 font-mono">
                Assistente de Faturamento • 3.0.1
              </span>
              <h3 className="text-lg font-black uppercase text-white tracking-wide">
                Faturamento da Expedição
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFecharX}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cancelar e Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* BARRA DE ETAPAS (WIZARD PROGRESSIVO EM 5 ETAPAS)                          */}
        {/* Etapa 1: Resumo ↓ Etapa 2: Forma ↓ Etapa 3: Condição ↓ Etapa 4: Parcelas ↓ Etapa 5: Confirmar */}
        {/* ========================================================================= */}
        <div className="bg-black/60 border-b border-white/10 px-4 py-3 shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max gap-2 text-xs">
            {[
              { num: 1, label: 'Resumo da Expedição' },
              { num: 2, label: 'Forma de Pagamento' },
              { num: 3, label: 'Condição' },
              { num: 4, label: 'Parcelas' },
              { num: 5, label: 'Confirmar' }
            ].map((step, idx) => {
              const isAtivo = etapaAtual === step.num;
              const isConcluido = etapaAtual > step.num;

              return (
                <React.Fragment key={step.num}>
                  <button
                    type="button"
                    onClick={() => {
                      // Permitir navegar para etapas anteriores ou já concluídas
                      if (step.num <= etapaAtual) {
                        setEtapaAtual(step.num as any);
                      }
                    }}
                    disabled={step.num > etapaAtual}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                      isAtivo
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                        : isConcluido
                        ? 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/40'
                        : 'text-neutral-500 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-black ${
                      isAtivo
                        ? 'bg-white text-purple-900'
                        : isConcluido
                        ? 'bg-purple-500/30 text-purple-300'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}>
                      {isConcluido ? '✓' : step.num}
                    </span>
                    <span>{step.label}</span>
                  </button>

                  {idx < 4 && (
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPO DO ASSISTENTE COM RENDERIZAÇÃO CONDICIONAL DA ETAPA                  */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 space-y-6 text-xs overflow-y-auto flex-1">

          {/* ======================================================================= */}
          {/* ETAPA 1: RESUMO DA EXPEDIÇÃO (ITEM 8 DO HOTFIX)                         */}
          {/* Mostra: Cliente, Número Romaneio, Qtd Rolos, Peso Total, Metros, Valor */}
          {/* ======================================================================= */}
          {etapaAtual === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4">
                <h4 className="text-sm font-black uppercase text-purple-300 tracking-wide flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span>Etapa 1 de 5 • Conferência dos Dados da Expedição</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Verifique os dados do romaneio expedido antes de iniciar as definições financeiras.
                </p>
              </div>

              {/* Grid dos 6 Indicadores Oficiais Obrigatórios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                
                {/* 1. Cliente */}
                <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    Cliente
                  </span>
                  <div className="font-black text-white text-base truncate">{dados.clienteNome}</div>
                  <span className="text-[10px] text-purple-300 font-mono block">
                    Cobrança: Por {tipoCobranca.toLowerCase()} (R$ {formatarMoeda(precoUnitario)})
                  </span>
                </div>

                {/* 2. Número do Romaneio */}
                <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                    Número do Romaneio
                  </span>
                  <div className="font-mono font-black text-purple-400 text-base">
                    {dados.codigo || 'ROM-S/N'}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    Oficializado na expedição
                  </span>
                </div>

                {/* 3. Quantidade de Rolos */}
                <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Quantidade de Rolos
                  </span>
                  <div className="font-mono font-black text-white text-base">
                    {dados.totalRolos} rolo(s)
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    Volumes pesados e etiquetados
                  </span>
                </div>

                {/* 4. Metros Totais */}
                <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    Metros Totais
                  </span>
                  <div className="font-mono font-black text-blue-400 text-base">
                    {dados.totalMetros.toLocaleString('pt-BR')} m
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    Metragem contínua expedida
                  </span>
                </div>

                {/* 5. Peso Total */}
                <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    Peso Total
                  </span>
                  <div className="font-mono font-black text-emerald-400 text-base">
                    {formatarMoeda(dados.totalPesoKg)} kg
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    Peso líquido oficial de balança
                  </span>
                </div>

                {/* 6. Valor Total */}
                <div className="bg-neutral-900/90 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-1 bg-emerald-950/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Valor Total do Faturamento
                  </span>
                  <div className="font-mono font-black text-emerald-400 text-xl">
                    R$ {formatarMoeda(valorTotalNum)}
                  </div>
                  <span className="text-[10px] text-neutral-400 block">
                    {tipoCobranca === 'METRO' 
                      ? `${dados.totalMetros.toLocaleString('pt-BR')} m × R$ ${formatarMoeda(precoUnitario)}`
                      : `${dados.totalRolos} rolo(s) × R$ ${formatarMoeda(precoUnitario)}`}
                  </span>
                </div>

              </div>

              {/* Ajuste manual opcional do valor total se necessário */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black uppercase text-white tracking-wide block">
                      Ajuste Comercial do Valor Total (Opcional)
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      Caso tenha negociado um valor diferente do contrato padrão, digite o novo total aqui.
                    </span>
                  </div>
                  <div className="relative w-full sm:w-56">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-neutral-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={valorTotalInput}
                      onChange={e => handleValorTotalChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-400 text-right"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================================= */}
          {/* ETAPA 2: FORMA DE PAGAMENTO                                             */}
          {/* ======================================================================= */}
          {etapaAtual === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4">
                <h4 className="text-sm font-black uppercase text-purple-300 tracking-wide flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>Etapa 2 de 5 • Selecione a Forma de Pagamento</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Como o cliente efetuará o pagamento desta expedição.
                </p>
              </div>

              {/* Grid Interativo de Formas de Pagamento */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {FORMAS_PAGAMENTO.map(forma => {
                  const isSelected = formaPagamento === forma;
                  return (
                    <button
                      key={forma}
                      type="button"
                      onClick={() => setFormaPagamento(forma)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20 ring-1 ring-purple-400'
                          : 'bg-neutral-900/80 border-white/10 hover:border-white/20 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase">{forma}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {forma === 'Boleto' ? 'Cobrança Bancária' : forma === 'PIX' ? 'Transferência Instantânea' : 'Meio Homologado'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Resumo da Seleção Atual */}
              <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Forma Escolhida:</span>
                <span className="font-black text-purple-400 font-mono uppercase bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">
                  {formaPagamento}
                </span>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ETAPA 3: CONDIÇÃO DE PAGAMENTO                                          */}
          {/* ======================================================================= */}
          {etapaAtual === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4">
                <h4 className="text-sm font-black uppercase text-purple-300 tracking-wide flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Etapa 3 de 5 • Defina a Condição de Pagamento</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Escolha os prazos acordados. As parcelas e datas serão calculadas automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: 'À Vista', label: 'À Vista', desc: '1 parcela com vencimento imediato' },
                  { id: '28 dias', label: '28 dias', desc: '1 parcela para 28 dias corridos' },
                  { id: '30 dias', label: '30 dias', desc: '1 parcela para 30 dias corridos' },
                  { id: '30/60', label: '30 / 60 dias', desc: '2 parcelas iguais (30 e 60 dias)' },
                  { id: '30/60/90', label: '30 / 60 / 90 dias', desc: '3 parcelas iguais (30, 60 e 90 dias)' },
                  { id: 'Personalizado', label: 'Personalizado', desc: 'Defina livremente prazos e divisões' }
                ].map(cond => {
                  const isSelected = condicaoPagamento === cond.id || (cond.id === '30/60' && condicaoPagamento === '30 / 60') || (cond.id === '30/60/90' && condicaoPagamento === '30 / 60 / 90');
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => handleCondicaoChange(cond.id as CondicaoPagamentoTipo)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20 ring-1 ring-purple-400'
                          : 'bg-neutral-900/80 border-white/10 hover:border-white/20 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase">{cond.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {cond.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Informação sobre as parcelas geradas */}
              <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Configuração Atual:</span>
                <span className="font-mono font-bold text-white">
                  {parcelas.length} parcela(s) • Total: R$ {formatarMoeda(valorTotalNum)}
                </span>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ETAPA 4: PARCELAS (DATAS E VALORES TOTALMENTE EDITÁVEIS)                 */}
          {/* ======================================================================= */}
          {etapaAtual === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black uppercase text-purple-300 tracking-wide flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span>Etapa 4 de 5 • Conferência e Edição das Parcelas</span>
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Ajuste datas de vencimento ou valores se houver acordos específicos com o cliente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAdicionarParcela}
                  className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-purple-500/40 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Parcela</span>
                </button>
              </div>

              {/* Tabela de Parcelas */}
              <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-neutral-500 px-2">
                  <span className="col-span-2">Parcela</span>
                  <span className="col-span-5">Data de Vencimento</span>
                  <span className="col-span-4 text-right">Valor (R$)</span>
                  <span className="col-span-1"></span>
                </div>

                {parcelas.map((parc, idx) => (
                  <div 
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-black/40 border border-white/5 rounded-xl p-2.5 hover:border-white/15 transition-colors"
                  >
                    <div className="col-span-2 font-mono font-black text-neutral-200 text-xs pl-2">
                      {parc.numero}ª / {parcelas.length}
                    </div>

                    <div className="col-span-5">
                      <input
                        type="date"
                        required
                        value={parc.vencimento}
                        onChange={(e) => handleEditarVencimentoParcela(idx, e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-neutral-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div className="col-span-4 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-[10px]">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={arredondarDuasCasas(parc.valor).toFixed(2)}
                        onChange={(e) => handleEditarValorParcela(idx, e.target.value)}
                        className="w-full py-1.5 pl-8 pr-2 rounded-lg bg-neutral-900 border border-white/10 text-emerald-400 font-mono font-bold text-xs text-right focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="col-span-1 flex justify-center">
                      {parcelas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoverParcela(idx)}
                          className="p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remover parcela"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Barra de Conferência de Totais */}
                <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-neutral-400">Soma das Parcelas:</span>
                    <span className={`font-mono font-bold ${isDiferencaSignificativa ? 'text-amber-400' : 'text-emerald-400'}`}>
                      R$ {formatarMoeda(somaParcelas)}
                    </span>
                    <span className="text-neutral-500">de</span>
                    <span className="font-mono font-bold text-white">
                      R$ {formatarMoeda(valorTotalNum)}
                    </span>

                    {isDiferencaSignificativa && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1 font-sans font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Diferença de R$ {formatarMoeda(diferencaParcelas)}
                      </span>
                    )}
                  </div>

                  {isDiferencaSignificativa && (
                    <button
                      type="button"
                      onClick={handleAjustarDiferenca}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                    >
                      Ajustar resíduo na última parcela
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ETAPA 5: CONFIRMAR (REVISÃO GERAL + DADOS FISCAIS + BOTÃO PROTEGIDO)      */}
          {/* ======================================================================= */}
          {etapaAtual === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4">
                <h4 className="text-sm font-black uppercase text-purple-300 tracking-wide flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-purple-400" />
                  <span>Etapa 5 de 5 • Revisão Final e Confirmação</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Confira todos os parâmetros do faturamento antes de oficializar o registro financeiro.
                </p>
              </div>

              {/* Quadro Resumo Geral Consolidado */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Cliente</span>
                    <span className="font-bold text-white">{dados.clienteNome}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Romaneio</span>
                    <span className="font-mono font-bold text-purple-400">{dados.codigo || 'S/N'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Forma / Condição</span>
                    <span className="font-bold text-white">{formaPagamento} • {condicaoPagamento}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Valor Total</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      R$ {formatarMoeda(valorTotalNum)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-2">
                    Resumo do Cronograma de Parcelas:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {parcelas.map(p => (
                      <div key={p.numero} className="bg-black/50 p-2 rounded-xl border border-white/5 font-mono text-xs flex justify-between">
                        <span className="text-neutral-400">{p.numero}ª parc ({new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}):</span>
                        <span className="font-black text-emerald-400">R$ {formatarMoeda(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Número da Fatura e Observações */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-300 mb-1.5">
                    Número da Fatura / Nota Fiscal (NF-e)
                  </label>
                  <input
                    type="text"
                    value={numeroFatura}
                    onChange={(e) => setNumeroFatura(e.target.value)}
                    placeholder="Ex: FAT-25561"
                    className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-300 mb-1.5">
                    Observações Financeiras (Opcional)
                  </label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Acordo especial de vencimento com a diretoria"
                    className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* RODAPÉ DO ASSISTENTE COM NAVEGAÇÃO E BOTÃO DE CONFIRMAÇÃO PROTEGIDO       */}
        {/* ========================================================================= */}
        <div className="border-t border-white/10 p-4 sm:p-5 bg-black/60 shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            
            {/* Botão Cancelar ou Voltar */}
            {etapaAtual === 1 ? (
              <button
                type="button"
                onClick={handleCancelar}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEtapaAtual((prev) => (prev > 1 ? (prev - 1) as any : 1))}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}

            {/* Botão de Avanço de Etapa ou Confirmação Final */}
            {etapaAtual < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (etapaAtual === 1 && valorTotalNum <= 0) {
                    toast.error('Informe um valor total válido maior que R$ 0,00.');
                    return;
                  }
                  if (etapaAtual === 4 && isDiferencaSignificativa) {
                    toast.error(`Ajuste as parcelas. Soma (R$ ${formatarMoeda(somaParcelas)}) difere do total (R$ ${formatarMoeda(valorTotalNum)}).`);
                    return;
                  }
                  setEtapaAtual((prev) => (prev < 5 ? (prev + 1) as any : 5));
                }}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              /* Botão CONFIRMAR FATURAMENTO (Protegido contra dados incompletos - Item 7) */
              <button
                type="button"
                disabled={!validacaoConfirmacao.valido || isSalvando}
                onClick={handleConfirmarFaturamento}
                className={`px-7 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                  validacaoConfirmacao.valido && !isSalvando
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60 border border-neutral-700'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>{isSalvando ? 'Salvando...' : 'Confirmar Faturamento'}</span>
              </button>
            )}

          </div>

          {/* Mensagem explicativa se a confirmação estiver bloqueada (Item 7) */}
          {etapaAtual === 5 && !validacaoConfirmacao.valido && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{validacaoConfirmacao.motivo}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
