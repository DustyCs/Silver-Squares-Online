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
  turns: number
}

type Tiles = {
  tileId: number,
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
    if (!lobbies[roomCode].includes(socket.id)) lobbies[roomCode].push(socket.id);
    io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode], host: lobbies[roomCode][0] }); 
    
    if (typeof callback === "function") callback();
  });

  // game already started on game:create this is just to initialize the actual game
  socket.on("game:start", ({ roomCode, players }) => {
    console.log("2 Starting the game in room", roomCode)
    console.log("Players:", players);

    if (!lobbies[roomCode]) return; // room doesn't exist

    // create a tile set for this game
    const tileCount = players.length * 3; // 3 tiles per player
    const tiles = Array.from({ length: tileCount }, (_, i) => ({
      id: i + 1,
      type: null,       // type hidden until revealed
      revealed: false,  // nothing revealed at start
    }));

    // choose random first player
    const currentPlayerId = players[Math.floor(Math.random() * players.length)];

    const payload = { 
      host: lobbies[roomCode][0], pot: 0, tiles, turns: 0, currentPlayerId 
    };

    io.to(roomCode).emit("game:init", payload);

  })

  socket.on("pick:tile", ({tileId, roomCode, pot}) => {
    if (!lobbies[roomCode]) return;
    // tileId, type, revealedBy, pot: newPot
    io.to(roomCode).emit("tile:revealed", { tileId, type: "silver", revealedBy: socket.id, pot: pot + 100 });
    console.log("Picking tile", tileId, roomCode, pot);
  
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

      }
    }

    console.log("A user disconnected:", socket.id);
  });

});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default httpServer;