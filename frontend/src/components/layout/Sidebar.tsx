/**
 * 侧边栏组件
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PenTool, Pin, User, Code } from 'lucide-react'

import { cn } from '@/utils/cn'

interface TranslationItem {
  id: string
  content: string
  translated_content: string
  direction: string
  detected_perspective: string
  created_at: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface HistoryData {
  content: TranslationItem[]
  total: number
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [history, setHistory] = useState<TranslationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/translate/history?page=1&size=50')
        if (response.ok) {
          const result: ApiResponse<HistoryData> = await response.json()
          if (result.code === 200) {
            setHistory(result.data.content)
          }
        }
      } catch (err) {
        console.error('Failed to fetch history:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const handleNewChat = () => {
    navigate('/chat', { replace: true })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const getTitleFromContent = (item: TranslationItem) => {
    const content = item.content || item.translated_content || ''
    return truncateText(content, 20)
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-50">
      {/* Top Section: User Avatar and New Chat */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <User className="h-4 w-4 text-indigo-600" />
          </div>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            <span>新对话</span>
          </div>
          <span className="text-xs text-indigo-500">⌘K</span>
        </button>
      </div>

      {/* Bottom Section: Chat History */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className=" bg-white px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">历史对话</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-slate-400">加载中...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-slate-400">暂无历史对话</div>
            </div>
          ) : (
            <div className="p-2">
              {history.map((item) => {
                const isChatActive = location.pathname === `/chat/${item.id}`
                return (
                  <Link
                    key={item.id}
                    to={`/chat/${item.id}`}
                    className={cn(
                      'group relative mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-100',
                      isChatActive && 'bg-gray-200 text-gray-700'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.detected_perspective === 'pm' ? (
                        <User className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Code className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'truncate text-xs font-medium',
                            isChatActive ? 'text-gray-700' : 'text-slate-700'
                          )}
                        >
                          {getTitleFromContent(item)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="ml-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Pin className="h-3 w-3 text-slate-400" />
                        </button>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">{formatDate(item.created_at)}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
