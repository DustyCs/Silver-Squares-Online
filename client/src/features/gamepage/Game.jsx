import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

export default function Game({ playerCount = 4, socket = null, playerId = null }) {
  const tileCount = playerCount * 3;
  const [tiles, setTiles] = useState(() =>
    Array.from({ length: tileCount }, (_, i) => ({ id: i + 1, revealed: false }))
  );
  const [pot, setPot] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [loadingPick, setLoadingPick] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // this would run every time Game is mounted... which is dumb
  // const socketroom = io('http://localhost:4000'); // Replace with your server URL
  // socketroom.on('connect', () => {
  //   console.log('Connected to server with ID:', socketroom.id);
  //   // test msg
  //   sendChat("Hello from " + socketroom.id);
  // });

  // instead useEffect instead

  // useEffect(() => {
  //   const socket = io('http://localhost:4000'); // Replace with your server URL
    

  //   socket.on('connect', () => {
  //     console.log('Connected to server with ID:', socket.id);
  //     // test msg
  //     sendChat("Hello as " + socket.id);
  //   });

  //   // socket.emit('hello-event-me', 10, 'hi', { a: 1, b: '2' }); // parameters = event name, arguments

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, []);

  // compute grid columns dynamically (square-ish grid)
  const gridCols = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(tileCount));
    return Math.min(Math.max(cols, 3), 6); // clamp between 3 and 6
  }, [tileCount]);

  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    // test msg
    sendChat("Hello as " + socket.id);
  });

  
  

  const handlePick = (tile) => {
    // prevent picking if already revealed or not your turn or currently picking
    if (tile.revealed || loadingPick) return;
    if (currentPlayerId && playerId && currentPlayerId !== playerId) return;

    setLoadingPick(true);
    // send to server -- server should validate turn and broadcast tile:revealed
    if (socket) {
      console.log("Emitting pick for tile:", tile.id);
    } else {
      // Local demo fallback: reveal a random outcome after delay
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

  const sendChat = (msg) => {
    const text = msg || chatInput.trim();
    if (!text) return;
    if (socket) socket.emit('chat:send', { text });
    else setMessages(prev => [...prev, { id: Date.now(), author: playerId || 'You', text, time: new Date().toISOString() }]);
    setChatInput('');
  };

  const navigate = useNavigate();
  const handleLeave = () => {
    navigate('/');
    console.log("Leave game");
  }

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

          <div className="mt-4 text-sm text-gray-500">Current turn: {currentPlayerId || 'waiting...'}</div>
        </div>

        <div className="w-full md:w-96 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Player Chat</h2>
          <div className="flex-1 border rounded-lg p-2 mb-2 overflow-auto h-72">
            {messages.length === 0 && <div className="text-sm text-gray-400">No messages yet — say Hi!</div>}
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
            <button onClick={sendChat} className="px-2 py-2 bg-blue-600 text-white rounded-md">Send</button>
            <button onClick={handleLeave} className="px-2 py-2 bg-red-600 text-white rounded-md">Quit Game</button>
          </div>
        </div>
      </div>
    </div>
  );
}
