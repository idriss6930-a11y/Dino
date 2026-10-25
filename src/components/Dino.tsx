/**
 * DINO, la mascotte : un petit dinosaure explorateur dessiné en SVG (aucune image externe).
 * Expressions : happy (content), thinking (réfléchit), explorer (explorateur), sleeping (dort), surprised (surpris).
 */
export type DinoMood = "happy" | "thinking" | "explorer" | "sleeping" | "surprised";

const SAGE = "#86ad83";
const SAGE_LIGHT = "#a8c6a4";
const DEEP = "#214636";
const CREAM = "#f8f3e7";
const ORANGE = "#e8833a";

export function Dino({ mood = "happy", size = 96, className, title }: { mood?: DinoMood; size?: number; className?: string; title?: string }) {
  const label = title ?? { happy: "DINO content", thinking: "DINO réfléchit", explorer: "DINO explorateur", sleeping: "DINO dort", surprised: "DINO surpris" }[mood];
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label={label}>
      <title>{label}</title>
      {/* Queue */}
      <path d="M86 86 C102 88 110 80 114 70 C108 92 96 98 84 96 Z" fill={SAGE} />
      {/* Pics dorsaux */}
      {[
        [34, 26],
        [46, 18],
        [60, 16],
        [74, 20],
        [88, 60],
        [94, 72],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x - 5} ${y + 6} L${x} ${y - 3} L${x + 5} ${y + 6} Z`} fill={ORANGE} />
      ))}
      {/* Corps */}
      <ellipse cx="62" cy="82" rx="30" ry="27" fill={SAGE} />
      <ellipse cx="58" cy="87" rx="17" ry="18" fill={CREAM} />
      {/* Pattes */}
      <ellipse cx="46" cy="107" rx="9" ry="5" fill={DEEP} />
      <ellipse cx="74" cy="107" rx="9" ry="5" fill={DEEP} />
      {/* Bras */}
      {mood === "thinking" ? (
        <path d="M40 74 C34 68 36 60 44 58" stroke={SAGE} strokeWidth="7" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M38 78 C32 82 32 88 36 90" stroke={SAGE} strokeWidth="7" strokeLinecap="round" fill="none" />
      )}
      <path d="M82 78 C88 82 88 88 84 90" stroke={SAGE} strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* Tête */}
      <ellipse cx="58" cy="42" rx="27" ry="24" fill={SAGE} />
      <ellipse cx="58" cy="52" rx="19" ry="11" fill={SAGE_LIGHT} />
      {/* Joues */}
      <circle cx="40" cy="52" r="4" fill={ORANGE} opacity="0.35" />
      <circle cx="76" cy="52" r="4" fill={ORANGE} opacity="0.35" />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood === "explorer" && (
        <g>
          {/* Chapeau d'explorateur */}
          <ellipse cx="58" cy="22" rx="30" ry="6" fill="#c9a86b" />
          <path d="M40 22 C40 8 76 8 76 22 Z" fill="#d8bb7f" />
          <rect x="40" y="17" width="36" height="4" fill={DEEP} />
          {/* Sangle de sac */}
          <path d="M44 64 L76 104" stroke="#a9773f" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {mood === "thinking" && (
        <g fill={DEEP}>
          <circle cx="96" cy="26" r="11" fill="white" stroke={SAGE} strokeWidth="2" />
          <text x="96" y="31" textAnchor="middle" fontSize="15" fontWeight="700" fill={DEEP}>?</text>
          <circle cx="86" cy="40" r="3" fill="white" stroke={SAGE} strokeWidth="1.5" />
        </g>
      )}
      {mood === "sleeping" && (
        <g fill={DEEP} fontWeight="700">
          <text x="88" y="24" fontSize="12">z</text>
          <text x="96" y="16" fontSize="15">z</text>
          <text x="105" y="8" fontSize="18">Z</text>
        </g>
      )}
      {mood === "surprised" && (
        <text x="94" y="28" fontSize="22" fontWeight="800" fill={ORANGE}>!</text>
      )}
    </svg>
  );
}

function Eyes({ mood }: { mood: DinoMood }) {
  if (mood === "happy")
    return (
      <g stroke={DEEP} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M43 40 Q48 34 53 40" />
        <path d="M63 40 Q68 34 73 40" />
      </g>
    );
  if (mood === "sleeping")
    return (
      <g stroke={DEEP} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M43 40 Q48 44 53 40" />
        <path d="M63 40 Q68 44 73 40" />
      </g>
    );
  if (mood === "surprised")
    return (
      <g>
        <circle cx="48" cy="38" r="7" fill="white" />
        <circle cx="68" cy="38" r="7" fill="white" />
        <circle cx="48" cy="38" r="4" fill={DEEP} />
        <circle cx="68" cy="38" r="4" fill={DEEP} />
      </g>
    );
  const look = mood === "thinking" ? -2 : 0;
  return (
    <g>
      <circle cx="48" cy="38" r="6" fill="white" />
      <circle cx="68" cy="38" r="6" fill="white" />
      <circle cx={49 + (mood === "thinking" ? 1 : 0)} cy={38 + look} r="3.4" fill={DEEP} />
      <circle cx={69 + (mood === "thinking" ? 1 : 0)} cy={38 + look} r="3.4" fill={DEEP} />
      <circle cx="50" cy={36.5 + look} r="1" fill="white" />
      <circle cx="70" cy={36.5 + look} r="1" fill="white" />
    </g>
  );
}

function Mouth({ mood }: { mood: DinoMood }) {
  if (mood === "surprised") return <ellipse cx="58" cy="55" rx="4" ry="5" fill={DEEP} />;
  if (mood === "thinking") return <path d="M52 56 L64 55" stroke={DEEP} strokeWidth="2.5" strokeLinecap="round" />;
  if (mood === "sleeping") return <path d="M54 56 Q58 58 62 56" stroke={DEEP} strokeWidth="2.5" strokeLinecap="round" fill="none" />;
  return <path d="M50 54 Q58 62 66 54" stroke={DEEP} strokeWidth="2.8" strokeLinecap="round" fill="none" />;
}
