import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PricingRuleType } from '../../pricing/entities/pricing-rule.entity';

const ANSWER_TYPES: PricingRuleType[] = ['complexity', 'urgency'];

class QuestionOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;
}

export class CreateEstimationQuestionDto {
  @IsUUID()
  projectTypeId: string;

  @IsString()
  @MinLength(3)
  prompt: string;

  @IsIn(ANSWER_TYPES)
  answerType: PricingRuleType;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options: QuestionOptionDto[];
}

export class UpdateEstimationQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  prompt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
