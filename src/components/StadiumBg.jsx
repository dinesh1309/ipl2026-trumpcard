import React, { useEffect, useRef } from 'react';

export default function StadiumBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle pool
    const particles = [];
    const particleCount = 40;

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;
        this.size = Math.random() * 2 + 1;
        this.speedY = Math.random() * 0.6 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.glowColor = Math.random() > 0.5 ? 'rgba(0, 240, 255,' : 'rgba(255, 215, 0,';
      }

      update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        this.opacity -= 0.001;

        if (this.y < -10 || this.opacity <= 0) {
          this.reset();
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `${this.glowColor}${this.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.glowColor.includes('0, 240') ? '#00f0ff' : '#ffd700';
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
      // distribute them across height initially
      particles[i].y = Math.random() * canvas.height;
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw a subtle dark field grid in perspective
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
      ctx.lineWidth = 1;
      const lines = 12;
      for (let i = 0; i <= lines; i++) {
        const x = (canvas.width / lines) * i;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 3);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let i = 0; i < lines; i++) {
        const y = canvas.height / 3 + ((canvas.height * 2 / 3) / lines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw and update particles
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }} />
      <div className="stadium-light-beam" />
      <div className="stadium-light-beam-gold" />
      
      {/* Stadium floodlights crown */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '60px',
        background: 'linear-gradient(to bottom, rgba(0,240,255,0.1), transparent)',
        display: 'flex',
        justifyContent: 'space-around',
        opacity: 0.7
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            width: '8px',
            height: '8px',
            background: i % 2 === 0 ? '#00f0ff' : '#ffd700',
            borderRadius: '50%',
            boxShadow: i % 2 === 0 ? '0 0 20px 8px #00f0ff' : '0 0 20px 8px #ffd700',
            marginTop: '5px'
          }} />
        ))}
      </div>
    </div>
  );
}
