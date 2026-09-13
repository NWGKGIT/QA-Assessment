import { Controller, Get, Post, Body, Param, Put, ParseIntPipe } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ApiResponse } from 'src/constants';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@Controller('products')
@ApiTags('Products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ description: 'Product created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid product input' })
  @ApiConflictResponse({ description: 'Product name already exists' })
  async create(@Body() body: CreateProductDto): Promise<ApiResponse<Product>> {
    return this.productsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  async findAll(): Promise<ApiResponse<Product[]>> {
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<Product>> {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBadRequestResponse({ description: 'Invalid product input' })
  @ApiConflictResponse({ description: 'Product name already exists' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateProductDto,
  ): Promise<ApiResponse<Product>> {
    return this.productsService.update(id, body);
  }
}
