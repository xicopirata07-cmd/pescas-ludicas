/*
  Mare Pixel: Pesca da Nazare
  --------------------------------
  Este ficheiro tem todo o codigo do jogo Canvas.

  Organizacao geral:
  1. Ligacao aos elementos HTML.
  2. Constantes de configuracao do jogo.
  3. Variaveis que mudam durante a partida.
  4. Tabelas de peixes, perigos, lixo e dificuldade.
  5. Eventos do rato/toque e botoes.
  6. Logica principal do jogo.
  7. Colisoes e regras especiais.
  8. Funcoes de desenho no Canvas.

  A ideia e manter tudo simples para a turma poder ler, mudar valores
  e substituir os desenhos temporarios por imagens na pasta assets.
*/

// ============================================================
// 1. Elementos HTML usados pelo jogo
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreElement = document.getElementById("finalScore");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

// ============================================================
// 2. Constantes de configuracao
// ============================================================

// GAME_CONFIG vem de game-config.js e contem todos os valores faceis de editar.
const config = window.GAME_CONFIG;

// Linha onde a agua comeca. Tudo acima e ceu/terra; tudo abaixo e mar.
const seaTop = config.seaTop;

// Quando o anzol chega aqui com um objeto, esse objeto e recolhido.
const collectLineY = seaTop + config.collectLineOffset;

// Posicao horizontal fixa do anzol. O jogador controla apenas a altura.
const hookX = config.hookX;

// Limites verticais do anzol para ele nao sair do mar nem do ecra.
const hookMinY = seaTop + config.hookTopPadding;
const hookMaxY = canvas.height - config.hookBottomPadding;

// Duracao total da partida em segundos. 120 segundos = 2 minutos.
const gameSeconds = config.gameSeconds;

// Duracao do choque da alforreca em milissegundos.
const shockDuration = config.shockDuration;

// O peixe grande so pode aparecer depois desta pontuacao.
const bigFishUnlockScore = config.bigFishUnlockScore;

// ============================================================
// 3. Estado da partida
// ============================================================

// Estas variaveis mudam constantemente durante o jogo.
let score = 0;
let timeLeft = gameSeconds;
let gameRunning = false;
let hookY = 390;
let carriedItem = null;
let items = [];
let recentCatch = [];
let caughtCounts = {};
let lastSpawnTime = 0;
let gameStartTime = 0;
let animationId = 0;
let shockUntil = 0;
let statusMessage = "";
let statusMessageUntil = 0;
let bigFishHasSpawned = false;
let bigFishCaught = false;

// ============================================================
// 4. Dados dos objetos do jogo
// ============================================================

// Placeholder entries for the students' future pixel art in /assets.
const assetPlaceholders = config.assetPlaceholders;

// Peixes normais vindos de game-config.js.
const fishTypes = config.fish.map((fish) => ({
  ...fish,
  kind: "fish"
}));

// Lixo e perigos vindos de game-config.js.
const trashTypes = config.trash;
const dangerTypes = [config.jellyfish];

// Peixe especial e tubarao tambem ficam no config.
const bigFishType = config.bigFish;
const sharkType = config.shark;

// Probabilidade de o peixe grande fugir conforme o isco usado.
const bigFishEscapeChanceByBait = config.bigFishEscapeByBait;

// Dificuldade por tempo.
const difficultyLevels = config.difficultyLevels;

// ============================================================
// 5. Eventos de entrada do jogador
// ============================================================

// O rato e o dedo controlam diretamente a altura do anzol.
canvas.addEventListener("mousemove", updatePointer);
canvas.addEventListener("touchmove", updatePointer, { passive: false });

// Botoes para comecar e reiniciar a partida.
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

/*
  Le a posicao vertical do rato/toque dentro do canvas.
  O anzol segue essa posicao diretamente, sem fisica ou atraso.
  Se o jogador estiver em choque, ignoramos o input.
*/
function updatePointer(event) {
  if (event.type === "touchmove") {
    event.preventDefault();
  }

  if (!gameRunning || isShocked(performance.now())) {
    return;
  }

  const pointer = event.touches ? event.touches[0] : event;
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseY = (pointer.clientY - rect.top) * scaleY;

  hookY = clamp(mouseY, hookMinY, hookMaxY);
}

