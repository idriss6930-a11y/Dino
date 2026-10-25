import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";

/** DINO, la mascotte : même dessin que sur le site, cinq humeurs. */
export type DinoMood = "happy" | "thinking" | "explorer" | "sleeping" | "surprised";

const SAGE = "#86ad83";
const SAGE_LIGHT = "#a8c6a4";
const DEEP = "#214636";
const CREAM = "#f8f3e7";
const ORANGE = "#e8833a";
const LABELS: Record<DinoMood, string> = { happy: "DINO content", thinking: "DINO réfléchit", explorer: "DINO explorateur", sleeping: "DINO dort", surprised: "DINO surpris" };

export function Dino({ mood = "happy", size = 96 }: { mood?: DinoMood; size?: number }) {
  return (
    <Svg viewBox="0 0 120 120" width={size} height={size} accessibilityLabel={LABELS[mood]} accessibilityRole="image">
      <Path d="M86 86 C102 88 110 80 114 70 C108 92 96 98 84 96 Z" fill={SAGE} />
      {[
        [34, 26],
        [46, 18],
        [60, 16],
        [74, 20],
        [88, 60],
        [94, 72],
      ].map(([x, y], i) => (
        <Path key={i} d={`M${x - 5} ${y + 6} L${x} ${y - 3} L${x + 5} ${y + 6} Z`} fill={ORANGE} />
      ))}
      <Ellipse cx="62" cy="82" rx="30" ry="27" fill={SAGE} />
      <Ellipse cx="58" cy="87" rx="17" ry="18" fill={CREAM} />
      <Ellipse cx="46" cy="107" rx="9" ry="5" fill={DEEP} />
      <Ellipse cx="74" cy="107" rx="9" ry="5" fill={DEEP} />
      {mood === "thinking" ? (
        <Path d="M40 74 C34 68 36 60 44 58" stroke={SAGE} strokeWidth="7" strokeLinecap="round" fill="none" />
      ) : (
        <Path d="M38 78 C32 82 32 88 36 90" stroke={SAGE} strokeWidth="7" strokeLinecap="round" fill="none" />
      )}
      <Path d="M82 78 C88 82 88 88 84 90" stroke={SAGE} strokeWidth="7" strokeLinecap="round" fill="none" />
      <Ellipse cx="58" cy="42" rx="27" ry="24" fill={SAGE} />
      <Ellipse cx="58" cy="52" rx="19" ry="11" fill={SAGE_LIGHT} />
      <Circle cx="40" cy="52" r="4" fill={ORANGE} opacity={0.35} />
      <Circle cx="76" cy="52" r="4" fill={ORANGE} opacity={0.35} />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood === "explorer" && (
        <G>
          <Ellipse cx="58" cy="22" rx="30" ry="6" fill="#c9a86b" />
          <Path d="M40 22 C40 8 76 8 76 22 Z" fill="#d8bb7f" />
          <Rect x="40" y="17" width="36" height="4" fill={DEEP} />
          <Path d="M44 64 L76 104" stroke="#a9773f" strokeWidth="4" strokeLinecap="round" />
        </G>
      )}
      {mood === "thinking" && (
        <G>
          <Circle cx="96" cy="26" r="11" fill="white" stroke={SAGE} strokeWidth="2" />
          <SvgText x="96" y="31" textAnchor="middle" fontSize="15" fontWeight="700" fill={DEEP}>
            ?
          </SvgText>
          <Circle cx="86" cy="40" r="3" fill="white" stroke={SAGE} strokeWidth="1.5" />
        </G>
      )}
      {mood === "sleeping" && (
        <G fill={DEEP}>
          <SvgText x="88" y="24" fontSize="12" fontWeight="700" fill={DEEP}>z</SvgText>
          <SvgText x="96" y="16" fontSize="15" fontWeight="700" fill={DEEP}>z</SvgText>
          <SvgText x="105" y="8" fontSize="18" fontWeight="700" fill={DEEP}>Z</SvgText>
        </G>
      )}
      {mood === "surprised" && (
        <SvgText x="94" y="28" fontSize="22" fontWeight="800" fill={ORANGE}>
          !
        </SvgText>
      )}
    </Svg>
  );
}

function Eyes({ mood }: { mood: DinoMood }) {
  if (mood === "happy" || mood === "sleeping") {
    const d = mood === "happy" ? ["M43 40 Q48 34 53 40", "M63 40 Q68 34 73 40"] : ["M43 40 Q48 44 53 40", "M63 40 Q68 44 73 40"];
    return (
      <G>
        {d.map((p) => (
          <Path key={p} d={p} stroke={DEEP} strokeWidth="3" strokeLinecap="round" fill="none" />
        ))}
      </G>
    );
  }
  if (mood === "surprised")
    return (
      <G>
        <Circle cx="48" cy="38" r="7" fill="white" />
        <Circle cx="68" cy="38" r="7" fill="white" />
        <Circle cx="48" cy="38" r="4" fill={DEEP} />
        <Circle cx="68" cy="38" r="4" fill={DEEP} />
      </G>
    );
  const look = mood === "thinking" ? -2 : 0;
  const dx = mood === "thinking" ? 1 : 0;
  return (
    <G>
      <Circle cx="48" cy="38" r="6" fill="white" />
      <Circle cx="68" cy="38" r="6" fill="white" />
      <Circle cx={49 + dx} cy={38 + look} r="3.4" fill={DEEP} />
      <Circle cx={69 + dx} cy={38 + look} r="3.4" fill={DEEP} />
      <Circle cx="50" cy={36.5 + look} r="1" fill="white" />
      <Circle cx="70" cy={36.5 + look} r="1" fill="white" />
    </G>
  );
}

function Mouth({ mood }: { mood: DinoMood }) {
  if (mood === "surprised") return <Ellipse cx="58" cy="55" rx="4" ry="5" fill={DEEP} />;
  if (mood === "thinking") return <Path d="M52 56 L64 55" stroke={DEEP} strokeWidth="2.5" strokeLinecap="round" />;
  if (mood === "sleeping") return <Path d="M54 56 Q58 58 62 56" stroke={DEEP} strokeWidth="2.5" strokeLinecap="round" fill="none" />;
  return <Path d="M50 54 Q58 62 66 54" stroke={DEEP} strokeWidth="2.8" strokeLinecap="round" fill="none" />;
}
