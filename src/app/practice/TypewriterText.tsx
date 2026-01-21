'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface TypewriterTextProps {
  text: string
  className?: string
  delay?: number
  speed?: number
}

export function TypewriterText({ text, className = '', delay = 0, speed = 100 }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0
      const timer = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1))
          index++
        } else {
          clearInterval(timer)
        }
      }, speed)

      return () => clearInterval(timer)
    }, delay)

    return () => clearTimeout(timeout)
  }, [text, delay, speed])

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      {displayedText}
      <span
        className="inline-block ml-1 align-middle bg-white shadow-lg shadow-white/50"
        style={{
          width: '3px',
          height: '1.2em',
          animation: 'cursor-blink 0.8s steps(2) infinite'
        }}
      />
      <style>{`
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.15; }
        }
      `}</style>
    </motion.span>
  )
}
