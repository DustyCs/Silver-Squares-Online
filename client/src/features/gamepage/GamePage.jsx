import React, { useEffect } from "react";
import { io } from "socket.io-client";
import Game from "./RGame";
import VoteOut from "./components/VoteOut";
import { useSocket } from "../../contexts/useSocket";

// const socket = io("http://localhost:4000"); 

export default function GamePage() {
  const socket = useSocket();

  return (
    <div className="min-h-screen bg-gray-100">
      <VoteOut />
      <Game playerCount={4} socket={socket} playerId="p1" />
    </div>
  );
}
