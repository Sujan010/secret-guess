const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

/* ---------- HELPERS ---------- */

function isValid(num) {
  return /^[1-9]{4}$/.test(num) && new Set(num).size === 4;
}

function feedback(secret, guess) {
  let cp = 0,
    wp = 0;
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) cp++;
    else if (secret.includes(guess[i])) wp++;
  }
  return { cp, wp };
}

/* ---------- SOCKET ---------- */

io.on("connection", (socket) => {
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

    const count = Object.keys(rooms[room].players).length;

    io.to(room).emit(
      "msg",
      count === 1
        ? "⏳ Waiting for opponent to join..."
        : "👥 Both players joined. Lock your secrets!",
    );
  });

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

  socket.on("guess", (num) => {
    const room = rooms[socket.room];
    if (!room || room.state !== "IN_PROGRESS") return;

    const p = socket.player;
    const o = p === "A" ? "B" : "A";

    if (room.turn !== p) return;

    if (!isValid(num)) {
      socket.emit("msg", "❌ Invalid guess");
      socket.emit("retryTurn");
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

    if (fb.cp === 4) {
      room.state = "GAME_OVER";
      io.to(socket.room).emit(
        "msg",
        `🏆 ${room.players[p].name} WINS THE GAME!`,
      );
      io.to(socket.room).emit("revealSecret", room.secrets);
      delete rooms[socket.room];
      return;
    }

    room.turn = o;
    io.to(socket.room).emit("turn", room.turn);
  });

  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      delete rooms[socket.room];
      io.to(socket.room).emit("msg", "⚠️ Player disconnected");
    }
  });
});

server.listen(3000, () =>
  console.log("🔐 SECRET GUESS running on http://localhost:3000"),
);