// ============================================================
// 6. Ciclo principal da partida
// ============================================================

/*
  Reinicia todos os valores importantes e arranca o loop de animacao.
  E usado tanto pelo botao Comecar como pelo botao Jogar outra vez.
*/
function startGame() {
  cancelAnimationFrame(animationId);

  score = 0;
  timeLeft = gameSeconds;
  gameRunning = true;
  hookY = 390;
  carriedItem = null;
  items = [];
  recentCatch = [];
  caughtCounts = {};
  lastSpawnTime = 0;
  gameStartTime = performance.now();
  shockUntil = 0;
  statusMessage = "";
  statusMessageUntil = 0;
  bigFishHasSpawned = false;
  bigFishCaught = false;

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  animationId = requestAnimationFrame(gameLoop);
}

/*
  Loop principal: acontece muitas vezes por segundo.
  A ordem importa:
  1. atualiza tempo;
  2. atualiza anzol e objetos;
  3. verifica colisoes;
  4. desenha o novo frame.
*/
function gameLoop(timestamp) {
  if (!gameRunning) return;

  updateTimer(timestamp);
  updateHook(timestamp);
  updateItems(timestamp);
  checkCollisions(timestamp);
  draw();

  if (timeLeft <= 0) {
    endGame();
    return;
  }

  animationId = requestAnimationFrame(gameLoop);
}

// Calcula quantos segundos faltam a partir do tempo real da partida.
function updateTimer(timestamp) {
  const elapsedSeconds = Math.floor((timestamp - gameStartTime) / 1000);
  timeLeft = Math.max(0, gameSeconds - elapsedSeconds);
}

/*
  Atualiza o objeto preso ao anzol.
  Se for peixe grande, ele pode fugir antes de ser recolhido.
  Se o anzol chega a linha da agua, o item e recolhido.
*/
function updateHook(timestamp) {
  if (carriedItem) {
    carriedItem.x = hookX - carriedItem.width / 2;
    carriedItem.y = hookY + 28;

    if (carriedItem.kind === "bigFish" && timestamp >= carriedItem.escapeAt) {
      tryBigFishEscape(carriedItem, timestamp);
      return;
    }

    if (!isShocked(timestamp) && hookY <= collectLineY) {
      if (carriedItem.kind === "bigFish" && tryBigFishFinalEscape(carriedItem, timestamp)) {
        return;
      }

      collectCarriedItem();
    }
  }
}

/*
  Cria novos objetos com base na dificuldade atual e move todos os objetos.
  O peixe grande e especial: nao e removido so por sair da borda,
  porque ele deve continuar no jogo ate ser apanhado ou comido.
*/
function updateItems(timestamp) {
  const difficulty = getCurrentDifficulty(timestamp);

  if (timestamp - lastSpawnTime > difficulty.spawnDelay) {
    spawnItem();
    lastSpawnTime = timestamp;
  }

  for (const item of items) {
    updateSpecialItemMovement(item, timestamp);
    item.x += item.speed * item.direction;
    item.swimOffset += 0.05;
    item.y += Math.sin(item.swimOffset) * 0.25;
  }

  items = items.filter((item) => {
    return item.kind === "bigFish" || (item.x > -140 && item.x < canvas.width + 140);
  });
}

/*
  Movimento especial do peixe grande depois de fugir:
  primeiro afasta-se rapido do anzol, depois volta a nadar devagar.
*/
function updateSpecialItemMovement(item, timestamp) {
  if (item.kind !== "bigFish") return;

  if (item.fleeUntil && timestamp >= item.fleeUntil) {
    item.direction = item.returnDirection;
    item.speed = randomBetween(bigFishType.speedMin, bigFishType.speedMax);
    item.fleeUntil = 0;
    item.returnDirection = 0;
  }

  if (item.x < 30) {
    item.direction = 1;
  } else if (item.x + item.width > canvas.width - 30) {
    item.direction = -1;
  }
}

