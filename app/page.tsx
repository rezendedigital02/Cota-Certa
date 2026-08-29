"use client";

import { useCallback, useMemo, useState } from "react";

import Mapa from "@/components/Mapa";
import PainelDados, { type DadosFormulario } from "@/components/PainelDados";
import Resultado from "@/components/Resultado";
import { calcularAMT } from "@/lib/calculo";
import { distanciaEntrePontosM, type Ponto } from "@/lib/geo";
import { escreverNumero, lerNumero, lerNumeroOuNulo } from "@/lib/numero";
import type { TipoPonto } from "@/lib/tipos";

const DADOS_INICIAIS: DadosFormulario = {
  nivelDinamico: "",
  altitudePoco: "",
  altitudeReservatorio: "",
  alturaCaixa: "",
  vazao: "3000",
  diametro: '1"',
  material: "pvc",
  comprimento: "",
};

export default function Home() {
  const [dados, setDados] = useState<DadosFormulario>(DADOS_INICIAIS);
  const [poco, setPoco] = useState<Ponto | null>(null);
  const [reservatorio, setReservatorio] = useState<Ponto | null>(null);
  const [comprimentoEditado, setComprimentoEditado] = useState(false);
  const [carregandoAltitude, setCarregandoAltitude] = useState(false);

  const distanciaMapaM = useMemo(
    () => (poco && reservatorio ? distanciaEntrePontosM(poco, reservatorio) : null),
    [poco, reservatorio],
  );

  /* --------------------------------- eventos -------------------------------- */

  const alterarCampo = useCallback(
    <K extends keyof DadosFormulario>(campo: K, valor: DadosFormulario[K]) => {
      if (campo === "comprimento") setComprimentoEditado(true);
      setDados((atual) => ({ ...atual, [campo]: valor }));
    },
    [],
  );

  /** Clique no mapa ou arraste de marcador: reposiciona o ponto e recalcula. */
  const definirPonto = useCallback(
    (tipo: TipoPonto, ponto: Ponto) => {
      const outro = tipo === "poco" ? reservatorio : poco;

      if (tipo === "poco") {
        setPoco(ponto);
        setDados((atual) => ({ ...atual, altitudePoco: "" }));
      } else {
        setReservatorio(ponto);
        setDados((atual) => ({ ...atual, altitudeReservatorio: "" }));
      }

      // Enquanto o vendedor nao mexer no campo, o comprimento acompanha o mapa.
      if (outro && !comprimentoEditado) {
        const a = tipo === "poco" ? ponto : outro;
        const b = tipo === "poco" ? outro : ponto;
        setDados((atual) => ({ ...atual, comprimento: escreverNumero(distanciaEntrePontosM(a, b)) }));
      }
    },
    [poco, reservatorio, comprimentoEditado],
  );

  const definirAltitude = useCallback((tipo: TipoPonto, altitude: number | null) => {
    const texto = altitude === null ? "" : escreverNumero(altitude);
    setDados((atual) =>
      tipo === "poco" ? { ...atual, altitudePoco: texto } : { ...atual, altitudeReservatorio: texto },
    );
  }, []);

  const limparPontos = useCallback(() => {
    setPoco(null);
    setReservatorio(null);
    setComprimentoEditado(false);
    setDados((atual) => ({
      ...atual,
      altitudePoco: "",
      altitudeReservatorio: "",
      comprimento: "",
    }));
  }, []);

  const usarDistanciaDoMapa = useCallback(() => {
    if (distanciaMapaM === null) return;
    setComprimentoEditado(false);
    setDados((atual) => ({ ...atual, comprimento: escreverNumero(distanciaMapaM) }));
  }, [distanciaMapaM]);

  /* -------------------------------- resultado ------------------------------- */

  const resultado = useMemo(
    () =>
      calcularAMT({
        nivelDinamicoM: lerNumero(dados.nivelDinamico),
        altitudePocoM: lerNumeroOuNulo(dados.altitudePoco),
        altitudeReservatorioM: lerNumeroOuNulo(dados.altitudeReservatorio),
        alturaCaixaM: lerNumero(dados.alturaCaixa),
        vazaoLh: lerNumero(dados.vazao),
        diametro: dados.diametro,
        material: dados.material,
        comprimentoTubulacaoM: lerNumero(dados.comprimento),
      }),
    [dados],
  );

  const proximoPonto: TipoPonto | null = !poco ? "poco" : !reservatorio ? "reservatorio" : null;

  /** Enquanto a tela estiver zerada nao vale exibir AMT nem avisos: so confunde. */
  const preenchido =
    lerNumero(dados.nivelDinamico) > 0 ||
    lerNumero(dados.comprimento) > 0 ||
    lerNumero(dados.alturaCaixa) > 0 ||
    poco !== null;

  /* ---------------------------------- render --------------------------------- */

  return (
    <main className="mx-auto flex min-h-screen max-w-[110rem] flex-col gap-4 p-4 lg:h-screen lg:gap-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Cota Certa
            <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-widest text-agua-700">
              bomba caneta
            </span>
          </h1>
          <p className="text-sm text-slate-600">
            Marque o poco e o reservatorio no mapa e veja quantos metros a bomba precisa vencer.
          </p>
        </div>
        <ol className="hidden items-center gap-2 text-[11px] font-medium text-slate-500 md:flex">
          {["Busque o endereco", "Clique no poco (A)", "Clique na caixa (B)", "Confira a AMT"].map(
            (passo, i) => (
              <li key={passo} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  {i + 1}
                </span>
                {passo}
              </li>
            ),
          )}
        </ol>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_32rem]">
        <Mapa
          poco={poco}
          reservatorio={reservatorio}
          proximoPonto={proximoPonto}
          onDefinirPonto={definirPonto}
          onAltitude={definirAltitude}
          onCarregandoAltitude={setCarregandoAltitude}
          onLimpar={limparPontos}
        />

        <aside className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <Resultado resultado={resultado} preenchido={preenchido} />
          <PainelDados
            dados={dados}
            onChange={alterarCampo}
            poco={poco}
            reservatorio={reservatorio}
            distanciaMapaM={distanciaMapaM}
            comprimentoEditado={comprimentoEditado}
            onUsarDistanciaDoMapa={usarDistanciaDoMapa}
            carregandoAltitude={carregandoAltitude}
          />
          <p className="pb-1 text-[11px] leading-snug text-slate-500">
            Estimativa de balcao: Hazen-Williams com 15% de acrescimo para perdas localizadas e
            diametros internos aproximados. Confira a curva da bomba antes de fechar a venda.
          </p>
        </aside>
      </div>
    </main>
  );
}
