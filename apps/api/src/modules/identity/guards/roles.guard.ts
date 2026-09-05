import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleName } from '../entities/role.entity';

// Field/route-level RBAC. Runs AFTER SessionAuthGuard (which guarantees
// req.session.userId + req.session.roleName exist). See MEMORY.md Section 13.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // no @Roles() decorator = any authenticated user
    }
    const req = context.switchToHttp().getRequest();
    const userRole: RoleName | undefined = req.session?.roleName;
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
