const socket = io();
const history = document.getElementById("history");
const status = document.getElementById("status");

const room = sessionStorage.getItem("room");
const name = sessionStorage.getItem("name");
const player = sessionStorage.getItem("player");
// Disable guessing by default
guessInput.disabled = true;
guessBtn.disabled = true;

status.innerText = "🔐 Lock your secret to begin";

document.getElementById("playerInfo").innerText =
  `${name} (Player ${player}) | Room ${room}`;

socket.emit("join", { room, player, name });

function setSecret() {
  socket.emit("secret", secret.value);
}

function makeGuess() {
  if (guessInput.disabled) return;

  socket.emit("guess", guess.value);
  guessInput.value = "";

  // Prevent double clicking
  guessInput.disabled = true;
  guessBtn.disabled = true;
}

socket.on("feedback", (fb) => {
  const li = document.createElement("li");
  li.innerText = `Guess ${fb.attempt}: ${fb.correctPos} CP, ${fb.correctWrongPos} WP`;
  history.appendChild(li);
});

socket.on("msg", (msg) => {
  status.innerText = msg;

  // Waiting state
  if (msg.includes("Waiting for opponent")) {
    guessInput.disabled = true;
    guessBtn.disabled = true;
  }

  // Game over
  if (
    msg.includes("wins") ||
    msg.includes("Game Over") ||
    msg.includes("used all")
  ) {
    guessInput.disabled = true;
    guessBtn.disabled = true;
  }
});

const guessInput = document.getElementById("guess");
const guessBtn = document.getElementById("guessBtn");

socket.on("turn", (currentTurn) => {
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
