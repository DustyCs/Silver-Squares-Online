import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Homepage from '../features/homepage/page/Homepage'
import Lobby from '../features/lobby/Lobby'

export function AppRoutes() {
  return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={<Homepage />} />
                <Route path="/lobby" element={<Lobby />} />
            </Route>
            <Route path="*" element={<h1>404</h1>} />
        </Routes>
  )
}

export default AppRoutes