const socket = io();

// DOM references (MUST come first)
const history = document.getElementById("history");
const status = document.getElementById("status");
const guessInput = document.getElementById("guess");
const guessBtn = document.getElementById("guessBtn");

// Session data
const room = sessionStorage.getItem("room");
const name = sessionStorage.getItem("name");
const player = sessionStorage.getItem("player");

// Initial UI state
guessInput.disabled = true;
guessBtn.disabled = true;
status.innerText = "🔐 Lock your secret to begin";

document.getElementById("playerInfo").innerText =
  `${name} (Player ${player}) | Room ${room}`;

// Join room
socket.emit("join", { room, player, name });

let gameStarted = false;

/* -------- Actions -------- */

function setSecret() {
  socket.emit("secret", secret.value);
}

function makeGuess() {
  if (guessInput.disabled || !gameStarted) return;

  socket.emit("guess", guess.value);
  guessInput.value = "";

  // prevent spam until next turn
  guessInput.disabled = true;
  guessBtn.disabled = true;
}

/* -------- Socket events -------- */

// Feedback
socket.on("feedback", (fb) => {
  const li = document.createElement("li");
  li.innerText = `Attempt ${fb.attempt}: ${fb.correctPos} CP, ${fb.correctWrongPos} WP`;
  history.appendChild(li);
});

// General messages
socket.on("msg", (msg) => {
  status.innerText = msg;

  if (msg.includes("Both secrets locked")) {
    gameStarted = true;
  }

  if (
    msg.includes("wins") ||
    msg.includes("Game Over") ||
    msg.includes("used all")
  ) {
    gameStarted = false;
    guessInput.disabled = true;
    guessBtn.disabled = true;
  }
});

// Turn handling (ONLY controls guessing)
socket.on("turn", (currentTurn) => {
  if (!gameStarted) return;

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
