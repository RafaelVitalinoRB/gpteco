import React, { useRef, useState } from 'react';
import { 
  Printer, 
  Download, 
  ExternalLink, 
  X, 
  FileText, 
  Truck, 
  CheckCircle2, 
  Scale, 
  Layers, 
  Info,
  Calendar,
  User,
  Cpu,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useEmpresa, formatarEnderecoEmpresa } from '../../services/empresaService';
import { RomaneioItem } from './FilaRolosAguardandoPesagem';

interface FichaTecnicaRomaneioModalProps {
  romaneio: RomaneioItem;
  onClose: () => void;
  onExpedir?: (romaneio: RomaneioItem) => void;
}

export const FichaTecnicaRomaneioModal: React.FC<FichaTecnicaRomaneioModalProps> = ({
  romaneio,
  onClose,
  onExpedir
}) => {
  const { empresa } = useEmpresa();
  const printableRef = useRef<HTMLDivElement>(null);
  const [isGerandoPdf, setIsGerandoPdf] = useState(false);

  // Formatar data e hora
  const formatarDataHora = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  // Gerar e Baixar PDF Real (Prioridade 3)
  const handleGerarEBaixarPdf = async () => {
    if (!printableRef.current) return;
    setIsGerandoPdf(true);
    const toastId = toast.loading('Gerando PDF da Ficha Técnica...');
    try {
      const element = printableRef.current;
      
      // Captura o elemento com html2canvas em alta resolução
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const renderHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (renderHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderHeight);
      } else {
        let position = 0;
        let remainingHeight = renderHeight;
        while (remainingHeight > 0) {
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderHeight);
          remainingHeight -= pdfHeight;
          if (remainingHeight > 0) {
            pdf.addPage();
            position -= pdfHeight;
          }
        }
      }

      const fileName = `Romaneio_FichaTecnica_${romaneio.codigoRomaneio}.pdf`;
      pdf.save(fileName);
      toast.success(`PDF baixado com sucesso: ${fileName}`, { id: toastId });
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar PDF: ' + (err?.message || 'Falha ao processar'), { id: toastId });
    } finally {
      setIsGerandoPdf(false);
    }
  };

  // Abrir Visualização em Nova Janela
  const handleAbrirVisualizacaoSeparada = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('O navegador bloqueou a abertura de nova janela. Permita pop-ups.');
      return;
    }
    const htmlContent = printableRef.current?.innerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>${romaneio.codigoRomaneio} - Romaneio & Ficha Técnica do Rolo</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: #fff !important; }
              .no-print { display: none !important; }
              @page { size: A4; margin: 8mm; }
            }
            body { 
              background: #f3f4f6; 
              padding: 24px; 
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="max-width: 900px; margin: 0 auto 16px auto; display: flex; gap: 8px; justify-content: flex-end;">
            <button onclick="window.print()" style="background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              🖨️ Imprimir Agora
            </button>
            <button onclick="window.close()" style="background: #4b5563; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;">
              Fechar
            </button>
          </div>
          <div style="background: #fff; max-width: 900px; margin: 0 auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            ${htmlContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Disparar Impressão Direta
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-neutral-900 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col my-auto border border-neutral-300 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* BARRA DE AÇÕES (PRIORIDADE 3: IMPRIMIR, SALVAR PDF, BAIXAR, VISUALIZAR)   */}
        {/* ========================================================================= */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm uppercase tracking-wide block">
                Romaneio & Ficha Técnica do Rolo
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {romaneio.codigoRomaneio} • Status: {romaneio.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão 1: Imprimir Direto */}
            <button
              type="button"
              onClick={handleImprimir}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              title="Abre a caixa de diálogo de impressão do navegador"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir</span>
            </button>

            {/* Botão 2: Baixar PDF Real */}
            <button
              type="button"
              disabled={isGerandoPdf}
              onClick={handleGerarEBaixarPdf}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              title="Gera e faz o download imediato do arquivo PDF"
            >
              <Download className={`w-4 h-4 ${isGerandoPdf ? 'animate-bounce' : ''}`} />
              <span>{isGerandoPdf ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>

            {/* Botão 3: Visualizar em Janela Separada */}
            <button
              type="button"
              onClick={handleAbrirVisualizacaoSeparada}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10 hidden md:flex"
              title="Abre a ficha técnica em tela cheia sem menus"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Visualizar</span>
            </button>

            {/* Botão Expedir (se aplicável) */}
            {onExpedir && romaneio.status === 'EMITIDO' && (
              <button
                type="button"
                onClick={() => onExpedir(romaneio)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Truck className="w-4 h-4" />
                <span>Expedir</span>
              </button>
            )}

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ml-1"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO OFICIAL A4: ROMANEIO DE PRODUÇÃO & FICHA TÉCNICA DO ROLO        */}
        {/* (PRIORIDADE 2: TÍTULO, TIPO, COR, FIOS, METROS, ROLETE, VOLTAS,           */}
        {/* PESO BRUTO, TARA, PESO LÍQUIDO, CLIENTE, FACCIONISTA, MÁQUINA,           */}
        {/* URDIDO POR, DATA PRODUÇÃO E OBSERVAÇÕES GRANDES PARA O CLIENTE)           */}
        {/* ========================================================================= */}
        <div ref={printableRef} className="p-6 sm:p-10 space-y-6 bg-white font-sans text-neutral-900">
          
          {/* 1. Cabeçalho Institucional Oficial */}
          <div className="border-b-2 border-neutral-900 pb-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7">
              {/* Logomarca da Empresa (20-25% da largura) */}
              <div className="w-full sm:w-[24%] max-w-[210px] min-w-[130px] flex items-center justify-center sm:justify-start shrink-0">
                {empresa.logotipo ? (
                  <img 
                    src={empresa.logotipo} 
                    alt={empresa.nomeFantasia || empresa.razaoSocial} 
                    className="w-full max-h-24 object-contain object-left" 
                  />
                ) : (
                  <div className="w-full aspect-[16/9] max-h-24 rounded-2xl bg-neutral-950 text-white flex flex-col items-center justify-center p-3 shadow-md border border-neutral-800">
                    <span className="text-2xl font-black tracking-widest font-mono">
                      {(empresa.nomeFantasia || empresa.razaoSocial || 'TEX').slice(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold mt-1">
                      Logomarca
                    </span>
                  </div>
                )}
              </div>

              {/* Nome e Dados Institucionais */}
              <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 uppercase leading-tight font-sans">
                  {empresa.nomeFantasia || empresa.razaoSocial}
                </h1>
                {empresa.nomeFantasia && empresa.razaoSocial && empresa.nomeFantasia !== empresa.razaoSocial && (
                  <p className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                    {empresa.razaoSocial}
                  </p>
                )}
                
                {/* Endereço, Telefones, CNPJ e E-mail */}
                <div className="text-xs text-neutral-600 space-y-0.5 pt-1 border-t border-neutral-200 mt-2 font-sans">
                  <p className="font-medium text-neutral-800">
                    {formatarEnderecoEmpresa(empresa)}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-700">
                    <b>CNPJ:</b> {empresa.cnpj || '—'} &nbsp;|&nbsp; <b>Inscrição Estadual:</b> {empresa.inscricaoEstadual || '—'}
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    <span><b>Tel:</b> {empresa.telefone || '—'}</span>
                    {empresa.celular && <span> &nbsp;•&nbsp; <b>WhatsApp:</b> {empresa.celular}</span>}
                    {empresa.email && <span> &nbsp;•&nbsp; <b>E-mail:</b> {empresa.email}</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Faixa Título do Documento: ROMANEIO DE PRODUÇÃO & FICHA TÉCNICA */}
            <div className="bg-neutral-100 border border-neutral-300 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-sm sm:text-base font-black tracking-wider uppercase text-neutral-950">
                  ROMANEIO DE PRODUÇÃO & FICHA TÉCNICA DO ROLO
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-black bg-neutral-900 text-white">
                  {romaneio.codigoRomaneio}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-neutral-700">
                <span><b>Emissão:</b> {formatarDataHora(romaneio.dataEmissao)}</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  romaneio.status === 'EXPEDIDO' || romaneio.status === 'FATURADO'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {romaneio.status}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Informações Gerais do Destinatário & Transporte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <div>
              <span className="font-bold text-neutral-500 uppercase block text-[10px]">Cliente / Destinatário</span>
              <span className="font-black text-sm text-neutral-950">{romaneio.clienteNome}</span>
            </div>
            <div>
              <span className="font-bold text-neutral-500 uppercase block text-[10px]">Transporte & Expedição</span>
              <span className="text-neutral-800 font-medium">
                {romaneio.transportadora ? `${romaneio.transportadora} • ` : ''}
                {romaneio.motorista ? `Mot: ${romaneio.motorista} ` : ''}
                {romaneio.placa ? `(Placa: ${romaneio.placa})` : 'Frete Próprio / Retirada'}
              </span>
            </div>
          </div>

          {/* 3. FICHAS TÉCNICAS DOS ROLOS (PRIORIDADE 2) */}
          <div className="space-y-6">
            {romaneio.rolos.map((rolo, idx) => (
              <div 
                key={rolo.numero_rolo || idx}
                className="border-2 border-neutral-900 rounded-2xl p-5 space-y-4 bg-white shadow-xs"
              >
                {/* Cabeçalho da Ficha Técnica do Rolo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-neutral-900 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-950 text-white font-mono font-black flex items-center justify-center text-sm shadow-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
                        Ficha Técnica Oficial
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black font-mono text-neutral-950">
                        ROLO Nº {rolo.numero_rolo}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    {rolo.op_codigo && (
                      <span className="px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-300 font-bold text-neutral-800">
                        OP: {rolo.op_codigo}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 font-bold text-blue-900">
                      Máquina: {rolo.maquina || '02'}
                    </span>
                  </div>
                </div>

                {/* Sub-bloco A: Identificação Fabril & Responsáveis */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Cliente
                    </span>
                    <span className="font-bold text-neutral-900 truncate block">
                      {rolo.cliente_nome || romaneio.clienteNome}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Faccionista
                    </span>
                    <span className="font-bold text-neutral-800 truncate block">
                      {rolo.faccionista_nome || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Urdido por (Operador)
                    </span>
                    <span className="font-bold text-neutral-900 truncate block">
                      {rolo.operadores_nomes || 'Operador Responsável'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Data Produção
                    </span>
                    <span className="font-mono font-bold text-neutral-800 block">
                      {formatarDataHora(rolo.data_producao || romaneio.dataEmissao)}
                    </span>
                  </div>
                </div>

                {/* Sub-bloco B: ESPECIFICAÇÕES TÉCNICAS DO FIO & URDIMENTO EM DESTAQUE */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-700 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-neutral-900" />
                    <span>Especificações Técnicas do Fio & Urdimento</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Título do Fio */}
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Título do Fio
                      </span>
                      <span className="text-base font-black font-mono text-neutral-950 block">
                        {rolo.titulo_fio || rolo.fio || '150/48'}
                      </span>
                    </div>

                    {/* Tipo do Fio */}
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Tipo do Fio
                      </span>
                      <span className="text-base font-black text-neutral-950 uppercase truncate block">
                        {rolo.tipo_fio || 'Poliéster'}
                      </span>
                    </div>

                    {/* Cor */}
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Cor
                      </span>
                      <span className="text-base font-black text-neutral-950 uppercase truncate block">
                        {rolo.cor || 'Branco'}
                      </span>
                    </div>

                    {/* Total de Fios */}
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Total de Fios
                      </span>
                      <span className="text-base font-black font-mono text-neutral-950 block">
                        {typeof rolo.total_fios === 'number' ? rolo.total_fios.toLocaleString('pt-BR') : rolo.total_fios || '3.520'}
                      </span>
                    </div>

                    {/* Metros */}
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Metros
                      </span>
                      <span className="text-base font-black font-mono text-blue-900 block">
                        {typeof rolo.metros === 'number' ? rolo.metros.toLocaleString('pt-BR') : rolo.metros || '3.100'} m
                      </span>
                    </div>

                    {/* Rolete */}
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Rolete
                      </span>
                      <span className="text-xs font-bold text-neutral-900 truncate block mt-0.5">
                        {rolo.rolete || 'Rolete Metálico 1800mm'}
                      </span>
                    </div>

                    {/* Voltas */}
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Voltas da Urdideira
                      </span>
                      <span className="text-base font-black font-mono text-neutral-950 block">
                        {rolo.voltas ? `${rolo.voltas.toLocaleString('pt-BR')} voltas` : '1.550 voltas'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-bloco C: PESAGEM E APURAÇÃO DE MASSA (ALTO DESTAQUE) */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-700 mb-2 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-neutral-900" />
                    <span>Pesagem Oficial da Balança</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300 text-center">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Peso Bruto
                      </span>
                      <span className="text-lg font-black font-mono text-neutral-900">
                        {rolo.pesoBrutoKg ? rolo.pesoBrutoKg.toFixed(2) : (rolo.pesoLiquidoKg + (rolo.taraKg || 3.5)).toFixed(2)} kg
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300 text-center">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Tara
                      </span>
                      <span className="text-lg font-black font-mono text-neutral-700">
                        {rolo.taraKg ? rolo.taraKg.toFixed(2) : '3.50'} kg
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-600 text-center shadow-xs">
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                        ★ Peso Líquido ★
                      </span>
                      <span className="text-2xl font-black font-mono text-emerald-950">
                        {rolo.pesoLiquidoKg.toFixed(2)} kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-bloco D: OBSERVAÇÕES GRANDES DESTINADAS AO CLIENTE */}
                <div className="rounded-xl border border-neutral-300 bg-amber-50/40 p-4 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-700" />
                    <span>Observações Técnicas para o Operador do Cliente (Malharia / Tecelagem)</span>
                  </span>
                  <p className="text-xs sm:text-sm text-neutral-800 font-medium leading-relaxed">
                    {rolo.observacoes_cliente || romaneio.observacoes || 'Entregar com embalagem reforçada. Verificar alinhamento da faca da urdideira e manter tensão uniforme na alimentação da tecelagem/malharia.'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Totais Gerais do Romaneio */}
          <div className="bg-neutral-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-6 text-center sm:text-left">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-sans font-bold block">
                  Total Volumes
                </span>
                <span className="text-2xl font-black text-white">
                  {romaneio.totalRolos} {romaneio.totalRolos === 1 ? 'rolo' : 'rolos'}
                </span>
              </div>
              <div className="border-l border-neutral-700 pl-6">
                <span className="text-[10px] text-neutral-400 uppercase font-sans font-bold block">
                  Metros Totais
                </span>
                <span className="text-2xl font-black text-blue-400">
                  {romaneio.totalMetros.toLocaleString('pt-BR')} m
                </span>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <span className="text-[10px] text-neutral-400 uppercase font-sans font-bold block">
                Peso Líquido Total
              </span>
              <span className="text-3xl font-black text-emerald-400">
                {romaneio.totalPesoKg.toFixed(2)} kg
              </span>
            </div>
          </div>

          {/* 5. Assinaturas Oficiais */}
          <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs">
            <div className="border-t border-neutral-400 pt-2">
              <span className="font-bold block text-neutral-900">{empresa.nomeFantasia || empresa.razaoSocial}</span>
              <span className="text-[10px] text-neutral-500">Expedição & Urdimento</span>
            </div>
            <div className="border-t border-neutral-400 pt-2">
              <span className="font-bold block text-neutral-900">Transportador / Motorista</span>
              <span className="text-[10px] text-neutral-500">Assinatura & RG</span>
            </div>
            <div className="border-t border-neutral-400 pt-2">
              <span className="font-bold block text-neutral-900">{romaneio.clienteNome}</span>
              <span className="text-[10px] text-neutral-500">Operador / Recebimento</span>
            </div>
          </div>

          {/* Rodapé institucional sutil */}
          <div className="text-[9px] text-neutral-400 text-center pt-4 border-t border-neutral-200">
            Documento gerado automaticamente pelo Sistema TEXLOG • Ficha Técnica Operacional de Urdimento
          </div>
        </div>
      </div>
    </div>
  );
};