// Cria um novo peixe/lixo/perigo numa das laterais do ecrã.
function spawnItem() {
  const type = prepareSpawnedItem(chooseItemType());
  const direction = Math.random() > 0.5 ? 1 : -1;
  const x = direction === 1 ? -90 : canvas.width + 90;
  const y = seaTop + 70 + Math.random() * (canvas.height - seaTop - 150);

  items.push({
    ...type,
    x,
    y,
    direction,
    speed: randomBetween(type.speedMin || 1.2, type.speedMax || 3.1),
    swimOffset: Math.random() * Math.PI * 2
  });

  if (type.kind === "bigFish") {
    bigFishHasSpawned = true;
  }
}

// Prepara um objeto acabado de nascer, incluindo a versao shiny se sair sorte.
function prepareSpawnedItem(type) {
  if (type.kind !== "fish" && type.kind !== "bigFish") {
    return type;
  }

  if (Math.random() >= (type.shinyChance || 0)) {
    return type;
  }

  return {
    ...type,
    name: `${type.name} shiny`,
    baseName: type.name,
    isShiny: true,
    points: type.points * config.shinyMultiplier,
    color: invertColor(type.color)
  };
}

/*
  Decide que tipo de objeto nasce agora.
  Primeiro escolhe a categoria geral pela dificuldade: fish/trash/danger.
  Depois escolhe um objeto dentro dessa categoria usando os pesos "chance".
*/
function chooseItemType() {
  const difficulty = getCurrentDifficulty(performance.now());
  const category = chooseWeightedCategory(difficulty.weights);
  let availableTypes = [];

  if (category === "fish") {
    availableTypes = fishTypes;
  } else if (category === "trash") {
    availableTypes = trashTypes;
  } else {
    availableTypes = dangerTypes;
  }

  if (category === "fish" && score >= bigFishUnlockScore && !bigFishHasSpawned && !bigFishCaught) {
    availableTypes = [...availableTypes, bigFishType];
  }

  if (category === "danger") {
    availableTypes = [...availableTypes, sharkType];
  }

  const totalChance = availableTypes.reduce((sum, item) => sum + item.chance, 0);
  let random = Math.random() * totalChance;

  for (const item of availableTypes) {
    random -= item.chance;
    if (random <= 0) return item;
  }

  return availableTypes[0];
}

// Escolhe uma categoria com base nos pesos da dificuldade atual.
function chooseWeightedCategory(weights) {
  const totalWeight = weights.fish + weights.trash + weights.danger;
  let random = Math.random() * totalWeight;

  random -= weights.fish;
  if (random <= 0) return "fish";

  random -= weights.trash;
  if (random <= 0) return "trash";

  return "danger";
}

// Devolve o nivel de dificuldade atual com base no tempo ja jogado.
function getCurrentDifficulty(timestamp) {
  if (!gameRunning) {
    return difficultyLevels[0];
  }

  const elapsedSeconds = Math.floor((timestamp - gameStartTime) / 1000);
  let currentLevel = difficultyLevels[0];

  for (const level of difficultyLevels) {
    if (elapsedSeconds >= level.startsAt) {
      currentLevel = level;
    }
  }

  return currentLevel;
}

// ============================================================
// 7. Colisoes e regras do jogo
// ============================================================

/*
  Verifica se o anzol ou o objeto preso tocaram noutro objeto.
  Regras principais:
  - anzol vazio apanha peixe normal/lixo;
  - anzol vazio nao apanha peixe grande nem tubarao;
  - alforreca da choque;
  - tubarao come o que estiver no anzol;
  - peixe grande so morde se ja houver um peixe no anzol.
*/
function checkCollisions(timestamp) {
  const hookBox = {
    x: hookX - 12,
    y: hookY - 10,
    width: 24,
    height: 34
  };

  if (isShocked(timestamp)) {
    return;
  }

  if (carriedItem) {
    checkDangerWhileCarrying(hookBox, timestamp);
    checkSharkStealCollision(timestamp);

    if (carriedItem && carriedItem.kind === "fish") {
      checkBigFishBaitCollision(timestamp);
    }

    return;
  }

  for (const item of items) {
    if (boxesTouch(hookBox, item)) {
      if (item.kind === "danger") {
        triggerShock(item, timestamp);
        items = items.filter((otherItem) => otherItem !== item);
      } else if (item.kind !== "bigFish" && item.kind !== "sharkHazard") {
        carriedItem = item;
        items = items.filter((otherItem) => otherItem !== item);
      }
      break;
    }
  }
}

