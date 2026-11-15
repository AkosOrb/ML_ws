import { AdaptiveFov } from '../../components/AdaptiveFov';
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Segments } from '../../components/ClassificationScene';
import { ACTIONS, bestAction, maxQ, type GridWorld } from '../../ml/qlearning';

interface Props {
  world: GridWorld;
  Q: Float64Array;
  agentPos: number;
  path: number[];
  showHeat: boolean;
  showArrows: boolean;
  version: number;
}

const neg = new THREE.Color('#e8553a');
const zero = new THREE.Color('#2b2b2b');
const pos = new THREE.Color('#3ccf91');

function heat(v: number): THREE.Color {
  const t = Math.max(-1, Math.min(1, v));
  return t >= 0 ? zero.clone().lerp(pos, t) : zero.clone().lerp(neg, -t);
}

function Agent({ target }: { target: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.lerp(target, 1 - Math.exp(-dt * 20));
  });
  return (
    <mesh ref={ref} position={target}>
      <sphereGeometry args={[0.28, 24, 16]} />
      <meshStandardMaterial color="#ffd166" emissive="#ffb547" emissiveIntensity={0.5} />
    </mesh>
  );
}

export function GridScene({ world, Q, agentPos, path, showHeat, showArrows }: Props) {
  const { width: W, height: H } = world;
  const cellPos = (s: number): [number, number, number] => [(s % W) - W / 2 + 0.5, 0, Math.floor(s / W) - H / 2 + 0.5];
  const agentTarget = useMemo(() => new THREE.Vector3(), []);
  const [ax, , az] = cellPos(agentPos);
  agentTarget.set(ax, 0.45, az);

  const pathPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 1; i < path.length; i++) {
      const a = cellPos(path[i - 1]);
      const b = cellPos(path[i]);
      pts.push([a[0], 0.12, a[2]], [b[0], 0.12, b[2]]);
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <Canvas camera={{ position: [0, 9, 7.5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#1c1c1c']} />
      <AdaptiveFov />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 10, 5]} intensity={1.1} />
      {world.cells.map((cell, s) => {
        const [x, , z] = cellPos(s);
        if (cell === 'wall') {
          return (
            <mesh key={s} position={[x, 0.35, z]}>
              <boxGeometry args={[0.96, 0.7, 0.96]} />
              <meshStandardMaterial color="#5a5a5a" />
            </mesh>
          );
        }
        const color =
          cell === 'goal' ? '#3ccf91' : cell === 'trap' ? '#ff6b3d' : showHeat ? '#' + heat(maxQ(Q, s)).getHexString() : '#2b2b2b';
        const a = bestAction(Q, s);
        const hasQ = Q[s * 4] !== 0 || Q[s * 4 + 1] !== 0 || Q[s * 4 + 2] !== 0 || Q[s * 4 + 3] !== 0;
        return (
          <group key={s}>
            <mesh position={[x, -0.05, z]}>
              <boxGeometry args={[0.94, 0.1, 0.94]} />
              <meshStandardMaterial color={color} emissive={cell === 'trap' ? '#ff3d00' : '#000000'} emissiveIntensity={cell === 'trap' ? 0.5 : 0} />
            </mesh>
            {cell === 'goal' && (
              <group position={[x, 0, z]}>
                <mesh position={[0, 0.45, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.9]} />
                  <meshStandardMaterial color="#f3f1ec" />
                </mesh>
                <mesh position={[0.17, 0.75, 0]}>
                  <boxGeometry args={[0.32, 0.2, 0.02]} />
                  <meshStandardMaterial color="#3ccf91" emissive="#3ccf91" emissiveIntensity={0.4} />
                </mesh>
              </group>
            )}
            {showArrows && hasQ && (cell === 'empty' || cell === 'start') && (
              <mesh position={[x + ACTIONS[a][0] * 0.18, 0.08, z + ACTIONS[a][1] * 0.18]} rotation={[0, -Math.atan2(ACTIONS[a][1], ACTIONS[a][0]), -Math.PI / 2]}>
                <coneGeometry args={[0.1, 0.28, 12]} />
                <meshStandardMaterial color="#f3f1ec" />
              </mesh>
            )}
          </group>
        );
      })}
      {pathPts.length > 0 && <Segments points={pathPts} color="#ffd166" />}
      <Agent target={agentTarget} />
      <OrbitControls enableDamping makeDefault minDistance={5} maxDistance={20} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  );
}
