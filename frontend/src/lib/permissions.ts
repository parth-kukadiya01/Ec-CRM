/**
 * Check if the user has a specific permission or module access.
 */
export function hasPermission(currentUser: any, requiredPermission: string): boolean {
  if (!currentUser) return false;

  // 1. Super Admin and General/Operations Manager have unrestricted access to everything
  if (currentUser.is_admin || ['Super Admin', 'General Manager', 'Operations Manager'].includes(currentUser.role_name)) {
    return true;
  }

  const userPerms: string[] = currentUser.permissions || (currentUser.role?.permissions ? currentUser.role.permissions.map((p: any) => p.name) : []);
  const roleName = currentUser.role_name || currentUser.role?.name || '';
  const [moduleName, action] = requiredPermission.split(':');

  // Role name default permissions
  if (moduleName === 'inventory' && ['Inventory Manager', 'Operations Manager', 'General Manager'].includes(roleName)) {
    return true;
  }
  if (moduleName === 'purchases' && ['Purchase Manager', 'Inventory Manager'].includes(roleName)) {
    return true;
  }
  if (moduleName === 'shipments' && ['Shipment Manager', 'Sales Executive'].includes(roleName)) {
    return true;
  }
  if (moduleName === 'orders' && ['Sales Executive', 'Shipment Manager'].includes(roleName)) {
    return true;
  }

  // 2. Explicit wildcard or specific permission match
  if (userPerms.includes('*') || userPerms.includes(requiredPermission)) {
    return true;
  }

  // Check if user holds any write permission which implies read
  if (action === 'read' && userPerms.includes(`${moduleName}:write`)) {
    return true;
  }

  // Check generic module permissions if granted
  if (userPerms.some((p) => p === moduleName || p.startsWith(`${moduleName}:`))) {
    return true;
  }

  if (moduleName === 'orders') {
    if (['Sales Executive', 'Channel Partner', 'Shipment Manager', 'Purchase Manager'].includes(roleName) || currentUser.is_partner) {
      return true;
    }
  }

  if (moduleName === 'purchases') {
    if (['Purchase Manager', 'Inventory Manager'].includes(roleName)) {
      return true;
    }
  }

  if (moduleName === 'shipments') {
    if (['Shipment Manager', 'Sales Executive', 'Channel Partner'].includes(roleName) || currentUser.is_partner) {
      return true;
    }
  }

  if (moduleName === 'accounts') {
    if (['Sales Executive'].includes(roleName)) {
      return true;
    }
  }

  if (moduleName === 'employees' || moduleName === 'roles') {
    if (['Super Admin', 'General Manager', 'Operations Manager'].includes(roleName)) {
      return true;
    }
  }

  return false;
}
