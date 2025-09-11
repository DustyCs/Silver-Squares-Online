import { createContext, useContext, useState } from "react";


const GameContext = createContext(null);

export function GameContextProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);

  return (
    <GameContext.Provider value={{ players, setPlayers, host, setHost }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === null) {
    throw new Error("useGameContext must be used within a GameContextProvider");
  }
  return context;
}
