import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { ChangePasswordDto } from './dto/user.dto';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Validates credentials and returns the user (including role) on success.
   * Never returns/leaks the password hash to callers.
   */
  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['role'],
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        isActive: true,
      } as any,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async findByIdSafe(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['role'] });
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  /**
   * Self-service password change: the user proves knowledge of their
   * current password rather than an admin overwriting it (contrast with
   * UserService.setPassword, which is the admin-set reset path and has
   * deliberately no old-password check). Available to any authenticated,
   * active user regardless of role — this is not admin-gated.
   */
  async changeOwnPassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        isActive: true,
      } as any,
    });

    if (!user || !user.isActive) {
      // Shouldn't happen behind SessionAuthGuard for a live session, but
      // guard anyway rather than trusting the session blindly.
      throw new UnauthorizedException('Not authenticated');
    }

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must be different from your current password');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);

    // Distinct audit action from 'user.password_reset' (admin-set) so the
    // two paths are told apart in the audit trail.
    await this.auditLogService.record({
      userId,
      action: 'auth.password_changed',
      entityType: 'User',
      entityId: userId,
    });
  }
}
