import { cleanMojibake } from "./index";

describe("cleanMojibake", () => {
  test("decodes known seed mojibake emoji sequences", () => {
    expect(cleanMojibake("Best artisan pastries in town ðŸ¥ Crispy outside, pillowy inside.")).toBe(
      "Best artisan pastries in town 🥐 Crispy outside, pillowy inside."
    );
    expect(cleanMojibake("Sunset over the coastal cliffs ðŸŒ… Can never get tired")).toBe(
      "Sunset over the coastal cliffs 🌅 Can never get tired"
    );
    expect(cleanMojibake("Studio vibes ðŸŽ¹ Working on something")).toBe(
      "Studio vibes 🎹 Working on something"
    );
    expect(cleanMojibake("Product Designer & Visual Creator 🎨âœ¨")).toBe(
      "Product Designer & Visual Creator 🎨✨"
    );
  });

  test("leaves normal text and normal emojis unchanged", () => {
    expect(cleanMojibake("Hello world")).toBe("Hello world");
    expect(cleanMojibake("Best pastries 🥐")).toBe("Best pastries 🥐");
    expect(cleanMojibake("")).toBe("");
    expect(cleanMojibake(null)).toBe(null);
  });
});
