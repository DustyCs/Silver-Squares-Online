import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/index';
import { SocketProvider } from './contexts/useSocket';
import { GameContextProvider } from './contexts/useGameContext';

function App() {
  return (
    <SocketProvider>
      <GameContextProvider>
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
      </GameContextProvider>
    </SocketProvider>
  )
}

export default App
