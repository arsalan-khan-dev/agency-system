import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

// Server-side session check. Requires express-session middleware to already
// have populated req.session. See MEMORY.md Section 03 (Auth = session-based).
@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.session || !req.session.userId) {
      throw new UnauthorizedException('Not authenticated');
    }
    return true;
  }
}
