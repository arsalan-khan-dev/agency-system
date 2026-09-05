import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class GenerateQuotationDto {
  @IsUUID()
  estimateId: string;

  @IsUUID()
  clientId: string;

  // Phase 2 task 4 — recurring quotations. 'none' (the default) is a
  // normal one-off quotation; 'monthly'/'quarterly' marks it as billed on
  // an interval once accepted. No usage tracking — explicitly scoped this
  // way with the person.
  @IsOptional()
  @IsIn(['none', 'monthly', 'quarterly'])
  recurringInterval?: 'none' | 'monthly' | 'quarterly';
}

export class ReviseQuotationDto {
  @IsUUID()
  quotationId: string; // the existing quotation (any version) to revise from
}
