import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { RootLayout } from '@/components/layout/RootLayout'
import { ChatPage } from '@/pages/ChatPage'

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <ChatPage />,
      },
      {
        path: '/chat',
        element: <ChatPage />,
      },
      {
        path: '/chat/:id',
        element: <ChatPage />,
      },
    ],
  },
])

export function Router() {
  return <RouterProvider router={router} />
}
