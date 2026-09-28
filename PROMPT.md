# Projeto: Carrinhos que aprendem a dirigir

Demo de neuroevolução para uma feira de profissões, no estande do laboratório de aprendizado de máquina e inteligência artificial. Público: adolescentes de 14 a 18 anos que nunca estudaram IA. O projeto vai rodar num notebook ligado a uma TV, sem depender de internet.

A ideia é a mesma dos vídeos de "IA aprendendo a jogar Trackmania": vários carrinhos numa pista vista de cima, cada um com uma rede neural sorteada ao acaso. Na geração 1 quase todos batem; os melhores viram pais da próxima geração, com mutações, e o público vê a evolução acontecendo.

## Ponto de partida

`referencia/prototipo.html` é um protótipo funcional, em um arquivo só, que já foi testado e aprende bem. Abra e rode antes de começar. A lógica do motor (física, sensores, rede neural, algoritmo genético, geração de pista) deve ser portada dele, mantendo os parâmetros da tabela abaixo. O visual e a organização podem e devem melhorar. A identidade atual (grama, asfalto, zebra vermelha e branca, carro líder amarelo, fontes Saira e Saira Condensed) funcionou bem e pode ser mantida como base.

## Stack

- Vite + React + TypeScript.
- Renderização da pista e dos carros em `<canvas>` (não usar DOM ou SVG para os carros; são 150+ objetos por frame).
- Motor 100% separado da interface, em TypeScript puro, sem React e sem DOM, para poder ser testado em Node.
- Sem backend. Tudo roda offline com `npm run dev` ou a partir do build estático (`npm run build` + abrir o `dist`). Fontes empacotadas localmente (via `@fontsource`), nada carregado de CDN.
- Vitest para testes do motor.

Estrutura sugerida:

```
src/
  engine/
    rng.ts           # PRNG com seed (mulberry32) — todo aleatório passa por aqui
    network.ts       # rede neural feedforward (genoma = Float32Array)
    genetics.ts      # seleção, cruzamento, mutação, elitismo
    track.ts         # geração de pista, validação, máscara de colisão
    car.ts           # física, sensores, progresso, tempo de volta
    simulation.ts    # população, passo da simulação, fim de geração, histórico
    params.ts        # todos os parâmetros num só lugar
  render/
    trackRenderer.ts # desenha a pista num canvas offscreen (cache)
    worldRenderer.ts # carros, sensores, rastros, fantasmas
    brainRenderer.ts # visualização da rede neural
    chartRenderer.ts # gráfico por geração
  ui/                # componentes React (painel, controles, overlays)
  App.tsx
```

## Parâmetros que já foram calibrados

Estes valores foram testados em simulação headless. Com eles, a geração 1 faz em média menos de 1 volta, e entre a 2ª e a 6ª geração o melhor carro já completa voltas; depois disso o tempo de volta segue caindo por várias gerações. Não mude sem rodar o teste de aprendizado (ver Testes).

| Parâmetro | Valor |
|---|---|
| Mundo | 1200 × 760 unidades |
| Largura da pista | 54 |
| Pontos de controle da pista | 16, raio sorteado entre 0,35 e 1 da elipse, suavizado com vizinhos |
| Curva spline | Catmull-Rom fechada, reamostrada com espaçamento de 8 unidades |
| Validação da pista | curva máxima (ângulo entre segmentos a cada 4 pontos) entre 40° e 60°; ressortear até passar |
| Sensores | 7, em −90°, −50°, −20°, 0°, 20°, 50°, 90°; alcance 220; passo do raio 4 |
| Rede | 8 entradas (7 sensores como `1 − d/alcance` + velocidade normalizada) → 10 ocultos → 2 saídas, tanh em tudo |
| Saídas | [0] volante, [1] acelerador/freio |
| Física | velocidade máx. 8; aceleração `saída[1] × 0,2`; velocidade mínima 0 |
| Direção | `ângulo += saída[0] × 0,085 × (1 − 0,65 × v / vmax)` — em alta velocidade vira menos, então precisa aprender a frear |
| População | 150 |
| Elitismo | 4 melhores copiados sem mudança |
| Aleatórios novos | 3 por geração |
| Pais | top 20% (mínimo 10), escolha com viés de ranking `pool[floor(rand² × n)]` |
| Filho | 50% cruzamento uniforme de dois pais, 50% clone de um pai; depois mutação |
| Mutação | cada peso com probabilidade 10% (ajustável 1–40%) recebe `+ gaussiana × 0,5` |
| Duração da geração | 1800 passos (30 s em 1×) ou até todos morrerem |
| Morte | sair da pista, ficar 120 passos sem avançar, ou andar 10 pontos para trás |
| Aptidão | maior progresso alcançado ao longo da linha central (em pontos) |
| Colisão | máscara de bits da pista (Uint8Array) rasterizada uma vez por pista |

O progresso é calculado procurando o ponto da linha central mais próximo numa janela de −6 a +12 índices a partir do índice atual do carro, somando o deslocamento (com volta ao redor do circuito).

