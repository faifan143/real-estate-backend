import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateRequestDto {
  @IsEnum(['BUY', 'RENT'])
  @IsNotEmpty()
  type: 'BUY' | 'RENT';
}
