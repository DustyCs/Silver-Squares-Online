import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";
dotenv.config();

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

    // lobbies[roomCode].push(data.playerId);
    // send server socket id instead 
    if (!lobbies[roomCode].includes(socket.id)) lobbies[roomCode].push(socket.id);

    // update lobby state
    io.to(roomCode).emit("lobby:update", { players: lobbies[roomCode], host: lobbies[roomCode][0] }); // the first player is the host

    
    // socket.to(roomCode).emit("player:join", { playerId: data.playerId });
    
    if (typeof callback === "function") callback();
  });

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