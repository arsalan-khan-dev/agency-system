import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RoleName } from '../entities/role.entity';

const ROLE_NAMES: RoleName[] = ['admin', 'manager', 'estimator', 'viewer'];

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(200)
  password: string;

  @IsIn(ROLE_NAMES)
  roleName: RoleName;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsIn(ROLE_NAMES)
  roleName?: RoleName;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Phase 2 — admin-set password reset, confirmed scope: no email/link flow,
// the admin directly sets a new password for the user (e.g. over the
// phone or in person) and communicates it out of band.
export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(200)
  newPassword: string;
}

// Self-service password change, distinct from SetPasswordDto above: the
// user proves they know their current password rather than an admin
// unilaterally overwriting it. See IdentityService.changeOwnPassword.
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(200)
  newPassword: string;
}
