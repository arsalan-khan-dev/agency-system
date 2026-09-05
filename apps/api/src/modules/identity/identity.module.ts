import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { AuditLog } from './entities/audit-log.entity';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, AuditLog])],
  controllers: [IdentityController, UserController],
  providers: [IdentityService, UserService, AuditLogService],
  exports: [IdentityService, AuditLogService],
})
export class IdentityModule {}
