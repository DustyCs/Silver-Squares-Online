import { Outlet } from "react-router-dom";

export default function MainLayout() {
    return (
      <div>
          <Outlet />
          <div className="self-center bottom-0 absolute text-gray-700">
              Copyright &copy; 2025 - DustyHansCS - github.com/DustyCs
          </div>
      </div>
    )
  }
