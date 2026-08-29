# Cota Certa

Ferramenta de balcão para lojas que vendem **bomba caneta** (bomba submersa de poço
artesiano). O vendedor marca o poço e o reservatório no mapa e descobre em segundos
**quantos metros a bomba precisa vencer** — a AMT (Altura Manométrica Total).

Uma página só: mapa à esquerda, painel de dados e resultado à direita. No celular,
os dois blocos empilham.

## Como usar no balcão

1. **Busque o endereço** do cliente no campo acima do mapa (Geocoding do Google).
2. **Primeiro clique no mapa marca o POÇO (A)**; o **segundo marca o RESERVATÓRIO (B)**.
3. Os dois marcadores são **arrastáveis** — ao arrastar, altitude, distância e AMT
   recalculam sozinhos.
4. Preencha nível dinâmico, altura da caixa, vazão desejada, diâmetro e material da
   tubulação. O **comprimento da tubulação** já vem pré-preenchido com um valor sugerido
   (veja abaixo) e continua editável — e o painel mostra a composição desse número,
   parcela por parcela.
5. Leia a **AMT em destaque**, junto com a vazão e a quebra em parcelas.

Sem chave de API o mapa não abre, mas a calculadora continua funcionando: basta
preencher as altitudes e o comprimento na mão.

## Configuração

```bash
cp .env.local.example .env.local   # e preencha a chave
npm install
npm run dev                        # http://localhost:3000
```

A chave vem de `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` e precisa destas APIs habilitadas no
Google Cloud Console:

| API | Para quê |
| --- | --- |
| Maps JavaScript API | desenhar o mapa e os marcadores |
| Geocoding API | busca de endereço |
| Elevation API | altitude dos pontos A e B |

Como a chave é exposta no browser (prefixo `NEXT_PUBLIC_`), **restrinja-a por
referenciador HTTP** (o domínio da loja) no Google Cloud Console. `.env.local` está no
`.gitignore` — não comite a chave.

`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` é opcional; sem ela o app usa o `DEMO_MAP_ID` do
Google, que já funciona para testes.

## O cálculo

Todo o cálculo está isolado em **`lib/calculo.ts`**: funções puras, sem React e sem
Google, com entrada e saída serializáveis. É o arquivo pronto para virar um endpoint de
API — `calcularAMT(entrada)` já recebe e devolve JSON.

```
AMT = nível dinâmico
    + (altitude B − altitude A)
    + altura da caixa acima do solo
    + perda de carga
```

**Perda de carga por Hazen-Williams:**

```
J = 10.65 * Q^1.852 / (C^1.852 * D^4.87)
```

com `Q` em m³/s, `D` = diâmetro **interno** em metros e `J` em m/m. A perda distribuída
é `J × comprimento`, e sobre ela somam-se **15%** de perdas localizadas (curvas,
registros, válvula de retenção).

**Coeficiente C:** PVC/PEAD `140` · galvanizado novo `120` · galvanizado usado `100`.

**Diâmetros internos aproximados (mm):** 3/4" `21,6` · 1" `27,8` · 1.1/4" `35,2` ·
1.1/2" `44,0` · 2" `53,4`.

### Comprimento sugerido da tubulação

A distância do mapa é só a **projeção horizontal**. O tubo ainda desce o poço até a
bomba, acompanha o desnível do terreno e sobe a torre da caixa:

```
sugerido = (distância horizontal
          + nível dinâmico
          + altura da caixa
          + |altitude B − altitude A|) * (1 + folga de traçado)
```

A **folga de traçado** é um campo visível e editável no painel (padrão **15%**), não um
multiplicador escondido: cobre curvas, desvios e sobra de corte. Zerar o campo zera a
folga; valores negativos são tratados como 0, para que a folga nunca encurte o tubo.

O painel exibe a composição ao lado do campo — distância no mapa, descida no poço,
subida até a caixa, desnível do terreno, subtotal, folga e total — para o vendedor
entender de onde saiu o número.

Quando **falta a altitude de A ou de B**, a parcela do desnível continua valendo 0 (o
cálculo não muda), mas a linha aparece atenuada como *"desnível do terreno — não
informado"* e um aviso avisa que a sugestão está incompleta e o comprimento real deve ser
maior — em vez de a parcela sumir da lista sem explicação. Enquanto ele não digitar um comprimento próprio, o campo
acompanha a sugestão e se atualiza junto com o nível dinâmico, a altura da caixa e a
folga; depois de editado na mão, um link devolve o valor sugerido.

### Velocidade

Também é calculada a **velocidade** na tubulação (`v = Q / A`). Acima de **2 m/s** o app
avisa e sugere a menor bitola da tabela que traz a velocidade de volta ao limite.

O resultado nunca é só o número final: a tela mostra **de onde vem cada metro** — nível
dinâmico, desnível do terreno, altura da caixa e perda de carga (separada em distribuída
e localizada, com o percentual que ela representa na AMT).

## Testes

```bash
npm test
```

Cobrem Hazen-Williams contra o cálculo manual, a composição das parcelas da AMT, o
acréscimo de 15%, a troca de material e de bitola, desnível negativo, o aviso de
velocidade, a sugestão de diâmetro, entradas inválidas e a distância haversine — mais o
comprimento sugerido: soma dos trechos verticais, desnível em valor absoluto (descer
também gasta tubo), folga configurável e folga negativa que não encurta o tubo.

## Estrutura

```
app/page.tsx           orquestra o estado da tela (pontos, formulário, resultado)
components/Mapa.tsx    Google Maps: busca, cliques, marcadores arrastáveis, elevação
components/PainelDados.tsx   campos de entrada
components/Resultado.tsx     AMT em destaque + quebra em parcelas
lib/calculo.ts         núcleo hidráulico e comprimento sugerido — puro, candidato a virar API
lib/geo.ts             distância haversine entre A e B — puro
lib/googleMaps.ts      carregamento do SDK, geocoding e elevação
```

> Estimativa de balcão: os diâmetros internos são aproximados e as perdas localizadas
> entram como um percentual fixo. Confira sempre a curva da bomba antes de fechar a venda.
