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
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.on("chat:send", (msg) => {
    console.log("Received message from", socket.id, ":", msg);
    io.emit("chat:message", { id: Date.now(), author: socket.id, text: msg.text, time: new Date().toISOString() }); // msg is received as an object {text: "..."} from client so unpack it
  });
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default httpServer;