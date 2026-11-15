import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Scenes are composed for a landscape view; below this aspect we widen the field of view. */
const DESIGN_ASPECT = 1.4;

/**
 * Keeps the horizontal field of view constant on narrow (portrait, phone)
 * canvases, so the scene is not cropped at the sides.
 */
export function AdaptiveFov() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const baseFov = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (baseFov.current === null) baseFov.current = camera.fov;
    const aspect = width / Math.max(height, 1);
    const base = baseFov.current;
    camera.fov =
      aspect >= DESIGN_ASPECT
        ? base
        : (2 * Math.atan((Math.tan((base * Math.PI) / 360) * DESIGN_ASPECT) / aspect) * 180) / Math.PI;
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}
