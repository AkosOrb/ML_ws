import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AdaptiveFov } from '../../components/AdaptiveFov';
import { TextSprite } from '../../components/TextSprite';

export interface Candidate {
  word: string;
  p: number;
  /** Does some true sentence of the corpus continue with this word? */
  truthful: boolean;
}

const BAR_H = 4;
const SPACING = 1.7;
const TRUE_C = '#3ccf91';
const FALSE_C = '#e8553a';

/**
 * The sentence written so far floats at the top; underneath, one bar per
 * possible next word, as tall as its probability. Green bars keep the
 * sentence true, orange ones lead to something the corpus never said.
 */
export function NgramScene({ words, candidates, endLabel }: { words: string[]; candidates: Candidate[]; endLabel: string }) {
  const widths = words.map((w) => 0.3 + w.length * 0.2);
  const total = widths.reduce((a, b) => a + b, 0);
  let cursor = -total / 2;
  const n = candidates.length;
  return (
    <Canvas camera={{ position: [0, 2.4, 12], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#1c1c1c']} />
      <AdaptiveFov />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 8, 6]} intensity={1.1} />
      <gridHelper args={[16, 16, '#4a4a4a', '#333333']} position={[0, -0.01, 0]} />
      {words.map((w, i) => {
        const x = cursor + widths[i] / 2;
        cursor += widths[i];
        return <TextSprite key={i} text={w} position={[x, BAR_H + 0.9, 0]} size={0.42} color={i === words.length - 1 ? '#ffd166' : '#f3f1ec'} />;
      })}
      {candidates.map((c, i) => {
        const x = (i - (n - 1) / 2) * SPACING;
        const h = Math.max(0.03, c.p * BAR_H);
        return (
          <group key={c.word}>
            <mesh position={[x, h / 2, 0]}>
              <boxGeometry args={[0.8, h, 0.8]} />
              <meshStandardMaterial color={c.truthful ? TRUE_C : FALSE_C} roughness={0.5} />
            </mesh>
            <TextSprite text={`${Math.round(c.p * 100)}%`} position={[x, h + 0.3, 0]} size={0.28} />
            <TextSprite text={c.word === '.' ? endLabel : c.word} position={[x, -0.35, 0.8]} size={0.3} color="#f3f1ec" />
          </group>
        );
      })}
      <OrbitControls enableDamping makeDefault target={[0, 2.6, 0]} minDistance={4} maxDistance={24} />
    </Canvas>
  );
}