// Se uma alforreca toca no anzol ou no objeto preso, ativa choque.
function checkDangerWhileCarrying(hookBox, timestamp) {
  const danger = items.find((item) => {
    return item.kind === "danger" && (boxesTouch(hookBox, item) || boxesTouch(carriedItem, item));
  });

  if (!danger) return;

  triggerShock(danger, timestamp);
  items = items.filter((item) => item !== danger);
}

// O tubarao come qualquer coisa que o jogador esteja a carregar.
function checkSharkStealCollision(timestamp) {
  if (!carriedItem) return;

  const shark = items.find((item) => item.kind === "sharkHazard" && boxesTouch(carriedItem, item));

  if (!shark) return;

  const eatenName = carriedItem.name;
  carriedItem = null;
  shark.justAteUntil = timestamp + 800;
  showStatus(`O Tubarao comeu ${eatenName}!`);
}

// O peixe grande so pode ser fisgado usando um peixe normal como isco.
function checkBigFishBaitCollision(timestamp) {
  const bigFish = items.find((item) => item.kind === "bigFish" && boxesTouch(carriedItem, item));

  if (!bigFish) return;

  const baitName = carriedItem.baseName || carriedItem.name;
  const escapeChance = bigFishEscapeChanceByBait[baitName] || 0.8;

  carriedItem = {
    ...bigFish,
    baitName,
    escapeChance,
    hookedAt: timestamp,
    escapeAt: timestamp + 250 + Math.random() * 450,
    finalEscapeChance: Math.min(0.98, escapeChance + 0.08)
  };
  items = items.filter((item) => item !== bigFish);
  showStatus(`Peixe grande mordeu o isco: ${baitName}!`);
}

// Recolhe o objeto quando chega a linha da agua e atualiza pontuacao/contadores.
function collectCarriedItem() {
  score += carriedItem.points;

  if (carriedItem.kind === "fish") {
    const countName = carriedItem.baseName || carriedItem.name;
    caughtCounts[countName] = (caughtCounts[countName] || 0) + 1;
  } else if (carriedItem.kind === "bigFish") {
    caughtCounts["Peixe grande"] = (caughtCounts["Peixe grande"] || 0) + 1;
    bigFishCaught = true;
    showStatus("Peixe grande capturado! Grande pesca!");
  }

  recentCatch.unshift({ ...carriedItem });
  recentCatch = recentCatch.slice(0, 5);
  carriedItem = null;
}

// Aplica a penalizacao da alforreca e bloqueia o jogador por alguns segundos.
function triggerShock(item, timestamp) {
  score += item.points;

  if (carriedItem && carriedItem.kind === "bigFish") {
    releaseBigFishToSea(carriedItem, timestamp, "A alforreca assustou o peixe grande!");
  } else {
    carriedItem = null;
  }

  shockUntil = timestamp + shockDuration;
  showStatus("Choque da alforreca! Espera 5 segundos.");
}

// Primeira tentativa de fuga do peixe grande depois de morder o isco.
function tryBigFishEscape(bigFish, timestamp) {
  if (Math.random() < bigFish.escapeChance) {
    releaseBigFishToSea(bigFish, timestamp, `O peixe grande largou o anzol! Isco: ${bigFish.baitName}.`);
    return;
  }

  showStatus("O peixe grande ficou preso! Puxa para cima!");
  carriedItem.escapeAt = Number.POSITIVE_INFINITY;
}

// Segunda tentativa de fuga do peixe grande mesmo antes de ser recolhido.
function tryBigFishFinalEscape(bigFish, timestamp) {
  if (Math.random() < bigFish.finalEscapeChance) {
    releaseBigFishToSea(bigFish, timestamp, "O peixe grande escapou mesmo à beira da água!");
    return true;
  }

  return false;
}

