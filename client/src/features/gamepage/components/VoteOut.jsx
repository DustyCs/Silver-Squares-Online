export default function VoteOut({players = []}) {
  return (
    <div className="absolute border bg-gray-500 top-0 left-0">
        {
            players.map(p => <div key={p.id}>{p.name}</div>)
        }
    </div>
  )
}
