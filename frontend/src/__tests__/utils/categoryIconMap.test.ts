import { describe, it, expect } from 'vitest';
import {
  Beef,
  Croissant,
  Sparkles,
  Snowflake,
  Milk,
  Leaf,
  Package,
  Home,
} from 'lucide-react';
import { getCategoryIcon } from '../../utils/categoryIcon';

describe('getCategoryIcon', () => {
  it('returns Leaf icon for "frutas"', () => {
    const { Icon } = getCategoryIcon('frutas');
    expect(Icon).toBe(Leaf);
  });

  it('returns Beef icon for "carnes"', () => {
    const { Icon } = getCategoryIcon('carnes');
    expect(Icon).toBe(Beef);
  });

  it('returns Croissant icon for "padaria"', () => {
    const { Icon } = getCategoryIcon('padaria');
    expect(Icon).toBe(Croissant);
  });

  it('returns Sparkles icon for "higiene"', () => {
    const { Icon } = getCategoryIcon('higiene');
    expect(Icon).toBe(Sparkles);
  });

  it('returns Snowflake icon for "congelados"', () => {
    const { Icon } = getCategoryIcon('congelados');
    expect(Icon).toBe(Snowflake);
  });

  it('returns Milk icon for "laticínios"', () => {
    const { Icon } = getCategoryIcon('laticínios');
    expect(Icon).toBe(Milk);
  });

  it('returns Home icon for "limpeza"', () => {
    const { Icon } = getCategoryIcon('limpeza');
    expect(Icon).toBe(Home);
  });

  it('returns Package for an unknown category name', () => {
    const { Icon } = getCategoryIcon('unknown');
    expect(Icon).toBe(Package);
  });

  it('returns Package for an empty string', () => {
    const { Icon } = getCategoryIcon('');
    expect(Icon).toBe(Package);
  });

  it('returns a non-empty color string for any match', () => {
    const { color } = getCategoryIcon('frutas');
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  it('returns fallback color for unknown category', () => {
    const { color } = getCategoryIcon('unknown');
    expect(color).toBe('#6c757d');
  });

  it('matches case-insensitively for "CONGELADOS"', () => {
    const { Icon } = getCategoryIcon('CONGELADOS');
    expect(Icon).toBe(Snowflake);
  });

  it('matches case-insensitively for "Padaria"', () => {
    const { Icon } = getCategoryIcon('Padaria');
    expect(Icon).toBe(Croissant);
  });
});