/*
  Devolve o peixe grande ao mar quando ele escapa.
  Ele nasce perto do anzol, foge rapido um pouco, e depois volta ao ritmo lento.
*/
function releaseBigFishToSea(bigFish, timestamp, message) {
  const escapeDirection = bigFish.direction ? -bigFish.direction : -1;
  const returnDirection = bigFish.direction || 1;

  items.push({
    ...bigFishType,
    x: hookX - bigFish.width / 2,
    y: clamp(hookY + 42, seaTop + 60, canvas.height - 110),
    direction: escapeDirection,
    speed: 2.7,
    swimOffset: Math.random() * Math.PI * 2,
    fleeUntil: timestamp + 1200,
    returnDirection
  });

  carriedItem = null;
  showStatus(message);
}

// Mostra uma mensagem temporaria no HUD.
function showStatus(message) {
  statusMessage = message;
  statusMessageUntil = performance.now() + 2400;
}

// Verdadeiro enquanto o jogador esta em choque por causa da alforreca.
function isShocked(timestamp) {
  return timestamp < shockUntil;
}

// Termina a partida e mostra o ecrã de fim de jogo.
function endGame() {
  gameRunning = false;
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

// Colisao simples entre dois retangulos.
function boxesTouch(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Limita um valor entre minimo e maximo.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Sorteia um numero decimal entre minimo e maximo.
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Inverte uma cor hexadecimal para criar o efeito shiny.
function invertColor(hexColor) {
  const cleanHex = hexColor.replace("#", "");
  const red = 255 - parseInt(cleanHex.slice(0, 2), 16);
  const green = 255 - parseInt(cleanHex.slice(2, 4), 16);
  const blue = 255 - parseInt(cleanHex.slice(4, 6), 16);

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

// Transforma um numero 0-255 em dois caracteres hexadecimais.
function toHex(value) {
  return value.toString(16).padStart(2, "0");
}

// ============================================================
// 8. Desenho do jogo no Canvas
// ============================================================

// Desenha um frame completo do jogo.
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();
  drawSea();
  drawCliffs();
  drawFishermanPlaceholder();
  drawCollectionPile();
  drawItems();

  if (carriedItem) {
    drawItem(carriedItem, true, true);
  }

  drawFishingLine();
  drawHud();
}

// Desenha o ceu e os pontinhos decorativos do fundo.
function drawSky() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, seaTop);

  ctx.fillStyle = "#b7c0c9";
  for (let y = 18; y < seaTop - 20; y += 32) {
    for (let x = 20; x < canvas.width; x += 36) {
      ctx.fillRect(x, y, 3, 3);
    }
  }
}

// Desenha a agua e uma linha ondulada na superficie.
function drawSea() {
  const waterGradient = ctx.createLinearGradient(0, seaTop, 0, canvas.height);
  waterGradient.addColorStop(0, "#55c0e6");
  waterGradient.addColorStop(1, "#4ba5df");
  ctx.fillStyle = waterGradient;
  ctx.fillRect(20, seaTop, canvas.width - 40, canvas.height - seaTop - 18);

  ctx.strokeStyle = "#f7fbff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(20, seaTop);
  for (let x = 20; x <= canvas.width - 20; x += 24) {
    ctx.lineTo(x, seaTop + Math.sin(x * 0.04) * 4);
  }
  ctx.stroke();
}

// Desenha as arribas/rochas temporarias.
function drawCliffs() {
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(18, 194, 430, 96);
  ctx.fillRect(660, 194, 500, 96);

  ctx.fillStyle = "#d39b28";
  ctx.fillRect(18, 286, 430, 8);
  ctx.fillRect(660, 286, 500, 8);

  drawText("Arribas e rochas", 144, 246, 28, "#111111", "bold");
  drawText("Arribas e rochas", 820, 246, 28, "#111111", "bold");
}

