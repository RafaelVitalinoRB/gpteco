import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { OP, Cliente, Especificacao } from '../../types';

interface ModalConferenciaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  op: OP;
  clienteNome: string;
  tituloFio?: string;
  tipoFio?: string;
  especificacao?: Especificacao | null;
  maquina: string;
}

export const ModalConferencia: React.FC<ModalConferenciaProps> = ({
  isOpen,
  onClose,
  onConfirm,
  op,
  clienteNome,
  tituloFio,
  tipoFio,
  especificacao,
  maquina
}) => {
  if (!isOpen || !op) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#121620] border-2 border-amber-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-amber-950/40 flex flex-col">
        {/* Cabeçalho de Atenção */}
        <div className="bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-transparent border-b border-amber-500/30 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                Conferência Antes do Início
              </h3>
              <p className="text-xs text-amber-300/80 font-medium">
                Confira os parâmetros físicos da máquina antes de iniciar a produção
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parâmetros Críticos */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* Identificação Geral */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                Ordem de Produção
              </span>
              <span className="text-base font-black text-blue-400 font-mono">
                {op.codigo}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                Máquina
              </span>
              <span className="text-base font-black text-white font-mono">
                {maquina}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                Cliente
              </span>
              <span className="text-base font-black text-white truncate block">
                {clienteNome}
              </span>
            </div>
          </div>

          {/* Cards de Conferência Técnica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Fio */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                <span>Fio Informado</span>
                <span className="text-blue-400 font-mono">Título / Tipo</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {tituloFio || op.tituloFio || '—'}
              </div>
              <div className="text-xs font-semibold text-neutral-400">
                Tipo: <span className="text-neutral-200">{tipoFio || op.tipoFio || 'POLIÉSTER'}</span>
              </div>
            </div>

            {/* Total de Fios */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                <span>Total de Fios</span>
                <span className="text-blue-400 font-mono">Gaiola</span>
              </div>
              <div className="text-xl font-black text-blue-400 font-mono">
                {(op.totalFios || 0).toLocaleString('pt-BR')} <span className="text-xs text-neutral-400 font-normal">fios</span>
              </div>
              <div className="text-xs font-semibold text-neutral-400">
                Fios por portada: <span className="text-white font-bold">{op.fiosPorPortada || '—'}</span>
              </div>
            </div>

            {/* Pente */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                <span>Pente Instalado</span>
                <span className="text-amber-400 font-mono">Ajuste</span>
              </div>
              <div className="text-xl font-black text-amber-300 font-mono">
                {especificacao?.pente || op.pente || '—'}
              </div>
              <div className="text-xs text-neutral-400">
                Verifique os dentes e passamento na palheta
              </div>
            </div>

            {/* Largura & Rolete */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                <span>Largura / Rolete</span>
                <span className="text-emerald-400 font-mono">Medida</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {especificacao?.largura || op.largura ? `${especificacao?.largura || op.largura} cm` : '—'}
              </div>
              <div className="text-xs text-neutral-400 truncate" title={op.rolete || especificacao?.rolete}>
                Rolete: <span className="text-purple-300 font-bold">{op.rolete || especificacao?.rolete || 'Padrão'}</span>
              </div>
            </div>
          </div>

          {/* Observações de Produção */}
          {op.observacoesProducao && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400 mb-1.5">
                <AlertTriangle className="w-4 h-4" />
                Atenção às Observações do Programador:
              </div>
              <p className="text-xs text-neutral-200 leading-relaxed font-medium whitespace-pre-wrap">
                {op.observacoesProducao}
              </p>
            </div>
          )}

          <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-3.5 text-center text-xs text-blue-200">
            Ao confirmar, a máquina será marcada como em produção e o ciclo do primeiro rolo será iniciado.
          </div>
        </div>

        {/* Ações */}
        <div className="bg-black/40 border-t border-white/10 p-5 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm uppercase tracking-wider transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Confirmar e Iniciar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
