import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @ApiProperty({ example: 1 })
  userId: number;

  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 2, minimum: 1 })
  quantity: number;
}
