import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EmailLog } from './entities/email-log.entity';

export interface QueueEmailInput {
  recipientEmail: string;
  subject: string;
  body: string;
  relatedQuotationId?: string;
}

/**
 * Log/queue-only email delivery (Phase 2 task 4, MEMORY.md Section 19).
 * Does NOT send real email — there is no SMTP integration in this sandbox
 * and none was requested; every call here writes a row to email_logs so
 * the content is inspectable and the "would this have been sent, and with
 * what content" question is answerable without a live mail server.
 * Wiring a real transport (SES, Postmark, SMTP, etc.) in production would
 * mean adding a send step here — the call site (QuotationService.send)
 * would not need to change.
 */
@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(EmailLog) private emailLogRepo: Repository<EmailLog>) {}

  async queueEmail(input: QueueEmailInput, manager?: EntityManager): Promise<EmailLog> {
    const repo = manager ? manager.getRepository(EmailLog) : this.emailLogRepo;
    const log = repo.create({
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      body: input.body,
      relatedQuotation: input.relatedQuotationId ? ({ id: input.relatedQuotationId } as never) : null,
      status: 'queued',
    });
    return repo.save(log);
  }

  listForQuotation(quotationId: string) {
    return this.emailLogRepo.find({
      where: { relatedQuotation: { id: quotationId } },
      order: { createdAt: 'DESC' },
    });
  }

  list() {
    return this.emailLogRepo.find({
      relations: ['relatedQuotation'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
