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
  // socket.on("hello-event-me", (number: number, string: string, obj: object) => console.log(number, string, obj))
  socket.on("send:msg", (msg) => {
    console.log("Received message from", socket.id, ":", msg);
    io.emit("receive:msg", msg);
  });
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default httpServer;