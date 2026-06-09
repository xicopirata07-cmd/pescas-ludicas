/*
  Configuracao principal de Mare Pixel: Pesca da Nazare
  -----------------------------------------------------
  Este e o ficheiro mais importante para ajustar o jogo.

  Podes mudar pontos, velocidades, probabilidades, duracoes,
  raridade dos shinies, dificuldade e fuga do peixe grande aqui,
  sem mexer na logica principal em game.js.

  Notas sobre probabilidades:
  - O jogo usa duas camadas de probabilidade:

    1. Primeiro escolhe uma categoria geral em difficultyLevels:
       fish, trash ou danger.

       Exemplo:
       weights: { fish: 88, trash: 9, danger: 3 }

       Isto quer dizer que, nessa fase do jogo, aparecem muitos peixes,
       pouco lixo e poucos perigos.

    2. Depois de escolher a categoria, o jogo escolhe um objeto dentro
       dessa categoria usando o valor "chance".

       Exemplo:
       Sardinha chance 32 e Polvo chance 7 significa que, quando o jogo
       ja escolheu a categoria "fish", a Sardinha aparece muito mais
       vezes do que o Polvo.

  - Muito importante:
    Se mudares o Tubarao para chance 80, isso nao quer dizer que ele
    aparece 80% das vezes no jogo todo.

    O Tubarao so compete dentro da categoria "danger".
    Para aparecerem mais tubaroes no jogo todo, tambem tens de aumentar
    danger em difficultyLevels.

    O mesmo vale para lixo:
    aumentar a chance da Garrafa ou da Bota so muda qual lixo aparece.
    Para aparecer mais lixo no jogo todo, aumenta trash em difficultyLevels.

  - "shinyChance" e uma probabilidade real entre 0 e 1.
    Exemplo: 0.02 = 2% de chance de esse peixe nascer shiny.
  - Os shinies valem sempre os pontos normais x shinyMultiplier.
*/

