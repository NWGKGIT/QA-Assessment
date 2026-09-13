import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceTransactionFkNotNull1789337198145
  implements MigrationInterface
{
  name = 'EnforceTransactionFkNotNull1789337198145';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove any orphaned rows that would violate the NOT NULL constraint.
    // In practice this should never trigger because the service always validates
    // user and product existence before inserting a transaction.
    await queryRunner.query(
      `DELETE FROM "transaction" WHERE "userId" IS NULL OR "productId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ALTER COLUMN "productId" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transaction" ALTER COLUMN "productId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ALTER COLUMN "userId" DROP NOT NULL`,
    );
  }
}
