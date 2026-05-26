/**
 * Unit tests for Report Permissions Matrix
 */

const {
  REPORT_PERMISSIONS_MATRIX,
  isRoleAllowed,
  requiredPermission
} = require('../../../../../src/api/v1/config/report-permissions.matrix');

describe('Report Permissions Matrix', () => {
  describe('REPORT_PERMISSIONS_MATRIX structure', () => {
    it('should define entries for all dashboard endpoints', () => {
      expect(REPORT_PERMISSIONS_MATRIX['GET /dashboard/summary']).toBeDefined();
      expect(REPORT_PERMISSIONS_MATRIX['GET /dashboard/gender-counts']).toBeDefined();
    });

    it('should define entries for all report endpoints', () => {
      expect(REPORT_PERMISSIONS_MATRIX['GET /reports/fees']).toBeDefined();
      expect(REPORT_PERMISSIONS_MATRIX['GET /reports/expenses']).toBeDefined();
      expect(REPORT_PERMISSIONS_MATRIX['GET /reports/students']).toBeDefined();
      expect(REPORT_PERMISSIONS_MATRIX['GET /reports/financial-summary']).toBeDefined();
    });

    it('every entry should have permission, description and allowedRoles', () => {
      for (const [endpoint, entry] of Object.entries(REPORT_PERMISSIONS_MATRIX)) {
        expect(entry.permission).toBeDefined();
        expect(typeof entry.permission).toBe('string');
        expect(entry.description).toBeDefined();
        expect(Array.isArray(entry.allowedRoles)).toBe(true);
        expect(entry.allowedRoles.length).toBeGreaterThan(0);
      }
    });

    it('super_admin should be in allowedRoles for every endpoint', () => {
      for (const [endpoint, entry] of Object.entries(REPORT_PERMISSIONS_MATRIX)) {
        expect(entry.allowedRoles).toContain('super_admin');
      }
    });
  });

  describe('isRoleAllowed', () => {
    it('should return true for admin on dashboard summary', () => {
      expect(isRoleAllowed('GET /dashboard/summary', 'admin')).toBe(true);
    });

    it('should return true for accounts on fee reports', () => {
      expect(isRoleAllowed('GET /reports/fees', 'accounts')).toBe(true);
    });

    it('should return false for student on report endpoints', () => {
      expect(isRoleAllowed('GET /reports/fees', 'student')).toBe(false);
    });

    it('should return false for unknown endpoint', () => {
      expect(isRoleAllowed('GET /unknown', 'admin')).toBe(false);
    });
  });

  describe('requiredPermission', () => {
    it('should return dashboard:read for dashboard endpoints', () => {
      expect(requiredPermission('GET /dashboard/summary')).toBe('dashboard:read');
    });

    it('should return reports:read for report endpoints', () => {
      expect(requiredPermission('GET /reports/fees')).toBe('reports:read');
    });

    it('should return null for unknown endpoint', () => {
      expect(requiredPermission('GET /unknown')).toBeNull();
    });
  });
});
