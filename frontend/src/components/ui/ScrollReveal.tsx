import React, { useEffect, useRef, useState } from 'react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number // in ms
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'none'
  threshold?: number
  duration?: number // in ms
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  threshold = 0.05,
  duration = 700,
}) => {
  const [isVisible, setIsVisible] = useState(() => {
    return typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined'
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    const element = ref.current
    if (!element) return

    // If already in viewport on mount, trigger reveal smoothly after initial paint
    const rect = element.getBoundingClientRect()
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0

    if (inViewport) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 60)
      return () => clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -20px 0px',
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0) scale(1)'
    switch (direction) {
      case 'up':
        return 'translate3d(0, 32px, 0)'
      case 'down':
        return 'translate3d(0, -32px, 0)'
      case 'left':
        return 'translate3d(32px, 0, 0)'
      case 'right':
        return 'translate3d(-32px, 0, 0)'
      case 'scale':
        return 'translate3d(0, 16px, 0) scale(0.96)'
      case 'none':
        return 'none'
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: `${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
