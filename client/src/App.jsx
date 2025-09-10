import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/index';
import { SocketProvider } from './contexts/useSocket';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
          <AppRoutes />
      </BrowserRouter>
    </SocketProvider>
  )
}

export default App
