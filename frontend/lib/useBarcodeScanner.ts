'use client'

import { useEffect, useRef } from 'react'

/**
 * Hook global de React para capturar lecturas de escáner láser físico (HID).
 * Filtra los eventos de teclado según la velocidad del búfer (< 30ms entre teclas).
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const buffer = useRef<string[]>([])
  const lastKeyTime = useRef<number>(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      )

      const now = Date.now()
      const diff = now - lastKeyTime.current
      lastKeyTime.current = now

      // Los escáneres láser envían teclas a una velocidad extrema (<30ms por carácter)
      const isFast = diff < 30

      if (e.key === 'Enter') {
        // Al terminar la lectura del código (típicamente culmina en Enter)
        if (buffer.current.length >= 6) {
          // Prevenir que el Enter envíe formularios o active botones que tengan foco accidental
          e.preventDefault()
          e.stopPropagation()
          
          const barcode = buffer.current.join('').trim()
          buffer.current = []
          onScan(barcode)
        } else {
          // Si el búfer es muy corto, fue un Enter humano normal
          buffer.current = []
        }
        return
      }

      // Solo acumulamos caracteres imprimibles de una sola tecla (evita Shift, Ctrl, etc.)
      if (e.key.length === 1) {
        if (isFast || buffer.current.length === 0) {
          buffer.current.push(e.key)
        } else {
          // Si el intervalo de tecleo fue lento y el usuario está en un campo de texto,
          // es escritura humana normal, por lo que vaciamos el búfer del escáner.
          if (isInput) {
            buffer.current = []
          } else {
            // Si teclea despacio fuera de un input, lo tratamos como inicio de una nueva cadena
            buffer.current = [e.key]
          }
        }
      }
    }

    // Usamos el modo de captura (true) para interceptar las teclas antes de que lleguen a otros componentes
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onScan])
}

/**
 * Genera un pitido electrónico corto y profesional ("beep") usando la API nativa de Web Audio.
 * Funciona de manera 100% local, offline y sin descargar archivos pesados de internet.
 */
export function playScanSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'sine'
    // Tono premium agudo (1100 Hz), corto y claro para retroalimentación
    osc.frequency.setValueAtTime(1100, ctx.currentTime)
    
    // Volumen muy bajo para no saturar al personal (5% de ganancia)
    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    // Desvanecimiento exponencial en 120 milisegundos (evita el "click" metálico al apagar)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch (err) {
    console.warn('Web Audio API no soportada o bloqueada por la política del navegador:', err)
  }
}
