import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleIdToUser1790420000000 implements MigrationInterface {
  name = 'AddRoleIdToUser1790420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `users` ADD `role_id` int NULL');
    await queryRunner.query(
      'UPDATE `users` u INNER JOIN `user_roles` ur ON ur.`user_id` = u.`id` AND ur.`id` = (SELECT MIN(ur2.`id`) FROM `user_roles` ur2 WHERE ur2.`user_id` = u.`id`) SET u.`role_id` = ur.`role_id`',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_users_role_id` ON `users` (`role_id`)',
    );
    await queryRunner.query(
      'ALTER TABLE `users` ADD CONSTRAINT `FK_users_role_id_roles_id` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `user_roles` DROP FOREIGN KEY `FK_b23c65e50a758245a33ee35fda1`',
    );
    await queryRunner.query(
      'ALTER TABLE `user_roles` DROP FOREIGN KEY `FK_87b8888186ca9769c960e926870`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_23ed6f04fe43066df08379fd03` ON `user_roles`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_87b8888186ca9769c960e92687` ON `user_roles`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b23c65e50a758245a33ee35fda` ON `user_roles`',
    );
    await queryRunner.query('DROP TABLE `user_roles`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `user_roles` (`id` int NOT NULL AUTO_INCREMENT, `created_by` int NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_by` int NULL, `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `user_id` int NOT NULL, `role_id` int NOT NULL, INDEX `IDX_b23c65e50a758245a33ee35fda` (`role_id`), INDEX `IDX_87b8888186ca9769c960e92687` (`user_id`), UNIQUE INDEX `IDX_23ed6f04fe43066df08379fd03` (`user_id`, `role_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'INSERT INTO `user_roles` (`created_by`, `created_at`, `updated_by`, `updated_at`, `user_id`, `role_id`) SELECT `created_by`, `created_at`, `updated_by`, `updated_at`, `id`, `role_id` FROM `users` WHERE `role_id` IS NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `user_roles` ADD CONSTRAINT `FK_87b8888186ca9769c960e926870` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `user_roles` ADD CONSTRAINT `FK_b23c65e50a758245a33ee35fda1` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `users` DROP FOREIGN KEY `FK_users_role_id_roles_id`',
    );
    await queryRunner.query('DROP INDEX `IDX_users_role_id` ON `users`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `role_id`');
  }
}
