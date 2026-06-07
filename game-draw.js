/*
  Desenhos temporarios do jogo
  ----------------------------
  Este ficheiro concentra os desenhos de placeholder.

  Quando os alunos criarem imagens na pasta assets, este e o melhor
  sitio para trocar os desenhos em Canvas por imagens reais.

  O ficheiro game.js chama estas funcoes, mas a logica do jogo fica la.
*/

/*
  Decide qual desenho usar para cada objeto.
  "caughtOnHook" desenha os peixes na vertical quando estao presos no anzol.
*/
function drawItem(item, showLabel = true, caughtOnHook = false) {
  if (item.name.includes("Lula") || item.baseName === "Lula") {
    drawSquidPlaceholder(item, caughtOnHook);
  } else if (caughtOnHook && (item.kind === "fish" || item.kind === "bigFish")) {
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

// Desenha o quadro final: icone + quantidade x pontos = total.
function drawFinalSummary(summaryItems) {
  const summaryCanvas = document.getElementById("summaryCanvas");
  const summaryCtx = summaryCanvas.getContext("2d");

  summaryCtx.clearRect(0, 0, summaryCanvas.width, summaryCanvas.height);
  summaryCtx.fillStyle = "#f7fbff";
  summaryCtx.fillRect(0, 0, summaryCanvas.width, summaryCanvas.height);

  summaryCtx.fillStyle = "#10263f";
  summaryCtx.font = "bold 24px Arial";
  summaryCtx.fillText("Resumo da pesca", 24, 36);

  if (summaryItems.length === 0) {
    summaryCtx.font = "18px Arial";
    summaryCtx.fillText("Ainda nao foi recolhido nenhum peixe, lixo ou perigo.", 24, 86);
    window.ctx = oldCtx;
    return;
  }

  summaryItems.forEach((item, index) => {
    const rowY = 64 + index * 44;
    const icon = {
      ...item,
      x: 28,
      y: rowY - 24,
      width: Math.min(58, item.width || 58),
      height: Math.min(32, item.height || 32),
      direction: 1
    };

    drawSummaryIcon(summaryCtx, icon);

    summaryCtx.fillStyle = "#10263f";
    summaryCtx.font = "bold 17px Arial";
    summaryCtx.fillText(item.name, 102, rowY);

    summaryCtx.font = "16px Arial";
    summaryCtx.fillText(`${item.quantity} x ${item.points} pontos = ${item.totalPoints}`, 340, rowY);
  });
}

// Versao compacta dos desenhos para o canvas do resumo final.
function drawSummaryIcon(summaryCtx, item) {
  summaryCtx.fillStyle = item.color;

  if (item.kind === "trash") {
    summaryCtx.fillRect(item.x + 8, item.y + 8, item.width - 16, item.height - 8);
    summaryCtx.strokeStyle = "#10263f";
    summaryCtx.lineWidth = 2;
    summaryCtx.strokeRect(item.x + 8, item.y + 8, item.width - 16, item.height - 8);
  } else if (item.kind === "danger") {
    summaryCtx.beginPath();
    summaryCtx.arc(item.x + item.width / 2, item.y + 18, 18, Math.PI, 0);
    summaryCtx.lineTo(item.x + item.width - 8, item.y + 26);
    summaryCtx.lineTo(item.x + 8, item.y + 26);
    summaryCtx.closePath();
    summaryCtx.fill();
  } else if (item.name.includes("Lula") || item.baseName === "Lula") {
    summaryCtx.beginPath();
    summaryCtx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width * 0.28, item.height * 0.45, 0, 0, Math.PI * 2);
    summaryCtx.fill();
  } else {
    summaryCtx.beginPath();
    summaryCtx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width * 0.32, item.height * 0.48, 0, 0, Math.PI * 2);
    summaryCtx.fill();
  }

  if (item.isShiny) {
    summaryCtx.fillStyle = "#7a1cff";
    summaryCtx.font = "bold 12px Arial";
    summaryCtx.fillText("x4", item.x + item.width - 18, item.y + item.height + 8);
  }
}
