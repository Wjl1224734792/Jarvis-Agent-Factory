import { useMemo } from "react";
import { cn } from "@/lib/utils";

type AuthCaptchaChallengeProps = {
  code: string;
  onRefresh: () => void;
  className?: string;
  hintClassName?: string;
};

function createSeededRandom(seedText: string) {
  let seed = 0;
  for (let index = 0; index < seedText.length; index += 1) {
    seed = (seed * 31 + seedText.charCodeAt(index)) >>> 0;
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}

export function AuthCaptchaChallenge(props: AuthCaptchaChallengeProps) {
  const code = props.code.trim() || "----";
  const noise = useMemo(() => {
    const random = createSeededRandom(code);

    const chars = code.split("").map((char, index) => ({
      char,
      x: 28 + index * 28 + random() * 6,
      y: 31 + (random() * 10 - 5),
      rotate: random() * 24 - 12
    }));

    const lines = Array.from({ length: 5 }).map(() => ({
      x1: random() * 160,
      y1: random() * 52,
      x2: random() * 160,
      y2: random() * 52,
      opacity: 0.2 + random() * 0.18
    }));

    const dots = Array.from({ length: 14 }).map(() => ({
      cx: random() * 160,
      cy: random() * 52,
      r: 0.8 + random() * 1.4,
      opacity: 0.18 + random() * 0.15
    }));

    return { chars, lines, dots };
  }, [code]);

  return (
    <div className={cn("space-y-2", props.className)}>
      <button
        className="h-12 w-full overflow-hidden rounded-[var(--radius-control)] border border-sky-200/70 bg-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-slate-900/92"
        onClick={props.onRefresh}
        type="button"
      >
        <svg aria-hidden className="h-full w-full" viewBox="0 0 160 52" xmlns="http://www.w3.org/2000/svg">
          <rect fill="#232b42" height="52" rx="14" width="160" />
          {noise.lines.map((line, index) => (
            <line
              key={`line-${index}`}
              opacity={line.opacity}
              stroke="#8cc7ff"
              strokeWidth="1.4"
              x1={line.x1}
              x2={line.x2}
              y1={line.y1}
              y2={line.y2}
            />
          ))}
          {noise.dots.map((dot, index) => (
            <circle
              key={`dot-${index}`}
              cx={dot.cx}
              cy={dot.cy}
              fill="#d9ecff"
              opacity={dot.opacity}
              r={dot.r}
            />
          ))}
          {noise.chars.map((item, index) => (
            <text
              key={`char-${index}`}
              fill="#ffffff"
              fontFamily="Geist Variable, PingFang SC, sans-serif"
              fontSize="18"
              fontWeight="700"
              textAnchor="middle"
              transform={`rotate(${item.rotate} ${item.x} ${item.y})`}
              x={item.x}
              y={item.y}
            >
              {item.char}
            </text>
          ))}
        </svg>
        <span className="sr-only">刷新图形验证码</span>
      </button>
      <p className={cn("text-xs text-sky-600", props.hintClassName)}>看不清？点击上方验证码可刷新</p>
    </div>
  );
}
