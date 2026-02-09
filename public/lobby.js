function generateRoom() {
  return "SG" + Math.floor(100 + Math.random() * 900);
}

function enterGame() {
  let room = document.getElementById("room").value.trim().toUpperCase();
  const name = document.getElementById("name").value.trim();
  const player = document.getElementById("player").value;

  if (!name) return alert("Enter name");
  if (!room) room = generateRoom();

  sessionStorage.setItem("room", room);
  sessionStorage.setItem("name", name);
  sessionStorage.setItem("player", player);

  window.location.href = "game.html";
}

function autoPlay() {
  sessionStorage.setItem("auto", "yes");
  sessionStorage.setItem("name", document.getElementById("name").value);
  window.location.href = "game.html";
}
function generateRoomId() {
  const num = Math.floor(100 + Math.random() * 900);
  return "SG" + num;
}
let room = document.getElementById("room").value.trim();
if (!room) room = generateRoomId();
const params = new URLSearchParams(window.location.search);
const roomFromUrl = params.get("room");

if (roomFromUrl) {
  document.getElementById("room").value = roomFromUrl.toUpperCase();
}
