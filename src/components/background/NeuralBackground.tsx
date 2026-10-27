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

const MAX_DISTANCE = 185;
const POINTER_RADIUS = 220;
const MAX_NODE_SPEED = 1.45;

function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let reducedMotion = motionQuery.matches;
    let width = 0;
    let height = 0;
    let animationFrame = 0;

    let nodes: NetworkNode[] = [];

    let previousPointerX: number | null = null;
    let previousPointerY: number | null = null;

    const pointer: PointerPosition = {
      x: 0,
      y: 0,
      active: false,
    };

    function draw() {
      const now = performance.now();

      context.clearRect(0, 0, width, height);

      // Halo diffus autour du curseur.
      if (pointer.active) {
        const glow = context.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          POINTER_RADIUS,
        );

        glow.addColorStop(
          0,
          `rgba(${GREEN_RGB}, 0.17)`,
        );

        glow.addColorStop(
          0.42,
          `rgba(${COPPER_RGB}, 0.065)`,
        );

        glow.addColorStop(
          1,
          `rgba(${GREEN_RGB}, 0)`,
        );

        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
      }

      // Déplacement progressif et interaction avec le curseur.
      for (const node of nodes) {
        if (reducedMotion) continue;

        if (pointer.active) {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance > 0 && distance < POINTER_RADIUS) {
            const influence = 1 - distance / POINTER_RADIUS;
            const force = influence * 0.012;

            node.vx += (dx / distance) * force;
            node.vy += (dy / distance) * force;
          }
        }

        // Léger mouvement naturel, sans trajectoire mécanique.
        node.vx += (Math.random() - 0.5) * 0.0008;
        node.vy += (Math.random() - 0.5) * 0.0008;

        node.vx *= 0.992;
        node.vy *= 0.992;

        // Limite la vitesse pour conserver une animation élégante.
        const speed = Math.hypot(node.vx, node.vy);

        if (speed > MAX_NODE_SPEED) {
          node.vx = (node.vx / speed) * MAX_NODE_SPEED;
          node.vy = (node.vy / speed) * MAX_NODE_SPEED;
        }

        node.x += node.vx;
        node.y += node.vy;

        // Les nœuds restent dans la zone visible.
        if (node.x < node.radius || node.x > width - node.radius) {
          node.vx *= -1;
          node.x = Math.max(
            node.radius,
            Math.min(width - node.radius, node.x),
          );
        }

        if (node.y < node.radius || node.y > height - node.radius) {
          node.vy *= -1;
          node.y = Math.max(
            node.radius,
            Math.min(height - node.radius, node.y),
          );
        }

        node.pulse += 0.025;
      }

      // Connexions dynamiques entre les nœuds proches.
      for (let i = 0; i < nodes.length; i += 1) {
        const first = nodes[i];

        for (let j = i + 1; j < nodes.length; j += 1) {
          const second = nodes[j];

          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distance = Math.hypot(dx, dy);

          if (distance > MAX_DISTANCE) continue;

          const proximity = 1 - distance / MAX_DISTANCE;

          const midpointX = (first.x + second.x) / 2;
          const midpointY = (first.y + second.y) / 2;

          let pointerInfluence = 0;

          if (pointer.active) {
            const pointerDistance = Math.hypot(
              midpointX - pointer.x,
              midpointY - pointer.y,
            );

            pointerInfluence = Math.max(
              0,
              1 - pointerDistance / POINTER_RADIUS,
            );
          }

          const opacity =
            proximity * (0.19 + pointerInfluence * 0.52);

          const copperLink = first.copper || second.copper;

          context.beginPath();
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);

          context.strokeStyle = copperLink
            ? `rgba(${COPPER_RGB}, ${opacity * 0.85})`
            : `rgba(${GREEN_RGB}, ${opacity})`;

          context.lineWidth = 0.65 + pointerInfluence * 1.2;
          context.stroke();

          /*
           * Petites impulsions lumineuses qui parcourent
           * une partie des connexions.
           */
          if ((i * 13 + j * 7) % 11 === 0) {
            const phase = ((i * 17 + j * 31) % 100) / 100;

            const progress = reducedMotion
              ? phase
              : (now / 6000 + phase) % 1;

            const particleX =
              first.x + (second.x - first.x) * progress;

            const particleY =
              first.y + (second.y - first.y) * progress;

            context.beginPath();
            context.arc(
              particleX,
              particleY,
              1.5 + pointerInfluence * 0.7,
              0,
              Math.PI * 2,
            );

            context.fillStyle = copperLink
              ? `rgba(${COPPER_RGB}, ${0.65 + proximity * 0.3})`
              : `rgba(${GREEN_RGB}, ${0.55 + proximity * 0.4})`;

            context.fill();
          }
        }
      }

      // Nœuds et halos.
      for (const node of nodes) {
        const distance = pointer.active
          ? Math.hypot(node.x - pointer.x, node.y - pointer.y)
          : Infinity;

        const influence = Math.max(
          0,
          1 - distance / POINTER_RADIUS,
        );

        const pulse = reducedMotion
          ? 0
          : (Math.sin(node.pulse) + 1) * 0.5;

        const radius =
          node.radius + pulse * 0.5 + influence * 1.5;

        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);

        context.fillStyle = node.copper
          ? `rgba(${COPPER_RGB}, ${0.68 + influence * 0.3})`
          : `rgba(${GREEN_RGB}, ${0.58 + influence * 0.4})`;

        context.shadowBlur = influence > 0.12
          ? 5 + influence * 12
          : 0;

        context.shadowColor = node.copper
          ? `rgba(${COPPER_RGB}, 0.55)`
          : `rgba(${GREEN_RGB}, 0.5)`;

        context.fill();
        context.shadowBlur = 0;
      }

      // Repère discret autour du curseur.
      if (pointer.active) {
        context.beginPath();
        context.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2);

        context.strokeStyle = `rgba(${COPPER_RGB}, 0.65)`;
        context.lineWidth = 1;
        context.stroke();
      }

      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) return;

      const oldWidth = width;
      const oldHeight = height;

      width = rect.width;
      height = rect.height;

      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2,
      );

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const desiredNodeCount = Math.max(
        34,
        Math.min(82, Math.floor((width * height) / 5600)),
      );

      const previousNodes = nodes;

      nodes = Array.from(
        { length: desiredNodeCount },
        (_, index): NetworkNode => {
          const existing = previousNodes[index];

          if (existing && oldWidth > 0 && oldHeight > 0) {
            return {
              ...existing,
              x: (existing.x / oldWidth) * width,
              y: (existing.y / oldHeight) * height,
            };
          }

          return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.24,
            vy: (Math.random() - 0.5) * 0.24,
            radius: Math.random() > 0.84
              ? 2.8
              : 1.6 + Math.random() * 0.5,
            copper: Math.random() > 0.86,
            pulse: Math.random() * Math.PI * 2,
          };
        },
      );

      if (reducedMotion) draw();
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();

      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;

      if (
        previousPointerX !== null &&
        previousPointerY !== null
      ) {
        const deltaX = Math.max(
          -35,
          Math.min(35, pointer.x - previousPointerX),
        );

        const deltaY = Math.max(
          -35,
          Math.min(35, pointer.y - previousPointerY),
        );

        for (const node of nodes) {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance > 0 && distance < 150) {
            const influence = 1 - distance / 150;

            node.vx +=
              (dx / distance) * influence * 0.025 +
              deltaX * influence * 0.002;

            node.vy +=
              (dy / distance) * influence * 0.025 +
              deltaY * influence * 0.002;
          }
        }
      }

      previousPointerX = pointer.x;
      previousPointerY = pointer.y;

      if (reducedMotion) draw();
    }

    function handlePointerLeave() {
      pointer.active = false;
      previousPointerX = null;
      previousPointerY = null;

      if (reducedMotion) draw();
    }

    function handleMotionPreferenceChange(
      event: MediaQueryListEvent,
    ) {
      reducedMotion = event.matches;

      window.cancelAnimationFrame(animationFrame);

      if (reducedMotion) {
        draw();
      } else {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    const resizeObserver = new ResizeObserver(resizeCanvas);

    resizeObserver.observe(canvas);

    canvas.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true },
    );

    canvas.addEventListener(
      "pointerleave",
      handlePointerLeave,
    );

    motionQuery.addEventListener(
      "change",
      handleMotionPreferenceChange,
    );

    resizeCanvas();

    if (!reducedMotion) {
      animationFrame = window.requestAnimationFrame(draw);
    }

    return () => {
      resizeObserver.disconnect();

      canvas.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      canvas.removeEventListener(
        "pointerleave",
        handlePointerLeave,
      );

      motionQuery.removeEventListener(
        "change",
        handleMotionPreferenceChange,
      );

      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="neural-canvas"
      aria-hidden="true"
    />
  );
}

export default NeuralBackground;