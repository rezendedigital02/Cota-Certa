/** Conversao entre o texto digitado no campo e o numero usado no calculo. */

/**
 * Le o valor de um campo aceitando virgula como separador decimal.
 * Campo vazio ou invalido vira 0 — o calculo trata isso com avisos.
 */
export function lerNumero(texto: string): number {
  const limpo = texto.replace(/\s/g, "").replace(",", ".");
  if (limpo === "" || limpo === "-") return 0;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

/** Igual a `lerNumero`, mas devolve `null` quando o campo esta vazio/invalido. */
export function lerNumeroOuNulo(texto: string): number | null {
  const limpo = texto.replace(/\s/g, "").replace(",", ".");
  if (limpo === "" || limpo === "-") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Escreve um numero no formato aceito pelos campos (virgula decimal). */
export function escreverNumero(valor: number, casas = 1): string {
  return valor.toFixed(casas).replace(".", ",");
}
