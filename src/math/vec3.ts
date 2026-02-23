/**
 * Vec3: 3D vector type and operations.
 * Used throughout for rotation axes, points in B³(π), etc.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const EPSILON = 1e-10;
export const PI = Math.PI;
export const TWO_PI = 2 * Math.PI;
export const FOUR_PI = 4 * Math.PI;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function vec3Zero(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

export function vec3Norm(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3NormSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function vec3Normalize(v: Vec3): Vec3 {
  const n = vec3Norm(v);
  if (n < EPSILON) return { x: 0, y: 0, z: 1 }; // default axis
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vec3Negate(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function vec3ApproxEqual(a: Vec3, b: Vec3, eps: number = EPSILON): boolean {
  return (
    Math.abs(a.x - b.x) < eps &&
    Math.abs(a.y - b.y) < eps &&
    Math.abs(a.z - b.z) < eps
  );
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

export function approxEqual(a: number, b: number, eps: number = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}
