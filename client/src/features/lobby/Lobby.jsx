import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "../../contexts/useSocket";
import { useGameContext } from "../../contexts/useGameContext";
import cryptoRandomString from 'crypto-random-string';

const useQuery = () => { // make this a custom hook
    return new URLSearchParams(useLocation().search);
}

export default function Lobby({
  initialPlayers = [
    { id: 1, name: "Player 1" },
    { id: 2, name: "Player 2" },
    { id: 3, name: "Player 3" },
    { id: 4, name: "Player 4" },
  ],
}) {
    // const [players, setPlayers] = useState(initialPlayers);
    const {players, setPlayers} = useGameContext();
    // const [host, setHost] = useState(null);
    const {host, setHost} = useGameContext();
    const [copied, setCopied] = useState(false);
    const [isHost, setIsHost] = useState(false); // redundant
    

    const navigate = useNavigate();
    const query = useQuery();
    const [roomCode, setRoomCode] = useState(query.get("roomCode") || null);

    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;
        if (roomCode) {
            socket.emit("game:join", { roomCode: roomCode, playerId: socket.id }, () => { console.log("Room joined") }); 
            return;
        } else { // yes i know how bad this is but i did it cause i can
            const code = cryptoRandomString({ length: 4 }) // this should be handled by the backend but for now we'll do it here
            setRoomCode(code);
            console.log("Room code:", code); 
            socket.emit("game:create", { roomCode: code }, () => { console.log("Room created") }); // why im i passing this as an object...?
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleLobbyUpdate = ({ players, host }) => {
                console.log("Lobby update:", players, host);
                setPlayers(players.map((id, idx) => ({ id, name: `Player ${idx + 1}` })));
                setHost(host);
            };

        const handlePlayerJoin = ({playerId}) => {
            setPlayers((prevPlayers) => [
                ...prevPlayers,
                { id: playerId, name: `Player ${prevPlayers.length + 1}` }
            ]);
        };

        const handlePlayerLeave = (playerId) => {
            setPlayers((prevPlayers) =>
                prevPlayers.filter((p) => p.id !== playerId)
            );
        };
        
        socket.on("lobby:update", handleLobbyUpdate);
        socket.on("player:join", handlePlayerJoin);
        socket.on("player:leave", handlePlayerLeave);
        socket.on("game:start", () => navigate('/game?roomCode=' + roomCode));

        return () => {
        console.log("Cleanup socket listeners");
        socket.off("lobby:update", handleLobbyUpdate);
        socket.off("player:join", handlePlayerJoin);
        socket.off("player:leave", handlePlayerLeave);

        };
    }, [socket, roomCode, players]);


    useEffect(() => { // this doesnt really have to be in useeffect and just placed in the component and let it update on render ? unless i have some side effects 
        console.log("Players state updated:", players);
        console.log("Host state updated:", host);

        setIsHost(host === socket.id);
        console.log("Is host:", isHost);

        }, [players, host]);


    const copyRoomCode = async () => {
        try {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        } catch (e) {
        console.error("Copy failed", e);
        }
    };

    const handleStart = () => {
        if (!roomCode) return;
        // navigate('/game?roomCode=' + roomCode);
        socket.emit("host:start", { roomCode: roomCode });
        console.log("Start game")
    };

    const handleLeave = () => {
        navigate('/');
        console.log("Leave game");
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-6">Lobby</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-4 flex flex-col">
            <h2 className="text-xl font-semibold mb-3">Players</h2>
            <div className="flex-1 overflow-auto">
                <ul className="space-y-2">
                {players.map((player, idx) => (
                    <li
                    key={player.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-medium">
                        {String(idx + 1)}
                        </div>
                        <span className="font-medium">{player.id}</span>
                    </div>
                    {/* Host badge */}
                    {player.id === host && (
                        <span className="text-sm px-2 py-1 bg-yellow-100 rounded-full">Host</span>
                    )}
                    </li>
                ))}
                </ul>
            </div>
            <div className="mt-4 text-sm text-gray-500">{players.length} player(s) — waiting for more...</div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-xs uppercase text-gray-400">Room Code</div>
                    <div className="flex items-center gap-3 mt-2">
                    <div className="px-3 py-2 bg-gray-100 rounded-md font-mono text-lg">{roomCode}</div>
                    <button
                        onClick={copyRoomCode}
                        className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
                        aria-label="Copy room code"
                    >
                        {copied ? "Copied" : "Copy"}
                    </button>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Players</div>
                    <div className="text-2xl font-bold">{players.length}</div>
                </div>
                </div>

                <div className="mt-6 p-4 border rounded-lg text-center">
                <h3 className="text-lg font-semibold mb-2">IS IT A SILVER SQUARE?</h3>
                <p className="text-gray-500 mb-3">Pick squares to build the pot. Discuss and vote when prompted.</p>
                <div className="h-12 w-full bg-gray-50 rounded-md flex items-center justify-center text-sm text-gray-400">Waiting for game to start</div>
                </div>
            </div>

            <div className="mt-6 flex gap-3">
                <button
                onClick={handleStart}
                  disabled={!isHost} 
                className={`flex-1 py-3 rounded-lg font-semibold transition-transform active:scale-95 disabled:opacity-50 ${
                    isHost ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-600"
                }`}
                >
                Start Game
                </button>

                <button
                onClick={handleLeave}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300"
                >
                Leave Game
                </button>
            </div>
            </div>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">Tip: open on desktop for the best experience; responsive for mobile.</div>
        </div>
    );
    }