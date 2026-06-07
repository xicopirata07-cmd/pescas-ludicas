const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreElement = document.getElementById("finalScore");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const seaTop = 282;
const collectLineY = seaTop + 28;
const hookX = 540;
const hookMinY = seaTop + 8;
const hookMaxY = canvas.height - 54;
const gameSeconds = 75;
const shockDuration = 2000;
const hookLockDuration = 1000;
const bigFishUnlockScore = 200;

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
let hookLockedUntil = 0;
let statusMessage = "";
let statusMessageUntil = 0;
let bigFishHasSpawned = false;
let bigFishCaught = false;

// Placeholder entries for the students' future pixel art in /assets.
const assetPlaceholders = [
  "fisherman.png",
  "cliffs.png",
  "sardinha.png",
  "carapau.png",
  "robalo.png",
  "polvo.png",
  "peixe_grande.png",
  "tubarao.png",
  "alforreca.png",
  "garrafa.png",
  "bota.png"
];

const itemTypes = [
  { name: "Sardinha", kind: "fish", points: 10, color: "#f5c84c", chance: 32, width: 74, height: 34 },
  { name: "Carapau", kind: "fish", points: 15, color: "#c4d0dc", chance: 24, width: 82, height: 36 },
  { name: "Robalo", kind: "fish", points: 30, color: "#e8f7fb", chance: 13, width: 96, height: 40 },
  { name: "Polvo", kind: "fish", points: 45, color: "#a96be0", chance: 7, width: 64, height: 44 },
  { name: "Alforreca", kind: "danger", points: -20, color: "#ef4a3d", chance: 12, width: 76, height: 52 },
  { name: "Garrafa", kind: "trash", points: 0, color: "#45b36a", chance: 7, width: 54, height: 34 },
  { name: "Bota velha", kind: "trash", points: 0, color: "#9b671f", chance: 5, width: 64, height: 44 }
];

const bigFishType = {
  name: "Peixe grande",
  kind: "bigFish",
  points: 1000,
  color: "#2f9f8d",
  chance: 7,
  width: 150,
  height: 64,
  speedMin: 0.5,
  speedMax: 0.9
};

const sharkType = {
  name: "Tubarao",
  kind: "sharkHazard",
  points: 0,
  color: "#37516c",
  chance: 2,
  width: 138,
  height: 58,
  speedMin: 4.8,
  speedMax: 6.5
};

const bigFishEscapeChanceByBait = {
  Sardinha: 0.98,
  Carapau: 0.94,
  Robalo: 0.86,
  Polvo: 0.76
};

const difficultyLevels = [
  {
    name: "Mar calmo",
    startsAt: 0,
    spawnDelay: 1050,
    weights: { fish: 88, trash: 9, danger: 3 }
  },
  {
    name: "Mar sujo",
    startsAt: 25,
    spawnDelay: 900,
    weights: { fish: 66, trash: 24, danger: 10 }
  },
  {
    name: "Mar perigoso",
    startsAt: 50,
    spawnDelay: 760,
    weights: { fish: 44, trash: 34, danger: 22 }
  }
];

canvas.addEventListener("mousemove", updatePointer);
canvas.addEventListener("touchmove", updatePointer, { passive: false });
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

function updatePointer(event) {
  if (event.type === "touchmove") {
    event.preventDefault();
  }

  if (!gameRunning || isShocked(performance.now()) || isHookLocked(performance.now())) {
    return;
  }

  const pointer = event.touches ? event.touches[0] : event;
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseY = (pointer.clientY - rect.top) * scaleY;

  hookY = clamp(mouseY, hookMinY, hookMaxY);
}

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
  hookLockedUntil = 0;
  statusMessage = "";
  statusMessageUntil = 0;
  bigFishHasSpawned = false;
  bigFishCaught = false;

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  animationId = requestAnimationFrame(gameLoop);
}

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

