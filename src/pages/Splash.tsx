import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * SPRINT BETA 1.0 — Módulo: Autenticação e Entrada
 * 
 * Layout da Splash:
 *                  TEXLOG
 *       Controle Total da Produção Têxtil
 *                URDIMENTO
 *             Versão Beta 2026
 *               [ INICIAR ]
 * 
 * Rodapé: © 2026 RB Souza
 * Visual:
 * - fundo grafite
 * - logo central
 * - animação discreta de fade
 * - botão azul petróleo
 */
export default function Splash() {
  const navigate = useNavigate();

  const handleIniciar = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#121417] text-neutral-100 flex flex-col justify-between items-center p-6 select-none relative overflow-hidden">
      {/* Luz ambiente discreta de fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Topo vazio para centralização exata */}
      <div className="w-full flex justify-end items-center max-w-4xl py-2">
        <span className="text-[11px] font-mono text-neutral-400 font-semibold uppercase tracking-wider">
          ERP RB SOUZA
        </span>
      </div>

      {/* Conteúdo Central da Splash com animação de fade in */}
      <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-7 animate-in fade-in duration-700 z-10">
        {/* Logo / Emblema Industrial TEXLOG */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center shadow-2xl shadow-cyan-900/40 border border-cyan-500/30">
          <span className="text-white font-black text-4xl tracking-tighter">T</span>
        </div>

        {/* Título Principal */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            TEXLOG
          </h1>
          <p className="text-base sm:text-lg text-neutral-300 font-medium tracking-normal">
            Controle Total da Produção Têxtil
          </p>
          <div className="pt-1">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700 text-cyan-400 font-mono text-xs font-bold tracking-widest uppercase">
              URDIMENTO
            </span>
          </div>
        </div>

        {/* Versão */}
        <div className="pt-1">
          <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
            Versão Beta 2026
          </p>
        </div>

        {/* Botão de Ação: Azul Petróleo */}
        <div className="pt-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleIniciar}
            className="w-full sm:w-64 py-4 px-8 rounded-2xl bg-[#005f73] hover:bg-[#0a9396] active:scale-95 text-white font-black tracking-widest text-sm transition-all duration-200 shadow-xl shadow-[#005f73]/30 cursor-pointer border border-[#0a9396]/40 uppercase flex items-center justify-center gap-3"
          >
            <span>INICIAR</span>
          </button>
        </div>
      </div>

      {/* Rodapé Obrigatório */}
      <footer className="w-full text-center py-4 z-10 border-t border-neutral-800/40">
        <p className="text-xs text-neutral-400 font-mono tracking-wide">
          © 2026 RB Souza
        </p>
      </footer>
    </div>
  );
}
