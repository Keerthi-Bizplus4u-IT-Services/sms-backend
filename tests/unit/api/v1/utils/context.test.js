const { resolveSchoolIdFromRequest, ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { AppError } = require('../../../../../src/middleware/error.middleware');

describe('context utils', () => {
  describe('resolveSchoolIdFromRequest', () => {
    it('uses server-scoped school for non-super-admin and ignores client hints', () => {
      const req = {
        user: { roleName: 'admin', schoolId: 10 },
        headers: { 'x-school-id': '99' },
        query: { schoolId: '77' },
        body: { school_id: 88 }
      };

      const schoolId = resolveSchoolIdFromRequest(req);
      expect(schoolId).toBe(10);
    });

    it('uses authContext school when present for non-super-admin', () => {
      const req = {
        authContext: { roleName: 'teacher', schoolId: 44 },
        user: { roleName: 'teacher', schoolId: 10 },
        headers: { 'x-school-id': '99' }
      };

      const schoolId = resolveSchoolIdFromRequest(req);
      expect(schoolId).toBe(44);
    });

    it('allows super_admin to select school via client hint', () => {
      const req = {
        authContext: { roleName: 'super_admin', schoolId: null },
        user: { roleName: 'super_admin' },
        headers: { 'x-school-id': '7' }
      };

      const schoolId = resolveSchoolIdFromRequest(req);
      expect(schoolId).toBe(7);
    });

    it('returns null for super_admin without selected school', () => {
      const req = {
        authContext: { roleName: 'super_admin', schoolId: null },
        user: { roleName: 'super_admin' }
      };

      const schoolId = resolveSchoolIdFromRequest(req);
      expect(schoolId).toBeNull();
    });
  });

  describe('ensureSchoolContext', () => {
    it('returns resolved school id when available', () => {
      const req = {
        user: { roleName: 'admin', schoolId: 21 }
      };

      expect(ensureSchoolContext(req)).toBe(21);
    });

    it('throws AppError when school context is missing', () => {
      const req = {
        authContext: { roleName: 'super_admin', schoolId: null },
        user: { roleName: 'super_admin' }
      };

      expect(() => ensureSchoolContext(req)).toThrow(AppError);
      expect(() => ensureSchoolContext(req)).toThrow('School context is required');
    });
  });
});
