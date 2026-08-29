"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Ponto } from "@/lib/geo";
import type { TipoPonto } from "@/lib/tipos";
import {
  CENTRO_PADRAO,
  CHAVE_API,
  MAP_ID,
  buscarAltitudes,
  buscarEndereco,
  carregarGoogleMaps,
  type BibliotecasGoogle,
} from "@/lib/googleMaps";

interface MapaProps {
  poco: Ponto | null;
  reservatorio: Ponto | null;
  /** Qual ponto o proximo clique define. `null` = cliques ignorados. */
  proximoPonto: TipoPonto | null;
  onDefinirPonto: (tipo: TipoPonto, ponto: Ponto) => void;
  onAltitude: (tipo: TipoPonto, altitude: number | null) => void;
  onCarregandoAltitude: (carregando: boolean) => void;
  onLimpar: () => void;
}

const CORES: Record<TipoPonto, { fundo: string; borda: string; letra: string }> = {
  poco: { fundo: "#2579eb", borda: "#1e468a", letra: "A" },
  reservatorio: { fundo: "#16a34a", borda: "#14532d", letra: "B" },
};

export default function Mapa({
  poco,
  reservatorio,
  proximoPonto,
  onDefinirPonto,
  onAltitude,
  onCarregandoAltitude,
  onLimpar,
}: MapaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);
  const libsRef = useRef<BibliotecasGoogle | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const elevacaoRef = useRef<google.maps.ElevationService | null>(null);
  const marcadoresRef = useRef<Partial<Record<TipoPonto, google.maps.marker.AdvancedMarkerElement>>>({});
  const linhaRef = useRef<google.maps.Polyline | null>(null);
  const requisicaoAltitudeRef = useRef(0);

  // Callbacks em refs: os listeners do Google sao registrados uma vez so.
  const cbRef = useRef({ onDefinirPonto, onAltitude, onCarregandoAltitude, proximoPonto });
  cbRef.current = { onDefinirPonto, onAltitude, onCarregandoAltitude, proximoPonto };

  const [pronto, setPronto] = useState(false);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  /* ------------------------------ inicializacao ------------------------------ */

  useEffect(() => {
    let cancelado = false;

    carregarGoogleMaps()
      .then((libs) => {
        if (cancelado || !containerRef.current || mapaRef.current) return;

        libsRef.current = libs;
        const mapa = new libs.maps.Map(containerRef.current, {
          center: CENTRO_PADRAO,
          zoom: 4,
          mapId: MAP_ID,
          mapTypeId: "hybrid",
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });

        mapa.addListener("click", (evento: google.maps.MapMouseEvent) => {
          const tipo = cbRef.current.proximoPonto;
          if (!tipo || !evento.latLng) return;
          cbRef.current.onDefinirPonto(tipo, {
            lat: evento.latLng.lat(),
            lng: evento.latLng.lng(),
          });
        });

        mapaRef.current = mapa;
        geocoderRef.current = new libs.geocoding.Geocoder();
        elevacaoRef.current = new libs.elevation.ElevationService();
        setPronto(true);
      })
      .catch((erro: unknown) => {
        if (cancelado) return;
        setErroMapa(erro instanceof Error ? erro.message : "Falha ao carregar o Google Maps.");
      });

    return () => {
      cancelado = true;
    };
  }, []);

  /* -------------------------------- marcadores ------------------------------- */

  const sincronizarMarcador = useCallback((tipo: TipoPonto, ponto: Ponto | null) => {
    const libs = libsRef.current;
    const mapa = mapaRef.current;
    if (!libs || !mapa) return;

    const existente = marcadoresRef.current[tipo];

    if (!ponto) {
      if (existente) {
        existente.map = null;
        delete marcadoresRef.current[tipo];
      }
      return;
    }

    if (existente) {
      existente.position = ponto;
      return;
    }

    const cor = CORES[tipo];
    const pin = new libs.marker.PinElement({
      background: cor.fundo,
      borderColor: cor.borda,
      glyphColor: "#ffffff",
      glyph: cor.letra,
      scale: 1.2,
    });

    const marcador = new libs.marker.AdvancedMarkerElement({
      map: mapa,
      position: ponto,
      content: pin.element,
      gmpDraggable: true,
      title: tipo === "poco" ? "Poco (A) — arraste para ajustar" : "Reservatorio (B) — arraste para ajustar",
      zIndex: tipo === "poco" ? 2 : 1,
    });

    marcador.addListener("dragend", (evento: { latLng?: google.maps.LatLng | null }) => {
      const pos = evento.latLng;
      if (!pos) return;
      cbRef.current.onDefinirPonto(tipo, { lat: pos.lat(), lng: pos.lng() });
    });

    marcadoresRef.current[tipo] = marcador;
  }, []);

  useEffect(() => {
    if (!pronto) return;
    sincronizarMarcador("poco", poco);
  }, [pronto, poco, sincronizarMarcador]);

  useEffect(() => {
    if (!pronto) return;
    sincronizarMarcador("reservatorio", reservatorio);
  }, [pronto, reservatorio, sincronizarMarcador]);

  /* ---------------------------- linha entre A e B ---------------------------- */

  useEffect(() => {
    if (!pronto || !mapaRef.current) return;

    if (!poco || !reservatorio) {
      linhaRef.current?.setMap(null);
      linhaRef.current = null;
      return;
    }

    const caminho = [poco, reservatorio];
    if (linhaRef.current) {
      linhaRef.current.setPath(caminho);
      return;
    }

    linhaRef.current = new google.maps.Polyline({
      map: mapaRef.current,
      path: caminho,
      strokeColor: "#f8fafc",
      strokeOpacity: 0,
      icons: [
        {
          icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeWeight: 3, scale: 3 },
          offset: "0",
          repeat: "14px",
        },
      ],
    });
  }, [pronto, poco, reservatorio]);

  /* --------------------------------- altitude -------------------------------- */

  useEffect(() => {
    const servico = elevacaoRef.current;
    if (!pronto || !servico) return;

    const alvos: Array<{ tipo: TipoPonto; ponto: Ponto }> = [];
    if (poco) alvos.push({ tipo: "poco", ponto: poco });
    if (reservatorio) alvos.push({ tipo: "reservatorio", ponto: reservatorio });
    if (alvos.length === 0) return;

    const id = ++requisicaoAltitudeRef.current;
    cbRef.current.onCarregandoAltitude(true);

    buscarAltitudes(
      servico,
      alvos.map((a) => a.ponto),
    )
      .then((altitudes) => {
        if (id !== requisicaoAltitudeRef.current) return; // resposta velha
        alvos.forEach((alvo, i) => cbRef.current.onAltitude(alvo.tipo, altitudes[i]));
      })
      .catch(() => {
        if (id !== requisicaoAltitudeRef.current) return;
        alvos.forEach((alvo) => cbRef.current.onAltitude(alvo.tipo, null));
        setErroBusca("Nao consegui a altitude dos pontos. Confira se a Elevation API esta habilitada.");
      })
      .finally(() => {
        if (id === requisicaoAltitudeRef.current) cbRef.current.onCarregandoAltitude(false);
      });
  }, [pronto, poco, reservatorio]);

  /* ------------------------------ busca endereco ----------------------------- */

  async function aoBuscar(evento: React.FormEvent) {
    evento.preventDefault();
    const termo = busca.trim();
    const geocoder = geocoderRef.current;
    const mapa = mapaRef.current;
    if (!termo || !geocoder || !mapa) return;

    setBuscando(true);
    setErroBusca(null);
    try {
      const achado = await buscarEndereco(geocoder, termo);
      if (achado.viewport) {
        mapa.fitBounds(achado.viewport);
        if ((mapa.getZoom() ?? 0) > 19) mapa.setZoom(19);
      } else {
        mapa.setCenter(achado.ponto);
        mapa.setZoom(18);
      }
    } catch {
      setErroBusca("Endereco nao encontrado. Tente incluir cidade e estado.");
    } finally {
      setBuscando(false);
    }
  }

  /* ---------------------------------- render --------------------------------- */

  const dica =
    proximoPonto === "poco"
      ? "Clique no mapa para marcar o POCO (A)."
      : proximoPonto === "reservatorio"
        ? "Agora clique para marcar o RESERVATORIO (B)."
        : "Pontos marcados. Arraste os marcadores para ajustar — tudo recalcula sozinho.";

  return (
    <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
      <form onSubmit={aoBuscar} className="flex gap-2 border-b border-slate-200 p-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar endereco, sitio ou cidade…"
          disabled={!pronto}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-agua-500 focus:ring-2 focus:ring-agua-100 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!pronto || buscando || busca.trim() === ""}
          className="shrink-0 rounded-lg bg-agua-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-agua-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <div className="relative flex-1">
        <div ref={containerRef} className="h-full min-h-[20rem] w-full bg-slate-200" />

        {!pronto && !erroMapa && (
          <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm text-slate-500">
            Carregando mapa…
          </div>
        )}

        {erroMapa && (
          <div className="absolute inset-0 grid place-items-center bg-slate-50 p-6">
            <div className="max-w-md text-center">
              <p className="text-sm font-semibold text-slate-800">Mapa indisponivel</p>
              <p className="mt-2 text-sm text-slate-600">{erroMapa}</p>
              {!CHAVE_API && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-left text-xs text-amber-900">
                  Sem o mapa a calculadora continua funcionando: preencha as altitudes e o
                  comprimento da tubulacao na mao.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-600">{dica}</p>
        {(poco || reservatorio) && (
          <button
            type="button"
            onClick={onLimpar}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Limpar pontos
          </button>
        )}
      </div>

      {erroBusca && (
        <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {erroBusca}
        </p>
      )}
    </section>
  );
}
