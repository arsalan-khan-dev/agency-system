import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength, MinLength } from 'class-validator';
import { PricingRuleType } from '../entities/pricing-rule.entity';

const RULE_TYPES: PricingRuleType[] = ['complexity', 'urgency'];

export class CreatePricingRuleDto {
  @IsUUID()
  profileId: string;

  @IsIn(RULE_TYPES)
  ruleType: PricingRuleType;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @IsNumber()
  @Min(0.01)
  multiplier: number;
}

export class UpdatePricingRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  multiplier?: number;
}
