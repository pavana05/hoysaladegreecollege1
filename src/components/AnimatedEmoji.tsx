import { useState } from "react";

const BASE_URL = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/";

const EMOJI_MAP: Record<string, { folder: string; file: string }> = {
  "🌤": { folder: "Sun%20behind%20cloud", file: "sun_behind_cloud_3d.png" },
  "🌤️": { folder: "Sun%20behind%20cloud", file: "sun_behind_cloud_3d.png" },
  "🎓": { folder: "Graduation%20cap", file: "graduation_cap_3d.png" },
  "👩‍🏫": { folder: "Woman%20teacher", file: "woman_teacher_3d.png" },
  "🎉": { folder: "Party%20popper", file: "party_popper_3d.png" },
  "🎂": { folder: "Birthday%20cake", file: "birthday_cake_3d.png" },
  "🌟": { folder: "Star", file: "star_3d.png" },
  "👍": { folder: "Thumbs%20up", file: "thumbs_up_3d.png" },
  "📚": { folder: "Books", file: "books_3d.png" },
  "💪": { folder: "Flexed%20biceps", file: "flexed_biceps_3d.png" },
  "✓": { folder: "Check%20mark", file: "check_mark_3d.png" },
  "✅": { folder: "Check%20mark%20button", file: "check_mark_button_3d.png" },
  "❌": { folder: "Cross%20mark", file: "cross_mark_3d.png" },
  "📋": { folder: "Clipboard", file: "clipboard_3d.png" },
  "📝": { folder: "Memo", file: "memo_3d.png" },
  "💬": { folder: "Speech%20balloon", file: "speech_balloon_3d.png" },
  "📎": { folder: "Paperclip", file: "paperclip_3d.png" },
  "⚠": { folder: "Warning", file: "warning_3d.png" },
  "⚠️": { folder: "Warning", file: "warning_3d.png" },
  "🚨": { folder: "Police%20car%20light", file: "police_car_light_3d.png" },
  "💰": { folder: "Money%20bag", file: "money_bag_3d.png" },
  "👤": { folder: "Bust%20in%20silhouette", file: "bust_in_silhouette_3d.png" },
  "📍": { folder: "Round%20pushpin", file: "round_pushpin_3d.png" },
  "🔥": { folder: "Fire", file: "fire_3d.png" },
  "😊": { folder: "Smiling%20face%20with%20smiling%20eyes", file: "smiling_face_with_smiling_eyes_3d.png" },
  "❤": { folder: "Red%20heart", file: "red_heart_3d.png" },
  "❤️": { folder: "Red%20heart", file: "red_heart_3d.png" },
  "👏": { folder: "Clapping%20hands", file: "clapping_hands_3d.png" },
  "💯": { folder: "Hundred%20points", file: "hundred_points_3d.png" },
  "✨": { folder: "Sparkles", file: "sparkles_3d.png" },
  "☕": { folder: "Hot%20beverage", file: "hot_beverage_3d.png" },
  "🥇": { folder: "1st%20place%20medal", file: "1st_place_medal_3d.png" },
  "🥈": { folder: "2nd%20place%20medal", file: "2nd_place_medal_3d.png" },
  "🥉": { folder: "3rd%20place%20medal", file: "3rd_place_medal_3d.png" },
  "🌱": { folder: "Seedling", file: "seedling_3d.png" },
  "🏆": { folder: "Trophy", file: "trophy_3d.png" },
  "👑": { folder: "Crown", file: "crown_3d.png" },
  "💎": { folder: "Gem%20stone", file: "gem_stone_3d.png" },
  "👋": { folder: "Waving%20hand", file: "waving_hand_3d.png" },
  "📞": { folder: "Telephone", file: "telephone_3d.png" },
  "🏛": { folder: "Classical%20building", file: "classical_building_3d.png" },
  "⚙": { folder: "Gear", file: "gear_3d.png" },
  "⚙️": { folder: "Gear", file: "gear_3d.png" },
};

type AnimationType = "float" | "bounce" | "wiggle" | "pulse" | "none";

interface AnimatedEmojiProps {
  emoji: string;
  size?: number;
  animation?: AnimationType;
  className?: string;
  alt?: string;
}

export default function AnimatedEmoji({
  emoji,
  size = 28,
  animation = "float",
  className = "",
  alt,
}: AnimatedEmojiProps) {
  const [failed, setFailed] = useState(false);
  const mapped = EMOJI_MAP[emoji];

  if (!mapped || failed) {
    // Fallback to native emoji with CSS animation class
    const animClass = animation === "float"
      ? "animate-emoji-float"
      : animation === "bounce"
      ? "animate-emoji-bounce"
      : animation === "wiggle"
      ? "animate-emoji-wiggle"
      : animation === "pulse"
      ? "animate-emoji-pulse"
      : "";
    return (
      <span
        className={`inline-block align-middle select-none ${animClass} ${className}`}
        style={{ fontSize: size, lineHeight: 1 }}
        role="img"
        aria-label={alt || emoji}
      >
        {emoji}
      </span>
    );
  }

  const src = `${BASE_URL}${mapped.folder}/3D/${mapped.file}`;
  const animClass = animation === "float"
    ? "animate-emoji-float"
    : animation === "bounce"
    ? "animate-emoji-bounce"
    : animation === "wiggle"
    ? "animate-emoji-wiggle"
    : animation === "pulse"
    ? "animate-emoji-pulse"
    : "";

  return (
    <img
      src={src}
      alt={alt || emoji}
      className={`inline-block align-middle select-none ${animClass} ${className}`}
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setFailed(true)}
      loading="lazy"
      draggable={false}
    />
  );
}
