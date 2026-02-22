"use client";

import { useRef, useEffect, useState } from "react";

interface SquaresProps {
    direction?: "diagonal" | "up" | "right" | "down" | "left";
    speed?: number;
    borderColor?: string;
    squareSize?: number;
    hoverFillColor?: string;
    className?: string;
}

export default function Squares({
    direction = "diagonal",
    speed = 1,
    borderColor = "rgba(255, 255, 255, 0.05)",
    squareSize = 40,
    hoverFillColor = "rgba(255, 255, 255, 0.1)",
    className = "",
}: SquaresProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredSquare, setHoveredSquare] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let resizeObserver: ResizeObserver;
        let animationFrameId: number;

        let gridOffset = { x: 0, y: 0 };

        const drawGrid = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const numCols = Math.ceil(canvas.width / squareSize) + 1;
            const numRows = Math.ceil(canvas.height / squareSize) + 1;

            for (let x = 0; x < numCols; x++) {
                for (let y = 0; y < numRows; y++) {
                    const startX = x * squareSize + (gridOffset.x % squareSize) - squareSize;
                    const startY = y * squareSize + (gridOffset.y % squareSize) - squareSize;

                    if (
                        hoveredSquare &&
                        Math.floor((startX + squareSize) / squareSize) === hoveredSquare.x &&
                        Math.floor((startY + squareSize) / squareSize) === hoveredSquare.y
                    ) {
                        ctx.fillStyle = hoverFillColor;
                        ctx.fillRect(startX, startY, squareSize, squareSize);
                    }

                    ctx.strokeStyle = borderColor;
                    ctx.strokeRect(startX, startY, squareSize, squareSize);
                }
            }
        };

        const animate = () => {
            switch (direction) {
                case "right":
                    gridOffset.x -= speed;
                    break;
                case "left":
                    gridOffset.x += speed;
                    break;
                case "down":
                    gridOffset.y -= speed;
                    break;
                case "up":
                    gridOffset.y += speed;
                    break;
                case "diagonal":
                    gridOffset.x -= speed;
                    gridOffset.y -= speed;
                    break;
                default:
                    break;
            }
            drawGrid();
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            if (canvasRef.current) {
                // Use offsetWidth/Height to get true CSS dimensions
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    canvas.width = parent.clientWidth;
                    canvas.height = parent.clientHeight;
                } else {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
            }
        };

        handleResize();
        resizeObserver = new ResizeObserver(handleResize);
        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
        }

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
        };
    }, [direction, speed, borderColor, squareSize, hoverFillColor, hoveredSquare]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // We pass hovered square index to calculate exactly which box we are over, accounting for offset
        // Since offset is dynamically changing in requestAnimationFrame, this simplified interaction 
        // will just light up squares generically under cursor.
        const x = Math.floor(mouseX / squareSize);
        const y = Math.floor(mouseY / squareSize);

        setHoveredSquare({ x, y });
    };

    const handleMouseLeave = () => {
        setHoveredSquare(null);
    };

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full border-none block pointer-events-auto z-0 ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        />
    );
}
