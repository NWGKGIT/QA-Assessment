import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ApiResponse } from 'src/constants';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@Controller('transactions')
@ApiTags('Transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  @ApiCreatedResponse({ description: 'Transaction created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid transaction input' })
  @ApiNotFoundResponse({ description: 'User or product not found' })
  async create(
    @Body() dto: CreateTransactionDto,
  ): Promise<ApiResponse<Transaction>> {
    return this.transactionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions' })
  async findAll(): Promise<ApiResponse<Transaction[]>> {
    return this.transactionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponse<Transaction>> {
    return this.transactionsService.findOne(Number(id));
  }
}
