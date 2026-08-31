/**
 * Check if the user has a specific permission or module access.
 */
export function hasPermission(currentUser: any, requiredPermission: string): boolean {
  if (!currentUser) return false;

  // 1. Super Admin has unrestricted access to everything
  if (currentUser.is_admin || currentUser.role_name === 'Super Admin') {
    return true;
  }

  // Dashboard is strictly restricted to Super Admin ONLY
  if (requiredPermission === 'dashboard') {
    return false;
  }

  const userPerms: string[] = currentUser.permissions || (currentUser.role?.permissions ? currentUser.role.permissions.map((p: any) => p.name) : []);
  const roleName = currentUser.role_name || currentUser.role?.name || '';
  const [moduleName, action] = requiredPermission.split(':');

  // 2. Explicit wildcard or specific permission match
  if (userPerms.includes('*') || userPerms.includes(requiredPermission)) {
    return true;
  }

  // Check if user holds write or delete permission which implies read
  if (action === 'read' && (userPerms.includes(`${moduleName}:write`) || userPerms.includes(`${moduleName}:delete`))) {
    return true;
  }

  // Check generic module permissions if granted
  if (userPerms.some((p) => p === moduleName || p.startsWith(`${moduleName}:`))) {
    return true;
  }

  // If role has explicit permissions assigned, strictly rely on them
  if (userPerms.length > 0) {
    return false;
  }

  // Fallback only when role has no explicit permissions configured:
  if (['General Manager', 'Operations Manager', 'Orders, Purchases & Shipments Specialist'].includes(roleName)) {
    return true;
  }

  if (moduleName === 'inventory' && ['Inventory Manager'].includes(roleName)) {
    return true;
  }
  if (moduleName === 'purchases' && ['Purchase Manager'].includes(roleName)) {
    return true;
  }
  if (moduleName === 'shipments' && ['Shipment Manager'].includes(roleName)) {
    return true;
  }
  if (moduleName === 'orders' && ['Sales Executive', 'Channel Partner'].includes(roleName)) {
    return true;
  }

  return false;
}

/**
 * Returns allowed companies for a user.
 * User 2 (ops2@crm.com or users with allowed_companies set) only have access to ADBH and Globle.
 * Super Admin and User 1 (ops1@crm.com) have access to all companies.
 */
export function getAllowedCompanies(currentUser: any): string[] {
  const ALL_COMPANIES = ['ADBH', 'Vetai', 'Globle', 'canton'];
  if (!currentUser) return ALL_COMPANIES;
  if (currentUser.is_admin || currentUser.role_name === 'Super Admin') return ALL_COMPANIES;

  if (currentUser.email === 'ops2@crm.com' || currentUser.allowed_companies) {
    if (currentUser.allowed_companies) {
      const raw = currentUser.allowed_companies.split(',').map((c: string) => c.trim().toLowerCase());
      const filtered = ALL_COMPANIES.filter(c => raw.some((r: string) => c.toLowerCase().includes(r) || r.includes(c.toLowerCase()) || (r === 'global' && c.toLowerCase() === 'globle')));
      return filtered.length > 0 ? filtered : ['ADBH', 'Globle'];
    }
    return ['ADBH', 'Globle'];
  }

  return ALL_COMPANIES;
}

/**
 * Determine default landing route based on user permissions
 */
export function getDefaultRoute(currentUser: any): string {
  if (!currentUser) return '/';
  if (hasPermission(currentUser, 'dashboard')) return '/dashboard';
  if (hasPermission(currentUser, 'orders:read')) return '/dashboard/orders';
  if (hasPermission(currentUser, 'purchases:read')) return '/dashboard/purchases';
  if (hasPermission(currentUser, 'shipments:read')) return '/dashboard/shipments';
  if (hasPermission(currentUser, 'accounts:read')) return '/dashboard/accounts';
  return '/dashboard/profile';
}
