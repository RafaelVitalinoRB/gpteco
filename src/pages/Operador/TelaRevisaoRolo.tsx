import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  Layers, 
  User, 
  Settings2, 
  History,
  RotateCcw
} from 'lucide-react';
import { OP, Especificacao } from '../../types';

export interface OcorrenciaProducaoItem {
  portada?: number;
  tipo?: string;
  obs?: string;
  texto: string;
  horario?: string;
}

interface TelaRevisaoRoloProps {
  op: OP | any;
  clienteNome: string;
  maquina: string;
  operadorNome: string;
  roloAtualFormatado: string;
  especificacao?: Especificacao | null;
  fiosPorPortada?: number | string;
  totalPortadas: number;
  ocorrenciasProducao: (string | OcorrenciaProducaoItem)[];
  onIniciarRetirada: () => void;
  onVoltarProducao?: () => void;
}

export const TelaRevisaoRolo: React.FC<TelaRevisaoRoloProps> = ({
  op,
  clienteNome,
  maquina,
  operadorNome,
  roloAtualFormatado,
  especificacao,
  fiosPorPortada,
  totalPortadas,
  ocorrenciasProducao,
  onIniciarRetirada,
  onVoltarProducao
}) => {
  const [roleteConfirmado, setRoleteConfirmado] = useState<'SIM' | 'NAO' | null>(null);

  // Extração segura dos dados técnicos
  const roleteCadastrado = op?.rolete || 'ROLETE 1800 mm';
  const pente = op?.pente ?? especificacao?.pente ?? '-';
  const faca = op?.faca ?? especificacao?.faca ?? '-';
  const avanco = op?.avanco ?? especificacao?.avanco ?? '-';
  const abertura = op?.abertura ?? especificacao?.abertura ?? '-';
  const totalFios = op?.total_fios ?? op?.totalFios ?? especificacao?.totalFios ?? '-';
  const metrosPlanejados = op?.metros ? `${op.metros} m` : (op?.quantidade_planejada ? `${op.quantidade_planejada} m` : '-');
  const isDesenho = Boolean(op?.is_desenho ?? op?.isDesenho);

  // Normalização do histórico de ocorrências
  const formatarOcorrencia = (oc: string | OcorrenciaProducaoItem, index: number) => {
    if (typeof oc === 'string') {
      // Extrair se tem formato "Portada XX [HH:MM:SS] - Descrição"
      const match = oc.match(/^(Portada \d+)(?: \[[^\]]+\])? - (.+)$/i);
      if (match) {
        return {
          portada: match[1],
          descricao: match[2]
        };
      }
      return {
        portada: `Ocorrência #${index + 1}`,
        descricao: oc
      };
    }
    return {
      portada: oc.portada ? `Portada ${String(oc.portada).padStart(2, '0')}` : `Ocorrência #${index + 1}`,
      descricao: oc.texto || oc.tipo || 'Ocorrência registrada'
    };
  };

  const listaOcorrencias = (ocorrenciasProducao || []).map(formatarOcorrencia);

  const podeContinuar = roleteConfirmado === 'SIM';

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200 pb-10">
      {/* Banner de Status Superior */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-950/20 border border-blue-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-900/30">
            <ClipboardCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Etapa 1 de 2 • Revisão</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Revisão do Rolo
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300">
              Produção concluída. Realize a conferência técnica e confirme o rolete antes de liberar a retirada.
            </p>
          </div>
        </div>

        {onVoltarProducao && (
          <button
            type="button"
            onClick={onVoltarProducao}
            className="self-end sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors border border-white/10"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        )}
      </div>

      {/* 1. Bloco de Identificação */}
      <div className="bg-[#121620] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400 border-b border-white/10 pb-3">
          <User className="w-4 h-4" />
          <span>Identificação da Produção</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Ordem (OP)
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-400 block">
              {op?.codigo}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Cliente
            </span>
            <span className="text-base sm:text-lg font-black text-white truncate block">
              {clienteNome}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Máquina
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono block">
              {maquina}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Operador
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-400 truncate block">
              {operadorNome}
            </span>
          </div>
        </div>

        <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-3.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Rolo Atual em Revisão:
          </span>
          <span className="text-base font-mono font-black text-blue-300">
            {roloAtualFormatado}
          </span>
        </div>
      </div>

      {/* 2. Bloco de Dados Técnicos */}
      <div className="bg-[#121620] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-400 border-b border-white/10 pb-3">
          <Settings2 className="w-4 h-4" />
          <span>Dados Técnicos do Rolo</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-black/40 rounded-2xl p-3 border border-white/5 col-span-2 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Rolete Cadastrado
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-amber-300 block">
              {roleteCadastrado}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Pente
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-white block">
              {pente}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Faca
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-white block">
              {faca}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Avanço
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-white block">
              {avanco}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Abertura
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-white block">
              {abertura}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Total de Fios
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-white block">
              {totalFios}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Fios por Portada
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-white block">
              {fiosPorPortada}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Total de Portadas
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-emerald-400 block">
              {totalPortadas}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Metros Planejados
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-blue-400 block">
              {metrosPlanejados}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3 border border-white/5 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Rolo Desenho
            </span>
            <span className={`text-sm sm:text-base font-black block ${isDesenho ? 'text-amber-400' : 'text-neutral-300'}`}>
              {isDesenho ? 'SIM' : 'NÃO'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Histórico da Produção (Ocorrências do Rolo) */}
      <div className="bg-[#121620] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
            <History className="w-4 h-4" />
            <span>Histórico da Produção (Ocorrências)</span>
          </div>
          <span className="text-xs font-mono text-neutral-400 font-bold">
            {listaOcorrencias.length} {listaOcorrencias.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {listaOcorrencias.length === 0 ? (
          <div className="bg-black/30 rounded-2xl p-6 text-center border border-white/5 space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto opacity-80" />
            <p className="text-sm text-neutral-300 font-bold">
              Nenhuma ocorrência registrada durante a produção deste rolo.
            </p>
            <p className="text-xs text-neutral-500">
              Todas as portadas foram concluídas sem apontamentos anômalos.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {listaOcorrencias.map((item, idx) => (
              <div 
                key={idx}
                className="bg-black/40 border border-amber-500/20 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30 shrink-0">
                    {item.portada}
                  </span>
                  <span className="text-sm text-white font-medium">
                    {item.descricao}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Confirmação Obrigatória do Rolete */}
      <div className="bg-[#151924] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
              Confirmação Obrigatória do Rolete
            </h3>
            <p className="text-xs text-neutral-300 font-medium mt-0.5">
              Rolete cadastrado na OP: <strong className="text-amber-300 font-mono text-sm">{roleteCadastrado}</strong>
            </p>
          </div>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <p className="text-sm sm:text-base font-bold text-white">
            O rolete correto já está instalado?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opção SIM */}
            <label 
              onClick={() => setRoleteConfirmado('SIM')}
              className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                roleteConfirmado === 'SIM'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                  : 'bg-black/30 border-white/10 text-neutral-300 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <input 
                type="radio" 
                name="confirmarRolete"
                checked={roleteConfirmado === 'SIM'}
                onChange={() => setRoleteConfirmado('SIM')}
                className="w-5 h-5 accent-emerald-500 cursor-pointer" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Sim, rolete correto instalado
                </span>
                <span className="text-xs text-neutral-400">
                  Confirmar rolete e liberar para retirada
                </span>
              </div>
            </label>

            {/* Opção NÃO */}
            <label 
              onClick={() => setRoleteConfirmado('NAO')}
              className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                roleteConfirmado === 'NAO'
                  ? 'bg-red-950/40 border-red-500 text-white shadow-lg shadow-red-950/30'
                  : 'bg-black/30 border-white/10 text-neutral-300 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <input 
                type="radio" 
                name="confirmarRolete"
                checked={roleteConfirmado === 'NAO'}
                onChange={() => setRoleteConfirmado('NAO')}
                className="w-5 h-5 accent-red-500 cursor-pointer" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-wider text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Não, rolete incorreto / ausente
                </span>
                <span className="text-xs text-neutral-400">
                  Bloquear retirada até a correção
                </span>
              </div>
            </label>
          </div>

          {roleteConfirmado === 'NAO' && (
            <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-3 text-xs text-red-300 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Atenção: O rolete correto deve estar devidamente instalado para continuar com a retirada do rolo.
              </span>
            </div>
          )}

          {!roleteConfirmado && (
            <p className="text-xs text-amber-400/90 font-medium italic">
              * A confirmação do rolete é obrigatória para prosseguir com a retirada.
            </p>
          )}
        </div>
      </div>

      {/* 5. Botão de Ação: Iniciar Retirada do Rolo */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!podeContinuar}
          onClick={onIniciarRetirada}
          className={`w-full h-20 sm:h-24 rounded-3xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.99] border ${
            podeContinuar
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40 border-blue-400/40 cursor-pointer'
              : 'bg-neutral-800/70 border-white/10 text-neutral-400 cursor-not-allowed opacity-60'
          }`}
        >
          <ArrowRight className="w-7 h-7 stroke-[2.5]" />
          <div className="flex flex-col items-center">
            <span className="text-base sm:text-xl font-black uppercase tracking-wider">
              INICIAR RETIRADA DO ROLO
            </span>
            {!podeContinuar && (
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                (Confirme se o rolete correto está instalado para prosseguir)
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
