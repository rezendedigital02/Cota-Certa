/** Formatacao numerica pt-BR usada no painel. */

export function formatarNumero(valor: number, casas = 2): string {
  if (!Number.isFinite(valor)) return "—";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Igual a `formatarNumero`, mas com sinal explicito (+/-). Usado no desnivel. */
export function formatarComSinal(valor: number, casas = 2): string {
  if (!Number.isFinite(valor)) return "—";
  const sinal = valor > 0 ? "+" : valor < 0 ? "−" : "";
  return `${sinal}${formatarNumero(Math.abs(valor), casas)}`;
}
