import { useEffect, useState, useRef, startTransition } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Send } from 'lucide-react'

import { Result } from '@/components/Result'
import { useTranslate, type TranslateState } from '@/hooks/useTranslate'
import type { TranslateRequest } from '@/api/types'
import { cn } from '@/utils/cn'


type EmptyStateProps = {
  input: string
  isLoading: boolean
  selectedDirection: 'pm_to_dev' | 'dev_to_pm'
  selectedModel: 'auto' | 'qwen-max' | 'openai'
  onInputChange: (value: string) => void
  onDirectionChange: (direction: 'pm_to_dev' | 'dev_to_pm') => void
  onModelChange: (model: 'auto' | 'qwen-max' | 'openai') => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

type ChatResultsProps = {
  isLoading: boolean
  content: TranslateState['content']
  error: TranslateState['error']
  direction: TranslateState['direction']
  perspective: TranslateState['perspective']
  gaps: TranslateState['gaps']
  selectedModel: 'auto' | 'qwen-max' | 'openai'
  onContentChange: (value: string) => void
  input: string
  onInputChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

type InputDockProps = {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

function EmptyState({
  input,
  isLoading,
  selectedDirection,
  selectedModel,
  onInputChange,
  onDirectionChange,
  onModelChange,
  onSubmit,
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="mb-10 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-medium tracking-tight text-slate-800">
          职场沟通翻译助手
        </h1>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100"
      >
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300',
            'border-slate-200/80 shadow-lg shadow-slate-200/50',
            'focus-within:border-indigo-300 focus-within:shadow-xl focus-within:shadow-indigo-500/10'
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-400/50 to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />

          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="输入你想翻译的内容..."
            rows={4}
            className="w-full resize-none bg-transparent px-5 py-4 text-base leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
          />

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedDirection}
                onChange={(e) => onDirectionChange(e.target.value as 'pm_to_dev' | 'dev_to_pm')}
                className={cn(
                  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  'hover:border-slate-300 transition-colors'
                )}
              >
                <option value="pm_to_dev">产品 → 开发</option>
                <option value="dev_to_pm">开发 → 产品</option>
              </select>

              <select
                value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value as 'auto' | 'qwen-max' | 'openai')}
                className={cn(
                  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  'hover:border-slate-300 transition-colors'
                )}
              >
                <option value="auto">Auto</option>
                <option value="qwen-max">Qwen-max</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-200',
                'bg-indigo-600 text-white shadow-md shadow-indigo-500/25',
                'hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30',
                'disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  发送
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ChatResults({
  isLoading,
  content,
  error,
  direction,
  perspective,
  gaps,
  selectedModel,
  input,
  onInputChange,
  onSubmit,
}: ChatResultsProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLoading && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, isLoading])

  const hasAnalysisData = perspective || gaps.length > 0

  return (
    <div ref={contentRef} className="flex min-h-0 flex-1 gap-8 pb-4">

       {/* 右侧边栏 - GitHub 风格 1/4 宽度 */}
       <div className="hidden w-80 shrink-0 lg:block">
        <div className="sticky top-0 space-y-4">
          {/* Input Dock */}
          <InputDock
            input={input}
            isLoading={isLoading}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
          />

          {/* 缺失信息 */}
          {!isLoading && hasAnalysisData && gaps.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-slate-900">可能缺失的信息</h3>
              <ul className="space-y-3">
                {gaps.map((gap, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-medium text-amber-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700">{gap.category}</p>
                      <p className="text-xs text-slate-500">{gap.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {/* 主内容区 - GitHub 风格 3/4 宽度 */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* 翻译结果 */}
        <div className="flex min-h-0 flex-1 flex-col rounded-md border border-slate-200">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200  px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">翻译结果</h2>
              <span className="text-xs text-slate-500">
              模式：{direction === 'pm_to_dev' ? '产品 → 开发' : '开发 → 产品'}  | 模型：{selectedModel} 
              </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-4">
            {content ? (
              <Result
                value={content}
                isStreaming={isLoading}
                className="min-h-0 flex-1"
              />
            ) : isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在翻译...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : null}
          </div>
        </div>
      </div>

     
    </div>
  )
}

function InputDock({
  input,
  isLoading,
  onInputChange,
  onSubmit,
}: InputDockProps) {
  return (
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="继续提问..."
            rows={4}
            className="w-full resize-none text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm',
              'disabled:cursor-not-allowed disabled:bg-slate-300'
            )}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
  )
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const prevIdRef = useRef<string | undefined>(id)
  const prevTranslationIdRef = useRef<string | null>(null)
  const prevIsLoadingRef = useRef<boolean>(false)
  const [input, setInput] = useState('')
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [selectedDirection, setSelectedDirection] = useState<'pm_to_dev' | 'dev_to_pm'>('pm_to_dev')
  const [selectedModel, setSelectedModel] = useState<'auto' | 'qwen-max' | 'openai'>('auto')
  const {
    isLoading,
    translationId,
    perspective,
    gaps,
    content,
    direction,
    error,
    translate,
    loadTranslation,
    reset,
  } = useTranslate()

  // 加载已有翻译记录
  useEffect(() => {
    if (id) {
      loadTranslation(id)
      prevIdRef.current = id
    }
  }, [id, loadTranslation])

  // 当 id 变化时，重置状态（仅在 id 变化时触发，不依赖 input/editedContent）
  useEffect(() => {
    const currentId = id
    const prevId = prevIdRef.current

    if (currentId !== prevId) {
      if (!currentId && prevId !== undefined) {
        // 从有 id 变为无 id（用户点击新对话），重置所有状态
        startTransition(() => {
          reset()
          setInput('')
          setEditedContent(null)
        })
        prevTranslationIdRef.current = null
        prevIsLoadingRef.current = false
      }
      prevIdRef.current = currentId
    }
  }, [id, reset])

  // 初始加载时清理残留状态（仅在组件首次挂载时执行一次）
  useEffect(() => {
    if (!id && (content || translationId)) {
      // 初始加载时如果是 /chat（无 id）但有残留状态，重置
      startTransition(() => {
        reset()
        setInput('')
        setEditedContent(null)
      })
      prevTranslationIdRef.current = null
      prevIsLoadingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 翻译完成后更新 URL（仅在刚刚完成翻译时，避免从历史对话页面返回时误触发）
  useEffect(() => {
    // 检查是否刚刚完成翻译：isLoading 从 true 变为 false，且 translationId 存在，且没有 id
    const justFinishedTranslation =
      prevIsLoadingRef.current && !isLoading && translationId && !id && prevTranslationIdRef.current === null

    if (justFinishedTranslation) {
      navigate(`/chat/${translationId}`, { replace: true })
    }

    // 更新 refs
    prevIsLoadingRef.current = isLoading
    if (translationId) {
      prevTranslationIdRef.current = translationId
    } else if (!id) {
      // 如果 id 也不存在，说明是新建对话，重置 ref
      prevTranslationIdRef.current = null
    }
  }, [isLoading, translationId, id, navigate])

  const displayContent = editedContent ?? content

  const hasResult = Boolean(displayContent || error)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return

    setEditedContent(null)

    const request: TranslateRequest = {
      content: input.trim(),
      model: selectedModel,
      direction: selectedDirection,
    }
    await translate(request)
  }

  const handleContentChange = (value: string) => {
    setEditedContent(value)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-130px)] w-full max-w-7xl flex-col px-6 py-6 sm:px-8 sm:py-8">
      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {!hasResult && !isLoading ? (
          <EmptyState
            input={input}
            isLoading={isLoading}
            selectedDirection={selectedDirection}
            selectedModel={selectedModel}
            onInputChange={setInput}
            onDirectionChange={setSelectedDirection}
            onModelChange={setSelectedModel}
            onSubmit={handleSubmit}
          />
        ) : (
          <ChatResults
            selectedModel={selectedModel}
            isLoading={isLoading}
            content={displayContent}
            error={error}
            direction={direction}
            perspective={perspective}
            gaps={gaps}
            onContentChange={handleContentChange}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
