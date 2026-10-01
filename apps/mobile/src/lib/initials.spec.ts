import { describe, expect, it } from 'vitest';
import { getInitials } from './initials';

describe('getInitials', () => {
  it('uses the first and last name initials', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('  koné   nonwa  ')).toBe('KN');
    expect(getInitials('Jean Pierre Dupont')).toBe('JD');
  });

  it('uses a single initial for a single name', () => {
    expect(getInitials('Marie')).toBe('M');
  });

  it('falls back to the email then to a placeholder', () => {
    expect(getInitials('', 'jane@appatam.com')).toBe('J');
    expect(getInitials(null, null)).toBe('?');
  });
});
