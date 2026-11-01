'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = 'Original',
  afterAlt = 'Background Removed',
  className = '',
  style = {},
}) {
  const containerRef = useRef(null)
  const handleRef = useRef(null)
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)
    const handler = (e) => setReduceMotion(e.matches)
    mediaQuery.addEventListener?.('change', handler)
    return () => mediaQuery.removeEventListener?.('change', handler)
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    }
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width <= 0) return
    const newPosition = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    setPosition(newPosition)
  }, [])

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true)
    updatePosition(e.clientX)
    e.preventDefault()
  }, [updatePosition])

  const handleTouchStart = useCallback((e) => {
    setIsDragging(true)
    updatePosition(e.touches[0].clientX)
  }, [updatePosition])

  useEffect(() => {
    const move = (e) => {
      if (!isDragging) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      updatePosition(clientX)
    }
    const up = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('mousemove', move)
      window.addEventListener('touchmove', move, { passive: true })
      window.addEventListener('mouseup', up)
      window.addEventListener('touchend', up)
    }

    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [isDragging, updatePosition])

  const handleKeyDown = useCallback((e) => {
    let newPosition = position
    if (e.key === 'ArrowLeft') newPosition = Math.max(0, position - 5)
    else if (e.key === 'ArrowRight') newPosition = Math.min(100, position + 5)
    else if (e.key === 'Home') newPosition = 0
    else if (e.key === 'End') newPosition = 100
    else return
    e.preventDefault()
    setPosition(newPosition)
  }, [position])

  return (
    <div
      ref={containerRef}
      className={`before-after-slider ${className}`}
      style={{
        ...style,
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        touchAction: 'none',
        cursor: 'ew-resize',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Compare before and after"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
    >
      {/* Before image container */}
      <div
        className="slider-before"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          clipPath: `inset(0 ${100 - position}% 0 0)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <img
          src={beforeSrc}
          alt={beforeAlt}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            userSelect: 'none',
          }}
        />
      </div>

      {/* After image container with genuine checkerboard transparency */}
      <div
        className="slider-after"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          clipPath: `inset(0 0 0 ${position}%)`,
          background: `conic-gradient(#262626 25%, #161616 0 50%, #262626 0 75%, #161616 0)`,
          backgroundSize: '16px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <img
          src={afterSrc}
          alt={afterAlt}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            userSelect: 'none',
          }}
        />
      </div>

      {/* Full-height vertical separator line */}
      <div
        className="slider-divider-line"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${position}%`,
          transform: 'translateX(-50%)',
          width: 2,
          background: '#C6FF00',
          boxShadow: '0 0 10px rgba(198, 255, 0, 0.8), 0 0 2px #fff',
          zIndex: 8,
          pointerEvents: 'none',
        }}
      />

      {/* Visible electric-lime circular drag handle with left/right arrows */}
      <motion.div
        ref={handleRef}
        className="slider-handle"
        style={{
          position: 'absolute',
          top: '50%',
          left: `${position}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
        transition={{ duration: 0.1 }}
      >
        <div
          className="slider-handle-inner"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: '#C6FF00',
            boxShadow: '0 0 24px rgba(198, 255, 0, 0.6), 0 4px 14px rgba(0, 0, 0, 0.5)',
            border: '3px solid #000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 3 12 9 6" />
            <polyline points="15 6 21 12 15 18" />
          </svg>
        </div>
      </motion.div>

      {/* Labels */}
      <div
        className="slider-labels"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <motion.span
          className="slider-label before"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: position > 10 ? 1 : 0, x: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(0,0,0,0.7)',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            color: '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          ORIGINAL
        </motion.span>
        <motion.span
          className="slider-label after"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: position < 90 ? 1 : 0, x: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(198, 255, 0, 0.9)',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            color: '#000',
          }}
        >
          PIXORA
        </motion.span>
      </div>

      <div
        className="slider-hint"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
          fontSize: 10,
          color: '#666',
          letterSpacing: 0.5,
        }}
      >
        Drag to compare
      </div>
    </div>
  )
}