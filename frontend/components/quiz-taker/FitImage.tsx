import React from 'react';

/**
 * Shows a whole picture, never cropped. The image keeps its own shape up to `maxHeight`; when it is taller or
 * narrower than the box, the leftover space is filled with a soft, blurred copy of the same picture instead of
 * empty bars. Used for question media, result images and split-layout panels, where an uploaded photo of any
 * shape has to look right.
 *
 * `fill` makes the frame take its parent's full size (for split-layout panels) instead of sizing to the image.
 */
export default function FitImage({ src, alt, maxHeight, radius, fill, onError }: {
  src: string;
  alt?: string;
  maxHeight?: number;
  radius?: number;
  fill?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  return (
    <div style={{
      position: fill ? 'absolute' : 'relative', inset: fill ? 0 : undefined,
      width: '100%', overflow: 'hidden', borderRadius: radius || 0,
      background: 'rgba(0,0,0,0.04)', lineHeight: 0,
    }}>
      <img src={src} alt="" aria-hidden="true" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        filter: 'blur(28px) saturate(1.1)', transform: 'scale(1.2)', opacity: 0.6,
      }} />
      <img src={src} alt={alt || ''} onError={onError} style={{
        position: 'relative', display: 'block', width: '100%',
        height: fill ? '100%' : 'auto', maxHeight: fill ? undefined : (maxHeight || 420),
        objectFit: 'contain',
      }} />
    </div>
  );
}
