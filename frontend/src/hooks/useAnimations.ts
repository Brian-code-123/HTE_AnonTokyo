/**
 * Animation hooks for MentorMirror interactivity
 *
 * - useScrollReveal  — IntersectionObserver-based scroll reveal
 * - useAnimatedCounter — Count-up from 0 to target with easing
 * - useRipple         — Material-style ripple on click
 * - useTypewriter     — Typing text effect
 */
import { useEffect, useRef, useState, type RefObject } from 'react'

/* ──────────────────────────────────────────────
   Scroll Reveal — adds .visible when element enters viewport
   Usage: const ref = useScrollReveal<HTMLDivElement>()
          <div ref={ref} className="reveal"> ... </div>
────────────────────────────────────────────── */
export function useScrollReveal<T extends HTMLElement>(
  threshold = 0.12,
  rootMargin = '0px 0px -60px 0px',
): RefObject<T> {
  const ref = useRef<T>(null) as RefObject<T>

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.unobserve(el) // one-shot
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return ref
}

/* ──────────────────────────────────────────────
   Batch Scroll Reveal — observe all children with .reveal
   Usage: const ref = useScrollRevealGroup<HTMLDivElement>()
          <div ref={ref} className="stagger-parent">
            <div className="reveal">...</div>
          </div>
────────────────────────────────────────────── */
export function useScrollRevealGroup<T extends HTMLElement>(
  threshold = 0.08,
): RefObject<T> {
  const ref = useRef<T>(null) as RefObject<T>

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const children = container.querySelectorAll('.reveal')
    if (children.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    )

    children.forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [threshold])

  return ref
}

/* ──────────────────────────────────────────────
   Animated Counter — count from 0 to `end` over `duration` ms
   Usage: const count = useAnimatedCounter(87, 1500, isVisible)
────────────────────────────────────────────── */
export function useAnimatedCounter(
  end: number,
  duration = 1200,
  trigger = true,
): number {
  const [value, setValue] = useState(0)
  const hasRun = useRef(false)

  useEffect(() => {
    if (!trigger || hasRun.current) return
    hasRun.current = true

    const startTime = performance.now()
    const isFloat = !Number.isInteger(end)
    const decimals = isFloat ? 1 : 0

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * end

      setValue(Number(current.toFixed(decimals)))

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        setValue(end)
      }
    }

    requestAnimationFrame(tick)
  }, [end, duration, trigger])

  return value
}

/* ──────────────────────────────────────────────
   Ripple — add click ripple to a ref'd element
   Usage: const rippleRef = useRipple<HTMLButtonElement>()
          <button ref={rippleRef}>Click me</button>
────────────────────────────────────────────── */
export function useRipple<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null) as RefObject<T>

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const ripple = document.createElement('span')
      ripple.className = 'ripple-effect'
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`

      el.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove())
    }

    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [])

  return ref
}

/* ──────────────────────────────────────────────
   Typewriter — progressively reveal text
   Usage: const text = useTypewriter("Hello world", 40, true)
────────────────────────────────────────────── */
export function useTypewriter(
  fullText: string,
  speed = 30,
  trigger = true,
): { text: string; isDone: boolean } {
  const [displayed, setDisplayed] = useState('')
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    if (!trigger) return
    setDisplayed('')
    setIsDone(false)

    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(fullText.slice(0, i))
      if (i >= fullText.length) {
        clearInterval(timer)
        setIsDone(true)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [fullText, speed, trigger])

  return { text: displayed, isDone }
}
