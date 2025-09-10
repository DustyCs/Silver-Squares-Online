import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/index';
import { SocketProvider } from './contexts/useSocket';

function App() {
  return (
    <BrowserRouter>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
    </BrowserRouter>
  )
}

export default App
