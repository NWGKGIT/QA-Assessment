import { Controller, Get, Post, Put, Body, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
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

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'User created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid user input' })
  @ApiConflictResponse({ description: 'Email already exists' })
  async create(@Body() dto: CreateUserDto): Promise<ApiResponse<User>> {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  async findAll(): Promise<ApiResponse<User[]>> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<User>> {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBadRequestResponse({ description: 'Invalid user input' })
  @ApiConflictResponse({ description: 'Email already exists' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateUserDto,
  ): Promise<ApiResponse<User>> {
    return this.usersService.update(id, dto);
  }
}
