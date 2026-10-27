export const formatTime = (dateString, t) => {
  const postDate = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.abs(now - postDate) / 36e5; // Chuyển đổi milliseconds thành giờ

  if (diffInHours < 24) {
    // Nếu trong vòng 24 giờ, hiển thị giờ
    const hours = Math.floor(diffInHours);
    if (hours === 0) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} ${t("newFed.phut")} `;
    }
    return `${hours}  ${t("newFed.Gio")}`;
  } else {
    // Nếu quá 24 giờ, hiển thị ngày
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    return postDate.toLocaleDateString("vi-VN", options);
  }
};

export const cleanMojibake = (text) => {
  if (!text || typeof text !== "string") return text;

  // Direct mapping of common UTF-8 emoji mojibake caused by Latin-1/Windows-1252 seed import
  const knownReplacements = [
    [/ðŸ¥[\u0080-\u00BF]?/g, "🥐"],
    [/ðŸŒ…/g, "🌅"],
    [/ðŸ–¥/g, "🖥️"],
    [/ðŸŽž/g, "🎞️"],
    [/ðŸ“¸/g, "📸"],
    [/ðŸŽ¹/g, "🎹"],
    [/ðŸ ³/g, "🍜"],
    [/ðŸ °/g, "🍰"],
    [/ðŸŽ¨/g, "🎨"],
    [/ðŸ’»/g, "💻"],
    [/âœ¨/g, "✨"],
    [/âœˆï¸/g, "✈️"],
    [/ðŸ ‹ï¸/g, "🏋️‍♂️"],
    [/ðŸ¥—/g, "🥗"],
    [/ðŸŒ¸/g, "🌸"],
    [/ðŸŽ§/g, "🎧"],
    [/ðŸŽµ/g, "🎵"],
    [/ðŸ“š/g, "📚"],
    [/ðŸ🏛/g, "🏛️"],
    [/ðŸ“\u0090/g, "📐"],
  ];

  let cleaned = text;
  for (const [pattern, replacement] of knownReplacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Generic repair attempt if any residual mojibake markers remain (e.g. ðŸ)
  if (/ðŸ/.test(cleaned)) {
    try {
      const bytes = new Uint8Array(
        [...cleaned].map((char) => {
          const code = char.charCodeAt(0);
          return code === 0x178 ? 0x9f : code & 0xff;
        })
      );
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (!decoded.includes("\uFFFD")) {
        cleaned = decoded;
      }
    } catch (_) {
      // ignore decoding fallback error
    }
  }

  return cleaned;
};
