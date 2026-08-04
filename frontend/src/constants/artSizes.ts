export type ArtSizeCode = "CUSTOM" | "A0" | "A1" | "A2" | "A3" | "A4";
export type ArtOrientation = "PORTRAIT" | "LANDSCAPE";

export const ART_SIZE_PRESETS: ReadonlyArray<{
  code: Exclude<ArtSizeCode, "CUSTOM">;
  widthCm: number;
  heightCm: number;
}> = [
  { code: "A0", widthCm: 84.1, heightCm: 118.9 },
  { code: "A1", widthCm: 59.4, heightCm: 84.1 },
  { code: "A2", widthCm: 42, heightCm: 59.4 },
  { code: "A3", widthCm: 29.7, heightCm: 42 },
  { code: "A4", widthCm: 21, heightCm: 29.7 },
];

const sameSize = (left: number, right: number) => Math.abs(left - right) < 0.01;

export function getArtSizeCode(widthCm: number | null, heightCm: number | null): ArtSizeCode {
  if (widthCm == null || heightCm == null) return "CUSTOM";
  return ART_SIZE_PRESETS.find(
    (size) =>
      (sameSize(widthCm, size.widthCm) && sameSize(heightCm, size.heightCm)) ||
      (sameSize(widthCm, size.heightCm) && sameSize(heightCm, size.widthCm)),
  )?.code ?? "CUSTOM";
}

export function getArtOrientation(widthCm: number | null, heightCm: number | null): ArtOrientation {
  return widthCm != null && heightCm != null && widthCm > heightCm
    ? "LANDSCAPE"
    : "PORTRAIT";
}

export function getArtSizeDimensions(code: ArtSizeCode, orientation: ArtOrientation) {
  const size = ART_SIZE_PRESETS.find((item) => item.code === code);
  if (!size) return null;
  return orientation === "PORTRAIT"
    ? { widthCm: size.widthCm, heightCm: size.heightCm }
    : { widthCm: size.heightCm, heightCm: size.widthCm };
}