// Desenha o pescador temporario.
function drawFishermanPlaceholder() {
  // Placeholder: students can replace this with assets/fisherman.png later.
  ctx.fillStyle = "#62c462";
  ctx.beginPath();
  ctx.moveTo(715, 12);
  ctx.lineTo(798, 92);
  ctx.lineTo(766, 196);
  ctx.lineTo(666, 196);
  ctx.lineTo(634, 92);
  ctx.closePath();
  ctx.fill();

  drawText("Pescador", 668, 124, 24, "#111111", "bold");

  ctx.strokeStyle = "#7330e8";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(696, 94);
  ctx.quadraticCurveTo(618, 8, hookX, 76);
  ctx.stroke();
}

// Desenha no topo esquerdo os ultimos peixes recolhidos.
function drawCollectionPile() {
  drawText("Peixes apanhados", 178, 166, 22, "#111111", "bold");

  recentCatch.forEach((item, index) => {
    const smallItem = {
      ...item,
      x: 94 + index * 58,
      y: 132 + (index % 2) * 24,
      width: 58,
      height: 28,
      direction: 1
    };
    drawItem(smallItem, false);
  });
}

/*
  Desenha a linha, boia e anzol.
  Quando ha choque, fica vermelho/amarelo.
*/
function drawFishingLine() {
  const shocked = isShocked(performance.now());

  ctx.strokeStyle = shocked ? "#ef4a3d" : "#111111";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hookX, 76);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();

  ctx.fillStyle = shocked ? "#ffd34d" : "#b9ff3d";
  ctx.beginPath();
  ctx.moveTo(hookX, hookY - 23);
  ctx.lineTo(hookX + 10, hookY - 7);
  ctx.lineTo(hookX, hookY + 10);
  ctx.lineTo(hookX - 10, hookY - 7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#263d70";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = shocked ? "#ef4a3d" : "#111111";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hookX, hookY + 9);
  ctx.lineTo(hookX, hookY + 27);
  ctx.arc(hookX + 8, hookY + 27, 8, Math.PI, Math.PI * 1.8);
  ctx.stroke();

  if (shocked) {
    ctx.strokeStyle = "#ffd34d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hookX - 28, hookY - 18);
    ctx.lineTo(hookX - 8, hookY - 2);
    ctx.lineTo(hookX - 24, hookY + 8);
    ctx.lineTo(hookX + 4, hookY + 28);
    ctx.stroke();
  }
}

// Desenha pontuacao, tempo, contadores, nivel e mensagens temporarias.
function drawHud() {
  drawText("Tipos de peixe", 32, 42, 22, "#111111", "bold");
  drawText(`Sardinha: ${caughtCounts.Sardinha || 0}`, 32, 72, 18, "#111111");
  drawText(`Carapau: ${caughtCounts.Carapau || 0}`, 32, 96, 18, "#111111");
  drawText(`Robalo: ${caughtCounts.Robalo || 0}`, 32, 120, 18, "#111111");
  drawText(`Polvo: ${caughtCounts.Polvo || 0}`, 32, 144, 18, "#111111");
  drawText(`Lula: ${caughtCounts.Lula || 0}`, 32, 168, 18, "#111111");
  drawText(`Peixe grande: ${caughtCounts["Peixe grande"] || 0}`, 32, 192, 18, "#111111");

  drawText(`Pontos: ${score}`, 838, 68, 28, "#111111", "bold");
  drawText(`Tempo: ${timeLeft}s`, 838, 104, 22, "#111111", "bold");
  drawText(`Peixe grande aparece aos ${bigFishUnlockScore} pontos`, 838, 132, 16, "#111111");
  drawText("Tubarao raro come o anzol", 838, 154, 16, "#111111");
  drawText(`Nivel: ${getCurrentDifficulty(performance.now()).name}`, 838, 176, 16, "#111111");

  if (carriedItem) {
    const baitText = carriedItem.baitName ? ` com isco ${carriedItem.baitName}` : "";
    drawText(`A subir: ${carriedItem.name}${baitText}`, 438, 246, 22, "#111111", "bold");
  }

  if (isShocked(performance.now())) {
    const secondsLeft = Math.ceil((shockUntil - performance.now()) / 1000);
    drawText(`Choque! Espera ${secondsLeft}s`, 456, 214, 24, "#ef4a3d", "bold");
  } else if (performance.now() < statusMessageUntil) {
    drawText(statusMessage, 370, 214, 22, "#111111", "bold");
  }

  drawText("Placeholders: " + assetPlaceholders.slice(0, 4).join(", ") + "...", 32, 690, 14, "#0d3850");
}

