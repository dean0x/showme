import { describe, it, expect, vi } from 'vitest';
import { pipe, identity, tap, map, type Result } from '../utils/pipe.js';

describe('Pipe Composition', () => {
  it('should pipe single function correctly', async () => {
    const double = (x: number): Result<number, never> => ({ ok: true, value: x * 2 });
    
    const pipeline = pipe(double);
    const result = await pipeline(5);
    
    expect(result).toEqual({ ok: true, value: 10 });
  });

  it('should compose multiple functions in sequence', async () => {
    const double = (x: number): Result<number, never> => ({ ok: true, value: x * 2 });
    const addTen = (x: number): Result<number, never> => ({ ok: true, value: x + 10 });
    const toString = (x: number): Result<string, never> => ({ ok: true, value: x.toString() });
    
    const pipeline = pipe(double, addTen, toString);
    const result = await pipeline(5);
    
    expect(result).toEqual({ ok: true, value: '20' });
  });

  it('should stop execution on first error', async () => {
    const double = (x: number): Result<number, never> => ({ ok: true, value: x * 2 });
    const fail = (): Result<never, Error> => ({ ok: false, error: new Error('Failed') });
    const addTen = vi.fn((x: number): Result<number, never> => ({ ok: true, value: x + 10 }));
    
    const pipeline = pipe(double, fail, addTen);
    const result = await pipeline(5);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Failed');
    }
    expect(addTen).not.toHaveBeenCalled();
  });

  it('should handle async functions correctly', async () => {
    const asyncDouble = async (x: number): Promise<Result<number, never>> => 
      ({ ok: true, value: x * 2 });
    const syncAddTen = (x: number): Result<number, never> => 
      ({ ok: true, value: x + 10 });
    
    const pipeline = pipe(asyncDouble, syncAddTen);
    const result = await pipeline(5);
    
    expect(result).toEqual({ ok: true, value: 20 });
  });

  it('should catch thrown exceptions and convert to error results', async () => {
    const throwError = (): never => {
      throw new Error('Thrown error');
    };
    
    const pipeline = pipe(throwError);
    const result = await pipeline(null);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Thrown error');
    }
  });

  describe('utility functions', () => {
    it('should provide identity function', () => {
      const result = identity(42);
      expect(result).toEqual({ ok: true, value: 42 });
    });

    it('should provide tap for side effects', () => {
      const sideEffect = vi.fn();
      const tapper = tap(sideEffect);
      
      const result = tapper('test');
      
      expect(result).toEqual({ ok: true, value: 'test' });
      expect(sideEffect).toHaveBeenCalledWith('test');
    });

    it('should provide map for transformations', () => {
      const mapper = map((x: number) => x.toString());
      
      const result = mapper(42);
      
      expect(result).toEqual({ ok: true, value: '42' });
    });

    it('should handle map transformation errors', () => {
      const mapper = map(() => {
        throw new Error('Transform failed');
      });
      
      const result = mapper('input');
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Transform failed');
      }
    });
  });
});