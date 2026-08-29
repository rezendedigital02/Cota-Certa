/**
 * Utilidades geograficas puras — sem dependencia do Google Maps.
 */

export interface Ponto {
  lat: number;
  lng: number;
}

const RAIO_TERRA_M = 6_371_008.8;

function paraRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/**
 * Distancia em linha reta sobre a superficie (haversine), em metros.
 * E a distancia horizontal — o desnivel entra na AMT pela altitude, nao aqui.
 */
export function distanciaEntrePontosM(a: Ponto, b: Ponto): number {
  const dLat = paraRadianos(b.lat - a.lat);
  const dLng = paraRadianos(b.lng - a.lng);
  const lat1 = paraRadianos(a.lat);
  const lat2 = paraRadianos(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Formata uma coordenada para exibicao curta no painel. */
export function formatarCoordenada(ponto: Ponto): string {
  return `${ponto.lat.toFixed(6)}, ${ponto.lng.toFixed(6)}`;
}
