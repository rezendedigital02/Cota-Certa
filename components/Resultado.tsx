"use client";

import type { ResultadoCalculo } from "@/lib/calculo";
import { formatarComSinal, formatarNumero } from "@/lib/formato";

const ESTILO_AVISO = {
  erro: "border-rose-200 bg-rose-50 text-rose-900",
  atencao: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

function Parcela({
  rotulo,
  valor,
  detalhe,
  comSinal = false,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
  comSinal?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-slate-700">{rotulo}</p>
        {detalhe && <p className="text-[11px] leading-snug text-slate-500">{detalhe}</p>}
      </div>
      <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-900">
        {comSinal ? formatarComSinal(valor) : formatarNumero(valor)} m
      </p>
    </div>
  );
}

interface ResultadoProps {
  resultado: ResultadoCalculo;
  /** Falso enquanto o vendedor nao preencheu nada: evita alarme falso na tela vazia. */
  preenchido: boolean;
}

export default function Resultado({ resultado, preenchido }: ResultadoProps) {
  const { parcelas } = resultado;

  // Fragmento de proposito: os cartoes sao filhos diretos do painel rolavel,
  // e so assim o cartao da AMT consegue grudar no topo enquanto o resto rola.
  return (
    <>
      {/* -------------------------- numero em destaque -------------------------- */}
      <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm lg:sticky lg:top-0 lg:z-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-agua-300">
              AMT — altura manometrica total
            </p>
            <p className="mt-1 font-mono text-5xl font-bold tabular-nums leading-none">
              {preenchido ? formatarNumero(resultado.amtM, 1) : "—"}
              <span className="ml-2 text-2xl font-medium text-slate-400">m</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Vazao</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums leading-none">
              {formatarNumero(resultado.vazaoLh, 0)}
              <span className="ml-1 text-base font-medium text-slate-400">L/h</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatarNumero(resultado.vazaoM3h, 2)} m³/h
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
          {preenchido ? (
            <>
              Peca uma bomba que entregue{" "}
              <strong className="font-semibold text-white">
                {formatarNumero(resultado.vazaoLh, 0)} L/h a {formatarNumero(resultado.amtM, 1)} m
              </strong>{" "}
              de altura manometrica.
            </>
          ) : (
            "Marque o poco e o reservatorio no mapa e informe o nivel dinamico para ver a AMT."
          )}
        </p>
      </div>

      {/* ------------------------------- avisos ------------------------------- */}
      {preenchido &&
        resultado.avisos.map((aviso, i) => (
          <p
            key={`${aviso.nivel}-${i}`}
            className={`rounded-xl border px-3 py-2 text-xs leading-snug ${ESTILO_AVISO[aviso.nivel]}`}
          >
            {aviso.mensagem}
          </p>
        ))}

      {/* ------------------------------ parcelas ------------------------------ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          De onde vem a AMT
        </h3>

        <div className="mt-1 divide-y divide-slate-100">
          <Parcela rotulo="Nivel dinamico do poco" valor={parcelas.nivelDinamicoM} />
          <Parcela
            rotulo="Desnivel do terreno (B − A)"
            valor={parcelas.desnivelGeograficoM}
            comSinal
            detalhe="Altitude do reservatorio menos a altitude do poco"
          />
          <Parcela rotulo="Altura da caixa acima do solo" valor={parcelas.alturaCaixaM} />
          <Parcela
            rotulo="Perda de carga"
            valor={parcelas.perdaCargaM}
            detalhe={`${formatarNumero(resultado.perdaDistribuidaM)} m distribuida + ${formatarNumero(
              resultado.perdaLocalizadaM,
            )} m localizada (15%) · ${formatarNumero(resultado.percentualPerdaCarga, 0)}% da AMT`}
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t-2 border-slate-900 pt-2">
          <p className="text-sm font-bold text-slate-900">AMT total</p>
          <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
            {formatarNumero(resultado.amtM)} m
          </p>
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          Altura geometrica: {formatarNumero(resultado.alturaGeometricaM)} m · perda de carga:{" "}
          {formatarNumero(parcelas.perdaCargaM)} m
        </p>
      </div>

      {/* ---------------------------- dados da linha --------------------------- */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        {[
          {
            rotulo: "Velocidade",
            valor: `${formatarNumero(resultado.velocidadeMs)} m/s`,
            alerta: resultado.velocidadeMs > 2,
          },
          { rotulo: "Diametro interno", valor: `${formatarNumero(resultado.diametroInternoMm, 1)} mm` },
          { rotulo: "Coeficiente C", valor: `${resultado.coeficienteC}` },
          {
            rotulo: "Perda unitaria",
            valor: `${formatarNumero(resultado.perdaUnitariaMporM * 100, 2)} m/100 m`,
          },
        ].map((item) => (
          <div key={item.rotulo}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {item.rotulo}
            </p>
            <p
              className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                item.alerta ? "text-amber-600" : "text-slate-900"
              }`}
            >
              {item.valor}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
