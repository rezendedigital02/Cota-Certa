/**
 * Camada fina sobre o SDK do Google Maps.
 *
 * Tudo que depende do Google vive aqui ou nos componentes de mapa — o nucleo
 * de calculo (lib/calculo.ts) continua puro.
 */
import { Loader } from "@googlemaps/js-api-loader";

import type { Ponto } from "./geo.ts";

export const CHAVE_API = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/** Centro padrao do mapa: centro geografico aproximado do Brasil. */
export const CENTRO_PADRAO: Ponto = { lat: -15.78, lng: -47.93 };

export interface BibliotecasGoogle {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  geocoding: google.maps.GeocodingLibrary;
  elevation: google.maps.ElevationLibrary;
}

let promessa: Promise<BibliotecasGoogle> | null = null;

/** Carrega o SDK uma unica vez por sessao e devolve as bibliotecas usadas. */
export function carregarGoogleMaps(): Promise<BibliotecasGoogle> {
  if (!CHAVE_API) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nao configurada. Copie .env.local.example para .env.local e preencha a chave.",
      ),
    );
  }
  if (!promessa) {
    const loader = new Loader({ apiKey: CHAVE_API, version: "weekly", language: "pt-BR", region: "BR" });
    promessa = Promise.all([
      loader.importLibrary("maps"),
      loader.importLibrary("marker"),
      loader.importLibrary("geocoding"),
      loader.importLibrary("elevation"),
    ])
      .then(([maps, marker, geocoding, elevation]) => ({ maps, marker, geocoding, elevation }))
      .catch((erro) => {
        // permite nova tentativa depois de uma falha de rede
        promessa = null;
        throw erro;
      });
  }
  return promessa;
}

export interface EnderecoEncontrado {
  ponto: Ponto;
  enderecoFormatado: string;
  viewport: google.maps.LatLngBounds | null;
}

/** Busca um endereco pelo Geocoding API. Lanca erro com mensagem em pt-BR. */
export async function buscarEndereco(
  geocoder: google.maps.Geocoder,
  endereco: string,
): Promise<EnderecoEncontrado> {
  const { results } = await geocoder.geocode({
    address: endereco,
    componentRestrictions: { country: "BR" },
  });

  const primeiro = results[0];
  if (!primeiro) throw new Error("Endereco nao encontrado.");

  return {
    ponto: { lat: primeiro.geometry.location.lat(), lng: primeiro.geometry.location.lng() },
    enderecoFormatado: primeiro.formatted_address,
    viewport: primeiro.geometry.viewport ?? null,
  };
}

/** Altitude (m) de uma lista de pontos, na mesma ordem em que foram enviados. */
export async function buscarAltitudes(
  servico: google.maps.ElevationService,
  pontos: Ponto[],
): Promise<number[]> {
  if (pontos.length === 0) return [];
  const { results } = await servico.getElevationForLocations({ locations: pontos });
  if (!results || results.length < pontos.length) {
    throw new Error("O servico de altitude nao retornou dados para todos os pontos.");
  }
  return results.slice(0, pontos.length).map((r) => r.elevation);
}
