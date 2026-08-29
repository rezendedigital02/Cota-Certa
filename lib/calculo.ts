/**
 * Nucleo de calculo hidraulico do Cota Certa.
 *
 * Funcoes puras: nada de React, nada de Google Maps, nada de I/O.
 * Entrada e saida sao objetos serializaveis (JSON), de propositio — este
 * arquivo e o candidato natural a virar um endpoint de API sem alteracao.
 */

/* -------------------------------------------------------------------------- */
/* Tabelas                                                                     */
/* -------------------------------------------------------------------------- */

export type MaterialTubulacao = "pvc" | "galvanizado_novo" | "galvanizado_usado";

/** Coeficiente C de Hazen-Williams por material. */
export const COEFICIENTE_C: Record<MaterialTubulacao, number> = {
  pvc: 140, // PVC / PEAD
  galvanizado_novo: 120,
  galvanizado_usado: 100,
};

export const MATERIAIS: ReadonlyArray<{
  valor: MaterialTubulacao;
  rotulo: string;
  c: number;
}> = [
  { valor: "pvc", rotulo: "PVC / PEAD", c: COEFICIENTE_C.pvc },
  { valor: "galvanizado_novo", rotulo: "Galvanizado novo", c: COEFICIENTE_C.galvanizado_novo },
  { valor: "galvanizado_usado", rotulo: "Galvanizado usado", c: COEFICIENTE_C.galvanizado_usado },
];

export type DiametroNominal = '3/4"' | '1"' | '1.1/4"' | '1.1/2"' | '2"';

/** Diametro interno aproximado, em milimetros, por bitola nominal. */
export const DIAMETRO_INTERNO_MM: Record<DiametroNominal, number> = {
  '3/4"': 21.6,
  '1"': 27.8,
  '1.1/4"': 35.2,
  '1.1/2"': 44.0,
  '2"': 53.4,
};

/** Bitolas em ordem crescente de diametro interno. */
export const DIAMETROS: ReadonlyArray<DiametroNominal> = [
  '3/4"',
  '1"',
  '1.1/4"',
  '1.1/2"',
  '2"',
];

/** Acrescimo padrao sobre a perda distribuida para cobrir perdas localizadas. */
export const FATOR_PERDAS_LOCALIZADAS = 0.15;

/** Velocidade recomendada maxima no recalque, em m/s. */
export const VELOCIDADE_MAXIMA_MS = 2;

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export interface EntradaCalculo {
  /** Nivel dinamico do poco (m): da boca do poco ate a agua com a bomba ligada. */
  nivelDinamicoM: number;
  /** Altitude do ponto A (poco), em metros. `null` quando ainda nao consultada. */
  altitudePocoM: number | null;
  /** Altitude do ponto B (reservatorio), em metros. `null` quando ainda nao consultada. */
  altitudeReservatorioM: number | null;
  /** Altura da caixa d'agua acima do solo (m). */
  alturaCaixaM: number;
  /** Vazao desejada, em litros por hora. */
  vazaoLh: number;
  /** Bitola nominal da tubulacao de recalque. */
  diametro: DiametroNominal;
  /** Material da tubulacao (define o C de Hazen-Williams). */
  material: MaterialTubulacao;
  /** Comprimento total da tubulacao de recalque, em metros. */
  comprimentoTubulacaoM: number;
  /**
   * Fracao somada a perda distribuida para representar as perdas localizadas
   * (curvas, registros, valvula de retencao...). Padrao: 0.15 (15%).
   */
  fatorPerdasLocalizadas?: number;
}

export type NivelAviso = "info" | "atencao" | "erro";

export interface Aviso {
  nivel: NivelAviso;
  mensagem: string;
}

export interface ParcelasAMT {
  /** Coluna de agua dentro do poco. */
  nivelDinamicoM: number;
  /** Desnivel geografico: altitude B - altitude A. Negativo quando B fica abaixo de A. */
  desnivelGeograficoM: number;
  /** Altura da caixa acima do solo no ponto B. */
  alturaCaixaM: number;
  /** Perda de carga total (distribuida + localizada). */
  perdaCargaM: number;
}

export interface ResultadoCalculo {
  /** Altura Manometrica Total, em metros de coluna d'agua. */
  amtM: number;
  parcelas: ParcelasAMT;
  /** Soma das parcelas que sao altura geometrica pura (sem perda de carga). */
  alturaGeometricaM: number;
  /** Perda de carga unitaria J, em m/m. */
  perdaUnitariaMporM: number;
  perdaDistribuidaM: number;
  perdaLocalizadaM: number;
  /** Percentual da AMT consumido pela perda de carga (0-100). */
  percentualPerdaCarga: number;
  velocidadeMs: number;
  vazaoLh: number;
  vazaoM3h: number;
  vazaoM3s: number;
  diametroInternoMm: number;
  coeficienteC: number;
  comprimentoTubulacaoM: number;
  /** Menor bitola da tabela que mantem a velocidade dentro do limite, se houver. */
  diametroSugerido: DiametroNominal | null;
  avisos: Aviso[];
}

