import { Vec3, PI } from '../math/vec3';
import { AnimationMode } from '../animation/AnimationController';

export interface Preset {
  name: string;
  description: string;
  axis: Vec3;
  totalAngle: number;
  mode: AnimationMode;
  speed: number;
}

export const PRESETS: Preset[] = [
  {
    name: 'Lazo 2π (eje X)',
    description: 'Rotación de 360° alrededor del eje X. Este lazo NO es contráctil en SO(3).',
    axis: { x: 1, y: 0, z: 0 },
    totalAngle: 2 * PI,
    mode: 'loop',
    speed: 0.3,
  },
  {
    name: 'Lazo 4π (eje X)',
    description: 'Rotación de 720° alrededor del eje X. Este lazo SÍ es contráctil en SO(3).',
    axis: { x: 1, y: 0, z: 0 },
    totalAngle: 4 * PI,
    mode: 'loop',
    speed: 0.2,
  },
  {
    name: 'Contracción 4π',
    description: 'Observa cómo el lazo de 720° se contrae continuamente hasta un punto.',
    axis: { x: 1, y: 0, z: 0 },
    totalAngle: 4 * PI,
    mode: 'contraction',
    speed: 0.25,
  },
  {
    name: 'Comparar 2π vs 4π',
    description: 'Vista lado a lado: ¿por qué uno se contrae y el otro no?',
    axis: { x: 0, y: 0, z: 1 },
    totalAngle: 2 * PI,
    mode: 'comparison',
    speed: 0.25,
  },
];
