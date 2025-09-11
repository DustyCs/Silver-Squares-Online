import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";
dotenv.config();

type Game = {
  roomCode: string,
  players: string[],
  host: string,
  pot: number,
  tiles: Tiles[],
  currentPlayerId: string,
  // turns: number
}

type Player = {
  id: string,
  name: string
}

type Tiles = {
  id: number,
  type: "silver" | "black" | "empty" | "bonus",
  revealed: boolean,
  revealedBy?: string
}

const app = express();
const httpServer = createServer(app)

console.log("Server started... trying to run")

// Socket.io server setup
console.log("Setting up socket.io server...")

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"] 
  },
  allowEIO3: true
});

const games: Record<string, Game> = {};
const lobbies: Record<string, string[]> = {}; 


io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("chat:send", (msg) => {
    console.log("Received message from", socket.id, ":", msg);
    if (msg.roomCode){
      io.to(msg.roomCode).emit("chat:message", { id: Date.now(), author: socket.id, text: msg.text, time: new Date().toISOString() }); // msg is received as an object {text: "..."} from client so unpack it
    }
  });

  socket.on("game:create", (data, callback) => {
    const roomCode = typeof data === "string" ? data : data.roomCode;
    console.log("Creating game in room", roomCode);

    lobbies[roomCode] = [socket.id]; // create the room with the first player(host)
    socket.join(roomCode);

    // io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode] });
    // update lobby state
    io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode], host: lobbies[roomCode][0] }); // the first player is the host


    if (typeof callback === "function") callback();
  });

  socket.on("game:join", (data, callback) => {
    const roomCode = typeof data === "string" ? data : data.roomCode;
    console.log("Joining game in room", roomCode)
    socket.join(roomCode);

    if (!lobbies[roomCode]) lobbies[roomCode] = [];
    // send server socket id instead 

    if (!games[roomCode].players.includes(socket.id)) {
      socket.emit("game:notfound"); // client navigates back to /
      return;
    }
    if (!lobbies[roomCode].includes(socket.id)) lobbies[roomCode].push(socket.id);
    io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode], host: lobbies[roomCode][0] }); 
    
    // if game already started
    if (games[roomCode]) {
      io.to(roomCode).emit("game:init", games[roomCode]);
    }

    if (typeof callback === "function") callback();
  });

  // game already started on game:create this is just to initialize the actual game
  socket.on("game:start", ({ roomCode }) => {
    console.log("2 Starting the game in room", roomCode)
    // console.log("Players:", players);

    if (!lobbies[roomCode]) return; // room doesn't exist
    const roomPlayers = lobbies[roomCode];

    // create a tile set for this game
    const tileCount = roomPlayers.length * 3; // 3 tiles per player
    const tiles: Tiles[] = Array.from({ length: tileCount }, (_, i) => ({
      id: i + 1,
      type: "silver",       // type hidden until revealed
      revealed: false,  // nothing revealed at start
    }));

    // choose random first player
    const currentPlayerId = roomPlayers[Math.floor(Math.random() * roomPlayers.length)];

    // const payload = { 
    //   host: lobbies[roomCode][0], pot: 0, tiles, currentPlayerId 
    // };

    // save game state
    games[roomCode] = { roomCode, players: roomPlayers, host: lobbies[roomCode][0], pot: 0, tiles, currentPlayerId };

    io.to(roomCode).emit("game:init", games[roomCode]);

  })

  socket.on("pick:tile", ({tileId, roomCode }) => {
    console.log("Picking tile", tileId, roomCode)
    const game = games[roomCode];
    if (!game) return;
    if (!lobbies[roomCode]) return;

    const tile = game.tiles.find(t => t.id === tileId);
    if (!tile || tile.revealed) return;

    // silver for now
    // tile.type = "silver";
    tile.type = getRandomTileType();
    tile.revealed = true;
    tile.revealedBy = socket.id;
    // game.pot += 100;

    if (tile.type === "silver") game.pot += 100;
    else if (tile.type === "black") game.pot -= 50;
    else if (tile.type === "empty") game.pot += 0;
    else if (tile.type === "bonus") game.pot += 200;

    // next player

    const currentindex = game.players.indexOf(socket.id);
    const nextindex = (currentindex + 1) % game.players.length;
    game.currentPlayerId = game.players[nextindex];

    io.to(roomCode).emit("tile:revealed", { tileId, type: tile.type, revealedBy: tile.revealedBy, pot: game.pot, currentPlayerId: game.currentPlayerId });
    console.log("Picking tile", tileId, roomCode, game.pot, game.currentPlayerId);
  
  })

  socket.on("host:start", ({roomCode}) => {
    console.log("Starting the game in room", roomCode)
    if (!lobbies[roomCode]) return;
    // make sure the host is the one who started the game
    if (lobbies[roomCode][0] !== socket.id) return;
    io.to(roomCode).emit("game:start");
  });

  socket.on("disconnect", () => {
    for(const [roomCode, players] of Object.entries(lobbies)) {
      if (players.includes(socket.id)) {
        lobbies[roomCode] = players.filter(p => p !== socket.id);
        // io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode] });
        // update lobby state

        io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode], host: lobbies[roomCode][0] }); // the first player is the host
        socket.emit("force:redirect", { to: "/" });
        socket.disconnect();
      }
    }

    console.log("A user disconnected:", socket.id);
  });

});

// helper
function getRandomTileType(): "silver" | "black" | "empty" | "bonus" {
  const rand = Math.random();
  if (rand < 0.5) return "silver";     // 50%
  if (rand < 0.7) return "black";      // 20%
  if (rand < 0.9) return "empty";      // 20%
  return "bonus";                      // 10%
}


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default httpServer;