import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogInput {
  userId: string | null;
  action: string; // e.g. 'auth.login', 'quotation.sent', 'expense.logged'
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Explicit, honest audit logging: services call `record()` at the specific
 * points listed in MEMORY.md Section 13 rather than an interceptor claiming
 * blanket coverage of every mutation. See KI-007 (this was schema-only
 * since Phase 1A) and Phase 1E task 3.
 *
 * Currently wired at: auth.login, auth.logout, quotation.sent,
 * quotation.accepted, quotation.rejected, quotation.expired,
 * expense.logged, change_request.created/approved/rejected (Section 43).
 * NOT wired at every CRUD endpoint — that remains a gap,
 * documented rather than silently expanded without a corresponding call site.
 */
@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>) {}

  async record(input: AuditLogInput): Promise<void> {
    const entry = this.auditRepo.create({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
    await this.auditRepo.save(entry);
  }

  async listRecent(limit = 50) {
    return this.auditRepo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
