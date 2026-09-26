/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Terminal, Copy, Check, Code2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function SectionAPI() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'openai' | 'anthropic' | 'gemini'>('openai')
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://api.example.com'

  const snippets = {
    openai: `curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Hello!"
      }
    ]
  }'`,
    anthropic: `curl ${baseUrl}/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-3-5-sonnet-20240620",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Hello, Claude!"
      }
    ]
  }'`,
    gemini: `curl "${baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=$YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Hello, Gemini!"
          }
        ]
      }
    ]
  }'`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab])
    setCopied(true)
    toast.success(t('Snippet copied to clipboard'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id='api' className='relative z-10 border-t border-border/40 px-6 py-20 md:py-28 bg-muted/5'>
      <div className='mx-auto max-w-6xl'>
        {/* Curatorial Header */}
        <AnimateInView className='mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6'>
          <div>
            <div className='mb-3 inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-widest text-emerald-500 uppercase'>
              <span>05 /</span>
              <span>{t('API Integration')}</span>
            </div>
            <h2 className='text-3xl font-black tracking-tight sm:text-4xl md:text-5xl'>
              {t('Standardized Protocol Gateway')}
            </h2>
            <p className='text-muted-foreground/80 mt-3 max-w-xl text-sm leading-relaxed md:text-base'>
              {t('Fully compatible with OpenAI, Anthropic, and Gemini standard interfaces. Switch models without changing your application code.')}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              className='group h-11 bg-foreground text-background hover:bg-foreground/90 rounded-lg px-6 font-semibold shadow-md transition-all duration-200'
              render={<Link to='/dashboard' />}
            >
              <Code2 className='size-4 mr-2' />
              <span>{t('Get API Key')}</span>
              <ArrowUpRight className='ml-1.5 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
            </Button>
          </div>
        </AnimateInView>

        {/* API Snippet Playground */}
        <div className='mx-auto max-w-4xl'>
          <div className='relative overflow-hidden rounded-2xl border border-border/60 bg-neutral-950 shadow-2xl'>
            
            {/* Terminal Header & Tabs */}
            <div className='flex items-center justify-between border-b border-white/10 bg-neutral-900/80 px-2 pr-4 backdrop-blur-sm'>
              <div className='flex items-center'>
                <button
                  onClick={() => setActiveTab('openai')}
                  className={`px-4 py-3 text-xs font-mono font-medium transition-colors ${
                    activeTab === 'openai' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  OpenAI Format
                </button>
                <button
                  onClick={() => setActiveTab('anthropic')}
                  className={`px-4 py-3 text-xs font-mono font-medium transition-colors ${
                    activeTab === 'anthropic' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Anthropic Format
                </button>
                <button
                  onClick={() => setActiveTab('gemini')}
                  className={`px-4 py-3 text-xs font-mono font-medium transition-colors ${
                    activeTab === 'gemini' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Gemini Format
                </button>
              </div>

              <button
                onClick={handleCopy}
                className='flex items-center gap-1.5 text-white/50 hover:text-white transition-colors cursor-pointer'
                title={t('Copy Snippet')}
              >
                {copied ? (
                  <>
                    <Check className='size-3.5 text-emerald-500' />
                    <span className='text-[11px] font-mono text-emerald-500'>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className='size-3.5' />
                    <span className='text-[11px] font-mono'>COPY</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Code Area */}
            <div className='p-6 relative'>
              <div className='absolute right-6 top-6 flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 backdrop-blur-md'>
                <Terminal className='size-3 text-white/40' />
                <span className='font-mono text-[10px] text-white/40 uppercase tracking-widest'>cURL</span>
              </div>
              <pre className='overflow-x-auto text-[13px] leading-loose text-white/80 font-mono'>
                <code>
                  {snippets[activeTab].split('\n').map((line, i) => {
                    const isCommand = line.startsWith('curl')
                    const isFlag = line.trim().startsWith('-')
                    return (
                      <div key={i} className='table-row'>
                        <span className='table-cell select-none pr-4 text-right text-white/20'>{i + 1}</span>
                        <span className={`table-cell ${isCommand ? 'text-emerald-400' : isFlag ? 'text-blue-300' : 'text-white/80'}`}>
                          {line}
                        </span>
                      </div>
                    )
                  })}
                </code>
              </pre>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
