import React, { useEffect } from "react";
import { io } from "socket.io-client";
import Game from "./RGame";
import VoteOut from "./components/VoteOut";
import { useSocket } from "../../contexts/useSocket";

// const socket = io("http://localhost:4000"); 

export default function GamePage() {
  const socket = useSocket();

  // useEffect(() => {
  //   socket.emit("joinRoom", { roomCode: "ABCD", playerId: "p1" }); // problem with socket fix it first
  // }, []);

  // useEffect(() => {
  //   if (!socket) return;
  //   if (!socket.connected) {
  //     socket.on("connect", () => {
  //       socket.emit("game:join", { roomId: "ABCD", playerId: "p1" });
  //     });
  //   } else {
  //     socket.emit("game:join", { roomId: "ABCD", playerId: "p1" });
  //   }
  //   return () => {
  //     socket.off("connect");
  //   };
  // }, [socket]);

  return (
    <div className="min-h-screen bg-gray-100">
      <VoteOut />
      <Game playerCount={4} socket={socket} playerId="p1" />
    </div>
  );
}
