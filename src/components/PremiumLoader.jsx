'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

const LOADING_STEPS = [
  'Preparing image',
  'Detecting subject',
  'Removing background',
  'Finalizing PNG',
]

export function PremiumLoader({ className = '' }) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      className={`premium-loader ${className}`}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="loader-ring-container">
        <motion.svg className="loader-ring" viewBox="0 0 80 80">
          <motion.circle
            className="loader-ring-bg"
            cx="40"
            cy="40"
            r="32"
            fill="none"
            strokeWidth="3"
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.circle
            className="loader-ring-progress"
            cx="40"
            cy="40"
            r="32"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="201"
            strokeDashoffset="0"
            initial={{ rotate: -90, strokeDashoffset: 201 }}
            animate={{
              rotate: [0, 360],
              strokeDashoffset: [0, 201, 0],
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              strokeDashoffset: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </motion.svg>
        <motion.div
          className="loader-glow"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="loader-text-wrapper" style={{ height: 26, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={LOADING_STEPS[stepIndex]}
            className="loader-text"
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.3 }}
          >
            {LOADING_STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
      <motion.div
        className="loader-bar"
        initial={{ scaleX: 0.2 }}
        animate={{ scaleX: [0.2, 1, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

export function PremiumLoaderVariants() {
  return {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  }
}