import React, { useRef } from 'react';
import { X, Printer, Download, Building2, Truck, Calendar, Scale, Layers } from 'lucide-react';
import { useEmpresa, formatarEnderecoEmpresa } from '../../../services/empresaService';

export interface RoloRomaneioLinha {
  numero_rolo: string;
  titulo_fio: string;
  tipo_fio?: string;
  cor: string;
  total_fios?: number | string;
  metros: number;
  peso_bruto?: number;
  tara?: number;
  peso_liquido: number;
  rolete?: string;
  voltas?: number;
  op_codigo?: string;
}

export interface RomaneioExpedicaoDados {
  id: string;
  codigoRomaneio: string;
  clienteNome: string;
  clienteCnpj?: string;
  clienteCidade?: string;
  dataEmissao: string;
  motoristaPlaca?: string;
  observacoes?: string;
  rolos: RoloRomaneioLinha[];
}

interface VisualizadorRomaneioModalProps {
  romaneio: RomaneioExpedicaoDados | null;
  onClose: () => void;
}

export function VisualizadorRomaneioModal({ romaneio, onClose }: VisualizadorRomaneioModalProps) {
  const { empresa } = useEmpresa();
  const printRef = useRef<HTMLDivElement>(null);

  if (!romaneio) return null;

  const totalRolos = romaneio.rolos.length;
  const totalMetros = romaneio.rolos.reduce((acc, r) => acc + (r.metros || 0), 0);
  const totalPesoLiquido = romaneio.rolos.reduce((acc, r) => acc + (r.peso_liquido || 0), 0);
  const totalPesoBruto = romaneio.rolos.reduce((acc, r) => acc + (r.peso_bruto || (r.peso_liquido + (r.tara || 1.8))), 0);
  const totalTara = romaneio.rolos.reduce((acc, r) => acc + (r.tara || 1.8), 0);

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="p-4 md:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-white">Romaneio Oficial de Expedição</h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {romaneio.codigoRomaneio}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Cliente: <strong className="text-white">{romaneio.clienteNome}</strong> • Emissão: {new Date(romaneio.dataEmissao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Área de Impressão / Documento Formatado */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-950/40">
          <div ref={printRef} className="bg-white text-neutral-900 rounded-2xl p-6 md:p-8 shadow-xl max-w-4xl mx-auto space-y-6 print:m-0 print:p-4 print:shadow-none print:max-w-none">
            
            {/* Cabeçalho da Empresa RB SOUZA */}
            <div className="border-b-2 border-neutral-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {empresa.logotipo ? (
                  <img src={empresa.logotipo} alt={empresa.nomeFantasia} className="h-12 w-auto object-contain max-w-[140px]" />
                ) : (
                  <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center font-black text-xl">
                    RB
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-black uppercase tracking-tight text-neutral-900 leading-tight">
                    {empresa.razaoSocial || 'RB SOUZA BENEFICIAMENTO TÊXTIL'}
                  </h1>
                  <p className="text-xs text-neutral-600">
                    CNPJ: {empresa.cnpj || '—'} • IE: {empresa.inscricaoEstadual || '—'}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {formatarEnderecoEmpresa(empresa)}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right bg-neutral-100 p-3 rounded-xl border border-neutral-200 min-w-[200px]">
                <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider block">
                  ROMANEIO DE EXPEDIÇÃO
                </span>
                <span className="text-xl font-mono font-black text-emerald-800 block">
                  {romaneio.codigoRomaneio}
                </span>
                <span className="text-xs text-neutral-600 font-mono">
                  Data: {new Date(romaneio.dataEmissao).toLocaleDateString('pt-BR')} às {new Date(romaneio.dataEmissao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Dados do Destinatário / Cliente */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-bold text-neutral-500 uppercase tracking-wider block text-[10px]">Destinatário / Cliente</span>
                <span className="text-sm font-black text-neutral-900">{romaneio.clienteNome}</span>
                {romaneio.clienteCnpj && <span className="block text-neutral-600">CNPJ: {romaneio.clienteCnpj}</span>}
              </div>
              <div>
                <span className="font-bold text-neutral-500 uppercase tracking-wider block text-[10px]">Transporte & Expedição</span>
                <span className="font-medium text-neutral-800">{romaneio.motoristaPlaca || 'Veículo Próprio / Retirada do Cliente'}</span>
                {romaneio.observacoes && <span className="block text-neutral-600 italic">Obs: {romaneio.observacoes}</span>}
              </div>
            </div>

            {/* Tabela de Itens: Linhas com colunas solicitadas */}
            <div className="overflow-x-auto border border-neutral-300 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 text-white uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 font-black">Nº Oficial Rolo</th>
                    <th className="py-2.5 px-2 font-black">Título Fio</th>
                    <th className="py-2.5 px-2 font-black">Tipo Fio</th>
                    <th className="py-2.5 px-2 font-black">Cor</th>
                    <th className="py-2.5 px-2 font-black text-center">Total Fios</th>
                    <th className="py-2.5 px-2 font-black text-right">Metros</th>
                    <th className="py-2.5 px-2 font-black text-right">P. Bruto (kg)</th>
                    <th className="py-2.5 px-2 font-black text-right">Tara (kg)</th>
                    <th className="py-2.5 px-3 font-black text-right bg-emerald-950 text-emerald-200">P. Líquido (kg)</th>
                    <th className="py-2.5 px-2 font-black text-center">Rolete</th>
                    <th className="py-2.5 px-2 font-black text-right">Voltas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {romaneio.rolos.map((rolo, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/70'}>
                      <td className="py-2 px-3 font-mono font-black text-sm text-neutral-900">
                        {rolo.numero_rolo}
                      </td>
                      <td className="py-2 px-2 font-bold text-neutral-800 font-mono">
                        {rolo.titulo_fio}
                      </td>
                      <td className="py-2 px-2 text-neutral-700 uppercase font-semibold">
                        {rolo.tipo_fio || 'POLIÉSTER'}
                      </td>
                      <td className="py-2 px-2 text-neutral-800 font-medium">
                        {rolo.cor || 'CRU'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-neutral-700">
                        {rolo.total_fios || '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-neutral-900">
                        {rolo.metros?.toLocaleString('pt-BR')} m
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-neutral-600">
                        {(rolo.peso_bruto || (rolo.peso_liquido + (rolo.tara || 1.8))).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-neutral-500">
                        {(rolo.tara || 1.8).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-50">
                        {rolo.peso_liquido.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-neutral-700">
                        {rolo.rolete || '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-neutral-700">
                        {rolo.voltas ? rolo.voltas.toLocaleString('pt-BR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais do Romaneio */}
            <div className="bg-neutral-900 text-white rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border border-neutral-800">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Quantidade Total de Rolos
                </span>
                <span className="text-2xl font-black font-mono text-white">
                  {totalRolos} <span className="text-sm font-normal text-neutral-400">rolos</span>
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Total de Metros
                </span>
                <span className="text-2xl font-black font-mono text-blue-400">
                  {totalMetros.toLocaleString('pt-BR')} <span className="text-sm font-normal text-neutral-400">m</span>
                </span>
              </div>
              <div className="text-center sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Peso Total da Carga (Líquido)
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {totalPesoLiquido.toFixed(2)} <span className="text-sm font-normal text-neutral-400">kg</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono block">
                  Bruto: {totalPesoBruto.toFixed(2)} kg • Tara: {totalTara.toFixed(2)} kg
                </span>
              </div>
            </div>

            {/* Assinaturas */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-neutral-400 pt-2">
                <span className="font-bold block text-neutral-800">Expedido por (RB SOUZA)</span>
                <span className="text-[11px] text-neutral-500">Conferência & Liberação</span>
              </div>
              <div className="border-t border-neutral-400 pt-2">
                <span className="font-bold block text-neutral-800">Recebido por (Cliente / Transportador)</span>
                <span className="text-[11px] text-neutral-500">Data: ____/____/________</span>
              </div>
            </div>

          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            Documento emitido pelo <strong>TEXLOG ERP</strong> • RB Souza
          </span>
          <button
            onClick={onClose}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
