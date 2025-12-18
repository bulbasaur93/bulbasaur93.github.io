const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const btnStart = document.getElementById("btnStart");
const btnRestart = document.getElementById("btnRestart");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");

// Размер сетки
const tileSize = 40; // ещё шире клетки
const tilesCount = canvas.width / tileSize;

// Звук поедания еды
const eatSound = new Audio("eat.mp3");
eatSound.volume = 0.7;
let soundEnabled = false;

// Состояние игры
let snake;
let food;
let lethalFood = null; // «биткоин»-иконка, убивающая змейку
let direction;
let nextDirection;
let gameLoopId = null;
let speed = 130; // мс между кадрами
let isRunning = false;
let isGameOver = false;
let score = 0;
let highScore = Number(localStorage.getItem("snakeHighScore") || 0);
highScoreEl.textContent = highScore;

function initGame() {
  const startX = Math.floor(tilesCount / 2);
  const startY = Math.floor(tilesCount / 2);

  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];

  direction = { x: 1, y: 0 }; // вправо
  nextDirection = { ...direction };
  score = 0;
  speed = 130;
  scoreEl.textContent = score;
  isGameOver = false;
  lethalFood = null;

  spawnFood();
  draw();
}

// Разрешаем звук только после первого взаимодействия пользователя
document.body.addEventListener(
  "click",
  () => {
    soundEnabled = true;
  },
  { once: true }
);

function spawnFood() {
  while (true) {
    const x = Math.floor(Math.random() * tilesCount);
    const y = Math.floor(Math.random() * tilesCount);

    const onSnake = snake.some((seg) => seg.x === x && seg.y === y);
    if (!onSnake) {
      food = { x, y };
      return;
    }
  }
}

function spawnLethalFood() {
  if (isGameOver) return;

  while (true) {
    const x = Math.floor(Math.random() * tilesCount);
    const y = Math.floor(Math.random() * tilesCount);

    const onSnake = snake.some((seg) => seg.x === x && seg.y === y);
    const onNormalFood = food && food.x === x && food.y === y;

    if (!onSnake && !onNormalFood) {
      lethalFood = { x, y };
      return;
    }
  }
}

function gameTick() {
  // Обновляем направление в начале кадра
  direction = { ...nextDirection };

  const head = snake[0];
  let newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  // Проход через стены (телепортация на противоположную сторону)
  if (newHead.x < 0) newHead.x = tilesCount - 1;
  if (newHead.x >= tilesCount) newHead.x = 0;
  if (newHead.y < 0) newHead.y = tilesCount - 1;
  if (newHead.y >= tilesCount) newHead.y = 0;

  // Столкновение с «биткоин»-иконкой — мгновенная смерть
  if (lethalFood && newHead.x === lethalFood.x && newHead.y === lethalFood.y) {
    endGame();
    return;
  }

  // Столкновение с собой
  if (snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  // Съели еду
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 10;
    scoreEl.textContent = score;

    // Звук поедания (после первого клика по странице)
    if (soundEnabled) {
      try {
        eatSound.currentTime = 0;
        eatSound.play();
      } catch (e) {
        // браузер может блокировать автоплей, просто игнорируем
      }
    }

    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem("snakeHighScore", String(highScore));
    }
    // Ускоряем слегка каждое яблоко
    speed = Math.max(60, speed - 3);
    spawnFood();
  } else {
    snake.pop(); // двигаемся без роста
  }

  draw();

  if (isRunning) {
    gameLoopId = setTimeout(gameTick, speed);
  }
}