function updateTimer(timestamp) {
  const elapsedSeconds = Math.floor((timestamp - gameStartTime) / 1000);
  timeLeft = Math.max(0, gameSeconds - elapsedSeconds);
}

function updateHook(timestamp) {
  if (carriedItem) {
    carriedItem.x = hookX - carriedItem.width / 2;
    carriedItem.y = hookY + 28;

    if (carriedItem.kind === "bigFish" && timestamp >= carriedItem.escapeAt) {
      tryBigFishEscape(carriedItem, timestamp);
      return;
    }

    if (!isShocked(timestamp) && !isHookLocked(timestamp) && hookY <= collectLineY) {
      if (carriedItem.kind === "bigFish" && tryBigFishFinalEscape(carriedItem, timestamp)) {
        return;
      }

      collectCarriedItem();
    }
  }
}

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

function spawnItem() {
  const type = chooseItemType();
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

function chooseItemType() {
  const difficulty = getCurrentDifficulty(performance.now());
  const category = chooseWeightedCategory(difficulty.weights);
  let availableTypes = itemTypes.filter((item) => item.kind === category);

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

function chooseWeightedCategory(weights) {
  const totalWeight = weights.fish + weights.trash + weights.danger;
  let random = Math.random() * totalWeight;

  random -= weights.fish;
  if (random <= 0) return "fish";

  random -= weights.trash;
  if (random <= 0) return "trash";

  return "danger";
}

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

function checkDangerWhileCarrying(hookBox, timestamp) {
  const danger = items.find((item) => {
    return item.kind === "danger" && (boxesTouch(hookBox, item) || boxesTouch(carriedItem, item));
  });

  if (!danger) return;

  triggerShock(danger, timestamp);
  items = items.filter((item) => item !== danger);
}

function checkSharkStealCollision(timestamp) {
  if (!carriedItem) return;

  const shark = items.find((item) => item.kind === "sharkHazard" && boxesTouch(carriedItem, item));

  if (!shark) return;

  if (carriedItem.kind === "bigFish") {
    releaseBigFishToSea(carriedItem, timestamp, "O Tubarao assustou o peixe grande!");
  } else {
    carriedItem = null;
    showStatus("O Tubarao roubou o peixe! Anzol preso 1 segundo.");
  }

  hookLockedUntil = timestamp + hookLockDuration;
  items = items.filter((item) => item !== shark);
}

function checkBigFishBaitCollision(timestamp) {
  const bigFish = items.find((item) => item.kind === "bigFish" && boxesTouch(carriedItem, item));

  if (!bigFish) return;

  const baitName = carriedItem.name;
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

function collectCarriedItem() {
  score += carriedItem.points;

  if (carriedItem.kind === "fish") {
    caughtCounts[carriedItem.name] = (caughtCounts[carriedItem.name] || 0) + 1;
  } else if (carriedItem.kind === "bigFish") {
    caughtCounts["Peixe grande"] = (caughtCounts["Peixe grande"] || 0) + 1;
    bigFishCaught = true;
    showStatus("Peixe grande capturado! Grande pesca!");
  }

  recentCatch.unshift({ ...carriedItem });
  recentCatch = recentCatch.slice(0, 5);
  carriedItem = null;
}

function triggerShock(item, timestamp) {
  score += item.points;

  if (carriedItem && carriedItem.kind === "bigFish") {
    releaseBigFishToSea(carriedItem, timestamp, "A alforreca assustou o peixe grande!");
  } else {
    carriedItem = null;
  }

  shockUntil = timestamp + shockDuration;
  showStatus("Choque da alforreca! Espera 2 segundos.");
}

function tryBigFishEscape(bigFish, timestamp) {
  if (Math.random() < bigFish.escapeChance) {
    releaseBigFishToSea(bigFish, timestamp, `O peixe grande largou o anzol! Isco: ${bigFish.baitName}.`);
    return;
  }

  showStatus("O peixe grande ficou preso! Puxa para cima!");
  carriedItem.escapeAt = Number.POSITIVE_INFINITY;
}

function tryBigFishFinalEscape(bigFish, timestamp) {
  if (Math.random() < bigFish.finalEscapeChance) {
    releaseBigFishToSea(bigFish, timestamp, "O peixe grande escapou mesmo à beira da água!");
    return true;
  }

  return false;
}

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

function showStatus(message) {
  statusMessage = message;
  statusMessageUntil = performance.now() + 2400;
}

function isShocked(timestamp) {
  return timestamp < shockUntil;
}

function isHookLocked(timestamp) {
  return timestamp < hookLockedUntil;
}

function endGame() {
  gameRunning = false;
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

function boxesTouch(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

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

function drawFishingLine() {
  const shocked = isShocked(performance.now());
  const locked = isHookLocked(performance.now());

  ctx.strokeStyle = shocked ? "#ef4a3d" : locked ? "#2458ff" : "#111111";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hookX, 76);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();

  ctx.fillStyle = shocked ? "#ffd34d" : locked ? "#82a3ff" : "#b9ff3d";
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

  ctx.strokeStyle = shocked ? "#ef4a3d" : locked ? "#2458ff" : "#111111";
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
  } else if (locked) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hookX - 18, hookY + 2);
    ctx.lineTo(hookX + 18, hookY + 28);
    ctx.moveTo(hookX + 18, hookY + 2);
    ctx.lineTo(hookX - 18, hookY + 28);
    ctx.stroke();
  }
}

function drawHud() {
  drawText("Tipos de peixe", 32, 42, 22, "#111111", "bold");
  drawText(`Sardinha: ${caughtCounts.Sardinha || 0}`, 32, 72, 18, "#111111");
  drawText(`Carapau: ${caughtCounts.Carapau || 0}`, 32, 96, 18, "#111111");
  drawText(`Robalo: ${caughtCounts.Robalo || 0}`, 32, 120, 18, "#111111");
  drawText(`Polvo: ${caughtCounts.Polvo || 0}`, 32, 144, 18, "#111111");
  drawText(`Peixe grande: ${caughtCounts["Peixe grande"] || 0}`, 32, 168, 18, "#111111");

  drawText(`Pontos: ${score}`, 838, 68, 28, "#111111", "bold");
  drawText(`Tempo: ${timeLeft}s`, 838, 104, 22, "#111111", "bold");
  drawText(`Peixe grande aparece aos ${bigFishUnlockScore} pontos`, 838, 132, 16, "#111111");
  drawText("Tubarao raro rouba o isco", 838, 154, 16, "#111111");
  drawText(`Nivel: ${getCurrentDifficulty(performance.now()).name}`, 838, 176, 16, "#111111");

  if (carriedItem) {
    const baitText = carriedItem.baitName ? ` com isco ${carriedItem.baitName}` : "";
    drawText(`A subir: ${carriedItem.name}${baitText}`, 438, 246, 22, "#111111", "bold");
  }

  if (isShocked(performance.now())) {
    const secondsLeft = Math.ceil((shockUntil - performance.now()) / 1000);
    drawText(`Choque! Espera ${secondsLeft}s`, 456, 214, 24, "#ef4a3d", "bold");
  } else if (isHookLocked(performance.now())) {
    const secondsLeft = Math.ceil((hookLockedUntil - performance.now()) / 1000);
    drawText(`Anzol preso! Espera ${secondsLeft}s`, 446, 214, 24, "#2458ff", "bold");
  } else if (performance.now() < statusMessageUntil) {
    drawText(statusMessage, 370, 214, 22, "#111111", "bold");
  }

  drawText("Placeholders: " + assetPlaceholders.slice(0, 4).join(", ") + "...", 32, 690, 14, "#0d3850");
}

function drawItems() {
  for (const item of items) {
    drawItem(item);
  }
}

function drawItem(item, showLabel = true, caughtOnHook = false) {
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
  }
}

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

function drawText(text, x, y, size, color, weight = "normal") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial`;
  ctx.fillText(text, x, y);
}

draw();