/* -------------------------------------------------------------------------- */
/* Conversoes e primitivas                                                     */
/* -------------------------------------------------------------------------- */

export function litrosHoraParaM3Segundo(vazaoLh: number): number {
  return vazaoLh / 1000 / 3600;
}

export function litrosHoraParaM3Hora(vazaoLh: number): number {
  return vazaoLh / 1000;
}

export function areaSecaoM2(diametroInternoM: number): number {
  return (Math.PI * diametroInternoM ** 2) / 4;
}

/**
 * Velocidade media do escoamento, em m/s.
 * v = Q / A
 */
export function velocidadeEscoamento(vazaoM3s: number, diametroInternoM: number): number {
  if (diametroInternoM <= 0) return 0;
  return vazaoM3s / areaSecaoM2(diametroInternoM);
}

/**
 * Perda de carga unitaria por Hazen-Williams, em m/m.
 *
 *   J = 10.65 * Q^1.852 / (C^1.852 * D^4.87)
 *
 * @param vazaoM3s        vazao em m3/s
 * @param diametroInternoM diametro interno em metros
 * @param coeficienteC    coeficiente C de Hazen-Williams
 */
export function perdaCargaUnitariaHazenWilliams(
  vazaoM3s: number,
  diametroInternoM: number,
  coeficienteC: number,
): number {
  if (vazaoM3s <= 0 || diametroInternoM <= 0 || coeficienteC <= 0) return 0;
  return (
    (10.65 * Math.pow(vazaoM3s, 1.852)) /
    (Math.pow(coeficienteC, 1.852) * Math.pow(diametroInternoM, 4.87))
  );
}

/**
 * Menor bitola da tabela cuja velocidade fica <= `velocidadeMaximaMs`.
 * Retorna `null` quando nem a maior bitola disponivel resolve.
 */
export function sugerirDiametro(
  vazaoM3s: number,
  velocidadeMaximaMs: number = VELOCIDADE_MAXIMA_MS,
): DiametroNominal | null {
  for (const bitola of DIAMETROS) {
    const v = velocidadeEscoamento(vazaoM3s, DIAMETRO_INTERNO_MM[bitola] / 1000);
    if (v <= velocidadeMaximaMs) return bitola;
  }
  return null;
}

/** Arredonda para `casas` decimais, evitando -0 e ruido de ponto flutuante. */
export function arredondar(valor: number, casas = 2): number {
  if (!Number.isFinite(valor)) return 0;
  const fator = 10 ** casas;
  const r = Math.round(valor * fator) / fator;
  return Object.is(r, -0) ? 0 : r;
}

/* -------------------------------------------------------------------------- */
/* Calculo principal                                                           */
/* -------------------------------------------------------------------------- */

function numero(valor: number | null | undefined): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

/**
 * Calcula a Altura Manometrica Total (AMT) e todas as parcelas que a compoem.
 *
 *   AMT = nivel dinamico
 *       + (altitude B - altitude A)
 *       + altura da caixa acima do solo
 *       + perda de carga
 *
 * Funcao pura: mesma entrada, mesma saida. Nunca lanca excecao — entradas
 * inconsistentes viram itens em `avisos`.
 */
