"use client";

import { useEffect, useRef } from "react";
import "./ParticleField.css";

interface Dot {
  baseX: number;
  baseY: number;
  phaseX: number;
  phaseY: number;
  alpha: number;
  size: number;
}

interface ParticleFieldProps {
  spacing?: number;
  idleAlpha?: number;
  hoverAlpha?: number;
  influenceRadius?: number;
  baseSize?: number;
  hoverSize?: number;
  hoverDisplacement?: number;
  color?: string;
  className?: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);

export default function ParticleField({
  spacing = 34,
  idleAlpha = 0.04,
  hoverAlpha = 0.65,
  influenceRadius = 190,
  baseSize = 1.1,
  hoverSize = 1.9,
  hoverDisplacement = 24,
  color = "255, 255, 255",
  className,
}: ParticleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = reduceMotionQuery.matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const dotsRef: { current: Dot[] } = { current: [] };
    const sizeRef = { w: 0, h: 0 };
    const pointer = { x: -9999, y: -9999, active: false };

    let resizeTimer: ReturnType<typeof setTimeout>;
    let rafId: number | null = null;
    let frame = 0;

    const buildDots = (w: number, h: number) => {
      const cols = Math.max(1, Math.floor(w / spacing));
      const rows = Math.max(1, Math.floor(h / spacing));
      const padX = (w - cols * spacing) / 2;
      const padY = (h - rows * spacing) / 2;
      const dots: Dot[] = [];

      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const jitterX = (Math.random() - 0.5) * spacing * 0.4;
          const jitterY = (Math.random() - 0.5) * spacing * 0.4;
          dots.push({
            baseX: padX + col * spacing + jitterX,
            baseY: padY + row * spacing + jitterY,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            alpha: idleAlpha,
            size: baseSize,
          });
        }
      }
      dotsRef.current = dots;
    };

    const doResize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.w = w;
      sizeRef.h = h;
      buildDots(w, h);
    };

    const scheduleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 120);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const handleReducedMotionChange = () => {
      prefersReducedMotion = reduceMotionQuery.matches;
    };

    const drawStatic = () => {
      const dots = dotsRef.current;
      ctx.clearRect(0, 0, sizeRef.w, sizeRef.h);
      for (const dot of dots) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color}, ${idleAlpha})`;
        ctx.arc(dot.baseX, dot.baseY, baseSize, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      frame++;
      const dots = dotsRef.current;
      const t = frame * 0.012;
      const radiusSq = influenceRadius * influenceRadius;

      ctx.clearRect(0, 0, sizeRef.w, sizeRef.h);

      for (const dot of dots) {
        let x = dot.baseX;
        let y = dot.baseY;

        if (!prefersReducedMotion) {
          x += Math.sin(t + dot.phaseX) * 2.2;
          y += Math.cos(t + dot.phaseY) * 2.2;
        }

        let targetAlpha = idleAlpha;
        let targetSize = baseSize;
        let displacement = 0;

        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 0.0001 && distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const falloff = smoothstep(clamp01(1 - dist / influenceRadius));
            targetAlpha = idleAlpha + (hoverAlpha - idleAlpha) * falloff;
            targetSize = baseSize + (hoverSize - baseSize) * falloff;
            displacement = hoverDisplacement * falloff;
            const inv = 1 / dist;
            x += dx * inv * displacement;
            y += dy * inv * displacement;
          }
        }

        dot.alpha += (targetAlpha - dot.alpha) * 0.12;
        dot.size += (targetSize - dot.size) * 0.12;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color}, ${dot.alpha})`;
        ctx.arc(x, y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    };

    doResize();

    if (prefersReducedMotion) {
      drawStatic();
    } else {
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", scheduleResize);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);
    if (typeof reduceMotionQuery.addEventListener === "function") {
      reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleResize);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      if (typeof reduceMotionQuery.removeEventListener === "function") {
        reduceMotionQuery.removeEventListener("change", handleReducedMotionChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacing, idleAlpha, hoverAlpha, influenceRadius, baseSize, hoverSize, hoverDisplacement, color]);

  return (
    <div ref={containerRef} className={`particle-field-container ${className ?? ""}`}>
      <canvas ref={canvasRef} className="particle-field-canvas" />
    </div>
  );
}
