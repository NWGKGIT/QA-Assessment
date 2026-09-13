import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { ProductStatus } from 'src/constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Test Laptop' })
  @IsString()
  name: string;

  @IsNumber()
  @ApiProperty({ example: 1000 })
  price: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 10, minimum: 0 })
  quantity: number;

  @IsOptional()
  @IsEnum(ProductStatus, { message: 'Status must be a valid Product Status' })
  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.FOR_SALE })
  status?: ProductStatus;
}