function drawGrid() {
  ctx.strokeStyle = "rgba(15,23,42,0.08)"; // тонкие тёмно-синие линии на белом фоне
  ctx.lineWidth = 1;
  for (let i = 0; i <= tilesCount; i++) {
    const pos = i * tileSize;
    // вертикальные
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();
    // горизонтальные
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
}

function draw() {
  // Фон поля — белый
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Сетка
  drawGrid();

  // Еда — синяя закруглённая квадратная иконка
  const foodX = food.x * tileSize + tileSize / 2;
  const foodY = food.y * tileSize + tileSize / 2;
  const iconSize = tileSize * 0.8; // немного меньше клетки
  const iconX = foodX - iconSize / 2;
  const iconY = foodY - iconSize / 2;
  const iconRadius = iconSize * 0.18;

  // Синяя закруглённая «квадратная» иконка
  ctx.fillStyle = "#0069ff";
  roundRect(ctx, iconX, iconY, iconSize, iconSize, iconRadius);
  ctx.fill();

  // Опасная иконка (биткоин)
  if (lethalFood) {
    const lx = lethalFood.x * tileSize + tileSize / 2;
    const ly = lethalFood.y * tileSize + tileSize / 2;
    const r = (tileSize / 2) * 0.4; // гарантированно внутри клетки

    // Жёлтый круг
    ctx.beginPath();
    ctx.fillStyle = "#ffb000";
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();

    // Условный «B» по центру
    ctx.fillStyle = "#fff8d0";
    const barWidth = r * 0.26;
    const barHeight = r * 1.4;
    const barX = lx - barWidth / 2;
    const barY = ly - barHeight / 2;

    // Вертикальный прямоугольник
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hBarWidth = r * 0.9;
    const hBarHeight = r * 0.16;

    // Верхняя горизонтальная перекладина
    ctx.fillRect(
      lx - hBarWidth / 2,
      ly - r * 0.32 - hBarHeight / 2,
      hBarWidth,
      hBarHeight
    );

    // Нижняя горизонтальная перекладина
    ctx.fillRect(
      lx - hBarWidth / 2,
      ly + r * 0.32 - hBarHeight / 2,
      hBarWidth,
      hBarHeight
    );
  }

  // Змейка — цельная зелёная фигура
  snake.forEach((segment, index) => {
    const x = segment.x * tileSize;
    const y = segment.y * tileSize;

    // основной зелёный цвет
    ctx.fillStyle = "#22c55e"; // насыщённый зелёный

    // делаем чуть более сглаженную форму без зазоров
    const padding = 1.5;
    const radius = 7;

    roundRect(
      ctx,
      x + padding,
      y + padding,
      tileSize - padding * 2,
      tileSize - padding * 2,
      radius
    );
    ctx.fill();

    // небольшое светлое выделение на голове, чтобы было видно направление
    if (index === 0) {
      const eyeOffsetX = direction.x === 0 ? tileSize / 4 : 0;
      const eyeOffsetY = direction.y === 0 ? tileSize / 4 : 0;
      ctx.fillStyle = "#e5ffe5";
      ctx.beginPath();
      ctx.arc(
        x + tileSize / 2 - eyeOffsetX,
        y + tileSize / 2 - eyeOffsetY,
        2.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        x + tileSize / 2 + eyeOffsetX,
        y + tileSize / 2 + eyeOffsetY,
        2.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function startGameLoop() {
  if (isRunning || isGameOver) return;
  isRunning = true;
  gameLoopId = setTimeout(gameTick, speed);
}

function pauseGame() {
  isRunning = false;
  if (gameLoopId !== null) {
    clearTimeout(gameLoopId);
    gameLoopId = null;
  }
}

function togglePause() {
  if (isGameOver) return;
  if (isRunning) {
    pauseGame();
  } else {
    startGameLoop();
  }
}

function endGame() {
  pauseGame();
  isGameOver = true;
  overlayTitle.textContent = "Игра окончена";
  overlayText.textContent = `Ваш счёт: ${score}`;
  overlay.classList.remove("hidden");
}

function restartGame() {
  pauseGame();
  overlay.classList.add("hidden");
  initGame();
  startGameLoop();
}

// Управление
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === " " || key === "spacebar") {
    e.preventDefault();
    togglePause();
    return;
  }

  let newDir = null;

  if (key === "arrowup" || key === "w") {
    newDir = { x: 0, y: -1 };
  } else if (key === "arrowdown" || key === "s") {
    newDir = { x: 0, y: 1 };
  } else if (key === "arrowleft" || key === "a") {
    newDir = { x: -1, y: 0 };
  } else if (key === "arrowright" || key === "d") {
    newDir = { x: 1, y: 0 };
  }

  if (newDir) {
    // Запрещаем разворот на 180°
    if (newDir.x === -direction.x && newDir.y === -direction.y) {
      return;
    }
    nextDirection = newDir;
    if (!isRunning && !isGameOver) {
      startGameLoop();
    }
  }
});

btnStart.addEventListener("click", () => {
  if (isGameOver) return;
  togglePause();
});

btnRestart.addEventListener("click", () => {
  restartGame();
});

overlayButton.addEventListener("click", () => {
  restartGame();
});

// Стартовое состояние
initGame();

// Спавн «биткоин»-иконки раз в 30 секунд
setInterval(() => {
  spawnLethalFood();
}, 30000);

// Подключение кошельков (Phantom / Coinbase) к Base Sepolia
let provider;
let signer;
let currentNetwork;

// Базовые константы сети Base Sepolia
const BASE_CHAIN_ID = 84532n;

const BASE_SEPOLIA = {
  // EIP-155: chainId для RPC/кошелька должен быть в hex-формате
  chainId: "0x" + BASE_CHAIN_ID.toString(16),
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

const connectBtn = document.getElementById("connect");
const connectCbBtn = document.getElementById("connectCb");
const addressEl = document.getElementById("address");

async function connectPhantom() {
  const ethProvider =
    (window.phantom && window.phantom.ethereum) || window.ethereum;

  if (!ethProvider || !ethProvider.isPhantom) {
    alert("Phantom wallet extension not installed");
    return;
  }

  await ethProvider.request({ method: "eth_requestAccounts" });

  provider = new ethers.BrowserProvider(ethProvider);
  signer = await provider.getSigner();
  
  currentNetwork = await provider.getNetwork();

  if (currentNetwork.chainId !== BASE_CHAIN_ID) {
    try {
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA.chainId }],
      });
    } catch {
      await ethProvider.request({
        method: "wallet_addEthereumChain",
        params: [BASE_SEPOLIA],
      });
    }
  }

  const addr = await signer.getAddress();
  if (addressEl) {
    addressEl.innerText = `Connected on Base: ${addr.slice(0, 6)}…${addr.slice(
      -4
    )}`;
  }
  const networkEl = document.getElementById("network");
currentNetwork = await provider.getNetwork();
const chainId = Number(currentNetwork.chainId);

if (chainId === 8453) {
  networkEl.innerText = "Network: Base Mainnet";
} else if (chainId === 84532) {
  networkEl.innerText = "Network: Base Sepolia";
} else {
  networkEl.innerText = "Network: Unsupported";
}

  if (connectBtn) {
    connectBtn.disabled = true;
  }
}