// Desenha todos os objetos livres que estao no mar.
function drawItems() {
  for (const item of items) {
    drawItem(item);
  }
}

/*
  Decide qual desenho usar para cada objeto.
  "caughtOnHook" desenha os peixes na vertical quando estao presos no anzol.
*/
function drawItem(item, showLabel = true, caughtOnHook = false) {
  if (item.name.includes("Lula") || item.baseName === "Lula") {
    drawSquidPlaceholder(item, caughtOnHook);
  } else 
  if (caughtOnHook && (item.kind === "fish" || item.kind === "bigFish")) {
    drawCaughtFishPlaceholder(item);
  } else if (item.kind === "fish") {
    drawFishPlaceholder(item);
  } else if (item.kind === "bigFish") {
    drawBigFishPlaceholder(item);
  } else if (item.kind === "sharkHazard") {
    drawSharkHazardPlaceholder(item);
  } else if (item.kind === "danger") {
    drawJellyfishPlaceholder(item);
  } else {
    drawTrashPlaceholder(item);
  }

  if (showLabel) {
    drawText(item.name, item.x + 4, item.y - 8, 14, "#10263f", "bold");

    if (item.isShiny) {
      drawText("x4", item.x + item.width - 22, item.y + item.height + 14, 16, "#7a1cff", "bold");
    }
  }
}

