import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

type UserRepositoryMock = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  preload: jest.Mock;
};

const createRepositoryMock = (): UserRepositoryMock => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  preload: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: UserRepositoryMock;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new UsersService(repository as unknown as Repository<User>);
  });

  it('creates a user and returns the saved entity', async () => {
    const dto = { name: 'Ada Lovelace', email: 'ada@example.com' };
    const savedUser = {
      ...dto,
      id: 1,
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    repository.create.mockReturnValue(savedUser);
    repository.save.mockResolvedValue(savedUser);

    await expect(service.create(dto)).resolves.toEqual({
      statusCode: 201,
      message: 'User created successfully',
      data: savedUser,
    });
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(savedUser);
  });

  it('translates a duplicate email database error into a conflict', async () => {
    const duplicateError = Object.assign(
      new QueryFailedError('INSERT', [], new Error('duplicate email')),
      { code: '23505' },
    );
    const dto = { name: 'Ada Lovelace', email: 'ada@example.com' };

    repository.create.mockReturnValue(dto as User);
    repository.save.mockRejectedValue(duplicateError);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a user with requested transactions', async () => {
    const user = {
      id: 1,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
    repository.findOne.mockResolvedValue(user);

    await expect(service.findOne(1)).resolves.toEqual({
      statusCode: 200,
      message: 'User retrieved successfully',
      data: user,
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['transactions'],
    });
  });

  it('throws when the requested user does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
