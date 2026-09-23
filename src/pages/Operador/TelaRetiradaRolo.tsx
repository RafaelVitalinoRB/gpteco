import React, { useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  CheckSquare, 
  Square, 
  Plus, 
  X, 
  Clock, 
  User, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { OP } from '../../types';

export interface OcorrenciaRetiradaItem {
  id: string;
  tipo: string;
  obs?: string;
  texto: string;
  horario: string;
  fase_ocorrencia: 'RETIRADA';
}

interface TelaRetiradaRoloProps {
  op: OP | any;
  clienteNome: string;
  operadorNome: string;
  maquina: string;
  roloAtualFormatado: string;
  ocorrenciasRetirada: OcorrenciaRetiradaItem[];
  onAdicionarOcorrenciaRetirada: (tipo: string, obs?: string) => void;
  onRemoverOcorrenciaRetirada?: (id: string) => void;
  onFinalizarRetirada: () => void;
  onVoltarRevisao?: () => void;
}

const OCORRENCIAS_PADRAO_RETIRADA = [
  'Rolete travado',
  'Flange torta',
  'Flange desalinhada',
  'Dificuldade na retirada',
  'Outros'
];

export const TelaRetiradaRolo: React.FC<TelaRetiradaRoloProps> = ({
  op,
  clienteNome,
  operadorNome,
  maquina,
  roloAtualFormatado,
  ocorrenciasRetirada,
  onAdicionarOcorrenciaRetirada,
  onRemoverOcorrenciaRetirada,
  onFinalizarRetirada,
  onVoltarRevisao
}) => {
  // Modal / input para registrar ocorrência da retirada
  const [modalAberta, setModalAberta] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('Rolete travado');
  const [observacao, setObservacao] = useState('');

  // Checklist obrigatório de 4 itens da retirada (Máquina preparada removida - Sprint 2.4.4)
  const [checklist, setChecklist] = useState({
    roleteCorreto: true, // Confirmado na etapa de revisão
    revisaoConcluida: true, // Concluída na etapa anterior
    ocorrenciasRegistradas: false,
    roloRetirado: false
  });

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSalvarOcorrencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoSelecionado) return;
    onAdicionarOcorrenciaRetirada(tipoSelecionado, observacao.trim() || undefined);
    setObservacao('');
    setTipoSelecionado('Rolete travado');
    setModalAberta(false);
    // Automaticamente marca "Ocorrências registradas" como true
    setChecklist(prev => ({ ...prev, ocorrenciasRegistradas: true }));
  };

  const itensChecklist = [
    {
      id: 'roleteCorreto' as const,
      titulo: 'Rolete correto',
      descricao: 'Rolete correto confirmado e devidamente verificado.',
      obrigatorio: true
    },
    {
      id: 'revisaoConcluida' as const,
      titulo: 'Revisão concluída',
      descricao: 'Todos os parâmetros técnicos e histórico do rolo revisados.',
      obrigatorio: true
    },
    {
      id: 'ocorrenciasRegistradas' as const,
      titulo: 'Ocorrências registradas',
      descricao: 'Ocorrências da retirada apontadas ou verificado que não houve incidentes.',
      obrigatorio: true
    },
    {
      id: 'roloRetirado' as const,
      titulo: 'Rolo retirado da máquina',
      descricao: 'Rolo desacoplado e retirado com segurança da urdideira.',
      obrigatorio: true
    }
  ];

  const totalConcluidos = Object.values(checklist).filter(Boolean).length;
  const todosConcluidos = totalConcluidos === 4;
  const faltantes = 4 - totalConcluidos;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200 pb-12">
      {/* 6. Cabeçalho da Tela: RETIRADA DO ROLO */}
      <div className="bg-[#121620] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/40">
              <Package className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Etapa 2 de 2 • Retirada</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                RETIRADA DO ROLO
              </h1>
              <p className="text-xs text-neutral-400">
                Execute a desinstalação física do rolo e realize o checklist obrigatório
              </p>
            </div>
          </div>

          {onVoltarRevisao && (
            <button
              type="button"
              onClick={onVoltarRevisao}
              className="self-end sm:self-auto px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors border border-white/10"
            >
              Revisão
            </button>
          )}
        </div>

        {/* Identificação de Cabeçalho: OP, Cliente, Operador, Máquina */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              OP
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-blue-400 block">
              {op?.codigo}
            </span>
          </div>

          <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Cliente
            </span>
            <span className="text-base sm:text-lg font-black text-white truncate block">
              {clienteNome}
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

          <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Rolo / Máquina
            </span>
            <div className="flex items-center justify-between">
              <span className="text-base font-black font-mono text-amber-300">
                {roloAtualFormatado}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                ({maquina})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. NOVAS OCORRÊNCIAS: Grupo Exclusivo da Retirada */}
      <div className="bg-[#121620] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Ocorrências da Retirada</span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Grupo exclusivo: ocorrências registradas durante o manuseio e retirada do rolo
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalAberta(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/40 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Ocorrência</span>
          </button>
        </div>

        {/* Lista de Ocorrências da Retirada registradas */}
        {ocorrenciasRetirada.length === 0 ? (
          <div className="bg-black/30 rounded-2xl p-5 text-center border border-white/5">
            <p className="text-xs text-neutral-400 font-medium">
              Nenhuma ocorrência registrada durante a retirada.
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Se houve qualquer travamento ou avaria na retirada, clique em "Registrar Ocorrência".
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ocorrenciasRetirada.map((item) => (
              <div
                key={item.id}
                className="bg-black/40 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-xs border border-amber-500/40 uppercase">
                    RETIRADA
                  </span>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {item.texto}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.horario}
                    </span>
                  </div>
                </div>

                {onRemoverOcorrenciaRetirada && (
                  <button
                    type="button"
                    onClick={() => onRemoverOcorrenciaRetirada(item.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Remover ocorrência"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. CHECKLIST OBRIGATÓRIO DA RETIRADA */}
      <div className="bg-[#121620] border-2 border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Checklist Obrigatório da Retirada
              </h3>
              <p className="text-xs text-neutral-400">
                Todos os 5 itens devem ser confirmados para liberar a finalização
              </p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-xl text-xs font-black font-mono border ${
            todosConcluidos
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          }`}>
            {totalConcluidos} de 5 concluídos
          </div>
        </div>

        {/* Itens do Checklist */}
        <div className="space-y-3">
          {itensChecklist.map((item) => {
            const isChecked = checklist[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-white'
                    : 'bg-black/40 border-white/10 text-neutral-300 hover:bg-white/5 hover:border-white/20'
                }`}
              >
                <button
                  type="button"
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-900/40'
                      : 'bg-neutral-800 border border-neutral-700 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm sm:text-base font-black uppercase tracking-wider ${
                      isChecked ? 'text-white' : 'text-neutral-200'
                    }`}>
                      {item.titulo}
                    </span>
                    {isChecked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        Confirmado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {item.descricao}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 10. BOTÃO DE AÇÃO: CONCLUIR RETIRADA */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!todosConcluidos}
          onClick={onFinalizarRetirada}
          className={`w-full h-20 sm:h-24 rounded-3xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.99] border ${
            todosConcluidos
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 border-emerald-400/40 cursor-pointer'
              : 'bg-neutral-800/70 border-white/10 text-neutral-400 cursor-not-allowed opacity-60'
          }`}
        >
          <CheckCircle2 className="w-8 h-8 stroke-[2.3]" />
          <div className="flex flex-col items-center">
            <span className="text-base sm:text-xl font-black uppercase tracking-wider">
              CONCLUIR RETIRADA
            </span>
            {!todosConcluidos ? (
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                (Faltam {faltantes} {faltantes === 1 ? 'item' : 'itens'} no checklist para liberar)
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mt-0.5">
                Registrar retirada • Liberar máquina • Aguardando pesagem
              </span>
            )}
          </div>
        </button>
      </div>

      {/* MODAL: Registrar ocorrência da retirada */}
      {modalAberta && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#121620] border-2 border-amber-500/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl shadow-amber-950/50 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Registrar Ocorrência da Retirada
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400 uppercase">
                    Fase: RETIRADA
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarOcorrencia} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                  Selecione a ocorrência:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {OCORRENCIAS_PADRAO_RETIRADA.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoSelecionado(tipo)}
                      className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left border transition-all ${
                        tipoSelecionado === tipo
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                          : 'bg-black/30 border-white/10 text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {tipoSelecionado === 'Outros' && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Descreva a ocorrência:
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Descreva detalhes sobre a dificuldade ou incidente na retirada..."
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberta(false)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/40 transition-all active:scale-95"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
