import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class LogActualDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description: string;

  @IsNumber()
  @Min(0.01)
  hoursLogged: number;

  @IsOptional()
  @IsDateString()
  loggedAt?: string;
}

export class LogExpenseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description: string;

  @IsInt()
  @Min(1)
  amountCents: number;

  @IsOptional()
  @IsDateString()
  incurredAt?: string;
}
