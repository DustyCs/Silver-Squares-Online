import { useNavigate } from "react-router-dom"

export default function Homepage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-[90vh] flex-col items-center justify-center bg-gray-200 gap-4">
        <h1 className="text-5xl font-bold">SILVER SQUARES</h1>
        <button className="text-gray-500 border-2 p-2 border-gray-700 cursor-pointer active:scale-110 transition" onClick={() => { navigate('/lobby') }}>PLAY</button>
    </div>
  )
}
