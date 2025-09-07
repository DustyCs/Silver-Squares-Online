export default function Lobby() {
    const players = [
        { id: 1, name: 'Player 1' },
        { id: 2, name: 'Player 2' },
        { id: 3, name: 'Player 3' },
        { id: 4, name: 'Player 4' },
    ]

  return (
    <div>
        <h1>Lobby</h1>
        <div>
            <div>
                {
                    players.map(player => (
                        <div key={player.id}>
                            <span>{player.name}</span>
                        </div>
                    ))
                }
            </div>
            <div>
                <div>
                    <span>Room Code: ABCD</span>
                    <h3>Is it a SILVER SQUARE?</h3>
                    <div ></div>
                </div>
                <button>Start Game</button>
                <button>Leave Game</button>
            </div>
        </div>
    </div>
  )
}
