const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/*
Room structure:
rooms = {
  SG123: {
    players: { A: { id, name }, B: { id, name } },
    secrets: { A: "1234", B: "5678" },
    attempts: { A: 0, B: 0 },
    turn: "A"
  }
}
*/
const rooms = {};
let waitingPlayer = null;

/* ---------------- HELPERS ---------------- */

function isValid(num) {
  return /^[1-9]{4}$/.test(num) && new Set(num).size === 4;
}

// SAFE feedback (never crashes)
function feedback(secret, guess) {
  if (!secret || !guess) {
    return { cp: 0, wp: 0 };
  }

  let cp = 0;
  let wp = 0;

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      cp++;
    } else if (secret.includes(guess[i])) {
      wp++;
    }
  }
  return { cp, wp };
}

/* ---------------- SOCKET ---------------- */

io.on("connection", (socket) => {
  /* -------- MANUAL ROOM JOIN -------- */
  socket.on("join", ({ room, player, name }) => {
    room = room.trim().toUpperCase();
    socket.join(room);
    socket.room = room;
    socket.player = player;
    socket.name = name;

    if (!rooms[room]) {
      rooms[room] = {
        players: {},
        secrets: {},
        attempts: { A: 0, B: 0 },
        turn: "A",
      };
    }

    rooms[room].players[player] = {
      id: socket.id,
      name,
    };

    io.to(room).emit("msg", `👤 ${name} joined as Player ${player}`);
    io.to(room).emit("turn", rooms[room].turn);
  });

  /* -------- AUTO MATCHMAKING -------- */
  socket.on("autoMatch", ({ name }) => {
    socket.name = name;

    if (!waitingPlayer) {
      waitingPlayer = socket;
      socket.emit("msg", "🔍 Waiting for another player...");
      return;
    }

    const room = "SG" + Math.floor(100 + Math.random() * 900);

    rooms[room] = {
      players: {
        A: { id: waitingPlayer.id, name: waitingPlayer.name },
        B: { id: socket.id, name },
      },
      secrets: {},
      attempts: { A: 0, B: 0 },
      turn: "A",
    };

    waitingPlayer.join(room);
    socket.join(room);

    waitingPlayer.room = room;
    waitingPlayer.player = "A";
    socket.room = room;
    socket.player = "B";

    io.to(room).emit("msg", "🎮 Match found!");
    io.to(room).emit("turn", "A");

    waitingPlayer = null;
  });

  /* -------- SET SECRET -------- */

  socket.on("secret", (num) => {
    const room = rooms[socket.room];
    if (!room) return;
    if (room.secrets.A && room.secrets.B) {
      io.to(socket.room).emit("msg", "🎯 Both secrets locked. Game begins!");
      io.to(socket.room).emit("turn", room.turn);
    }

    if (!isValid(num)) {
      socket.emit("msg", "❌ Invalid secret");
      return;
    }

    room.secrets[socket.player] = num;

    // Notify THIS player
    socket.emit("msg", "🔒 Secret locked. Waiting for opponent...");

    // Notify opponent (if exists)
    socket
      .to(socket.room)
      .emit(
        "msg",
        `⏳ ${room.players[socket.player].name} locked their secret`,
      );

    // If both secrets are ready → start game
    if (room.secrets.A && room.secrets.B) {
      io.to(socket.room).emit("msg", "🎯 Both secrets locked. Game begins!");
      io.to(socket.room).emit("turn", room.turn);
    }
  });

  /* -------- GUESS -------- */
  socket.on("guess", (num) => {
    const room = rooms[socket.room];
    if (!room) return;
    if (room.state === "GAME_OVER") return;

    const p = socket.player;
    const o = p === "A" ? "B" : "A";

    // Not your turn
    if (room.turn !== p) {
      socket.emit("msg", "⏳ Not your turn");
      return;
    }

    // Secrets not ready
    if (!room.secrets.A || !room.secrets.B) {
      socket.emit("msg", "⚠️ Both players must lock secrets first");
      return;
    }

    // Invalid guess
    // Invalid guess (do NOT lock turn)
    if (!isValid(num)) {
      if (room.state !== "IN_PROGRESS") return;

      socket.emit("msg", "❌ Invalid guess");
      socket.emit("retryTurn");
      return;
    }

    // Attempts exhausted
    if (room.attempts[p] >= 10) {
      socket.emit("msg", "❌ No attempts left");
      return;
    }

    room.attempts[p]++;

    const fb = feedback(room.secrets[o], num);

    io.to(socket.room).emit("feedback", {
      by: p, // A or B
      guess: num, // guessed number
      attempt: room.attempts[p],
      correctPos: fb.cp,
      correctWrongPos: fb.wp,
    });

    // WIN
    if (fb.cp === 4) {
      room.state = "GAME_OVER";
      io.to(socket.room).emit(
        "msg",
        `🏆 ${room.players[p].name} wins the game!`,
      );
      delete rooms[socket.room];

      if (msg.includes("YOU WON")) {
        launchConfetti();
      }

      io.to(socket.room).emit("revealSecret", {
        A: room.secrets.A,
        B: room.secrets.B,
      });

      return;
    }

    // LAST ATTEMPT
    if (room.attempts[p] === 10) {
      io.to(socket.room).emit(
        "msg",
        `❌ ${room.players[p].name} used all 10 attempts`,
      );

      if (room.attempts[o] === 10) {
        io.to(socket.room).emit("msg", "🤝 Game Over! No winner.");
        delete rooms[socket.room];
      }
      io.to(socket.room).emit("revealSecret", {
        A: room.secrets.A,
        B: room.secrets.B,
      });

      return; // ⛔ Do not switch turn
    }

    // Switch turn
    room.turn = o;
    io.to(socket.room).emit("turn", room.turn);
  });

  /* -------- DISCONNECT -------- */
  socket.on("disconnect", () => {
    if (socket === waitingPlayer) {
      waitingPlayer = null;
    }

    if (socket.room && rooms[socket.room]) {
      io.to(socket.room).emit("msg", "⚠️ Player disconnected");
      delete rooms[socket.room];
    }
  });
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔐 SECRET GUESS running on http://localhost:${PORT}`);
});
