import { DraftSlot, clamp } from './draft';

export function SlotImage({ slot, alt }: { slot: DraftSlot; alt: string }) {
  const zoom = clamp(slot.zoom ?? 1, 1, 3);
  const panRange = ((zoom - 1) / zoom) * 50;
  return <img src={slot.preview ?? undefined} alt={alt} draggable={false} style={{
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
    objectPosition: `${50 + (slot.panX ?? 0) * panRange}% ${50 + (slot.panY ?? 0) * panRange}%`,
    transform: `scale(${zoom})`, transformOrigin: 'center', willChange: 'transform, object-position',
  }} />;
}
