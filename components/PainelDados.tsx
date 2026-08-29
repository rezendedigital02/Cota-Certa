"use client";

import CampoNumero from "@/components/CampoNumero";
import {
  DIAMETROS,
  DIAMETRO_INTERNO_MM,
  MATERIAIS,
  type ComprimentoSugerido,
  type DiametroNominal,
  type MaterialTubulacao,
} from "@/lib/calculo";
import { formatarNumero } from "@/lib/formato";
import { formatarCoordenada, type Ponto } from "@/lib/geo";

export interface DadosFormulario {
  nivelDinamico: string;
  altitudePoco: string;
  altitudeReservatorio: string;
  alturaCaixa: string;
  vazao: string;
  diametro: DiametroNominal;
  material: MaterialTubulacao;
  comprimento: string;
  /** Folga de tracado em porcentagem (o campo mostra "15", nao "0,15"). */
  folgaTracado: string;
}

interface PainelDadosProps {
  dados: DadosFormulario;
  onChange: <K extends keyof DadosFormulario>(campo: K, valor: DadosFormulario[K]) => void;
  poco: Ponto | null;
  reservatorio: Ponto | null;
  distanciaMapaM: number | null;
  sugestaoComprimento: ComprimentoSugerido | null;
  comprimentoEditado: boolean;
  onUsarComprimentoSugerido: () => void;
  carregandoAltitude: boolean;
}

