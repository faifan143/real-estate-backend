import { IsNotEmpty, IsNumber, IsDateString } from 'class-validator';

export class ApproveRequestDto {
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}
