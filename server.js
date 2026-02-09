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
    turn: "A",
    state: "WAITING" | "IN_PROGRESS" | "GAME_OVER"
  }
}
*/
const rooms = {};
let waitingPlayer = null;

/* ---------------- HELPERS ---------------- */

function isValid(num) {
  return /^[1-9]{4}$/.test(num) && new Set(num).size === 4;
}

function feedback(secret, guess) {
  let cp = 0;
  let wp = 0;

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) cp++;
    else if (secret.includes(guess[i])) wp++;
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
        state: "WAITING",
      };
    }

    rooms[room].players[player] = { id: socket.id, name };

    io.to(room).emit("msg", `👤 ${name} joined as Player ${player}`);
  });

  /* -------- AUTO MATCH -------- */
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
      state: "WAITING",
    };

    waitingPlayer.join(room);
    socket.join(room);

    waitingPlayer.room = room;
    waitingPlayer.player = "A";
    socket.room = room;
    socket.player = "B";

    io.to(room).emit("msg", "🎮 Match found!");
    waitingPlayer = null;
  });

  /* -------- SET SECRET -------- */
  socket.on("secret", (num) => {
    const room = rooms[socket.room];
    if (!room || room.state !== "WAITING") return;

    if (!isValid(num)) {
      socket.emit("msg", "❌ Invalid secret");
      return;
    }

    room.secrets[socket.player] = num;

    socket.emit("msg", "🔒 Secret locked. Waiting for opponent...");
    socket
      .to(socket.room)
      .emit(
        "msg",
        `⏳ ${room.players[socket.player].name} locked their secret`,
      );

    if (room.secrets.A && room.secrets.B) {
      room.state = "IN_PROGRESS";
      io.to(socket.room).emit("msg", "🎯 GAME STARTED!");
      io.to(socket.room).emit("turn", room.turn);
    }
  });

  /* -------- GUESS -------- */
  socket.on("guess", (num) => {
    const room = rooms[socket.room];
    if (!room || room.state !== "IN_PROGRESS") return;

    const p = socket.player;
    const o = p === "A" ? "B" : "A";

    if (room.turn !== p) {
      socket.emit("msg", "⏳ Not your turn");
      return;
    }

    if (!isValid(num)) {
      socket.emit("msg", "❌ Invalid guess");
      socket.emit("retryTurn");
      return;
    }

    if (room.attempts[p] >= 10) {
      socket.emit("msg", "❌ No attempts left");
      return;
    }

    room.attempts[p]++;

    const fb = feedback(room.secrets[o], num);

    io.to(socket.room).emit("feedback", {
      by: p,
      guess: num,
      attempt: room.attempts[p],
      correctPos: fb.cp,
      correctWrongPos: fb.wp,
    });

    /* -------- WIN -------- */
    if (fb.cp === 4) {
      room.state = "GAME_OVER";

      io.to(socket.room).emit(
        "msg",
        `🏆 ${room.players[p].name} WINS THE GAME!`,
      );

      io.to(socket.room).emit("revealSecret", {
        A: room.secrets.A,
        B: room.secrets.B,
      });

      setTimeout(() => {
        delete rooms[socket.room];
      }, 3000);

      return;
    }

    /* -------- LAST ATTEMPT -------- */
    if (room.attempts[p] === 10) {
      io.to(socket.room).emit(
        "msg",
        `❌ ${room.players[p].name} used all 10 attempts`,
      );

      if (room.attempts[o] === 10) {
        room.state = "GAME_OVER";

        io.to(socket.room).emit("🤝 GAME OVER! No winner.");
        io.to(socket.room).emit("revealSecret", {
          A: room.secrets.A,
          B: room.secrets.B,
        });

        setTimeout(() => {
          delete rooms[socket.room];
        }, 3000);
      }

      return;
    }

    /* -------- SWITCH TURN -------- */
    room.turn = o;
    io.to(socket.room).emit("turn", room.turn);
  });

  /* -------- DISCONNECT -------- */
  socket.on("disconnect", () => {
    if (socket === waitingPlayer) waitingPlayer = null;

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
