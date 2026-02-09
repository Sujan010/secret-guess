const socket = io();

const historyA = document.getElementById("historyA");
const historyB = document.getElementById("historyB");
const status = document.getElementById("status");
const guessInput = document.getElementById("guess");
const guessBtn = document.getElementById("guessBtn");
const secretInput = document.getElementById("secret");
const copyBtn = document.getElementById("copyLinkBtn");

const room = sessionStorage.getItem("room").toUpperCase();
const name = sessionStorage.getItem("name");
const player = sessionStorage.getItem("player");

let gameStarted = false;

document.getElementById("playerInfo").innerText =
  `${name} (Player ${player}) | Room ${room}`;

socket.emit("join", { room, player, name });

guessInput.disabled = true;
guessBtn.disabled = true;

copyBtn.onclick = () => {
  navigator.clipboard.writeText(`${location.origin}/join?room=${room}`);
  copyBtn.innerText = "Copied!";
  setTimeout(() => (copyBtn.innerText = "Copy Invite"), 1500);
};

function setSecret() {
  socket.emit("secret", secretInput.value);
}

function makeGuess() {
  if (!gameStarted) return;
  socket.emit("guess", guessInput.value);
  guessInput.value = "";
  guessInput.disabled = true;
  guessBtn.disabled = true;
}

socket.on("msg", (msg) => {
  status.innerText = msg;
  if (msg.includes("GAME STARTED")) gameStarted = true;
});

socket.on("turn", (turn) => {
  if (!gameStarted) return;
  if (turn === player) {
    status.innerText = "✅ Your turn!";
    guessInput.disabled = false;
    guessBtn.disabled = false;
  } else {
    status.innerText = "⏳ Opponent's turn";
  }
});

socket.on("feedback", (fb) => {
  const li = document.createElement("li");
  li.innerText = `Attempt ${fb.attempt}: ${fb.guess} → ${fb.correctPos + fb.correctWrongPos} correct, ${fb.correctPos} positions`;
  (fb.by === "A" ? historyA : historyB).appendChild(li);
});

socket.on("retryTurn", () => {
  guessInput.disabled = false;
  guessBtn.disabled = false;
});