function LinhaPonto({
  letra,
  nome,
  ponto,
  altitude,
  cor,
  carregando,
}: {
  letra: string;
  nome: string;
  ponto: Ponto | null;
  altitude: string;
  cor: string;
  carregando: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${cor}`}
      >
        {letra}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800">{nome}</p>
        <p className="truncate font-mono text-[11px] text-slate-500">
          {ponto ? formatarCoordenada(ponto) : "nao marcado"}
        </p>
      </div>
      <p className="shrink-0 font-mono text-xs font-semibold tabular-nums text-slate-700">
        {carregando ? "…" : altitude ? `${formatarNumero(Number(altitude.replace(",", ".")), 1)} m` : "—"}
      </p>
    </div>
  );
}

/** Mostra de onde saiu o comprimento sugerido, parcela por parcela. */
function ComposicaoComprimento({ sugestao }: { sugestao: ComprimentoSugerido | null }) {
  if (!sugestao) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-3 text-center text-[11px] leading-snug text-slate-400">
        A composicao do comprimento aparece aqui depois que o poco e o reservatorio
        estiverem no mapa.
      </div>
    );
  }

  const parcelas = [
    { rotulo: "Distancia no mapa (A→B)", valor: sugestao.distanciaHorizontalM },
    { rotulo: "Descida no poco (nivel dinamico)", valor: sugestao.descidaPocoM },
    { rotulo: "Subida ate a caixa", valor: sugestao.subidaCaixaM },
    { rotulo: "Desnivel do terreno", valor: sugestao.desnivelPercorridoM },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Comprimento sugerido
      </p>

      <dl className="mt-1.5 space-y-1">
        {parcelas.map((parcela) => (
          <div key={parcela.rotulo} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] leading-snug text-slate-600">{parcela.rotulo}</dt>
            <dd className="shrink-0 font-mono text-[11px] tabular-nums text-slate-700">
              {formatarNumero(parcela.valor, 1)} m
            </dd>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-2 border-t border-slate-200 pt-1">
          <dt className="text-[11px] leading-snug text-slate-600">Subtotal</dt>
          <dd className="shrink-0 font-mono text-[11px] tabular-nums text-slate-700">
            {formatarNumero(sugestao.subtotalM, 1)} m
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[11px] leading-snug text-slate-600">
            Folga de tracado ({formatarNumero(sugestao.folgaTracado * 100, 0)}%)
          </dt>
          <dd className="shrink-0 font-mono text-[11px] tabular-nums text-slate-700">
            + {formatarNumero(sugestao.folgaM, 1)} m
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-2 border-t-2 border-slate-300 pt-1">
          <dt className="text-[11px] font-bold text-slate-900">Sugerido</dt>
          <dd className="shrink-0 font-mono text-xs font-bold tabular-nums text-slate-900">
            {formatarNumero(sugestao.totalM, 1)} m
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function PainelDados({
  dados,
  onChange,
  poco,
  reservatorio,
  distanciaMapaM,
  sugestaoComprimento,
  comprimentoEditado,
  onUsarComprimentoSugerido,
  carregandoAltitude,
}: PainelDadosProps) {
  return (
    <div className="space-y-3">
      {/* ------------------------- pontos e altitudes ------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pontos no mapa
          </h2>
          {distanciaMapaM !== null && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
              {formatarNumero(distanciaMapaM, 0)} m entre A e B
            </span>
          )}
        </div>

        <div className="mt-3 space-y-2.5">
          <LinhaPonto
            letra="A"
            nome="Poco"
            ponto={poco}
            altitude={dados.altitudePoco}
            cor="bg-agua-600"
            carregando={carregandoAltitude && !!poco}
          />
          <LinhaPonto
            letra="B"
            nome="Reservatorio"
            ponto={reservatorio}
            altitude={dados.altitudeReservatorio}
            cor="bg-green-600"
            carregando={carregandoAltitude && !!reservatorio}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <CampoNumero
            id="altitude-poco"
            rotulo="Altitude A (poco)"
            unidade="m"
            valor={dados.altitudePoco}
            onChange={(v) => onChange("altitudePoco", v)}
            placeholder="—"
          />
          <CampoNumero
            id="altitude-reservatorio"
            rotulo="Altitude B (caixa)"
            unidade="m"
            valor={dados.altitudeReservatorio}
            onChange={(v) => onChange("altitudeReservatorio", v)}
            placeholder="—"
          />
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
          Preenchidas pelo Google (Elevation) quando voce marca os pontos. Da para corrigir na mao se
          souber a cota real.
        </p>
      </div>

      {/* ------------------------------ dados do poco ------------------------------ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Poco e reservatorio
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoNumero
            id="nivel-dinamico"
            rotulo="Nivel dinamico do poco"
            unidade="m"
            valor={dados.nivelDinamico}
            onChange={(v) => onChange("nivelDinamico", v)}
            dica="Da boca do poco ate a agua com a bomba ligada."
            placeholder="Ex.: 45"
          />
          <CampoNumero
            id="altura-caixa"
            rotulo="Altura da caixa acima do solo"
            unidade="m"
            valor={dados.alturaCaixa}
            onChange={(v) => onChange("alturaCaixa", v)}
            dica="Do chao ate a entrada de agua da caixa."
            placeholder="Ex.: 3"
          />
        </div>
      </div>

      {/* ------------------------------- tubulacao ------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Vazao e tubulacao
        </h2>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoNumero
            id="vazao"
            rotulo="Vazao desejada"
            unidade="L/h"
            valor={dados.vazao}
            onChange={(v) => onChange("vazao", v)}
            placeholder="Ex.: 3000"
            destaque
          />

          <div>
            <label htmlFor="diametro" className="block text-xs font-semibold text-slate-700">
              Diametro da tubulacao
            </label>
            <select
              id="diametro"
              value={dados.diametro}
              onChange={(e) => onChange("diametro", e.target.value as DiametroNominal)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-agua-500 focus:ring-2 focus:ring-agua-100"
            >
              {DIAMETROS.map((bitola) => (
                <option key={bitola} value={bitola}>
                  {bitola} — {formatarNumero(DIAMETRO_INTERNO_MM[bitola], 1)} mm internos
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="material" className="block text-xs font-semibold text-slate-700">
              Material da tubulacao
            </label>
            <select
              id="material"
              value={dados.material}
              onChange={(e) => onChange("material", e.target.value as MaterialTubulacao)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-agua-500 focus:ring-2 focus:ring-agua-100"
            >
              {MATERIAIS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.rotulo} — C = {m.c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <div>
            <label htmlFor="comprimento" className="block text-xs font-semibold text-slate-700">
              Comprimento da tubulacao
            </label>
            <div className="relative mt-1">
              <input
                id="comprimento"
                type="text"
                inputMode="decimal"
                value={dados.comprimento}
                onChange={(e) => onChange("comprimento", e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="Ex.: 120"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-12 text-sm tabular-nums outline-none transition focus:border-agua-500 focus:ring-2 focus:ring-agua-100"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs font-medium text-slate-400">
                m
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {sugestaoComprimento === null ? (
                "Marque os dois pontos no mapa para receber um comprimento sugerido."
              ) : comprimentoEditado ? (
                <>
                  Voce digitou este valor.{" "}
                  <button
                    type="button"
                    onClick={onUsarComprimentoSugerido}
                    className="font-semibold text-agua-700 underline underline-offset-2 hover:text-agua-800"
                  >
                    voltar para {formatarNumero(sugestaoComprimento.totalM, 0)} m
                  </button>
                </>
              ) : (
                "Sugerido a partir do mapa. Digite por cima se conhecer o tracado real."
              )}
            </p>

            <div className="mt-3">
              <CampoNumero
                id="folga-tracado"
                rotulo="Folga de tracado"
                unidade="%"
                valor={dados.folgaTracado}
                onChange={(v) => onChange("folgaTracado", v)}
                dica="Curvas, desvios e sobra de corte. Entra so no comprimento sugerido."
                placeholder="15"
              />
            </div>
          </div>

          <ComposicaoComprimento sugestao={sugestaoComprimento} />
        </div>
      </div>
    </div>
  );
}
