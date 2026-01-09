/**
 * 应用根布局组件
 */

import { Outlet } from 'react-router-dom'

import { Sidebar } from './Sidebar'

export function RootLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
