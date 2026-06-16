import { describe, it, expect } from 'vitest';
import { validateName } from '../services/nameValidator';

describe('validateName', () => {
  it('allows empty/missing names (name is optional)', () => {
    expect(validateName(undefined).valid).toBe(true);
    expect(validateName(null).valid).toBe(true);
    expect(validateName('').valid).toBe(true);
    expect(validateName('   ').valid).toBe(true);
  });

  it('allows realistic names', () => {
    expect(validateName('Jane Smith').valid).toBe(true);
    expect(validateName("O'Brien").valid).toBe(true);
    expect(validateName('Mary-Jane Watson').valid).toBe(true);
    expect(validateName('José García').valid).toBe(true);
    expect(validateName('Al').valid).toBe(true);
  });

  it('rejects known junk values', () => {
    for (const junk of ['Test', 'ABC', 'XYZ', 'asdf', 'qwerty', 'John Doe', 'N/A', 'Anonymous', 'User']) {
      expect(validateName(junk).valid, `expected "${junk}" to be invalid`).toBe(false);
    }
  });

  it('rejects single characters', () => {
    expect(validateName('X').valid).toBe(false);
  });

  it('rejects numbers-only input', () => {
    expect(validateName('12345').valid).toBe(false);
  });

  it('rejects repeated-character spam', () => {
    expect(validateName('aaaaaa').valid).toBe(false);
    expect(validateName('Bbbbbbb').valid).toBe(false);
  });

  it('rejects keyboard mashes', () => {
    expect(validateName('qwertyuiop').valid).toBe(false);
    expect(validateName('asdfgh').valid).toBe(false);
  });

  it('rejects non-name characters', () => {
    expect(validateName('John123').valid).toBe(false);
    expect(validateName('<script>').valid).toBe(false);
    expect(validateName('!!!!!').valid).toBe(false);
  });

  it('rejects consonant-only strings with no vowels', () => {
    expect(validateName('Xkjhgf').valid).toBe(false);
  });

  it('rejects overly long input', () => {
    expect(validateName('A'.repeat(101)).valid).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(validateName(12345 as any).valid).toBe(false);
    expect(validateName({} as any).valid).toBe(false);
  });
});
