import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { CreateUserDto, SetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { AuditLogService } from './audit-log.service';

/**
 * Admin-only user management (Phase 2 follow-up, KI-004's other half).
 * Scope confirmed explicitly with the person before writing this:
 *  - Password reset is ADMIN-SET, not an email/link flow — the admin
 *    directly assigns a new password (communicated out of band, e.g.
 *    phone/in person). No token, no NotificationsService involvement.
 *  - Only the 'admin' role can create/edit/deactivate/delete users — see
 *    UserController's @Roles('admin') guard.
 *  - Deactivate (soft, via isActive) is the default path; hard delete is a
 *    separate, deliberate action that can fail if the user has historical
 *    records referencing them (estimates created, actuals/expenses logged)
 *    — those foreign keys intentionally have no ON DELETE CASCADE, so
 *    deleting a user with history throws a clear error instead of either
 *    silently orphaning financial records or silently blocking with a raw
 *    Postgres constraint error.
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list() {
    return this.userRepo.find({ relations: ['role'], order: { createdAt: 'ASC' } });
  }

  async get(id: string) {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['role'] });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async resolveRole(roleName: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { name: roleName as Role['name'] } });
    if (!role) throw new BadRequestException(`Unknown role "${roleName}"`);
    return role;
  }

  async create(dto: CreateUserDto, actingUserId: string | null) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const role = await this.resolveRole(dto.roleName);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        role,
        isActive: true,
      }),
    );

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: role.name },
    });

    return this.get(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string | null) {
    const user = await this.get(id);

    // Safety net (not explicitly requested, but a reasonable default): an
    // admin cannot deactivate their own account through this endpoint —
    // prevents an accidental self-lockout with no other admin available.
    // Deliberately does NOT block role changes on self, only deactivation.
    if (dto.isActive === false && id === actingUserId) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.roleName !== undefined) user.role = await this.resolveRole(dto.roleName);
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.userRepo.save(user);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'user.updated',
      entityType: 'User',
      entityId: id,
      metadata: { fullName: dto.fullName, roleName: dto.roleName, isActive: dto.isActive },
    });

    return this.get(id);
  }

  async setPassword(id: string, dto: SetPasswordDto, actingUserId: string | null) {
    const user = await this.get(id);
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);

    // Deliberately do NOT log the password itself, even hashed, in
    // metadata — only the fact that a reset happened and who did it.
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'user.password_reset',
      entityType: 'User',
      entityId: id,
    });

    return { success: true };
  }

  async hardDelete(id: string, actingUserId: string | null) {
    if (id === actingUserId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }
    const user = await this.get(id);

    try {
      await this.userRepo.remove(user);
    } catch (err) {
      // Postgres FK violation (23503) — the user created estimates or
      // logged actuals/expenses that reference them. Deliberately caught
      // and reworded rather than left as a raw DB error, per the person's
      // confirmed scope: deactivate is the default path for users with
      // history; hard delete is only for users with none.
      if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === '23503') {
        throw new ConflictException(
          'This user has historical records (estimates created, hours or expenses logged) and cannot be deleted. Deactivate the account instead.',
        );
      }
      throw err;
    }

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'user.deleted',
      entityType: 'User',
      entityId: id,
      metadata: { email: user.email },
    });

    return { success: true };
  }
}
