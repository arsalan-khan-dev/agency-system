import { Controller, Get, Param, Post } from '@nestjs/common';
import { QuotationService } from './quotation.service';

/**
 * Phase 2 task 4 — signed acceptance links. Deliberately has NO
 * SessionAuthGuard/RolesGuard: the whole point is that a client can view
 * and respond to a quotation without an account. The random, unguessable,
 * time-limited token IS the authorization (see QuotationService.findByToken)
 * — this is intentional, not an oversight, and must stay this way.
 */
@Controller('api/v1/public/quotations')
export class PublicQuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Get(':token')
  view(@Param('token') token: string) {
    return this.quotationService.getPublicViewByToken(token);
  }

  @Post(':token/accept')
  accept(@Param('token') token: string) {
    return this.quotationService.acceptByToken(token);
  }

  @Post(':token/reject')
  reject(@Param('token') token: string) {
    return this.quotationService.rejectByToken(token);
  }
}
