import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  DeviceConfig, 
  User, 
  Cliente, 
  Especificacao, 
  OP, 
  Rolo, 
  Operador, 
  Entrada, 
  Saida, 
  FioCliente,
  EventoProducao,
  MovimentoRolete
} from '../types';

interface AppState {
  user: User | null;
  deviceConfig: DeviceConfig | null;
  clientes: Cliente[];
  fiosCliente: FioCliente[];
  especificacoes: Especificacao[];
  ops: OP[];
  rolos: Rolo[];
  entradas: Entrada[];
  saidas: Saida[];
  eventosProducao: EventoProducao[];
  movimentosRoletes: MovimentoRolete[];

  // Actions
  login: (user: User) => void;
  logout: () => void;
  
  bindDevice: (config: DeviceConfig) => void;
  unbindDevice: () => void;
  
  // Clientes
  addCliente: (cliente: Cliente) => void;
  updateCliente: (id: string, cliente: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  // Fios do Cliente
  addFioCliente: (fio: FioCliente) => void;
  updateFioCliente: (id: string, fio: Partial<FioCliente>) => void;
  deleteFioCliente: (id: string) => void;

  // Especificacoes
  addEspecificacao: (esp: Especificacao) => void;
  updateEspecificacao: (id: string, esp: Partial<Especificacao>) => void;
  deleteEspecificacao: (id: string) => void;

  // OPs
  addOP: (op: OP, rolos: Rolo[]) => void;
  updateOP: (id: string, op: Partial<OP>) => void;
  deleteOP: (id: string) => void;

  // Rolos
  addRolo: (rolo: Rolo) => void;
  updateRolo: (id: string, rolo: Partial<Rolo>) => void;
  setRolos: (rolos: Rolo[]) => void;

  // Eventos de Produção
  addEventoProducao: (evento: EventoProducao) => void;

  // Escritório / Estoque
  addEntrada: (entrada: Entrada) => void;
  updateEntrada: (id: string, entrada: Partial<Entrada>) => void;
  deleteEntrada: (id: string) => void;
  addSaida: (saida: Saida) => void;
  updateSaida: (id: string, saida: Partial<Saida>) => void;
  deleteSaida: (id: string) => void;

  // Roletes
  addMovimentoRolete: (mov: MovimentoRolete) => void;

  // Reset Operacional
  resetOperacional: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      deviceConfig: null,
      // TODO: substituir mock/local state por Supabase 
      // PROGRESSO: Clientes conectado no modulo Programador
      // PROXIMOS PASSOS: titulos_fio, maquinas, operadores, ordens_producao, rolos, producao_operador, entradas, saida_saldo, saida_rolos, faturamento, usuarios
      clientes: [],
      fiosCliente: [],
      especificacoes: [],
      ops: [],
      rolos: [],
      entradas: [],
      saidas: [],
      eventosProducao: [],
      movimentosRoletes: [],

      login: (user) => set({ user }),
      logout: () => set({ user: null }),

      bindDevice: (config) => set({ deviceConfig: config }),
      unbindDevice: () => set({ deviceConfig: null }),

      // CLIENTES
      addCliente: (cliente) => set((state) => ({ clientes: [...state.clientes, cliente] })),
      updateCliente: (id, cliente) => set((state) => ({
        clientes: state.clientes.map(c => c.id === id ? { ...c, ...cliente, updatedAt: new Date().toISOString() } : c)
      })),
      deleteCliente: (id) => set((state) => {
        const clientOps = state.ops.filter(o => o.clienteId === id).map(o => o.id);
        return {
          clientes: state.clientes.filter(c => c.id !== id),
          fiosCliente: state.fiosCliente.filter(f => f.clienteId !== id),
          especificacoes: state.especificacoes.filter(e => e.clienteId !== id),
          ops: state.ops.filter(o => o.clienteId !== id),
          rolos: state.rolos.filter(r => !clientOps.includes(r.opId)),
          eventosProducao: state.eventosProducao.filter(ev => !clientOps.includes(ev.opId)),
          entradas: state.entradas.filter(e => e.clienteId !== id),
          saidas: state.saidas.filter(s => s.clienteId !== id),
          movimentosRoletes: state.movimentosRoletes.filter(m => m.clienteId !== id)
        };
      }),

      // FIOS CLIENTE
      addFioCliente: (fio) => set((state) => ({ fiosCliente: [...state.fiosCliente, fio] })),
      updateFioCliente: (id, fio) => set((state) => ({
        fiosCliente: state.fiosCliente.map(f => f.id === id ? { ...f, ...fio, updatedAt: new Date().toISOString() } : f)
      })),
      deleteFioCliente: (id) => set((state) => ({
        fiosCliente: state.fiosCliente.filter(f => f.id !== id)
      })),

      // ESPECIFICACOES
      addEspecificacao: (esp) => set((state) => ({ especificacoes: [...state.especificacoes, esp] })),
      updateEspecificacao: (id, esp) => set((state) => ({
        especificacoes: state.especificacoes.map(e => e.id === id ? { ...e, ...esp, updatedAt: new Date().toISOString() } : e)
      })),
      deleteEspecificacao: (id) => set((state) => ({
        especificacoes: state.especificacoes.filter(e => e.id !== id)
      })),

      // OPs
      addOP: (op, rolos) => set((state) => ({ 
        ops: [...state.ops, op],
        rolos: [...state.rolos, ...rolos]
      })),
      updateOP: (id, op) => set((state) => ({
        ops: state.ops.map(o => o.id === id ? { ...o, ...op, updatedAt: new Date().toISOString() } : o)
      })),
      deleteOP: (id) => set((state) => ({
        ops: state.ops.filter(o => o.id !== id),
        rolos: state.rolos.filter(r => r.opId !== id),
        eventosProducao: state.eventosProducao.filter(ev => ev.opId !== id),
        saidas: state.saidas.filter(s => s.opId !== id)
      })),

      // ROLOS
      addRolo: (rolo) => set((state) => ({
        rolos: [rolo, ...state.rolos.filter(r => r.id !== rolo.id && r.numeroRolo !== rolo.numeroRolo)]
      })),
      updateRolo: (id, rolo) => set((state) => ({
        rolos: state.rolos.map(r => r.id === id ? { ...r, ...rolo, updatedAt: new Date().toISOString() } : r)
      })),
      setRolos: (rolos) => set({ rolos }),

      // EVENTOS
      addEventoProducao: (evento) => set((state) => ({
        eventosProducao: [...state.eventosProducao, evento]
      })),

      // ESCRITORIO
      addEntrada: (entrada) => set((state) => ({ entradas: [...state.entradas, entrada] })),
      updateEntrada: (id, entrada) => set((state) => ({
        entradas: state.entradas.map(e => e.id === id ? { ...e, ...entrada, updatedAt: new Date().toISOString() } : e)
      })),
      deleteEntrada: (id) => set((state) => ({
        entradas: state.entradas.filter(e => e.id !== id)
      })),
      addSaida: (saida) => set((state) => ({ saidas: [...state.saidas, saida] })),
      updateSaida: (id, saida) => set((state) => ({
        saidas: state.saidas.map(s => s.id === id ? { ...s, ...saida, updatedAt: new Date().toISOString() } : s)
      })),
      deleteSaida: (id) => set((state) => ({
        saidas: state.saidas.filter(s => s.id !== id)
      })),

      // ROLETES
      addMovimentoRolete: (mov) => set((state) => ({
        movimentosRoletes: [...state.movimentosRoletes, mov]
      })),

      // RESET OPERACIONAL (SPRINT ADMIN 1.0)
      resetOperacional: () => set((state) => ({
        ops: [],
        rolos: [],
        eventosProducao: [],
        movimentosRoletes: [],
        saidas: state.saidas.filter(s => s.tipoLancamento !== 'ROLETES' && !s.roloId && !s.opId)
      }))
    }),
    {
      name: 'texlog-storage-v2', // v2 to avoid conflicts with old structure during development
    }
  )
);
