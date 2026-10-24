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
  if (moduleName === 'shipments' && ['Shipment Manager', 'Shipment Specialist', 'Orders & Shipments Specialist'].includes(roleName)) {
    return true;
  }
  if (moduleName === 'orders' && ['Sales Executive', 'Channel Partner', 'Orders & Shipments Specialist', 'Orders & Purchases Specialist'].includes(roleName)) {
    return true;
  }

  return false;
}

/**
 * Returns allowed companies for a user.
 * Users with allowed_companies set in DB are restricted to those companies.
 * Users without allowed_companies have access to all companies.
 */
export function getAllowedCompanies(currentUser: any): string[] {
  const ALL_COMPANIES = ['ADBH', 'Vetai', 'Globle', 'Canton', 'canton'];
  if (!currentUser) return ['ADBH', 'Vetai', 'Globle', 'Canton'];
  if (currentUser.is_admin || currentUser.role_name === 'Super Admin') return ['ADBH', 'Vetai', 'Globle', 'Canton'];

  if (currentUser.allowed_companies) {
    const raw = currentUser.allowed_companies.split(',').map((c: string) => c.trim().toLowerCase());
    const filtered = ALL_COMPANIES.filter(c => raw.some((r: string) => c.toLowerCase().includes(r) || r.includes(c.toLowerCase()) || (r === 'global' && c.toLowerCase() === 'globle')));
    return filtered.length > 0 ? Array.from(new Set(filtered)) : currentUser.allowed_companies.split(',').map((c: string) => c.trim());
  }

  return ['ADBH', 'Vetai', 'Globle', 'Canton'];
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
