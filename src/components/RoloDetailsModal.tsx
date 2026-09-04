import { Rolo, Operador, EventoProducao } from '../types';
import { X, Clock, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

interface RoloDetailsModalProps {
  rolo: Rolo;
  operadores: Operador[];
  onClose: () => void;
}

export default function RoloDetailsModal({ rolo, operadores, onClose }: RoloDetailsModalProps) {
  const { user, eventosProducao } = useStore();

  const roloEventos = eventosProducao
    .filter(ev => ev.roloId === rolo.id)
    .sort((a, b) => new Date(a.timestampInicio).getTime() - new Date(b.timestampInicio).getTime());

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Rolo {rolo.numeroRolo}</h2>
            <p className="text-neutral-400 text-sm">Rastreabilidade completa de eventos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <span className="text-xs text-neutral-500 block mb-1 uppercase tracking-wider">Status</span>
              <span className={`text-sm font-bold ${
                rolo.status === 'FINALIZADO' ? 'text-emerald-500' : 
                rolo.status === 'EM_ANDAMENTO' ? 'text-blue-500' : 'text-neutral-500'
              }`}>
                {rolo.status.replace('_', ' ')}
              </span>
            </div>
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <span className="text-xs text-neutral-500 block mb-1 uppercase tracking-wider">Portadas</span>
              <span className="text-sm font-bold text-white">{rolo.portadasTotal}</span>
            </div>
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <span className="text-xs text-neutral-500 block mb-1 uppercase tracking-wider">Início</span>
              <span className="text-sm font-bold text-white">
                {rolo.iniciadoEm ? format(new Date(rolo.iniciadoEm), 'HH:mm', { locale: ptBR }) : '-'}
              </span>
            </div>
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <span className="text-xs text-neutral-500 block mb-1 uppercase tracking-wider">Fim</span>
              <span className="text-sm font-bold text-white">
                {rolo.finalizadoEm ? format(new Date(rolo.finalizadoEm), 'HH:mm', { locale: ptBR }) : '-'}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Linha do Tempo
            </h3>
            <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
              {roloEventos.slice().reverse().map((event, idx) => {
                const operador = operadores.find(o => o.id === event.operadorId);
                return (
                  <div key={event.id} className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-neutral-900 border-2 border-blue-500 z-10"></div>
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-white uppercase text-xs tracking-widest">{event.tipoEvento.replace('_', ' ')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-neutral-500">
                            {format(new Date(event.timestampInicio), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      {event.observacao && (
                        <p className="text-sm text-neutral-400 mb-2">{event.observacao}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        {operador && (
                          <div className="flex items-center gap-2 text-xs text-blue-400">
                            <User className="w-3 h-3" />
                            {operador.nome}
                          </div>
                        )}
                        <span className="text-[10px] text-neutral-600 font-bold uppercase">
                          Portada {event.portadasNoEvento}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {roloEventos.length === 0 && (
                <p className="text-neutral-500 text-sm pl-10 italic">Nenhum evento registrado para este rolo.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" />
              Operadores Envolvidos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rolo.operadores.map((opRel, idx) => {
                const operador = operadores.find(o => o.id === opRel.operadorId);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-xs uppercase">
                        {operador?.nome.charAt(0)}
                      </div>
                      <span className="text-sm text-white font-medium">{operador?.nome}</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-400">{opRel.portadas} portadas</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-800 bg-neutral-950/50">
          <button 
            onClick={onClose}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-bold transition-colors uppercase tracking-widest text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
