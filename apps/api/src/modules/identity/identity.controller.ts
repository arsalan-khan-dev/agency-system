import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { IdentityService } from './identity.service';
import { AuditLogService } from './audit-log.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/user.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Controller('api/v1/auth')
export class IdentityController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.identityService.validateCredentials(dto.email, dto.password);

    // Regenerate session on privilege change (login) to prevent session fixation.
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.userId = user.id;
    req.session.roleName = user.role.name;

    await this.auditLogService.record({
      userId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
    };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = req.session.userId as string;
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie('agency.sid');
    await this.auditLogService.record({
      userId,
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@Req() req: Request) {
    const user = await this.identityService.findByIdSafe(req.session.userId as string);
    return user;
  }

  // Self-service password change — any authenticated user, any role, no
  // @Roles restriction. Contrast with UserController's admin-only
  // PATCH /users/:id/password, which sets a password without knowing the
  // old one.
  @Patch('password')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    await this.identityService.changeOwnPassword(req.session.userId as string, dto);
    return { success: true };
  }
}
