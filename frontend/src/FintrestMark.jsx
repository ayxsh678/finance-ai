import { useRef, useEffect } from "react";

// Fintrest brand mark — 4-stroke F/₹ geometry.
// Variants: "intro" (1.08s draw), "loop" (2.8s draw/erase cycle),
//           "success" (diagonal signal-green pulse), "appnav" (0.62s snap),
//           "static" (no animation).
// CSS in index.css drives all keyframes via .mark-svg.{variant}.playing.
export default function FintrestMark({
  variant = "static",
  size = 40,
  color = "currentColor",
  style,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || variant === "static") return;

    if (variant === "loop" || variant === "success") {
      el.classList.add("playing");
    } else {
      // intro & appnav: one-shot draw; restart on remount
      const t = setTimeout(() => {
        el.classList.remove("playing");
        void el.offsetWidth; // force reflow so CSS restarts
        el.classList.add("playing");
      }, 16);
      return () => clearTimeout(t);
    }
  }, [variant]);

  return (
    <svg
      ref={ref}
      className={`mark-svg ${variant}`}
      viewBox="-7 -7 114 114"
      width={size}
      height={size}
      style={{ color, flexShrink: 0, display: "block", ...style }}
      aria-label="Fintrest"
      role="img"
      {...rest}
    >
      <line className="stroke stem"    x1="10" y1="95" x2="10" y2="10" />
      <line className="stroke top-bar" x1="10" y1="10" x2="75" y2="10" />
      <line className="stroke mid-bar" x1="10" y1="55" x2="66" y2="55" />
      <line className="stroke diag"    x1="66" y1="55" x2="97" y2="95" />
    </svg>
  );
}
