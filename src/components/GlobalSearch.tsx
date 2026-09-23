import React, { useState, useEffect, useRef } from 'react';
import { Search, User, FileText, Package, Hash, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useOperadores } from '../hooks/useOperadores';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import RoloDetailsModal from './RoloDetailsModal';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    clientes: any[];
    ops: any[];
    rolos: any[];
    nfs: any[];
  }>({ clientes: [], ops: [], rolos: [], nfs: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoloId, setSelectedRoloId] = useState<string | null>(null);
  const { clientes, ops, rolos, entradas, saidas } = useStore();
  const { operadores } = useOperadores();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ clientes: [], ops: [], rolos: [], nfs: [] });
      return;
    }

    const q = query.toLowerCase();

    const filteredClientes = clientes.filter(c => 
      c.nomeFantasia.toLowerCase().includes(q) || 
      c.razaoSocial.toLowerCase().includes(q)
    );

    const filteredOps = ops.filter(op => 
      op.codigo.toLowerCase().includes(q)
    );

    const filteredRolos = rolos.filter(r => 
      r.numeroRolo.toString().includes(q)
    );

    const filteredNfs = [
      ...entradas.map(e => ({ ...e, source: 'Entrada' })),
      ...saidas.filter(s => s.nfNumero).map(s => ({ ...s, source: 'Saída' }))
    ].filter(item => item.nfNumero?.toLowerCase().includes(q));

    setResults({
      clientes: filteredClientes,
      ops: filteredOps,
      rolos: filteredRolos,
      nfs: filteredNfs
    });
    setIsOpen(true);
  }, [query, clientes, ops, rolos, entradas, saidas]);

  const handleSelect = (type: string, id: string, opId?: string) => {
    setIsOpen(false);
    setQuery('');
    
    switch (type) {
      case 'cliente':
        navigate('/programador/clientes');
        break;
      case 'op':
        navigate('/programador/ops');
        break;
      case 'rolo':
        setSelectedRoloId(id);
        break;
      case 'nf':
        navigate('/escritorio');
        break;
    }
  };

  const hasResults = results.clientes.length > 0 || results.ops.length > 0 || results.rolos.length > 0 || results.nfs.length > 0;

  return (
    <div className="relative w-full max-w-xl" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input
          type="text"
          placeholder="Buscar cliente, NF, rolo ou OP..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-[100] max-h-[70vh] overflow-y-auto">
          {!hasResults ? (
            <div className="p-8 text-center text-neutral-500">
              Nenhum resultado encontrado para "{query}"
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {results.clientes.length > 0 && (
                <div>
                  <h3 className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">Clientes</h3>
                  {results.clientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect('cliente', c.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 rounded-xl transition-colors text-left"
                    >
                      <User className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="text-white font-medium">{c.nomeFantasia}</div>
                        <div className="text-xs text-neutral-500">{c.razaoSocial}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.ops.length > 0 && (
                <div>
                  <h3 className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">Ordens de Produção</h3>
                  {results.ops.map(op => (
                    <button
                      key={op.id}
                      onClick={() => handleSelect('op', op.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 rounded-xl transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-purple-500" />
                      <div>
                        <div className="text-white font-medium">{op.codigo}</div>
                        <div className="text-xs text-neutral-500">{clientes.find(c => c.id === op.clienteId)?.nomeFantasia}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.rolos.length > 0 && (
                <div>
                  <h3 className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">Rolos</h3>
                  {results.rolos.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect('rolo', r.id, r.opId)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 rounded-xl transition-colors text-left"
                    >
                      <Hash className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-white font-medium">Rolo {r.numeroRolo}</div>
                        <div className="text-xs text-neutral-500">OP: {ops.find(o => o.id === r.opId)?.codigo}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.nfs.length > 0 && (
                <div>
                  <h3 className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">Notas Fiscais</h3>
                  {results.nfs.map((nf, idx) => (
                    <button
                      key={`${nf.id}-${idx}`}
                      onClick={() => handleSelect('nf', nf.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 rounded-xl transition-colors text-left"
                    >
                      <Package className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="text-white font-medium">NF {nf.nfNumero}</div>
                        <div className="text-xs text-neutral-500">{nf.source} - {clientes.find(c => c.id === nf.clienteId)?.nomeFantasia}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedRoloId && (
        <RoloDetailsModal 
          rolo={rolos.find(r => r.id === selectedRoloId)!}
          operadores={operadores}
          onClose={() => setSelectedRoloId(null)}
        />
      )}
    </div>
  );
}
