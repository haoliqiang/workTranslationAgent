/**
 * Markdown preview/editor component
 * Supports switching between preview mode (Markdown rendering) and edit mode (raw text)
 */

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Loader2, Copy, Check } from 'lucide-react'
import type { Components } from 'react-markdown'

import { cn } from '@/utils/cn'

type ResultProps = {
  value: string
  isStreaming?: boolean
  className?: string
}

type CodeBlockProps = {
  className?: string
  children?: React.ReactNode
}

function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const codeString = String(children).replace(/\n$/, '')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!match) {
    return (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
        {children}
      </code>
    )
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'absolute right-2 top-2 rounded p-1.5 text-slate-400 opacity-0 transition-opacity',
          'hover:bg-slate-200 hover:text-slate-600',
          'group-hover:opacity-100'
        )}
        title="复制代码"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
      <SyntaxHighlighter
        style={oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  )
}

export function Result({
  value,
  isStreaming = false,
  className,
}: ResultProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // 流式输出时自动滚动到底部
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [value, isStreaming])

  // Output 组件样式配置
  const outputComponents: Components = {
    // 标题
    h1: ({ className: hClassName, ...props }) => (
      <h1
        className={cn(
          'mt-6 mb-2 text-2xl font-semibold leading-tight text-gray-900 pb-[0.3em] border-b border-gray-200',
          'first:mt-0',
          hClassName
        )}
        {...props}
      />
    ),
    h2: ({ className: hClassName, ...props }) => (
      <h2
        className={cn(
          'mt-6 mb-2 text-xl font-semibold leading-tight text-gray-900 pb-[0.3em] border-b border-gray-200',
          'first:mt-0',
          hClassName
        )}
        {...props}
      />
    ),
    h3: ({ className: hClassName, ...props }) => (
      <h3
        className={cn(
          'mt-6 mb-2 text-lg font-semibold leading-tight text-gray-900',
          'first:mt-0',
          hClassName
        )}
        {...props}
      />
    ),
    h4: ({ className: hClassName, ...props }) => (
      <h4
        className={cn(
          'mt-6 mb-2 text-base font-semibold leading-tight text-gray-900',
          'first:mt-0',
          hClassName
        )}
        {...props}
      />
    ),
    h5: ({ className: hClassName, ...props }) => (
      <h5
        className={cn(
          'mt-6 mb-2 text-sm font-semibold leading-tight text-gray-900',
          'first:mt-0',
          hClassName
        )}
        {...props}
      />
    ),
    h6: ({ className: hClassName, ...props }) => (
      <h6
        className={cn(
          'mt-6 mb-2 text-[0.85em] font-semibold leading-tight text-gray-500',
          'first:mt-0',
          hClassName
        )}
        {...props}
      />
    ),
    // 段落
    p: ({ className: pClassName, ...props }) => (
      <p className={cn('mt-0 mb-4 first:mt-0', pClassName)} {...props} />
    ),
    // 链接
    a: ({ className: aClassName, ...props }) => (
      <a
        className={cn(
          'text-indigo-600 no-underline hover:underline',
          aClassName
        )}
        {...props}
      />
    ),
    // 加粗和斜体
    strong: ({ className: sClassName, ...props }) => (
      <strong className={cn('font-semibold', sClassName)} {...props} />
    ),
    em: ({ className: eClassName, ...props }) => (
      <em className={cn('italic', eClassName)} {...props} />
    ),
    // 列表
    ul: ({ className: ulClassName, ...props }) => (
      <ul
        className={cn(
          'mt-0 mb-4 pl-8 list-disc [&>li+li]:mt-1',
          '[&_ul]:mt-0 [&_ul]:mb-0 [&_ol]:mt-0 [&_ol]:mb-0',
          ulClassName
        )}
        {...props}
      />
    ),
    ol: ({ className: olClassName, ...props }) => (
      <ol
        className={cn(
          'mt-0 mb-4 pl-8 list-decimal [&>li+li]:mt-1',
          '[&_ul]:mt-0 [&_ul]:mb-0 [&_ol]:mt-0 [&_ol]:mb-0',
          olClassName
        )}
        {...props}
      />
    ),
    li: ({ className: liClassName, ...props }) => (
      <li className={cn('mb-1 [&>p]:mt-4', liClassName)} {...props} />
    ),
    // 任务列表（通过 remark-gfm 支持）
    input: ({ type, className: inputClassName, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            className={cn('mr-2', inputClassName)}
            {...props}
          />
        )
      }
      return <input type={type} className={inputClassName} {...props} />
    },
    // 引用块
    blockquote: ({ className: blockquoteClassName, ...props }) => (
      <blockquote
        className={cn(
          'm-0 mb-4 py-2 px-4 text-gray-500 border-l-4 border-gray-200 bg-gray-50 rounded-r-md',
          '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
          blockquoteClassName
        )}
        {...props}
      />
    ),
    // 代码块
    pre: ({ className: preClassName, ...props }) => (
      <pre
        className={cn(
          'mt-0 mb-4 overflow-auto rounded-lg',
          preClassName
        )}
        {...props}
      />
    ),
    code: ({ className, children, ...props }) => {
      const isInline = !className
      if (isInline) {
        return (
          <code
            className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800"
            {...props}
          >
            {children}
          </code>
        )
      }
      return <CodeBlock className={className}>{children}</CodeBlock>
    },
    // 水平线
    hr: ({ className: hrClassName, ...props }) => (
      <hr
        className={cn(
          'h-px my-6 p-0 bg-gray-200 border-0',
          hrClassName
        )}
        {...props}
      />
    ),
    // 表格
    table: ({ className: tableClassName, ...props }) => (
      <table
        className={cn(
          'w-full mb-4 border-collapse border-spacing-0 overflow-auto',
          tableClassName
        )}
        {...props}
      />
    ),
    thead: ({ className: theadClassName, ...props }) => (
      <thead className={theadClassName} {...props} />
    ),
    tbody: ({ className: tbodyClassName, ...props }) => (
      <tbody className={tbodyClassName} {...props} />
    ),
    tr: ({ className: trClassName, ...props }) => (
      <tr
        className={cn('even:bg-gray-50', trClassName)}
        {...props}
      />
    ),
    th: ({ className: thClassName, ...props }) => (
      <th
        className={cn(
          'py-2 px-4 border border-gray-200 font-semibold bg-gray-50',
          thClassName
        )}
        {...props}
      />
    ),
    td: ({ className: tdClassName, ...props }) => (
      <td
        className={cn('py-2 px-4 border border-gray-200', tdClassName)}
        {...props}
      />
    ),
    // 图片
    img: ({ className: imgClassName, ...props }) => (
      <img
        className={cn('max-w-full h-auto rounded-lg', imgClassName)}
        {...props}
      />
    ),
    // 删除线
    del: ({ className: delClassName, ...props }) => (
      <del
        className={cn('line-through text-gray-500', delClassName)}
        {...props}
      />
    ),
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 顶部工具栏  */}
      <div className="flex items-center justify-between">

        {/* 右侧工具图标 */}
        <div className="flex items-center gap-1 pr-2">
          {isStreaming ? (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">生成中...</span>
            </div>
          ) : null
          }
        </div>
      </div>

      {/* 内容区域 */}
        <div
          ref={contentRef}
          className={cn(
            'mt-4 min-h-0 flex-1 overflow-y-auto thin-scrollbar',
            'text-[0.9375rem] leading-7 text-gray-800 break-words',
            '[&>:first-child]:mt-0'
          )}
        >
          {value ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={outputComponents}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-slate-400 italic">暂无内容</p>
          )}
        </div>
    </div>
  )
}
