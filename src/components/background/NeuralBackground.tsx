import { useEffect, useRef } from "react";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  copper: boolean;
  pulse: number;
}

interface PointerPosition {
  x: number;
  y: number;
  active: boolean;
}

const GREEN_RGB = "47, 93, 80";
const COPPER_RGB = "201, 138, 61";

function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let nodes: NetworkNode[] = [];
    let previousPointerX = 0;
    let previousPointerY = 0;
    const pointer: PointerPosition = { x: 0, y: 0, active: false };
    const maxDistance = 172;
    const pointerRadius = 190;

    function draw() {
      context.clearRect(0, 0, width, height);

      if (pointer.active) {
        const glow = context.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          pointerRadius,
        );
        glow.addColorStop(0, `rgba(${GREEN_RGB}, 0.12)`);
        glow.addColorStop(0.52, `rgba(${COPPER_RGB}, 0.035)`);
        glow.addColorStop(1, `rgba(${GREEN_RGB}, 0)`);
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
      }

      for (const node of nodes) {
        if (!reducedMotion) {
          if (pointer.active) {
            const dx = node.x - pointer.x;
            const dy = node.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 0 && distance < pointerRadius) {
              const influence = 1 - distance / pointerRadius;
              const force = influence * 0.016;
              node.vx += (dx / distance) * force;
              node.vy += (dy / distance) * force;
            }
          }

          node.vx += (Math.random() - 0.5) * 0.0015;
          node.vy += (Math.random() - 0.5) * 0.0015;
          node.vx *= 0.997;
          node.vy *= 0.997;
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < node.radius || node.x > width - node.radius) {
            node.vx *= -1;
            node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
          }
          if (node.y < node.radius || node.y > height - node.radius) {
            node.vy *= -1;
            node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
          }
          node.pulse += 0.018;
        }
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const first = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const second = nodes[j];
          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distance = Math.hypot(dx, dy);
          if (distance > maxDistance) continue;

          let pointerInfluence = 0;
          if (pointer.active) {
            const midpointX = (first.x + second.x) / 2;
            const midpointY = (first.y + second.y) / 2;
            const pointerDistance = Math.hypot(midpointX - pointer.x, midpointY - pointer.y);
            pointerInfluence = Math.max(0, 1 - pointerDistance / pointerRadius);
          }

          const opacity = (1 - distance / maxDistance) * (0.24 + pointerInfluence * 0.45);
          const copperLink = first.copper || second.copper;
          context.beginPath();
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);
          context.strokeStyle = copperLink
            ? `rgba(${COPPER_RGB}, ${opacity * 0.8})`
            : `rgba(${GREEN_RGB}, ${opacity})`;
          context.lineWidth = 0.65 + pointerInfluence * 1.1;
          context.stroke();
        }
      }

      for (const node of nodes) {
        let pointerInfluence = 0;
        if (pointer.active) {
          const distance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
          pointerInfluence = Math.max(0, 1 - distance / pointerRadius);
        }

        const pulse = reducedMotion ? 0 : (Math.sin(node.pulse) + 1) * 0.5;
        const radius = node.radius + pulse * 0.45 + pointerInfluence * 1.2;
        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fillStyle = node.copper
          ? `rgba(${COPPER_RGB}, ${0.65 + pointerInfluence * 0.35})`
          : `rgba(${GREEN_RGB}, ${0.48 + pointerInfluence * 0.45})`;
        context.shadowBlur = pointerInfluence > 0.15 ? 6 + pointerInfluence * 9 : 0;
        context.shadowColor = node.copper
          ? `rgba(${COPPER_RGB}, 0.45)`
          : `rgba(${GREEN_RGB}, 0.4)`;
        context.fill();
        context.shadowBlur = 0;
      }

      if (pointer.active) {
        context.beginPath();
        context.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${COPPER_RGB}, 0.42)`;
        context.lineWidth = 0.8;
        context.stroke();
      }

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const nodeCount = Math.max(30, Math.min(72, Math.floor((width * height) / 7200)));
      nodes = Array.from({ length: nodeCount }, () => ({
        x: 5 + Math.random() * Math.max(1, width - 10),
        y: 5 + Math.random() * Math.max(1, height - 10),
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        radius: Math.random() > 0.84 ? 2.8 : 1.6 + Math.random() * 0.5,
        copper: Math.random() > 0.86,
        pulse: Math.random() * Math.PI * 2,
      }));

      if (reducedMotion) draw();
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;

      const deltaX = pointer.x - previousPointerX;
      const deltaY = pointer.y - previousPointerY;
      if (previousPointerX !== 0 || previousPointerY !== 0) {
        for (const node of nodes) {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < 150) {
            const influence = (1 - distance / 150) * 0.035;
            node.vx += (dx / distance) * influence + deltaX * influence * 0.035;
            node.vy += (dy / distance) * influence + deltaY * influence * 0.035;
          }
        }
      }

      previousPointerX = pointer.x;
      previousPointerY = pointer.y;
      if (reducedMotion) draw();
    }

    function handlePointerLeave() {
      pointer.active = false;
      previousPointerX = 0;
      previousPointerY = 0;
      if (reducedMotion) draw();
    }

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      reducedMotion = event.matches;
      window.cancelAnimationFrame(animationFrame);
      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        draw();
      }
    }

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    canvas.addEventListener("pointerleave", handlePointerLeave);
    motionQuery.addEventListener("change", handleMotionPreferenceChange);

    resizeCanvas();
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      motionQuery.removeEventListener("change", handleMotionPreferenceChange);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="neural-canvas" aria-hidden="true" />;
}

export default NeuralBackground;
