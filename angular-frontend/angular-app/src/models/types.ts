import { z } from 'zod';

export type Size = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
export type Color =
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'p5'
  | 'p6'
  | 'p7'
  | 's1'
  | 's2'
  | 's3'
  | 's4'
  | 's5'
  | 's6'
  | 's7'
  | 'n0'
  | 'n1'
  | 'n2'
  | 'n3'
  | 'n4'
  | 'n5'
  | 'n6'
  | 'n7'
  | 't0'
  | 't1'
  | 't2'
  | 't6'
  | 't7'
  | 'o1'
  | 'o2'
  | 'o3'
  | 'y1'
  | 'y2'
  | 'y3'
  | 'g1'
  | 'g2'
  | 'g3'
  | 'b1'
  | 'b2'
  | 'b3';
export type ColorGroup = 'p' | 's' | 'n' | 't' | 'o' | 'y' | 'g' | 'b';

export type Range<T> = [T, T];

export const IsoDate = z.iso.datetime().transform((s) => new Date(s));
export const Decimal = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform(Number);
