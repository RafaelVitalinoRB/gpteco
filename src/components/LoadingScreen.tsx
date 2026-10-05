import React from 'react';

interface LoadingScreenProps {
  mensagem?: string;
}

/**
 * SPRINT BETA 1.0 — Tela "Conectando ao TEXLOG..."
 * Usada durante verificação de credenciais e permissões no Supabase.
 */
export default function LoadingScreen({ mensagem = 'Conectando ao TEXLOG...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-[#121417] flex flex-col items-center justify-center p-6 text-white select-none relative overflow-hidden">
      {/* Luz ambiente discreta */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center text-center space-y-6 z-10 animate-in fade-in duration-300">
        {/* Spinner animado com logo central */}
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-neutral-800 border-t-cyan-500 animate-spin" />
          <div className="absolute w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center shadow-lg border border-cyan-500/30">
            <span className="text-white font-black text-xl">T</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            {mensagem}
          </h2>
          <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
            Autenticando permissões de acesso
          </p>
        </div>
      </div>
    </div>
  );
}