export function calcularAMT(entrada: EntradaCalculo): ResultadoCalculo {
  const avisos: Aviso[] = [];

  const nivelDinamicoM = numero(entrada.nivelDinamicoM);
  const alturaCaixaM = numero(entrada.alturaCaixaM);
  const vazaoLh = numero(entrada.vazaoLh);
  const comprimentoTubulacaoM = numero(entrada.comprimentoTubulacaoM);
  const fatorPerdasLocalizadas =
    typeof entrada.fatorPerdasLocalizadas === "number" &&
    Number.isFinite(entrada.fatorPerdasLocalizadas)
      ? entrada.fatorPerdasLocalizadas
      : FATOR_PERDAS_LOCALIZADAS;

  const temAltitudes =
    typeof entrada.altitudePocoM === "number" &&
    Number.isFinite(entrada.altitudePocoM) &&
    typeof entrada.altitudeReservatorioM === "number" &&
    Number.isFinite(entrada.altitudeReservatorioM);

  const desnivelGeograficoM = temAltitudes
    ? (entrada.altitudeReservatorioM as number) - (entrada.altitudePocoM as number)
    : 0;

  if (!temAltitudes) {
    avisos.push({
      nivel: "info",
      mensagem:
        "Sem altitude dos dois pontos: o desnivel do terreno esta contando como 0 m. Marque o poco e o reservatorio no mapa.",
    });
  }

  const coeficienteC = COEFICIENTE_C[entrada.material] ?? COEFICIENTE_C.pvc;
  const diametroInternoMm = DIAMETRO_INTERNO_MM[entrada.diametro] ?? DIAMETRO_INTERNO_MM['1"'];
  const diametroInternoM = diametroInternoMm / 1000;

  const vazaoM3s = litrosHoraParaM3Segundo(vazaoLh);
  const velocidadeMs = velocidadeEscoamento(vazaoM3s, diametroInternoM);

  const perdaUnitariaMporM = perdaCargaUnitariaHazenWilliams(
    vazaoM3s,
    diametroInternoM,
    coeficienteC,
  );
  const perdaDistribuidaM = perdaUnitariaMporM * comprimentoTubulacaoM;
  const perdaLocalizadaM = perdaDistribuidaM * fatorPerdasLocalizadas;
  const perdaCargaM = perdaDistribuidaM + perdaLocalizadaM;

  const alturaGeometricaM = nivelDinamicoM + desnivelGeograficoM + alturaCaixaM;
  const amtM = alturaGeometricaM + perdaCargaM;

  /* ---------------------------- avisos ---------------------------- */

  if (vazaoLh <= 0) {
    avisos.push({
      nivel: "erro",
      mensagem: "Informe a vazao desejada (L/h) para calcular a perda de carga.",
    });
  }
  if (comprimentoTubulacaoM <= 0) {
    avisos.push({
      nivel: "erro",
      mensagem: "Informe o comprimento da tubulacao — sem ele a perda de carga fica zerada.",
    });
  }
  if (nivelDinamicoM <= 0) {
    avisos.push({
      nivel: "atencao",
      mensagem: "Nivel dinamico zerado. Confirme a profundidade da agua com a bomba ligada.",
    });
  }

  const diametroSugerido = sugerirDiametro(vazaoM3s, VELOCIDADE_MAXIMA_MS);

  if (velocidadeMs > VELOCIDADE_MAXIMA_MS) {
    const maiores = DIAMETROS.filter(
      (b) => DIAMETRO_INTERNO_MM[b] > diametroInternoMm,
    );
    const sugestao =
      diametroSugerido && DIAMETRO_INTERNO_MM[diametroSugerido] > diametroInternoMm
        ? `Suba para ${diametroSugerido}.`
        : maiores.length > 0
          ? `Suba para ${maiores[maiores.length - 1]} ou reduza a vazao.`
          : "Nenhuma bitola da tabela resolve nessa vazao: use um diametro maior que 2\" ou reduza a vazao.";
    avisos.push({
      nivel: "atencao",
      mensagem: `Velocidade de ${arredondar(velocidadeMs, 2)} m/s na tubulacao (limite recomendado: ${VELOCIDADE_MAXIMA_MS} m/s). ${sugestao}`,
    });
  }

  if (amtM > 0 && perdaCargaM / amtM > 0.25) {
    avisos.push({
      nivel: "atencao",
      mensagem:
        "A perda de carga passa de 25% da AMT. Vale conferir o comprimento da linha e considerar uma bitola maior.",
    });
  }

  if (desnivelGeograficoM < 0) {
    avisos.push({
      nivel: "info",
      mensagem:
        "O reservatorio esta em cota mais baixa que o poco: o desnivel do terreno esta ajudando e reduz a AMT.",
    });
  }

  return {
    amtM: arredondar(amtM, 2),
    parcelas: {
      nivelDinamicoM: arredondar(nivelDinamicoM, 2),
      desnivelGeograficoM: arredondar(desnivelGeograficoM, 2),
      alturaCaixaM: arredondar(alturaCaixaM, 2),
      perdaCargaM: arredondar(perdaCargaM, 2),
    },
    alturaGeometricaM: arredondar(alturaGeometricaM, 2),
    perdaUnitariaMporM: arredondar(perdaUnitariaMporM, 6),
    perdaDistribuidaM: arredondar(perdaDistribuidaM, 2),
    perdaLocalizadaM: arredondar(perdaLocalizadaM, 2),
    percentualPerdaCarga: amtM > 0 ? arredondar((perdaCargaM / amtM) * 100, 1) : 0,
    velocidadeMs: arredondar(velocidadeMs, 2),
    vazaoLh: arredondar(vazaoLh, 2),
    vazaoM3h: arredondar(litrosHoraParaM3Hora(vazaoLh), 3),
    vazaoM3s: arredondar(vazaoM3s, 8),
    diametroInternoMm,
    coeficienteC,
    comprimentoTubulacaoM: arredondar(comprimentoTubulacaoM, 2),
    diametroSugerido,
    avisos,
  };
}
