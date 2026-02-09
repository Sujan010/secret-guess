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
const historyA = document.getElementById("historyA");
const historyB = document.getElementById("historyB");

socket.on("feedback", (fb) => {
  const totalCorrect = fb.correctPos + fb.correctWrongPos;
  let message = "";

  if (totalCorrect === 0) {
    message = "All numbers are wrong";
  } else if (fb.correctPos > 0 && fb.correctWrongPos === 0) {
    message = `${fb.correctPos} number${fb.correctPos > 1 ? "s" : ""} are correct and ${fb.correctPos} position${fb.correctPos > 1 ? "s" : ""} are also correct`;
  } else if (fb.correctPos === 0 && fb.correctWrongPos > 0) {
    message = `${fb.correctWrongPos} number${fb.correctWrongPos > 1 ? "s" : ""} are correct but position${fb.correctWrongPos > 1 ? "s" : ""} are wrong`;
  } else {
    message = `${totalCorrect} number${totalCorrect > 1 ? "s" : ""} are correct and ${fb.correctPos} position${fb.correctPos > 1 ? "s" : ""} are also correct`;
  }

  const li = document.createElement("li");
  li.innerText = `Attempt ${fb.attempt}: Guess ${fb.guess} → ${message}`;

  // Append to correct history
  if (fb.by === "A") {
    historyA.appendChild(li);
  } else {
    historyB.appendChild(li);
  }
});

const gameResult = document.getElementById("gameResult");
const resultText = document.getElementById("resultText");
// General messages
socket.on("msg", (msg) => {
  status.innerText = msg;

  if (msg.includes("Both secrets locked")) {
    gameStarted = true;
  }
  if (msg.includes("GAME STARTED")) {
    gameStarted = true;
  }

  if (msg.includes("wins")) {
    gameStarted = false;
    guessInput.disabled = true;
    guessBtn.disabled = true;
    resultText.innerText = msg.includes(name) ? "🎉 YOU WON!" : "😔 YOU LOST";
    gameResult.classList.remove("hidden");
  }

  if (msg.includes("NO WINNER") || msg.includes("used all")) {
    gameStarted = false;
    resultText.innerText = "🤝 GAME OVER";
    gameResult.classList.remove("hidden");
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