## O que precisa ter (já existe no protótipo)

- 150 carros na pista, líder em amarelo com os raios dos sensores visíveis, campeões da geração anterior em branco, filhos com mutação em azul.
- Painel com geração, carros na pista, recorde em voltas, melhor tempo de volta (sem contar a primeira volta, que sai parado) e barra de tempo da geração.
- Velocidade 1×, 3×, 10×, 30× (vários passos de simulação por frame).
- Pausar/continuar (também pela barra de espaço), nova pista mantendo os cérebros, recomeçar do zero, slider de mutação.
- Gráfico por geração: melhor carro e média, em voltas por 30 s.
- Visualização da rede do líder com ativações em tempo real e rótulos "volante ← / →" e "acelera / freia".
- Bloco "Como funciona" em três passos.
- Tema claro e escuro.

## O que deve ficar melhor e mais didático

Prioridade na ordem da lista. Se o tempo apertar, os itens do fim são opcionais.

1. **Modo apresentação.** Tecla `F` ou botão para tela cheia pensada para TV: pista grande, números grandes, painel lateral enxuto só com geração, recorde e gráfico. Tudo legível a 3 metros de distância.

2. **Transição entre gerações.** Quando uma geração termina, um intervalo curto (cerca de 3 s em 1×, desligável e pulado automaticamente em 10× e 30×) que conta a história da evolução: destaca os melhores carros ("estes foram mais longe"), mostra dois deles virando pais, e a palavra "mutação" com alguns pesos mudando de cor na rede. Deve ser visual, com pouco texto.

3. **Fantasmas das gerações.** Guardar o genoma do melhor carro de cada geração. Um botão "Comparar gerações" roda lado a lado, na mesma pista, fantasmas semitransparentes da geração 1, de uma do meio e da atual, cada um com o número da geração em cima. É a forma mais clara de mostrar "a IA melhorou".

4. **Clicar num carro.** Clicar em qualquer carro seleciona ele: os sensores dele aparecem, a rede no painel passa a ser a dele, e aparece se ele é campeão copiado ou filho mutado.

5. **Narração curta por fase.** Uma faixa de texto discreta que muda conforme o momento, com frases de uma linha escritas para adolescentes: por exemplo, na geração 1 "Os cérebros foram sorteados. Ninguém sabe dirigir ainda.", quando alguém completa a primeira volta "Primeira volta completa na geração 7!", quando o recorde cai "Nova melhor volta: 4,9 s". Evitar jargão; quando usar um termo técnico, explicar em poucas palavras.

6. **Cérebro campeão salvo.** Botão para salvar o genoma do melhor carro (localStorage e exportar/importar JSON). Serve para a feira: se só houver 1 minuto com um visitante, carrega um cérebro já treinado e mostra ele correndo numa pista nova.

7. **Desenhar a própria pista.** O visitante desenha um circuito fechado com o mouse ou o dedo; o traço é suavizado, reamostrado e validado (se as curvas forem impossíveis ou a pista se cruzar, avisar e pedir para desenhar de novo). Depois os carros treinam ou o campeão salvo tenta correr nela.

8. **Painel "Experimente mudar".** Além da mutação: tamanho da população (50–300), número de sensores (3, 5 ou 7) e um botão para desligar o elitismo, cada um com uma frase explicando o que esperar. Mudanças que alteram a rede recomeçam do zero, com aviso.

## Qualidade

- Deve manter 60 fps em 30× com 150 carros num notebook comum. Se precisar, mover a simulação para um Web Worker e mandar apenas posições para renderizar; os raios dos sensores só precisam ser calculados para desenho no carro selecionado ou líder (a simulação calcula todos, mas o desenho não).
- Suporte a `devicePixelRatio` no canvas, layout que funciona de 1280 px até TV 4K e também em tablet.
- Toda a interface em português do Brasil, frases curtas, voz ativa.
- Aleatoriedade com seed, mostrada discretamente no painel, para reproduzir uma boa execução no dia da feira.

## Testes

- Testes unitários da rede (saída determinística para um genoma fixo), da genética (tamanho da população, elitismo preservado) e da pista (fechada, validação de curvas, pontos com espaçamento constante).
- **Teste de aprendizado** em Node, sem canvas: gerar a máscara de colisão pintando círculos de raio `largura/2` ao longo da linha central, rodar 15 gerações em 3 seeds fixas e verificar que o melhor carro passa de 2 voltas em 30 s até a geração 10. Este teste protege a calibração: se alguém mexer nos parâmetros e a demo ficar fácil ou difícil demais, ele falha.

## Entrega

- `README.md` curto com como instalar, rodar, gerar o build offline e um roteiro de apresentação de 2 minutos para quem estiver no estande (o que falar na geração 1, quando mostrar a rede, quando trocar a pista, quando comparar gerações).
- Comece portando o motor e o teste de aprendizado, confirme que passa, e só depois construa a interface.
