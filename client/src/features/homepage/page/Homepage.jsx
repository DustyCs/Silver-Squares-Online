import { useNavigate } from "react-router-dom"
import { useState } from "react"

export default function Homepage() {
    const navigate = useNavigate()
    const [roomCode, setRoomCode] = useState('')
    
    const handleJoin = (roomCode) => {
        if (roomCode.trim()) {
            navigate(`/game?roomCode=${roomCode}`)
        }
    }

    return (
      <div className="flex h-[90vh] flex-col items-center justify-center bg-gray-200 gap-4">
          <h1 className="text-5xl font-bold">SILVER SQUARES</h1>
          <button className="text-gray-500 border-2 p-2 border-gray-700 cursor-pointer active:scale-110 transition" onClick={() => { navigate('/lobby') }}>PLAY</button>
          <div>
            <h2>Join a game</h2>
            <input onChange={(e) => setRoomCode(e.target.value)} type="text" placeholder="Room code" value="" name="roomCode" className="border-2 p-2 border-gray-700" />
            <button onClick={handleJoin} className="text-gray-500 border-2 p-2 border-gray-700 cursor-pointer active:scale-110 transition">JOIN</button>
          </div>
      </div>
    )
}
