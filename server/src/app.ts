import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";
dotenv.config();

type Game = {
  roomCode: string,
  players: string[], // active players
  eliminated?: string[], // voted out
  host: string,
  pot: number,
  tiles: Tiles[],
  currentPlayerId: string,
  turns: number,
  phase: "tiles" | "final" | "over" | "vote",
  votes?: Record<string, number>
  finalChoices?: Record<string, "split" | "steal">
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

    if (games[roomCode]) {
      if (!games[roomCode].players.includes(socket.id)) {
        socket.emit("game:notfound"); // client navigates back to /
        return;
      }
    }

    if (!lobbies[roomCode].includes(socket.id)) lobbies[roomCode].push(socket.id);
    io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode], host: lobbies[roomCode][0] }); 
    
    // if game already started
    if (games[roomCode]) {
      io.to(roomCode).emit("game:init", games[roomCode]);
    }

    if (typeof callback === "function") callback();
  });

  socket.on("game:start", ({ roomCode }) => {
    console.log("2 Starting the game in room", roomCode)
    // console.log("Players:", players);

    if (!lobbies[roomCode]) return;
    const roomPlayers = lobbies[roomCode];

    // create a tile set for this game
    const tileCount = roomPlayers.length * 3; // 3 tiles per player
    const tiles: Tiles[] = Array.from({ length: tileCount }, (_, i) => ({
      id: i + 1,
      type: "silver",       // type hidden until revealed
      revealed: false,  // nothing revealed at start
    }));


    const currentPlayerId = roomPlayers[Math.floor(Math.random() * roomPlayers.length)];
    // save game state
    games[roomCode] = { 
      roomCode, players: roomPlayers, eliminated: [], host: lobbies[roomCode][0], pot: 0, tiles, currentPlayerId, turns: 0, phase: "tiles" 
    };

    console.log("Game started:", games[roomCode]);

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

    game.turns += 1;

    // next player

    const currentindex = game.players.indexOf(socket.id);
    const nextindex = (currentindex + 1) % game.players.length;
    game.currentPlayerId = game.players[nextindex];

    io.to(roomCode).emit("tile:revealed", { tileId, type: tile.type, revealedBy: tile.revealedBy, pot: game.pot, currentPlayerId: game.currentPlayerId, turns: game.turns });
    console.log("Picking tile", tileId, roomCode, game.pot, game.currentPlayerId);
  

    if (game.tiles.every(t => t.revealed)) {
      game.phase = "vote";
      io.to(roomCode).emit("game:vote", { pot: game.pot, players: game.players });
    }

  })

  socket.on("vote:submit", ({ roomCode, voter, voted }) => {
    console.log("Voting", voted, roomCode, voter);
    const game = games[roomCode];
    if (!game || game.phase !== "vote") return;
    console.log("Players", game.players);
    if (!game.players.includes(socket.id)) return;
    if (!game.players.includes(voted)) return;


    game.votes = game.votes || {};
    game.votes[socket.id] = voted;

    if (Object.keys(game.votes).length === game.players.length) {
      const tally: Record<string, number> = {};
      for (const t of Object.values(game.votes)) {
        tally[t] = (tally[t] || 0) + 1;
      }

      const maxVotes = Math.max(...Object.values(tally));
      const candidates = Object.entries(tally)
      .filter(([_, v]) => v === maxVotes)
      .map(([id]) => id);

      const eliminated = candidates[Math.floor(Math.random() * candidates.length)]; // randomly eliminate one if tie

      game.players = game.players.filter(p => p !== eliminated);

      if (!game.eliminated) game.eliminated = [];

      game.eliminated.push(eliminated);
      game.votes = {};

      io.to(roomCode).emit("player:eliminated", { eliminated, players: game.players, eliminatedList: game.eliminated });

      if (game.players.length === 2){
        game.phase = "final";
        io.to(roomCode).emit("final:start", { pot: game.pot, players: game.players });
      } else{
        io.to(roomCode).emit("voting:next", { players: game.players });
      }

    }

  })

  socket.on("final:choice", ({ roomCode, choice }) => {
    const game = games[roomCode];
    if (!game || game.phase !== "final") return;
    
    game.finalChoices = game.finalChoices || {};
    game.finalChoices[socket.id] = choice;

    // If both have chosen
    if (Object.keys(game.finalChoices).length === 2) {
      const [p1, p2] = game.players;
      const c1 = game.finalChoices[p1];
      const c2 = game.finalChoices[p2];
      let result;

      if (c1 === "split" && c2 === "split") {
        result = { winner: "both", payout: game.pot / 2 };
      } else if (c1 === "steal" && c2 === "split") {
        result = { winner: p1, payout: game.pot };
      } else if (c1 === "split" && c2 === "steal") {
        result = { winner: p2, payout: game.pot };
      } else {
        result = { winner: null, payout: 0 }; // both steal
      }

      game.phase = "over";
      io.to(roomCode).emit("game:over", { pot: game.pot, result });
    }
  });
  

  socket.on("host:start", ({roomCode, players}) => {
    console.log("Starting the game in room", roomCode, players)
    if (Object.keys(players).length < 2) {
      console.log("Not enough players to start the game");
      socket.emit("game:notenough", { message: "Need at least 2 players to start." });
      return;
    }
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