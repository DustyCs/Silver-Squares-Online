import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Homepage from '../features/homepage/page/Homepage'

export function AppRoutes() {
  return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={<Homepage />} />
            </Route>
            <Route path="*" element={<h1>404</h1>} />
        </Routes>
  )
}

export default AppRoutes