document.getElementById("connect").onclick = connectPhantom;

// Подключение через Coinbase Wallet
async function connectCoinbase() {
  try {
    const CoinbaseWalletSDK = window.CoinbaseWalletSDK;

    if (!CoinbaseWalletSDK) {
      console.error("Coinbase Wallet SDK global not found on window");
      alert("Coinbase Wallet SDK not loaded. Make sure unpkg is accessible and reload the page.");
      return;
    }

    const coinbaseWallet = new CoinbaseWalletSDK({
      appName: "BASE Snake",
    });

    const ethereum = coinbaseWallet.makeWeb3Provider(
      "https://sepolia.base.org",
      Number(BASE_CHAIN_ID)
    );

    // На десктопе Coinbase покажет QR-код,
    // в мобильном приложении — откроет dapp напрямую
    await ethereum.request({ method: "eth_requestAccounts" });

    provider = new ethers.BrowserProvider(ethereum);
    signer = await provider.getSigner();

    const addr = await signer.getAddress();
    if (addressEl) {
      addressEl.innerText = `Connected on Base: ${addr.slice(
        0,
        6
      )}…${addr.slice(-4)}`;
    }
    const networkEl = document.getElementById("network");
const network = await provider.getNetwork();
const chainId = Number(currentNetwork.chainId);

if (chainId === 8453) {
  networkEl.innerText = "Network: Base Mainnet";
} else if (chainId === 84532) {
  networkEl.innerText = "Network: Base Sepolia";
} else {
  networkEl.innerText = "Network: Unsupported";
}

    if (connectCbBtn) {
      connectCbBtn.disabled = true;
    }
  } catch (err) {
    console.error("Coinbase connect error", err);
    alert("Failed to connect Coinbase Wallet. Check console for details.");
  }
}

if (connectCbBtn) {
  connectCbBtn.onclick = connectCoinbase;
}

