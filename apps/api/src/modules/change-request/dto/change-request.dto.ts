import { IsInt, IsNumber, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateChangeRequestDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  // May be negative (a scope REDUCTION is still a change request).
  @IsNumber()
  hoursDelta: number;

  // Integer cents. May be negative. See MEMORY.md Section 05 — no floating
  // point for money anywhere in this app.
  @IsInt()
  priceDeltaCents: number;
}
