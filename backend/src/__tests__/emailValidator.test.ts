import { describe, it, expect } from 'vitest';
import { validateEmail } from '../services/emailValidator';

describe('Email Validator', () => {
  describe('Valid emails', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@example.co.uk',
        'test+tag@company.org',
        'user.name+tag@example.com',
        'firstname.lastname@example.com',
      ];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    it('should normalize emails to lowercase', () => {
      const result = validateEmail('User@EXAMPLE.COM');
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid format', () => {
    it('should reject emails without @ symbol', () => {
      const result = validateEmail('invalidemail.com');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email format');
    });

    it('should reject emails without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email format');
    });

    it('should reject emails without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email format');
    });

    it('should reject emails with spaces', () => {
      const result = validateEmail('user name@example.com');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email format');
    });

    it('should accept emails with special characters allowed by RFC', () => {
      // The # character is actually allowed in the local part according to RFC 5321
      const result = validateEmail('user#name@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Email address is too long');
    });

    it('should reject emails with invalid domain length', () => {
      const result = validateEmail('user@x');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email domain');
    });
  });

  describe('Disposable domains', () => {
    it('should reject common disposable email domains', () => {
      const disposableEmails = [
        'user@mailinator.com',
        'test@guerrillamail.com',
        'temp@tempmail.com',
        'throwaway@throwaway.email',
        'temporary@yopmail.com',
      ];

      disposableEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Disposable email addresses are not allowed');
      });
    });

    it('should reject all variations of disposable domains in the blocklist', () => {
      const disposableDomains = [
        'user@10minutemail.com',
        'test@sharklasers.com',
        'temp@maildrop.cc',
        'test@nada.email',
        'user@temp-mail.io',
      ];

      disposableDomains.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Disposable email addresses are not allowed');
      });
    });
  });

  describe('Empty and null emails', () => {
    it('should reject empty string', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Email is required');
    });

    it('should reject null/undefined as invalid type', () => {
      const result = validateEmail(null as any);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Email is required');
    });

    it('should reject whitespace-only string', () => {
      const result = validateEmail('   ');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email format');
    });
  });

  describe('Edge cases', () => {
    it('should accept emails with dots in local part', () => {
      const result = validateEmail('first.last.name@example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept emails with plus sign for tagging', () => {
      const result = validateEmail('user+tag+another@example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept emails with hyphens in domain', () => {
      const result = validateEmail('user@my-domain.com');
      expect(result.valid).toBe(true);
    });

    it('should accept emails with numbers in domain', () => {
      const result = validateEmail('user@domain123.com');
      expect(result.valid).toBe(true);
    });

    it('should handle international domain extensions', () => {
      const result = validateEmail('user@example.co.uk');
      expect(result.valid).toBe(true);
    });

    it('should handle three-letter TLDs', () => {
      const result = validateEmail('user@example.org');
      expect(result.valid).toBe(true);
    });
  });
});
