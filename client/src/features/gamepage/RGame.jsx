import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGameContext } from "../../contexts/useGameContext";

const useQuery = () => {
    return new URLSearchParams(useLocation().search);
}

export default function Game({ playerCount = 4, socket = null }) {
  const tileCount = playerCount * 3;
  const playerId = socket?.id;
  const [tiles, setTiles] = useState([]);
  const [pot, setPot] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [loadingPick, setLoadingPick] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");


  const { host, players } = useGameContext();
  const [turns, setTurns] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [gamePhase, setGamePhase] = useState("tiles");
  const [elimatedPlayers, setEliminatedPlayers] = useState([]);
  const navigate = useNavigate();
  const query = useQuery();
  const [roomCode] = useState(query.get("roomCode") || null);

  const gridCols = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(tileCount));
    return Math.min(Math.max(cols, 3), 6); // clamp between 3 and 6
  }, [tileCount]);

  // Start the game
  useEffect(() => {
    console.log(socket.id, host);
    if (socket.id === host) {
      socket.emit("game:start", { roomCode });
    }
  }, []);

  // Kick off the game
  useEffect(() => {
    if (!socket || !roomCode) {
      navigate("/");
      return;
    }

    // try to rejoin the room
    socket.emit("game:join", { roomCode }, () => {
      console.log("Rejoined", roomCode);
    });

    // if server says room not found, redirect
    socket.on("game:notfound", () => {
      console.log("Room not found, redirecting...");
      navigate("/");
      alert("You have been disconnected from the game."); // temp
    });

    return () => {
      socket.off("game:notfound");
    };
  }, [socket, roomCode, navigate]);

  useEffect(() => {
    if (!socket) return; 

    const handleInit = (payload) => {
      if (payload.tiles) setTiles(payload.tiles.map(t => ({ ...t, revealed: !!t.revealed })));
      if (typeof payload.pot === 'number') setPot(payload.pot);
      if (payload.currentPlayerId) setCurrentPlayerId(payload.currentPlayerId); // need to fix this yes so the first player is random
    };

    const handleTileRevealed = ({ tileId, type, revealedBy, pot: newPot, currentPlayerId, turns }) => {
      setTiles(prev => prev.map(t => t.id === tileId ? { ...t, revealed: true, type, revealedBy } : t));
      if (typeof newPot === 'number') setPot(newPot);
      if (currentPlayerId) setCurrentPlayerId(currentPlayerId);
      if (typeof turns === 'number') setTurns(turns);
      console.log("Tile revealed:", tileId, type, revealedBy, newPot, currentPlayerId, turns);
      setLoadingPick(false);
    };

    const handleGameUpdate = (payload) => {
      if (payload.currentPlayerId) setCurrentPlayerId(payload.currentPlayerId);
      if (typeof payload.pot === 'number') setPot(payload.pot); // redundant? cause it's already set in handleTileRevealed
    };
    const handleChat = (msg) => {
      console.log("Received message:", msg);
      setMessages(prev => [...prev, msg])
    };

    const handleGameFinal = (payload) => {
      console.log("Game final:", payload);
    };

    const handleVoteGame = (payload) => {
      setGamePhase("vote");
      console.log("Vote game:", payload);
    };

    const handlePlayerElimation = ({ eliminated, players, eliminatedList }) => {
      console.log("Player eliminated:", eliminated, players, eliminatedList);
      setEliminatedPlayers(eliminatedList);
    };

    const handleContinueVoteGame = () => {
      console.log("Continue vote game");
      setGamePhase("vote");
    };

    const handleFinalGame = () => {
      console.log("Final game");
      setGamePhase("final");
    };

    socket.on('game:init', handleInit);
    socket.on('tile:revealed', handleTileRevealed);
    socket.on('game:update', handleGameUpdate);
    socket.on('chat:message', handleChat);

    socket.on('game:final', handleGameFinal);
    socket.on('game:vote', handleVoteGame);
    socket.on('player:eliminated', handlePlayerElimation);
    socket.on("voting:next", handleContinueVoteGame);
    socket.on("final:start", handleFinalGame);

    socket.on("disconnect", () => {
      window.location.href = "/";
    });


    return () => {
      socket.off('game:init', handleInit);
      socket.off('tile:revealed', handleTileRevealed);
      socket.off('game:update', handleGameUpdate);
      socket.off('chat:message', handleChat);
    };
  }, [socket]);

  const handlePick = (tile) => {
    console.log("Trying to pick tile", tile)
    if (tile.revealed || loadingPick) return;
    if (currentPlayerId && playerId && currentPlayerId !== playerId) return;

    setLoadingPick(true);
    if (socket) {
      socket.emit('pick:tile', { tileId: tile.id, roomCode: roomCode });
      console.log("Picking tile", tiles)
    } else {
      console.log("Simulating pick");
    }
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    if (socket) socket.emit('chat:send', { text, roomCode });
    else setMessages(prev => [...prev, { id: Date.now(), author: playerId || 'You', text, time: new Date().toISOString() }]);
    setChatInput('');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Silver Squares</h1>
            <div className="text-right">
              <div className="text-sm text-gray-500">Pot</div>
              <div className="text-xl font-semibold">${pot}</div>
            </div>
          </div>

          <div
            className={`grid gap-2 w-full`}
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
          >
            {tiles.map((tile) => (
              <button
                key={tile.id}
                onClick={() => handlePick(tile)}
                disabled={tile.revealed || (currentPlayerId && playerId && currentPlayerId !== playerId)}
                className={`aspect-square rounded-lg border flex items-center justify-center p-2 relative transition-transform active:scale-95 ${
                  tile.revealed ? 'bg-gray-50 cursor-default' : 'bg-white hover:shadow'
                }`}
              >

                {!tile.revealed && (
                  <div className="text-sm font-medium text-gray-500">{tile.id}</div>
                )}

                {tile.revealed && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-sm font-semibold">
                      {tile.type ? tile.type.toUpperCase() : 'REVEALED'}
                    </div>
                    <div className="text-xs text-gray-500">by {tile.revealedBy || '—'}</div>
                  </div>
                )}

                {currentPlayerId === tile.revealedBy && (
                  <div className="absolute -top-2 -right-2 text-xs px-2 py-1 bg-yellow-100 rounded-full">Turn</div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Current turn: {
              currentPlayerId || 'waiting...'
            }
          </div>
          {/* Voting section */}
            <div className={`flex flex-col gap-2 ${ gamePhase === 'vote' ? 'block' : 'hidden'} `}>
              <h2 className="text-lg font-semibold">Vote a player out</h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                }}
                className="space-y-2"
              >
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={player.id}
                      name="vote"
                      value={player.id}
                      checked={selectedPlayer === player.id}
                      onChange={() => setSelectedPlayer(player.id)}
                      className="cursor-pointer"
                    />
                    <label
                      htmlFor={player.id}
                      className="cursor-pointer text-gray-700 hover:text-gray-900"
                    >
                      {player.id}
                    </label>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={!selectedPlayer}
                  className={`border-2 p-2 rounded-md transition 
                    ${
                      selectedPlayer
                        ? "text-gray-500 border-gray-700 cursor-pointer hover:bg-gray-400 hover:text-gray-100 active:scale-110"
                        : "text-gray-400 border-gray-300 cursor-not-allowed bg-gray-100"
                    }`}
                    onClick={() => {
                      if (selectedPlayer) {
                        socket.emit("vote:submit", {
                          roomCode,
                          voter: playerId,
                          voted: selectedPlayer,
                        });

                        setGamePhase("tiles");
                      }
                    }}
                >
                  Vote
                </button>
              </form>
            </div>

          {/* Final Section Split or Steal */}
            <div className={`flex flex-col gap-2 ${ gamePhase === 'final' ? 'block' : 'hidden'} `}>
                <div>
                    <h2 className="text-lg font-semibold">Final Decision</h2>
                    <div className="flex gap-2">
                        <button onClick={() => { handleFinalGame() }} className="border-2 p-2 rounded-md transition text-gray-500 border-gray-700 cursor-pointer hover:bg-gray-400 hover:text-gray-100 active:scale-110">Split</button>
                        <button onClick={() => { handleFinalGame() }} className="border-2 p-2 rounded-md transition text-gray-500 border-gray-700 cursor-pointer hover:bg-gray-400 hover:text-gray-100 active:scale-110">Steal</button>
                    </div>
                </div>
            </div>
        </div>

        <div className="w-full md:w-96 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Player Chat</h2>
          <div className="border rounded-lg p-2 mb-2 h-72 overflow-y-auto custom-scroll">
            {messages.length === 0 && (
              <div className="text-sm text-gray-400">No messages yet — say hi 👋</div>
            )}
            <ul className="space-y-2">
              {messages.map((m) => (
                <li key={m.id} className="text-sm">
                  <div className="font-medium text-gray-700">{m.author}</div>
                  <div className="text-gray-700">{m.text}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(m.time || Date.now()).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              type="text"
              className="flex-1 border rounded-md p-2"
              placeholder="Type a message..."
            />
            <button onClick={sendChat} className="px-4 py-2 bg-blue-600 text-white rounded-md">Send</button>
            <button onClick={() => navigate('/lobby')} className="px-4 py-2 bg-red-600 text-white rounded-md">Quit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
