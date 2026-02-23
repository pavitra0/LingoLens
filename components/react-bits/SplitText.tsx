import { useAnimation, motion } from "framer-motion";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

interface SplitTextProps {
    text: string;
    className?: string;
    delay?: number;
    textAlign?: "center" | "left" | "right";
    animationFrom?: { opacity: number; transform: string };
    animationTo?: { opacity: number; transform: string };
}

export default function SplitText({
    text,
    className = "",
    delay = 100,
    textAlign = "center",
    animationFrom = { opacity: 0, transform: "translate3d(0,40px,0)" },
    animationTo = { opacity: 1, transform: "translate3d(0,0,0)" },
}: SplitTextProps) {
    const words = text.split(" ").map((word) => word.split(""));
    const controls = useAnimation();
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    useEffect(() => {
        if (inView) {
            controls.start("visible");
        }
    }, [controls, inView]);

    return (
        <div
            ref={ref}
            className={className}
            style={{ textAlign, display: "inline-block", overflow: "hidden" }}
        >
            {words.map((word, wordIndex) => (
                <span
                    key={wordIndex}
                    style={{ display: "inline-block", whiteSpace: "nowrap" }}
                    className="mr-[0.3em]" // Add space between words
                >
                    {word.map((letter, letterIndex) => {
                        const index =
                            words.slice(0, wordIndex).reduce((acc, w) => acc + w.length, 0) +
                            letterIndex;

                        return (
                            <motion.span
                                key={index}
                                style={{ display: "inline-block", willChange: "transform, opacity" }}
                                initial="hidden"
                                animate={controls}
                                variants={{
                                    hidden: animationFrom,
                                    visible: {
                                        ...animationTo,
                                        transition: {
                                            duration: 0.5,
                                            ease: [0.2, 0.65, 0.3, 0.9],
                                            delay: (index * delay) / 1000,
                                        },
                                    },
                                }}
                            >
                                {letter}
                            </motion.span>
                        );
                    })}
                </span>
            ))}
        </div>
    );
}
