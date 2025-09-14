import { useNavigate } from "react-router-dom"
import { useState } from "react"

export default function Homepage() {
    const navigate = useNavigate()
    const [roomCode, setRoomCode] = useState('')
    
    const handleJoin = () => {
        if (roomCode.trim()) {
            navigate(`/lobby?roomCode=${roomCode}`)
        }
    }

    return (
      <div className="flex h-[90vh] flex-col items-center justify-center bg-gray-200 gap-4">
          {/* Little Square */}
          <div className="relative">
            <div className="absolute w-10 h-10 sm:w-20 sm:h-20 -right-12 sm:-right-25 bg-gray-700 animate-spin transition animation-duration-5s"></div>
            <h1 className="text-5xl font-bold"><span className="text-gray-500">SILVER</span> <span className="text-gray-700">SQUARES</span></h1>
          </div>
          <button className="text-gray-500 border-2 p-2 border-gray-700 cursor-pointer active:scale-110 transition" onClick={() => { navigate('/lobby') }}>PLAY</button>
          <div>
            <h2>Join a game</h2>
            <input onChange={(e) => setRoomCode(e.target.value)} type="text" placeholder="Room code" name="roomCode" className="border-2 p-2 border-gray-700" />
            <button onClick={handleJoin} className="text-gray-500 border-2 p-2 border-gray-700 cursor-pointer active:scale-110 transition">JOIN</button>
          </div>
      </div>
    )
}
