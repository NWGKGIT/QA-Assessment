import { IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsNotEmpty()
  @IsNumber({}, { message: 'userId must be a number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsNotEmpty()
  @IsNumber({}, { message: 'productId must be a number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNotEmpty()
  @IsNumber({}, { message: 'quantity must be a number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
