import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FioTipo } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function generateSpecKey(clienteId: string, tituloFio: string, totalFios: number): string {
  if (!clienteId || !tituloFio) return '';
  const normalize = (val: string) => (val || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const normalizedTitulo = normalize(tituloFio).replace(/\s*\/\s*/g, '/');
  const normalizedTotalFios = Math.floor(totalFios || 0);
  return `${clienteId}|${normalizedTitulo}|${normalizedTotalFios}`;
}

export function calculatePente(totalFios: number, larguraCm: number, tipoFio: FioTipo) {
  if (!larguraCm || larguraCm === 0) return { bruto: 0, divisor: 2, formatado: '-' };
  
  const fiosPorCm = totalFios / larguraCm;
  const isEtiqueta = tipoFio.startsWith('ETIQUETA');
  const divisor = (isEtiqueta || fiosPorCm > 50) ? 4 : 2;
  
  const penteBruto = fiosPorCm / divisor;
  
  // Arredondamento para .0 ou .5
  const inteiro = Math.floor(penteBruto);
  const decimal = penteBruto - inteiro;
  let finalValue = inteiro;
  if (decimal >= 0.25 && decimal < 0.75) {
    finalValue = inteiro + 0.5;
  } else if (decimal >= 0.75) {
    finalValue = inteiro + 1.0;
  }
  
  return {
    fiosPorCm: fiosPorCm.toFixed(2),
    divisor,
    bruto: finalValue,
    formatado: `${finalValue.toFixed(1).replace('.', ',')} a ${divisor}`
  };
}

export function calculateGramatura(totalFios: number, tituloFio: string, tipoFio: FioTipo) {
  if (tipoFio === 'ALGODAO') return 0;
  
  // Título base: 75/36 -> 75
  const tituloBase = parseInt(tituloFio.split('/')[0]);
  if (isNaN(tituloBase) || tituloBase === 0) return 0;
  
  const gramatura = (totalFios * tituloBase / 10000) * 1.10;
  return gramatura;
}

export function calculatePesoEstimado(gramatura: number, metros: number) {
  return (gramatura * metros) / 1000; // Gramas para KG
}

export function formatPeso(kg: number): string {
  if (!kg) return '0,000 kg';
  return `${kg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
}

export function formatGramatura(val: number): string {
  if (!val) return '0,00';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
