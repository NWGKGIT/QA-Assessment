import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiResponse, ProductStatus } from 'src/constants';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<ApiResponse<Product>> {
    try {
      const initialStatus =
        dto.quantity === 0
          ? ProductStatus.OUT_OF_STOCK
          : (dto.status ?? ProductStatus.FOR_SALE);
      const product = this.productRepository.create({
        ...dto,
        status: initialStatus,
      });
      const savedProduct = await this.productRepository.save(product);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Product created successfully',
        data: savedProduct,
      };
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Product name already exists');
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error creating product',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await this.productRepository.find({
        relations: ['transactions'],
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Products retrieved successfully',
        data: products,
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error retrieving products',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number): Promise<ApiResponse<Product>> {
    try {
      const product = await this.productRepository.findOne({
        where: { id },
        relations: ['transactions'],
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Product retrieved successfully',
        data: product,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error retrieving product',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: number,
    dto: UpdateProductDto,
  ): Promise<ApiResponse<Product>> {
    try {
      const product = await this.productRepository.findOne({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      product.name = dto.name ?? product.name;
      product.price = dto.price ?? product.price;

      const newQty = dto.quantity ?? product.quantity;
      product.quantity = newQty;

      // Auto-restore FOR_SALE when restocking an OUT_OF_STOCK product,
      // unless the caller explicitly sets a different status.
      if (dto.status !== undefined) {
        product.status = dto.status;
      } else if (newQty > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
        product.status = ProductStatus.FOR_SALE;
      }

      const updatedProduct = await this.productRepository.save(product);

      return {
        statusCode: HttpStatus.OK,
        message: 'Product updated successfully',
        data: updatedProduct,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Product name already exists');
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error updating product',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
