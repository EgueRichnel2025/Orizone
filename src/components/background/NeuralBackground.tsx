import { useEffect, useRef } from "react";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  copper: boolean;
}

function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let nodes: NetworkNode[] = [];
    const maxDistance = 145;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function draw() {
      context.clearRect(0, 0, width, height);

      for (const node of nodes) {
        if (!reducedMotion) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
        }
        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const first = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const second = nodes[j];
          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > maxDistance) continue;

          const opacity = (1 - distance / maxDistance) * 0.32;
          context.beginPath();
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);
          context.strokeStyle = `rgba(47, 93, 80, ${opacity})`;
          context.lineWidth = 0.8;
          context.stroke();
        }
      }

      for (const node of nodes) {
        context.beginPath();
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context.fillStyle = node.copper
          ? "rgba(183, 121, 62, 0.75)"
          : "rgba(47, 93, 80, 0.65)";
        context.fill();
      }

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    }

    function resizeCanvas() {
      const rect = canvas!.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * pixelRatio);
      canvas!.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const nodeCount = Math.max(18, Math.min(48, Math.floor((width * height) / 9500)));
      nodes = Array.from({ length: nodeCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() > 0.84 ? 3 : 1.8,
        copper: Math.random() > 0.89,
      }));

      if (reducedMotion) draw();
    }

    resizeCanvas();
    if (!reducedMotion) draw();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="neural-canvas" aria-hidden="true" />;
}

export default NeuralBackground;
