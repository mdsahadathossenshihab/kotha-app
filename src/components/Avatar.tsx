"use client";

type Props = {
  name: string;
  avatar?: string;
  color?: string;
  size?: number;
  ring?: boolean;
  online?: boolean;
  className?: string;
};

export default function Avatar({
  name,
  avatar,
  color = "#2b7fff",
  size = 48,
  ring = false,
  online,
  className = "",
}: Props) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  const dot = Math.max(9, Math.round(size * 0.26));

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className={`h-full w-full overflow-hidden rounded-full ${
          ring ? "ring-2 ring-white/70 ring-offset-0" : ""
        }`}
        style={{
          background: avatar ? "#dbe6f7" : `linear-gradient(145deg, ${color}, ${shade(color)})`,
        }}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-semibold text-white"
            style={{ fontSize: size * 0.4 }}
          >
            {letter}
          </span>
        )}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500"
          style={{ width: dot, height: dot }}
        />
      )}
    </div>
  );
}

/** রঙকে একটু গাঢ় করে গ্রেডিয়েন্ট বানায় */
function shade(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const dim = (v: string) => Math.max(0, Math.round(parseInt(v, 16) * 0.72));
  return `rgb(${dim(m[1])}, ${dim(m[2])}, ${dim(m[3])})`;
}
