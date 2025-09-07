import React, { useEffect } from "react";
import { io } from "socket.io-client";
import Game from "./Game";

const socket = io("http://localhost:4000"); // adjust to your backend

export default function GamePage() {
  useEffect(() => {
    // Example: join room when mounting
    socket.emit("joinRoom", { roomCode: "ABCD", playerId: "p1" });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Game playerCount={4} socket={socket} playerId="p1" />
    </div>
  );
}
