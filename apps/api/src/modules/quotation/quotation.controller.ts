import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { QuotationService } from './quotation.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { GenerateQuotationDto } from './dto/quotation.dto';

@Controller('api/v1/quotations')
@UseGuards(SessionAuthGuard, RolesGuard)
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Get()
  list() {
    return this.quotationService.list();
  }

  // Must be declared before ':id' — otherwise Nest would match
  // "due-for-billing" as an :id param on the route below.
  @Get('due-for-billing')
  listDueForBilling() {
    return this.quotationService.listDueForBilling();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.quotationService.get(id);
  }

  @Get(':groupId/versions')
  getVersionHistory(@Param('groupId') groupId: string) {
    return this.quotationService.getVersionHistory(groupId);
  }

  @Post('generate')
  @Roles('admin', 'manager', 'estimator')
  generate(@Body() dto: GenerateQuotationDto, @Req() req: Request) {
    return this.quotationService.generate(dto, req.session.userId ?? null);
  }

  @Post(':id/revise')
  @Roles('admin', 'manager', 'estimator')
  revise(@Param('id') id: string, @Req() req: Request) {
    return this.quotationService.reviseFrom(id, req.session.userId ?? null);
  }

  @Patch(':id/send')
  @Roles('admin', 'manager', 'estimator')
  send(@Param('id') id: string, @Req() req: Request) {
    return this.quotationService.send(id, req.session.userId ?? null);
  }

  @Patch(':id/accept')
  @Roles('admin', 'manager', 'estimator')
  accept(@Param('id') id: string, @Req() req: Request) {
    return this.quotationService.accept(id, req.session.userId ?? null);
  }

  @Patch(':id/reject')
  @Roles('admin', 'manager', 'estimator')
  reject(@Param('id') id: string, @Req() req: Request) {
    return this.quotationService.reject(id, req.session.userId ?? null);
  }

  @Patch(':id/expire')
  @Roles('admin', 'manager', 'estimator')
  expire(@Param('id') id: string, @Req() req: Request) {
    return this.quotationService.expire(id, req.session.userId ?? null);
  }

  @Post(':id/generate-next-instance')
  @Roles('admin', 'manager', 'estimator')
  generateNextInstance(@Param('id') id: string, @Req() req: Request) {
    return this.quotationService.generateNextRecurringInstance(id, req.session.userId ?? null);
  }

  @Post(':id/send-billing-reminder')
  @Roles('admin', 'manager', 'estimator')
  sendBillingReminder(@Param('id') id: string, @Req() req: Request) {
    return this.quotationService.sendBillingReminder(id, req.session.userId ?? null);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const quotation = await this.quotationService.get(id);
    const pdfBuffer = await this.quotationService.generatePdf(quotation);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quotation-${quotation.titleSnapshot.replace(/[^a-z0-9]+/gi, '-')}-v${quotation.version}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }
}
