import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DIAMETRO_INTERNO_MM,
  calcularAMT,
  litrosHoraParaM3Segundo,
  perdaCargaUnitariaHazenWilliams,
  sugerirDiametro,
  velocidadeEscoamento,
  type EntradaCalculo,
} from "./calculo.ts";

import { distanciaEntrePontosM } from "./geo.ts";

const base: EntradaCalculo = {
  nivelDinamicoM: 40,
  altitudePocoM: 600,
  altitudeReservatorioM: 615,
  alturaCaixaM: 5,
  vazaoLh: 3000,
  diametro: '1"',
  material: "pvc",
  comprimentoTubulacaoM: 120,
};

test("conversao de vazao L/h -> m3/s", () => {
  assert.equal(litrosHoraParaM3Segundo(3600), 0.001);
});

test("Hazen-Williams bate com o calculo manual", () => {
  const Q = litrosHoraParaM3Segundo(3000); // m3/s
  const D = DIAMETRO_INTERNO_MM['1"'] / 1000;
  const esperado = (10.65 * Q ** 1.852) / (140 ** 1.852 * D ** 4.87);
  assert.ok(Math.abs(perdaCargaUnitariaHazenWilliams(Q, D, 140) - esperado) < 1e-12);
});

test("perda unitaria cai quando o diametro sobe", () => {
  const Q = litrosHoraParaM3Segundo(3000);
  const j1 = perdaCargaUnitariaHazenWilliams(Q, DIAMETRO_INTERNO_MM['1"'] / 1000, 140);
  const j2 = perdaCargaUnitariaHazenWilliams(Q, DIAMETRO_INTERNO_MM['2"'] / 1000, 140);
  assert.ok(j2 < j1);
});

test("velocidade = Q / A", () => {
  const Q = 0.001;
  const D = 0.0278;
  assert.ok(Math.abs(velocidadeEscoamento(Q, D) - Q / ((Math.PI * D ** 2) / 4)) < 1e-12);
});

test("AMT = nivel + desnivel + caixa + perda de carga", () => {
  const r = calcularAMT(base);
  const soma =
    r.parcelas.nivelDinamicoM +
    r.parcelas.desnivelGeograficoM +
    r.parcelas.alturaCaixaM +
    r.parcelas.perdaCargaM;
  assert.ok(Math.abs(r.amtM - soma) < 0.02);
  assert.equal(r.parcelas.desnivelGeograficoM, 15);
  assert.equal(r.alturaGeometricaM, 60);
});

test("perdas localizadas somam 15% sobre a distribuida", () => {
  const r = calcularAMT(base);
  assert.ok(Math.abs(r.perdaLocalizadaM - r.perdaDistribuidaM * 0.15) < 0.01);
  assert.ok(Math.abs(r.parcelas.perdaCargaM - (r.perdaDistribuidaM + r.perdaLocalizadaM)) < 0.01);
});

test("fator de perdas localizadas e configuravel", () => {
  const r = calcularAMT({ ...base, fatorPerdasLocalizadas: 0 });
  assert.equal(r.perdaLocalizadaM, 0);
  assert.equal(r.parcelas.perdaCargaM, r.perdaDistribuidaM);
});

test("coeficiente C muda com o material", () => {
  const pvc = calcularAMT(base);
  const usado = calcularAMT({ ...base, material: "galvanizado_usado" });
  assert.equal(pvc.coeficienteC, 140);
  assert.equal(usado.coeficienteC, 100);
  assert.ok(usado.parcelas.perdaCargaM > pvc.parcelas.perdaCargaM);
});

test("desnivel negativo reduz a AMT", () => {
  const r = calcularAMT({ ...base, altitudeReservatorioM: 590 });
  assert.equal(r.parcelas.desnivelGeograficoM, -10);
  assert.ok(r.amtM < calcularAMT(base).amtM);
  assert.ok(r.avisos.some((a) => a.mensagem.includes("cota mais baixa")));
});

test("sem altitudes o desnivel vira 0 e gera aviso", () => {
  const r = calcularAMT({ ...base, altitudePocoM: null, altitudeReservatorioM: null });
  assert.equal(r.parcelas.desnivelGeograficoM, 0);
  assert.ok(r.avisos.some((a) => a.mensagem.includes("desnivel do terreno")));
});

test("avisa e sugere bitola maior acima de 2 m/s", () => {
  const r = calcularAMT({ ...base, vazaoLh: 8000, diametro: '3/4"' });
  assert.ok(r.velocidadeMs > 2);
  assert.ok(r.diametroSugerido !== null);
  assert.ok(DIAMETRO_INTERNO_MM[r.diametroSugerido!] > DIAMETRO_INTERNO_MM['3/4"']);
  assert.ok(r.avisos.some((a) => a.nivel === "atencao" && a.mensagem.includes("Velocidade")));
});

test("nao avisa de velocidade quando esta dentro do limite", () => {
  const r = calcularAMT({ ...base, vazaoLh: 2000, diametro: '2"' });
  assert.ok(r.velocidadeMs <= 2);
  assert.ok(!r.avisos.some((a) => a.mensagem.includes("Velocidade de")));
});

test("sugerirDiametro devolve a menor bitola que serve", () => {
  assert.equal(sugerirDiametro(litrosHoraParaM3Segundo(1000)), '3/4"');
  assert.equal(sugerirDiametro(litrosHoraParaM3Segundo(100000)), null);
});

test("entradas invalidas nao quebram e viram avisos", () => {
  const r = calcularAMT({
    ...base,
    vazaoLh: Number.NaN,
    comprimentoTubulacaoM: 0,
    nivelDinamicoM: 0,
  });
  assert.ok(Number.isFinite(r.amtM));
  assert.equal(r.parcelas.perdaCargaM, 0);
  assert.equal(r.avisos.filter((a) => a.nivel === "erro").length, 2);
});

test("haversine: 1 grau de latitude ~ 111 km", () => {
  const d = distanciaEntrePontosM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(Math.abs(d - 111_195) < 200);
  assert.equal(distanciaEntrePontosM({ lat: -23.5, lng: -46.6 }, { lat: -23.5, lng: -46.6 }), 0);
});
