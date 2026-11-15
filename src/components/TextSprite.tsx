import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface Props {
  text: string;
  position: [number, number, number];
  /** Text height in world units. */
  size?: number;
  color?: string;
}

/**
 * A camera-facing text label drawn onto a canvas texture. Lives in the 3D
 * scene itself, so it needs no DOM overlay or font download.
 */
export function TextSprite({ text, position, size = 0.4, color = '#d4d4d4' }: Props) {
  const { texture, aspect } = useMemo(() => {
    const px = 64;
    const font = `500 ${px}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 16;
    canvas.width = w;
    canvas.height = px * 1.3;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 8, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { texture: tex, aspect: w / canvas.height };
  }, [text, color]);

  useEffect(() => () => texture.dispose(), [texture]);

  const h = size * 1.3;
  return (
    <sprite position={position} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
