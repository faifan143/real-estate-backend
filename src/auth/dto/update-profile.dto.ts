import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  firstName?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

