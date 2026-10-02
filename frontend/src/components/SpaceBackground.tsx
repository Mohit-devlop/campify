'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Detect dark mode
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    
    // Create an observer to watch for theme changes
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Mouse position tracking
    const mouse = { x: -1000, y: -1000, active: false };

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Initialize Stars
    const starCount = Math.floor((width * height) / 9000) + 60;
    interface Star {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      targetAlpha: number;
      alphaSpeed: number;
      color: string;
      label?: string;
      labelTimer: number;
    }

    const stars: Star[] = [];
    const techLabels = ['NAV-NODE_A', 'SEC_SGNL_7', 'STRL_LNK_0', 'SYS_OK_9', 'CF_STAR_5', 'GRID_LOC_8', 'COMM_NET'];

    for (let i = 0; i < starCount; i++) {
      const radius = Math.random() * 1.8 + 0.4;
      const hasLabel = Math.random() < 0.08 && radius > 1.2;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        radius,
        alpha: Math.random(),
        targetAlpha: Math.random() * 0.8 + 0.2,
        alphaSpeed: Math.random() * 0.015 + 0.005,
        color: Math.random() < 0.2 
          ? (isDarkMode ? '#d8ee3f' : '#1c6b4c') // Cyan/yellow in dark, green in light
          : (Math.random() < 0.1 ? '#267a56' : '#ffffff'), // Orange/green or white
        label: hasLabel ? techLabels[Math.floor(Math.random() * techLabels.length)] : undefined,
        labelTimer: Math.random() * 100
      });
    }

    // Shooting Stars
    interface ShootingStar {
      x: number;
      y: number;
      vx: number;
      vy: number;
      len: number;
      speed: number;
      alpha: number;
    }
    const shootingStars: ShootingStar[] = [];

    const spawnShootingStar = () => {
      shootingStars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.5),
        vx: Math.random() * 4 + 4,
        vy: Math.random() * 2 + 2,
        len: Math.random() * 80 + 40,
        speed: Math.random() * 8 + 6,
        alpha: 1
      });
    };

    // Tech Circles/Radar elements in bg
    interface TechRing {
      x: number;
      y: number;
      radius: number;
      rotation: number;
      speed: number;
      opacity: number;
    }
    const techRings: TechRing[] = [];
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      techRings.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 150 + 80,
        rotation: Math.random() * Math.PI * 2,
        speed: (Math.random() - 0.5) * 0.002,
        opacity: Math.random() * 0.02 + 0.01
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Colors matching theme
      const starColorBase = isDarkMode ? '255, 255, 255' : '13, 23, 19';

      // 1. Draw Nebula Glows (large soft radial gradients)
      ctx.globalCompositeOperation = 'screen';
      
      // Left blob (orange-ish/green)
      const gradLeft = ctx.createRadialGradient(width * 0.2, height * 0.3, 0, width * 0.2, height * 0.3, width * 0.4);
      gradLeft.addColorStop(0, isDarkMode ? 'rgba(38, 122, 86, 0.03)' : 'rgba(28, 107, 76, 0.03)');
      gradLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradLeft;
      ctx.fillRect(0, 0, width, height);

      // Right blob (cyan/yellow)
      const gradRight = ctx.createRadialGradient(width * 0.8, height * 0.7, 0, width * 0.8, height * 0.7, width * 0.4);
      gradRight.addColorStop(0, isDarkMode ? 'rgba(216, 238, 63, 0.02)' : 'rgba(216, 238, 63, 0.02)');
      gradRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradRight;
      ctx.fillRect(0, 0, width, height);
      
      ctx.globalCompositeOperation = 'source-over';

      // 2. Draw Tech Grid lines (very faint)
      ctx.strokeStyle = isDarkMode ? 'rgba(216, 238, 63, 0.015)' : 'rgba(28, 107, 76, 0.025)';
      ctx.lineWidth = 0.5;
      const gridSize = 120;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Draw Tech Rings (slowly rotating circular hud coordinates)
      techRings.forEach(ring => {
        ring.rotation += ring.speed;
        
        ctx.strokeStyle = isDarkMode ? `rgba(216, 238, 63, ${ring.opacity})` : `rgba(28, 107, 76, ${ring.opacity * 1.5})`;
        ctx.lineWidth = 0.5;
        
        // Draw main circle
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw an outer dashed ring
        ctx.save();
        ctx.translate(ring.x, ring.y);
        ctx.rotate(ring.rotation);
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius + 15, 0, Math.PI * 2);
        ctx.setLineDash([4, 15]);
        ctx.stroke();
        
        // Draw crosshairs
        ctx.beginPath();
        ctx.moveTo(-ring.radius - 5, 0);
        ctx.lineTo(-ring.radius + 5, 0);
        ctx.moveTo(ring.radius - 5, 0);
        ctx.lineTo(ring.radius + 5, 0);
        ctx.moveTo(0, -ring.radius - 5);
        ctx.lineTo(0, -ring.radius + 5);
        ctx.moveTo(0, ring.radius - 5);
        ctx.lineTo(0, ring.radius + 5);
        ctx.stroke();
        ctx.restore();
      });

      // 4. Update and Draw Stars
      stars.forEach(star => {
        // Drifting movement
        star.x += star.vx;
        star.y += star.vy;

        // Wrap around screen boundaries
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        // Twinkling
        star.alpha += (star.targetAlpha - star.alpha) * star.alphaSpeed;
        if (Math.abs(star.alpha - star.targetAlpha) < 0.05) {
          star.targetAlpha = Math.random() * 0.8 + 0.2;
        }

        // Draw star dot
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        if (star.color.startsWith('#')) {
          ctx.fillStyle = star.color;
        } else {
          ctx.fillStyle = `rgba(${starColorBase}, ${star.alpha})`;
        }
        ctx.fill();

        // Draw Star tech label (faint blinking tag)
        if (star.label) {
          star.labelTimer += 0.05;
          const labelAlpha = (Math.sin(star.labelTimer) * 0.3 + 0.4) * star.alpha * 0.4;
          ctx.fillStyle = isDarkMode ? `rgba(216, 238, 63, ${labelAlpha})` : `rgba(28, 107, 76, ${labelAlpha * 1.5})`;
          ctx.font = '8px monospace';
          ctx.fillText(`[ ${star.label} ]`, star.x + 8, star.y + 3);
          
          // Tiny connection tick
          ctx.strokeStyle = isDarkMode ? `rgba(216, 238, 63, ${labelAlpha * 0.5})` : `rgba(28, 107, 76, ${labelAlpha * 0.7})`;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x + 6, star.y);
          ctx.stroke();
        }
      });

      // 5. Draw Constellations (connecting lines between close stars)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const s1 = stars[i];
          const s2 = stars[j];
          
          const dx = s1.x - s2.x;
          const dy = s1.y - s2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const opacity = (1 - dist / 100) * 0.07 * Math.min(s1.alpha, s2.alpha);
            ctx.strokeStyle = isDarkMode ? `rgba(216, 238, 63, ${opacity})` : `rgba(28, 107, 76, ${opacity * 1.5})`;
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
          }
        }
      }

      // 6. Draw Shooting Stars
      if (Math.random() < 0.0006) {
        spawnShootingStar();
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.alpha -= 0.025;

        if (ss.alpha <= 0 || ss.x > width || ss.y > height) {
          shootingStars.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = isDarkMode ? `rgba(216, 238, 63, ${ss.alpha * 0.4})` : `rgba(28, 107, 76, ${ss.alpha * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * 3, ss.y - ss.vy * 3);
        ctx.stroke();
      }

      // 7. Mouse lock-on and connections (Technical HUD effect)
      if (mouse.active) {
        let closestStar: Star | null = null;
        let minDistance = 150;

        stars.forEach(star => {
          const dx = star.x - mouse.x;
          const dy = star.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDistance) {
            minDistance = dist;
            closestStar = star;
          }

          // Faint lines to cursor
          if (dist < 120) {
            const lineAlpha = (1 - dist / 120) * 0.12;
            ctx.strokeStyle = isDarkMode ? `rgba(216, 238, 63, ${lineAlpha})` : `rgba(28, 107, 76, ${lineAlpha * 1.5})`;
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        });

        // Draw target circle & coordinate overlay on closest star
        if (closestStar) {
          const star: Star = closestStar;
          ctx.strokeStyle = isDarkMode ? 'rgba(216, 238, 63, 0.4)' : 'rgba(28, 107, 76, 0.5)';
          ctx.lineWidth = 0.8;
          
          // Target circle around star
          ctx.beginPath();
          ctx.arc(star.x, star.y, 8, 0, Math.PI * 2);
          ctx.stroke();

          // Coordinate label
          ctx.fillStyle = isDarkMode ? 'rgba(216, 238, 63, 0.7)' : 'rgba(28, 107, 76, 0.8)';
          ctx.font = '9px monospace';
          ctx.fillText(`LOCK: [X:${Math.round(star.x)} Y:${Math.round(star.y)}]`, star.x + 12, star.y - 6);

          // Radar sweeps around cursor
          ctx.strokeStyle = isDarkMode ? 'rgba(216, 238, 63, 0.05)' : 'rgba(28, 107, 76, 0.08)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 40, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