// Desenho temporario de peixe normal a nadar de lado.
function drawFishPlaceholder(item) {
  // Placeholder: replace this simple Canvas fish with student pixel art later.
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;
  const noseX = item.direction === 1 ? item.x + item.width : item.x;
  const tailX = item.direction === 1 ? item.x : item.x + item.width;

  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, item.width * 0.32, item.height * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(tailX, centerY);
  ctx.lineTo(tailX - 22 * item.direction, item.y + 2);
  ctx.lineTo(tailX - 22 * item.direction, item.y + item.height - 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(noseX - 15 * item.direction, centerY - 6, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(noseX - 14 * item.direction, centerY - 6, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX + 8 * item.direction, centerY + 3);
  ctx.lineTo(centerX + 18 * item.direction, centerY + 8);
  ctx.stroke();
}

// Desenho temporario dos peixes presos no anzol, de cabeca para cima.
function drawCaughtFishPlaceholder(item) {
  // Fish on the hook are drawn head-up so they look attached to the line.
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2 + item.width * 0.12;
  const bodyRadiusX = item.height * 0.45;
  const bodyRadiusY = item.width * 0.28;
  const noseY = centerY - bodyRadiusY;
  const tailY = centerY + bodyRadiusY;

  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, bodyRadiusX, bodyRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX, tailY + 18);
  ctx.lineTo(centerX - bodyRadiusX, tailY - 2);
  ctx.lineTo(centerX + bodyRadiusX, tailY - 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX - 7, noseY + 16, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(centerX - 7, noseY + 15, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX + 9, centerY - 2);
  ctx.lineTo(centerX + 17, centerY + 8);
  ctx.stroke();

  if (item.kind === "bigFish") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(centerX - 20, centerY - 12, 9, 5);
    ctx.fillRect(centerX + 6, centerY + 6, 9, 5);
  }
}

// Desenho temporario da lula, no mar ou pendurada no anzol.
function drawSquidPlaceholder(item, caughtOnHook = false) {
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;

  ctx.fillStyle = item.color;

  if (caughtOnHook) {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 12, item.height * 0.38, item.width * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let index = 0; index < 5; index += 1) {
      const x = centerX - 20 + index * 10;
      ctx.beginPath();
      ctx.moveTo(x, centerY + 8);
      ctx.lineTo(x - 4, centerY + 34);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, item.width * 0.28, item.height * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    const tentacleStart = item.direction === 1 ? item.x + 16 : item.x + item.width - 16;
    for (let index = 0; index < 5; index += 1) {
      const y = item.y + 8 + index * 7;
      ctx.beginPath();
      ctx.moveTo(tentacleStart, y);
      ctx.lineTo(tentacleStart - 22 * item.direction, y + 4);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(centerX + 8, centerY - 7, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Desenho temporario do peixe grande no mar.
function drawBigFishPlaceholder(item) {
  // Placeholder: students can replace this with assets/peixe_grande.png later.
  drawFishPlaceholder(item);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(item.x + item.width * 0.28, item.y + item.height * 0.2, 10, 5);
  ctx.fillRect(item.x + item.width * 0.42, item.y + item.height * 0.3, 10, 5);
  ctx.fillRect(item.x + item.width * 0.56, item.y + item.height * 0.42, 10, 5);

  ctx.strokeStyle = "#0e4f48";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(item.x + item.width * 0.53, item.y + item.height * 0.5, item.height * 0.42, 0.2, 1.2);
  ctx.stroke();
}

// Desenho temporario do tubarao-perigo.
function drawSharkHazardPlaceholder(item) {
  // Placeholder: students can replace this with assets/tubarao.png later.
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;
  const noseX = item.direction === 1 ? item.x + item.width : item.x;
  const tailX = item.direction === 1 ? item.x : item.x + item.width;

  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, item.width * 0.36, item.height * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX - 8 * item.direction, item.y + 6);
  ctx.lineTo(centerX + 18 * item.direction, item.y - 24);
  ctx.lineTo(centerX + 28 * item.direction, item.y + 10);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(tailX, centerY);
  ctx.lineTo(tailX - 34 * item.direction, item.y + 4);
  ctx.lineTo(tailX - 26 * item.direction, centerY);
  ctx.lineTo(tailX - 34 * item.direction, item.y + item.height - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(noseX - 20 * item.direction, centerY - 8, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(noseX - 18 * item.direction, centerY - 8, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(noseX - 38 * item.direction, centerY + 11);
  ctx.lineTo(noseX - 16 * item.direction, centerY + 8);
  ctx.stroke();
}

// Desenho temporario da alforreca.
function drawJellyfishPlaceholder(item) {
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.ellipse(item.x + item.width / 2, item.y + 22, item.width / 2, 24, 0, Math.PI, 0);
  ctx.lineTo(item.x + item.width - 8, item.y + 30);
  ctx.lineTo(item.x + 8, item.y + 30);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#7330e8";
  ctx.lineWidth = 4;
  for (let index = 0; index < 5; index += 1) {
    const x = item.x + 14 + index * 12;
    ctx.beginPath();
    ctx.moveTo(x, item.y + 30);
    ctx.quadraticCurveTo(x - 10, item.y + 42, x, item.y + 54);
    ctx.stroke();
  }

  drawText("Alforreca", item.x + 6, item.y + 36, 16, "#7330e8", "bold");
}

// Desenho temporario do lixo: garrafa ou bota velha.
function drawTrashPlaceholder(item) {
  if (item.name === "Bota velha") {
    ctx.fillStyle = item.color;
    ctx.fillRect(item.x + 4, item.y + 18, item.width - 18, item.height - 16);
    ctx.fillRect(item.x + 24, item.y + 4, item.width - 28, item.height - 22);

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.strokeRect(item.x + 4, item.y + 18, item.width - 18, item.height - 16);
    return;
  }

  ctx.fillStyle = item.color;
  ctx.fillRect(item.x + 14, item.y + 6, item.width - 24, item.height - 8);

  ctx.fillStyle = "#d7f7ff";
  ctx.fillRect(item.x + 18, item.y + 10, item.width - 32, item.height - 16);

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  ctx.strokeRect(item.x + 14, item.y + 6, item.width - 24, item.height - 8);
}

// Helper pequeno para escrever texto no Canvas sempre da mesma forma.
function drawText(text, x, y, size, color, weight = "normal") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial`;
  ctx.fillText(text, x, y);
}

// Desenha o ecra inicial parado antes do jogador carregar em Comecar.
draw();