window.GAME_CONFIG = {
  // ------------------------------
  // Tamanho e duracao da partida
  // ------------------------------
  seaTop: 282, // Linha vertical onde a agua comeca.
  gameSeconds: 120, // 120 segundos = 2 minutos.

  // ------------------------------
  // Anzol e estados de bloqueio
  // ------------------------------
  hookX: 540, // Posicao horizontal fixa do anzol.
  hookTopPadding: 8, // Distancia minima entre o anzol e a linha da agua.
  hookBottomPadding: 54, // Distancia minima entre o anzol e o fundo do canvas.
  collectLineOffset: 28, // Altura acima da qual o peixe e recolhido.
  shockDuration: 3000, // Duracao do choque em milissegundos. 3000 = 3 segundos; 5000 = 5 segundos.

  // ------------------------------
  // Regras de pontuacao especial
  // ------------------------------
  shinyMultiplier: 4, // Peixes shiny dao x4 pontos.
  bigFishUnlockScore: 200, // Peixe grande so aparece depois destes pontos.
  bigFishUnlockSeconds: 30, // Peixe grande so aparece depois deste tempo de jogo.

  // ------------------------------
  // Fuga do peixe grande
  // ------------------------------
  bigFishEscapeByBait: {
    Sardinha: 0.98, // Isco pequeno: quase sempre escapa.
    Carapau: 0.94,
    Robalo: 0.86,
    Polvo: 0.76,
    Lula: 0.7 // Lula e um isco um pouco melhor.
  },
  bigFishFinalEscapeBonus: 0.08, // Chance extra de fuga mesmo antes de recolher.
  bigFishEscapeDelayMin: 250, // Tempo minimo ate tentar largar o anzol.
  bigFishEscapeDelayMax: 700, // Tempo maximo ate tentar largar o anzol.
  bigFishFleeSpeed: 2.7, // Velocidade quando foge do anzol.
  bigFishFleeDuration: 1200, // Tempo de fuga rapida antes de voltar a nadar lento.

  // ------------------------------
  // Peixes normais
  // ------------------------------
  /*
    Campos usados nos peixes:

    name:
    - Nome que aparece no jogo e no resumo final.

    points:
    - Pontos ganhos quando o jogador recolhe esse peixe.

    color:
    - Cor do desenho temporario, usada quando nao existe imagem PNG em assets.
    - Se houver imagem, a imagem substitui este desenho.

    chance:
    - Peso dentro da categoria "fish".
    - So e usado depois de o jogo ja ter escolhido que vai aparecer um peixe.

    shinyChance:
    - Probabilidade real de nascer shiny.
    - 0.01 = 1%, 0.05 = 5%, 0.5 = 50%.

    width e height:
    - Tamanho do objeto no jogo.
    - Tambem controlam o tamanho da imagem PNG se existir.

    speedMin e speedMax:
    - Velocidade minima e maxima.
    - O jogo escolhe uma velocidade aleatoria entre estes dois valores.
  */
  fish: [
    {
      name: "Sardinha",
      points: 10,
      color: "#f5c84c",
      chance: 32,
      shinyChance: 0.035,
      width: 74,
      height: 34,
      speedMin: 1.2,
      speedMax: 3.1
    },
    {
      name: "Carapau",
      points: 15,
      color: "#c4d0dc",
      chance: 24,
      shinyChance: 0.025,
      width: 82,
      height: 36,
      speedMin: 1.2,
      speedMax: 3.1
    },
    {
      name: "Robalo",
      points: 30,
      color: "#e8f7fb",
      chance: 13,
      shinyChance: 0.015,
      width: 96,
      height: 40,
      speedMin: 1.2,
      speedMax: 3.1
    },
    {
      name: "Polvo",
      points: 45,
      color: "#a96be0",
      chance: 7,
      shinyChance: 0.008,
      width: 64,
      height: 44,
      speedMin: 1,
      speedMax: 2.5
    },
    {
      name: "Lula",
      points: 55,
      color: "#eef1ff",
      chance: 6,
      shinyChance: 0.006,
      width: 72,
      height: 44,
      speedMin: 1.4,
      speedMax: 3.4
    }
  ],

  // ------------------------------
  // Peixe grande especial
  // ------------------------------
  /*
    O peixe grande nao aparece por chance normal.
    Ele aparece quando:
    - ja passaram bigFishUnlockSeconds segundos;
    - o jogador tem mais de bigFishUnlockScore pontos;
    - nao existe outro peixe grande ativo no mar.

    Se for capturado ou comido pelo tubarao, pode aparecer outro mais tarde.
    Se fugir do anzol, volta para o mar e continua a ser o mesmo peixe grande.
  */
  bigFish: {
    name: "Peixe grande",
    kind: "bigFish",
    points: 1000,
    color: "#2f9f8d",
    chance: 7, // Ja nao controla o aparecimento; fica aqui para futura experimentacao.
    shinyChance: 0.002,
    width: 150,
    height: 64,
    speedMin: 0.5,
    speedMax: 0.9
  },

  // ------------------------------
  // Perigos e lixo
  // ------------------------------
  jellyfish: {
    name: "Alforreca",
    kind: "danger",
    points: -20,
    color: "#ef4a3d",
    chance: 12,
    // chance: peso dentro da categoria "danger".
    // Se danger for baixo em difficultyLevels, as alforrecas continuam raras.
    width: 76,
    height: 52,
    speedMin: 1.2,
    speedMax: 3.1
  },

  shark: {
    name: "Tubarao",
    kind: "sharkHazard",
    points: 0,
    color: "#37516c",
    chance: 2,
    // chance: peso dentro da categoria "danger", junto com a Alforreca.
    // Para o Tubarao aparecer muito, aumenta esta chance E aumenta danger
    // em difficultyLevels.
    width: 260,
    height: 110,
    speedMin: 13,
    speedMax: 17
  },

  trash: [
    {
      name: "Garrafa",
      kind: "trash",
      points: -10,
      color: "#45b36a",
      chance: 7,
      // chance: peso dentro da categoria "trash".
      // Para aparecer mais lixo no jogo todo, aumenta trash em difficultyLevels.
      width: 54,
      height: 34,
      speedMin: 1.2,
      speedMax: 3.1
    },
    {
      name: "Bota velha",
      kind: "trash",
      points: -20,
      color: "#9b671f",
      chance: 5,
      // chance: peso dentro da categoria "trash".
      // Este valor decide se aparece mais Bota velha ou mais Garrafa
      // depois de o jogo ja ter escolhido a categoria trash.
      width: 64,
      height: 44,
      speedMin: 1.2,
      speedMax: 3.1
    }
  ],

  // ------------------------------
  // Dificuldade ao longo do tempo
  // ------------------------------
  /*
    Aqui esta a primeira camada de probabilidade.

    startsAt:
    - Segundo da partida em que este nivel comeca.
    - startsAt: 40 quer dizer que este nivel comeca aos 40 segundos.

    spawnDelay:
    - Tempo em milissegundos entre novos objetos.
    - Numero menor = aparecem objetos mais depressa.
    - 1000 = mais ou menos 1 objeto por segundo.

    weights:
    - Decide a categoria geral do proximo objeto.
    - fish = peixes normais.
    - trash = lixo.
    - danger = alforrecas e tubarao.

    Exemplo:
    weights: { fish: 50, trash: 30, danger: 20 }

    Isto nao precisa somar 100, mas e mais facil pensar como percentagens.
    Neste exemplo, cerca de metade dos objetos seriam peixes.
  */
  difficultyLevels: [
    {
      name: "Mar calmo",
      startsAt: 0,
      spawnDelay: 1050,
      weights: { fish: 88, trash: 9, danger: 3 }
    },
    {
      name: "Mar sujo",
      startsAt: 40,
      spawnDelay: 900,
      weights: { fish: 66, trash: 24, danger: 10 }
    },
    {
      name: "Mar perigoso",
      startsAt: 80,
      spawnDelay: 760,
      weights: { fish: 44, trash: 34, danger: 22 }
    }
  ],

  // ------------------------------
  // Lista dos ficheiros de arte que os alunos podem criar
  // ------------------------------
  assetPlaceholders: [
    "fisherman.png",
    "cliffs.png",
    "sardinha.png",
    "carapau.png",
    "robalo.png",
    "polvo.png",
    "lula.png",
    "peixe_grande.png",
    "tubarao.png",
    "alforreca.png",
    "garrafa.png",
    "bota.png"
  ]
};
