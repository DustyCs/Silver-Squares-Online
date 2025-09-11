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

    const handleTileRevealed = ({ tileId, type, revealedBy, pot: newPot, currentPlayerId }) => {
      setTiles(prev => prev.map(t => t.id === tileId ? { ...t, revealed: true, type, revealedBy } : t));
      if (typeof newPot === 'number') setPot(newPot);
      if (currentPlayerId) setCurrentPlayerId(currentPlayerId);
      console.log("Tile revealed:", tileId, type, revealedBy, newPot);
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

    socket.on('game:init', handleInit);
    socket.on('tile:revealed', handleTileRevealed);
    socket.on('game:update', handleGameUpdate);
    socket.on('chat:message', handleChat);

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
      setTimeout(() => {
        const outcomes = ['silver', 'black', 'empty', 'bonus'];
        const type = outcomes[Math.floor(Math.random() * outcomes.length)];
        const revealed = { tileId: tile.id, type, revealedBy: playerId || 'local', pot: pot + (type === 'silver' ? 100 : (type === 'black' ? -50 : 0)) };
        setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, revealed: true, type, revealedBy: revealed.revealedBy } : t));
        setPot(revealed.pot);
        setLoadingPick(false);
      }, 700);
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

          {/* <div className="mt-4 text-sm text-gray-500">Current turn: {currentPlayerId || 'waiting...'}</div> */}
          <div className="mt-4 text-sm text-gray-500">
            Current turn: {
              // players.find(p => p.id === currentPlayerId)?.name || currentPlayerId || 'waiting...'
              currentPlayerId || 'waiting...'
            }
          </div>
        </div>

        <div className="w-full md:w-96 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Player Chat</h2>
          <div className="flex-1 border rounded-lg p-2 mb-2 overflow-auto h-72">
            {messages.length === 0 && <div className="text-sm text-gray-400">No messages yet — say hi 👋</div>}
            <ul className="space-y-2">
              {messages.map((m) => (
                <li key={m.id} className="text-sm">
                  <div className="font-medium text-gray-700">{m.author}</div>
                  <div className="text-gray-700">{m.text}</div>
                  <div className="text-xs text-gray-400">{new Date(m.time || Date.now()).toLocaleTimeString()}</div>
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
