import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, QueryFailedError } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { ApiResponse, ProductStatus } from 'src/constants';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTransactionDto): Promise<ApiResponse<Transaction>> {
    // Pre-flight lookups (outside the DB transaction — read-only, safe to retry)
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user)
      throw new NotFoundException(`User with ID ${dto.userId} not found`);

    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product)
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);

    // Check product availability
    if (product.status === ProductStatus.OUT_OF_STOCK) {
      throw new ConflictException(
        `Product with ID ${dto.productId} is out of stock`,
      );
    }

    // Check quantity availability
    if (dto.quantity > product.quantity) {
      throw new ConflictException(
        `Requested quantity (${dto.quantity}) exceeds available stock (${product.quantity})`,
      );
    }

    // Wrap both writes in a single atomic DB transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = queryRunner.manager.create(Transaction, {
        user,
        product,
        quantity: dto.quantity,
      });
      const savedTransaction = await queryRunner.manager.save(transaction);

      product.quantity -= dto.quantity;
      if (product.quantity <= 0) {
        product.status = ProductStatus.OUT_OF_STOCK;
      }
      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Transaction created successfully',
        data: savedTransaction,
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      if (error instanceof QueryFailedError) {
        throw new ConflictException(
          'Database error: ' +
            (error.driverError as { message?: string }).message,
        );
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error creating transaction',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<ApiResponse<Transaction[]>> {
    try {
      const transactions = await this.transactionRepository.find({
        relations: ['user', 'product'],
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Transactions retrieved successfully',
        data: transactions,
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error retrieving transactions',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number): Promise<ApiResponse<Transaction>> {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id },
        relations: ['user', 'product'],
      });
      if (!transaction)
        throw new NotFoundException(`Transaction with ID ${id} not found`);

      return {
        statusCode: HttpStatus.OK,
        message: 'Transaction retrieved successfully',
        data: transaction,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error retrieving transaction',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
