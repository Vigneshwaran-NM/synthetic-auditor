import React, { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const positionRef = useRef({ x: 0, y: 0 });
  const trailPointsRef = useRef<Array<{ x: number; y: number; opacity: number }>>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };
      setIsVisible(true);

      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }

      // Add trail point
      trailPointsRef.current.push({
        x: e.clientX,
        y: e.clientY,
        opacity: 1
      });

      // Limit trail length
      if (trailPointsRef.current.length > 20) {
        trailPointsRef.current.shift();
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Trail animation
    const canvas = trailRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animateTrail = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      trailPointsRef.current.forEach((point, index) => {
        point.opacity *= 0.95;

        if (point.opacity > 0.01) {
          const size = (index / trailPointsRef.current.length) * 3;
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 212, 255, ${point.opacity * 0.5})`;
          ctx.fill();
        }
      });

      // Remove faded points
      trailPointsRef.current = trailPointsRef.current.filter(p => p.opacity > 0.01);

      requestAnimationFrame(animateTrail);
    };

    animateTrail();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas
        ref={trailRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998 }}
      />
      <div
        ref={cursorRef}
        className="fixed pointer-events-none transition-opacity duration-300"
        style={{
          width: '12px',
          height: '12px',
          border: '2px solid rgba(0, 212, 255, 0.8)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: isVisible ? 1 : 0,
          zIndex: 9999,
          boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          mixBlendMode: 'screen'
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%)',
            transform: 'scale(2)'
          }}
        />
      </div>
    </>
  );
}
