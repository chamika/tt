import { describe, it, expect } from 'vitest';
import { parseMatchDate } from './utils';

describe('parseMatchDate', () => {
  describe('Season starting logic (Aug-Dec import)', () => {
    it('should parse September fixture as current year when imported in September', () => {
      const referenceDate = new Date('2025-09-15'); // Mid September 2025
      const result = parseMatchDate('Sep 20', referenceDate);
      expect(result).toBe('2025-09-20');
    });

    it('should parse December fixture as current year when imported in December', () => {
      const referenceDate = new Date('2025-12-29'); // Late December 2025
      const result = parseMatchDate('Dec 10', referenceDate);
      expect(result).toBe('2025-12-10');
    });

    it('should parse January fixture as next year when imported in December', () => {
      const referenceDate = new Date('2025-12-29'); // Late December 2025
      const result = parseMatchDate('Jan 7', referenceDate);
      expect(result).toBe('2026-01-07');
    });

    it('should parse March fixture as next year when imported in December', () => {
      const referenceDate = new Date('2025-12-29'); // Late December 2025
      const result = parseMatchDate('Mar 15', referenceDate);
      expect(result).toBe('2026-03-15');
    });

    it('should parse August fixture as current year when imported in August', () => {
      const referenceDate = new Date('2025-08-01'); // Early August 2025
      const result = parseMatchDate('Aug 25', referenceDate);
      expect(result).toBe('2025-08-25');
    });
  });

  describe('Season ending logic (Jan-Jul import)', () => {
    it('should parse January fixture as current year when imported in January', () => {
      const referenceDate = new Date('2025-01-15'); // Mid January 2025
      const result = parseMatchDate('Jan 20', referenceDate);
      expect(result).toBe('2025-01-20');
    });

    it('should parse March fixture as current year when imported in March', () => {
      const referenceDate = new Date('2025-03-10'); // Mid March 2025
      const result = parseMatchDate('Mar 25', referenceDate);
      expect(result).toBe('2025-03-25');
    });

    it('should parse September fixture as previous year when imported in March', () => {
      const referenceDate = new Date('2025-03-10'); // Mid March 2025
      const result = parseMatchDate('Sep 16', referenceDate);
      expect(result).toBe('2024-09-16');
    });

    it('should parse December fixture as previous year when imported in January', () => {
      const referenceDate = new Date('2025-01-15'); // Mid January 2025
      const result = parseMatchDate('Dec 10', referenceDate);
      expect(result).toBe('2024-12-10');
    });
  });

  describe('Full season scenarios', () => {
    it('should handle full season when imported in September', () => {
      const referenceDate = new Date('2025-09-15'); // Mid September 2025
      
      // All fixtures should span 2025-2026
      expect(parseMatchDate('Aug 28', referenceDate)).toBe('2025-08-28');
      expect(parseMatchDate('Sep 16', referenceDate)).toBe('2025-09-16');
      expect(parseMatchDate('Oct 24', referenceDate)).toBe('2025-10-24');
      expect(parseMatchDate('Nov 12', referenceDate)).toBe('2025-11-12');
      expect(parseMatchDate('Dec 10', referenceDate)).toBe('2025-12-10');
      expect(parseMatchDate('Jan 7', referenceDate)).toBe('2026-01-07');
      expect(parseMatchDate('Feb 14', referenceDate)).toBe('2026-02-14');
      expect(parseMatchDate('Mar 21', referenceDate)).toBe('2026-03-21');
    });

    it('should handle full season when imported in February', () => {
      const referenceDate = new Date('2025-02-10'); // Mid February 2025
      
      // All fixtures should span 2024-2025
      expect(parseMatchDate('Aug 28', referenceDate)).toBe('2024-08-28');
      expect(parseMatchDate('Sep 16', referenceDate)).toBe('2024-09-16');
      expect(parseMatchDate('Oct 24', referenceDate)).toBe('2024-10-24');
      expect(parseMatchDate('Nov 12', referenceDate)).toBe('2024-11-12');
      expect(parseMatchDate('Dec 10', referenceDate)).toBe('2024-12-10');
      expect(parseMatchDate('Jan 7', referenceDate)).toBe('2025-01-07');
      expect(parseMatchDate('Feb 14', referenceDate)).toBe('2025-02-14');
      expect(parseMatchDate('Mar 21', referenceDate)).toBe('2025-03-21');
    });
  });

  describe('Edge cases', () => {
    it('should handle July import (before season starts)', () => {
      const referenceDate = new Date('2025-07-15'); // Mid July 2025
      
      // Previous season fixtures (2024-2025)
      expect(parseMatchDate('Sep 16', referenceDate)).toBe('2024-09-16');
      expect(parseMatchDate('Jan 7', referenceDate)).toBe('2025-01-07');
    });

    it('should handle August 1st import (season just started)', () => {
      const referenceDate = new Date('2025-08-01'); // First day of August 2025
      
      // New season fixtures (2025-2026)
      expect(parseMatchDate('Aug 28', referenceDate)).toBe('2025-08-28');
      expect(parseMatchDate('Jan 7', referenceDate)).toBe('2026-01-07');
    });

    it('should handle December 31st import (end of year)', () => {
      const referenceDate = new Date('2025-12-31'); // Last day of December 2025
      
      // Season 2025-2026
      expect(parseMatchDate('Sep 16', referenceDate)).toBe('2025-09-16');
      expect(parseMatchDate('Jan 7', referenceDate)).toBe('2026-01-07');
    });

    it('should handle January 1st import (start of new year)', () => {
      const referenceDate = new Date('2025-01-01'); // First day of January 2025
      
      // Season 2024-2025
      expect(parseMatchDate('Sep 16', referenceDate)).toBe('2024-09-16');
      expect(parseMatchDate('Jan 7', referenceDate)).toBe('2025-01-07');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid month', () => {
      const referenceDate = new Date('2025-09-15');
      expect(() => parseMatchDate('Xyz 16', referenceDate)).toThrow('Invalid month in date string');
    });

    it('should throw error for malformed date string', () => {
      const referenceDate = new Date('2025-09-15');
      expect(() => parseMatchDate('16-Sep', referenceDate)).toThrow('Invalid date format');
    });
  });

  describe('Current date (no reference)', () => {
    it('should use current date when no reference date provided', () => {
      // This test will use the actual current date
      const result = parseMatchDate('Sep 16');
      
      // Should be a valid ISO date string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
