import { IsString, IsNumber, IsOptional, Min, IsEnum, MaxLength } from 'class-validator';
import { ProductStatus } from 'src/constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Test Laptop', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than zero' })
  @ApiProperty({ example: 1000, minimum: 0.01 })
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
