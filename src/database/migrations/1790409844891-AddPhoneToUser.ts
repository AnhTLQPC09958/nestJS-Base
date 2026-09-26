import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneToUser1790409844891 implements MigrationInterface {
    name = 'AddPhoneToUser1790409844891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`phone\` varchar(20) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone\``);
    }

}
