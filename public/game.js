const socket = io();

/* ---------- DOM ---------- */
const historyA = document.getElementById("historyA");
const historyB = document.getElementById("historyB");
const status = document.getElementById("status");
const guessInput = document.getElementById("guess");
const guessBtn = document.getElementById("guessBtn");
const secretInput = document.getElementById("secret");

const gameResult = document.getElementById("gameResult");
const resultText = document.getElementById("resultText");
const playAgainBtn = document.getElementById("playAgainBtn");

const copyBtn = document.getElementById("copyLinkBtn");

/* ---------- SESSION ---------- */
const room = sessionStorage.getItem("room").toUpperCase();
const name = sessionStorage.getItem("name");
const player = sessionStorage.getItem("player");

let gameStarted = false;
let gameOver = false;

/* ---------- INIT ---------- */
guessInput.disabled = true;
guessBtn.disabled = true;
status.innerText = "🔐 Lock your secret to begin";

document.getElementById("playerInfo").innerText =
  `${name} (Player ${player}) | Room ${room}`;

const roomLink = `${window.location.origin}/join?room=${room}`;
roomLinkInput.value = roomLink;

socket.emit("join", { room, player, name });

/* ---------- ACTIONS ---------- */

function setSecret() {
  socket.emit("secret", secretInput.value);
}

function makeGuess() {
  if (guessInput.disabled || !gameStarted || gameOver) return;

  const value = guessInput.value.trim();
  if (!value) return;

  socket.emit("guess", value);
  guessInput.value = "";

  guessInput.disabled = true;
  guessBtn.disabled = true;
}

/* ---------- SOCKET EVENTS ---------- */

socket.on("feedback", (fb) => {
  const total = fb.correctPos + fb.correctWrongPos;
  let msg = "";

  if (total === 0) {
    msg = "All numbers are wrong";
  } else if (fb.correctPos === total) {
    msg = `${fb.correctPos} numbers are correct and ${fb.correctPos} positions are also correct`;
  } else if (fb.correctPos === 0) {
    msg = `${fb.correctWrongPos} numbers are correct but positions are wrong`;
  } else {
    msg = `${total} numbers are correct and ${fb.correctPos} positions are also correct`;
  }

  const li = document.createElement("li");
  li.innerText = `Attempt ${fb.attempt}: Guess ${fb.guess} → ${msg}`;

  (fb.by === "A" ? historyA : historyB).appendChild(li);
});

socket.on("msg", (msg) => {
  status.innerText = msg;

  if (msg.includes("GAME STARTED")) {
    gameStarted = true;
  }

  if (msg.includes("WINS")) {
    gameOver = true;
    gameStarted = false;

    guessInput.disabled = true;
    guessBtn.disabled = true;

    resultText.innerText = msg.includes(name) ? "🎉 YOU WON!" : "😔 YOU LOST";

    gameResult.classList.remove("hidden");

    if (msg.includes(name)) launchConfetti();
  }

  if (msg.includes("NO WINNER") || msg.includes("used all")) {
    gameOver = true;
    gameStarted = false;
    resultText.innerText = "🤝 GAME OVER";
    gameResult.classList.remove("hidden");
  }
});

socket.on("turn", (currentTurn) => {
  if (!gameStarted || gameOver) return;

  if (currentTurn === player) {
    status.innerText = "✅ Your turn!";
    guessInput.disabled = false;
    guessBtn.disabled = false;
  } else {
    status.innerText = "⏳ Opponent's turn";
    guessInput.disabled = true;
    guessBtn.disabled = true;
  }
});

socket.on("retryTurn", () => {
  if (gameOver) return;
  status.innerText = "❌ Invalid guess. Try again!";
  guessInput.disabled = false;
  guessBtn.disabled = false;
});

socket.on("revealSecret", (data) => {
  const opp = player === "A" ? data.B : data.A;
  const div = document.createElement("div");
  div.className = "secret-reveal";
  div.innerText = `🔓 Opponent's Secret: ${opp}`;
  document.querySelector(".wide").appendChild(div);
});

/* ---------- UI HELPERS ---------- */

playAgainBtn.onclick = () => {
  sessionStorage.clear();
  window.location.href = "/";
};

copyBtn.onclick = () => {
  navigator.clipboard.writeText(roomLink);
  copyBtn.innerText = "Copied!";
  setTimeout(() => (copyBtn.innerText = "Copy Invite"), 1500);
};

function launchConfetti() {
  const confetti = document.createElement("div");
  confetti.className = "confetti";

  for (let i = 0; i < 80; i++) {
    const s = document.createElement("span");
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 2 + "s";
    s.style.setProperty("--h", Math.random() * 360);
    confetti.appendChild(s);
  }

  document.body.appendChild(confetti);
}
