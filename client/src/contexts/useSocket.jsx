import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (socket) return; // already connected

    const newSocket = io("https://silver-squares-online.onrender.com", {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"], // allow fallback
    });

    // Debug logs
    newSocket.on("connect", () => {
      console.log("Connected:", newSocket.id);
    });
    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
    });
    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {socket ? children : null}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === null) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
