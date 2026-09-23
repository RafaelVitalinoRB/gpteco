import React, { useState, useEffect } from 'react';
import { X, Building2, User, Package, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { registrarEntradaMateriaPrima } from '../../../services/materiaPrimaService';
import { TIPOS_FIO } from '../../../lib/calculations';

interface NovaEntradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientePreselecionado?: { id: string | number; nome: string } | null;
  onSuccess?: () => void;
  clientesDisponiveis?: Array<{ id: string | number; nome: string; razao_social?: string; nome_fantasia?: string }>;
}

export function NovaEntradaModal({
  isOpen,
  onClose,
  clientePreselecionado,
  onSuccess,
  clientesDisponiveis = []
}: NovaEntradaModalProps) {
  const { user } = useStore();

  const [origem, setOrigem] = useState<'CLIENTE' | 'EMPRESA'>('CLIENTE');
  const [clienteId, setClienteId] = useState<string | number>('');
  const [fornecedor, setFornecedor] = useState<string>('');
  const [titulo, setTitulo] = useState<string>('');
  const [tipo, setTipo] = useState<string>('POLIÉSTER');
  const [cor, setCor] = useState<string>('BRANCO');
  const [caixas, setCaixas] = useState<string>('');
  const [pesoKg, setPesoKg] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (clientePreselecionado) {
      setOrigem('CLIENTE');
      setClienteId(clientePreselecionado.id);
    } else if (clientesDisponiveis.length > 0 && !clienteId) {
      setClienteId(clientesDisponiveis[0].id);
    }
  }, [clientePreselecionado, clientesDisponiveis]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (origem === 'CLIENTE' && !clienteId) {
      toast.error('Selecione o Cliente');
      return;
    }

    if (origem === 'EMPRESA' && !fornecedor.trim()) {
      toast.error('Informe o Fornecedor');
      return;
    }

    if (!titulo.trim()) {
      toast.error('Informe o Título do material');
      return;
    }

    if (!tipo.trim()) {
      toast.error('Informe o Tipo do material');
      return;
    }

    if (!cor.trim()) {
      toast.error('Informe a Cor');
      return;
    }

    const caixasNum = parseInt(caixas, 10);
    if (isNaN(caixasNum) || caixasNum <= 0) {
      toast.error('Informe a quantidade de caixas válida (> 0)');
      return;
    }

    const pesoNum = parseFloat(pesoKg.replace(',', '.'));
    if (isNaN(pesoNum) || pesoNum <= 0) {
      toast.error('Informe o peso em kg válido (> 0)');
      return;
    }

    try {
      setIsSubmitting(true);

      const clienteSel = clientesDisponiveis.find(c => String(c.id) === String(clienteId));
      const clienteNome = clientePreselecionado?.nome || clienteSel?.nome || clienteSel?.razao_social || clienteSel?.nome_fantasia || '';

      const usuarioNome = (user as any)?.nome || user?.role || 'Escritório';

      await registrarEntradaMateriaPrima({
        origem,
        clienteId: origem === 'CLIENTE' ? clienteId : undefined,
        clienteNome: origem === 'CLIENTE' ? clienteNome : undefined,
        fornecedor: origem === 'EMPRESA' ? fornecedor.trim() : undefined,
        titulo: titulo.trim(),
        tipo: tipo.trim(),
        cor: cor.trim().toUpperCase(),
        quantidadeCaixas: caixasNum,
        pesoKg: pesoNum,
        observacao: observacao.trim(),
        usuario: usuarioNome
      });

      toast.success('Entrada de matéria-prima registrada com sucesso!');
      
      // Limpar campos
      setTitulo('');
      setCaixas('');
      setPesoKg('');
      setObservacao('');
      setFornecedor('');

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar entrada de matéria-prima:', err);
      toast.error(`Erro ao salvar entrada: ${err.message || 'Falha inesperada'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-950/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Package className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">Nova Entrada de Matéria-Prima</h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Controle de estoque, registro de movimentação e saldo automático
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 1. Origem da Matéria-Prima */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Origem da Matéria-Prima <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrigem('CLIENTE')}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                  origem === 'CLIENTE'
                    ? 'border-blue-500 bg-blue-500/10 text-white shadow-sm shadow-blue-500/20'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${origem === 'CLIENTE' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Cliente</div>
                  <div className="text-xs text-neutral-500">Material de cliente para beneficiamento</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOrigem('EMPRESA')}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                  origem === 'EMPRESA'
                    ? 'border-purple-500 bg-purple-500/10 text-white shadow-sm shadow-purple-500/20'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${origem === 'EMPRESA' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Empresa</div>
                  <div className="text-xs text-neutral-500">Material próprio ou compra de fornecedor</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Campo condicional: Cliente ou Fornecedor */}
          {origem === 'CLIENTE' ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Cliente <span className="text-red-400">*</span>
              </label>
              {clientePreselecionado ? (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-medium flex items-center justify-between">
                  <span>{clientePreselecionado.nome}</span>
                  <span className="text-xs text-neutral-500 font-mono">ID: {clientePreselecionado.id}</span>
                </div>
              ) : (
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clientesDisponiveis.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome || c.razao_social || c.nome_fantasia || `Cliente #${c.id}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Fornecedor <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Ex: Fiação São José, Polytex, etc."
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-neutral-600"
                required
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Campo simples de identificação do fornecedor nesta Sprint.
              </p>
            </div>
          )}

          {/* 3. Título, Tipo e Cor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: 150/48, 75/36"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-neutral-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Tipo <span className="text-red-400">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {TIPOS_FIO.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="OUTRO">OUTRO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Cor <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                placeholder="Ex: BRANCO, CRU, PRETO"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-neutral-600 uppercase"
                required
              />
            </div>
          </div>

          {/* 4. Caixas e Peso (kg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Quantidade de Caixas <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={caixas}
                onChange={(e) => setCaixas(e.target.value)}
                placeholder="0"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-neutral-600 font-mono text-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Peso Líquido (kg) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                placeholder="0.00"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-neutral-600 font-mono text-lg"
                required
              />
            </div>
          </div>

          {/* 5. Observação */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Observação
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Lote do fornecedor, número de nota ou instruções especiais..."
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-neutral-600 text-sm"
            />
          </div>

          {/* Informativo de automação da Sprint 3.1A */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 text-xs text-neutral-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-300">Atualização Automática:</span>
              <span className="text-neutral-500 block mt-0.5">
                Ao salvar, o sistema atualizará o saldo do material, registrará a movimentação no histórico com data e usuário, e preparará o evento para o módulo de notificações.
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Entrada
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
