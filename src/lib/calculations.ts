export const calcularPente = (totalFios: number, larguraCm: number, tipoFio?: string): number => {
  if (!larguraCm || larguraCm <= 0) return 0;
  
  const pente = totalFios / larguraCm;
  return Number(pente.toFixed(2));
};

export const calcularPeso = (totalFios: number, tituloFio: string, metros: number, tipoFio: string): number => {
  const tipoNormalizado = tipoFio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (tipoNormalizado === 'ALGODAO' || tipoNormalizado === 'ALGODÃO') return 0;
  
  // Extrair primeiro número do título (ex: "75/36" -> 75)
  const match = tituloFio.match(/^(\d+)/);
  if (!match) return 0;
  
  const tituloBase = parseInt(match[1], 10);
  
  const gramatura = (totalFios * tituloBase / 10000) * 1.10;
  const peso = gramatura * metros;
  
  return peso;
};

export const TIPOS_FIO = [
  'ALGODÃO',
  'POLIÉSTER',
  'MONOFILAMENTO',
  'ETIQUETA TORÇÃO S',
  'ETIQUETA TORÇÃO Z',
  'NYLON',
  'ELASTANO'
];
