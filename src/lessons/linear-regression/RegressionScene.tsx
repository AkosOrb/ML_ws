import { AdaptiveFov } from '../../components/AdaptiveFov';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TextSprite } from '../../components/TextSprite';
import * as THREE from 'three';
import { DOMAIN, predict, type Plane, type Point } from '../../ml/linearRegression';

interface Props {
  data: Point[];
  plane: Plane;
  truth: Plane;
  showResiduals: boolean;
  showTruth: boolean;
  axisLabels: { x1: string; x2: string; y: string };
}

// Scene axes: feature x1 → X, feature x2 → Z, target y → Y (up).
const tmp = new THREE.Object3D();
const colorAbove = new THREE.Color('#ff7a7a');
const colorBelow = new THREE.Color('#7ab8ff');

function Points({ data, plane }: { data: Point[]; plane: Plane }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    data.forEach((d, i) => {
      tmp.position.set(d.x1, d.y, d.x2);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, d.y >= predict(plane, d.x1, d.x2) ? colorAbove : colorBelow);
    });
    mesh.count = data.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, plane]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 400]}>
      <sphereGeometry args={[0.09, 16, 12]} />
      <meshStandardMaterial roughness={0.4} />
    </instancedMesh>
  );
}

/** A flat square patch of the plane y = w1·x1 + w2·x2 + b over the data domain. */
function PlaneMesh({ plane, color, opacity, wireframe = false }: { plane: Plane; color: string; opacity: number; wireframe?: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  }, []);

  useLayoutEffect(() => {
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const c = [
      [-DOMAIN, -DOMAIN],
      [DOMAIN, -DOMAIN],
      [DOMAIN, DOMAIN],
      [-DOMAIN, DOMAIN],
    ];
    c.forEach(([x1, x2], i) => pos.setXYZ(i, x1, predict(plane, x1, x2), x2));
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }, [geometry, plane]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        wireframe={wireframe}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Vertical lines from each point to the plane: the prediction errors. */
function Residuals({ data, plane }: { data: Point[]; plane: Plane }) {
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  useLayoutEffect(() => {
    const arr = new Float32Array(data.length * 6);
    data.forEach((d, i) => {
      arr.set([d.x1, d.y, d.x2, d.x1, predict(plane, d.x1, d.x2), d.x2], i * 6);
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geometry.computeBoundingSphere();
  }, [geometry, data, plane]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ffd166" transparent opacity={0.8} />
    </lineSegments>
  );
}

function Axes({ labels }: { labels: Props['axisLabels'] }) {
  const L = DOMAIN + 0.6;
  const yMin = -5;
  const yMax = 6;
  return (
    <group>
      <gridHelper args={[DOMAIN * 2, 12, '#4a4a4a', '#333333']} position={[0, yMin, 0]} />
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(-L, yMin, -L), L * 2, '#b3b3b3', 0.25, 0.15]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(-L, yMin, -L), L * 2, '#b3b3b3', 0.25, 0.15]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(-L, yMin, -L), yMax - yMin, '#b3b3b3', 0.25, 0.15]} />
      <TextSprite text={labels.x1} position={[L + 0.6, yMin, -L]} />
      <TextSprite text={labels.x2} position={[-L, yMin, L + 0.6]} />
      <TextSprite text={labels.y} position={[-L, yMax + 0.4, -L]} />
    </group>
  );
}

export function RegressionScene({ data, plane, truth, showResiduals, showTruth, axisLabels }: Props) {
  return (
    <Canvas camera={{ position: [10, 6, 12], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#1c1c1c']} />
      <AdaptiveFov />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
      <Axes labels={axisLabels} />
      <Points data={data} plane={plane} />
      <PlaneMesh plane={plane} color="#4f9dff" opacity={0.45} />
      {showTruth && <PlaneMesh plane={truth} color="#3ccf91" opacity={0.9} wireframe />}
      {showResiduals && <Residuals data={data} plane={plane} />}
      <OrbitControls enableDamping makeDefault target={[0, 0.5, 0]} minDistance={5} maxDistance={30} />
    </Canvas>
  );
}
