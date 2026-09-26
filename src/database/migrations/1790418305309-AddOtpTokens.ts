import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOtpTokens1790418305309 implements MigrationInterface {
    name = 'AddOtpTokens1790418305309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`otp_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_by\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_by\` int NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` int NOT NULL, \`code_hash\` varchar(255) NOT NULL, \`purpose\` enum ('forgot_password', 'change_password') NOT NULL, \`expires_at\` datetime NOT NULL, \`used_at\` datetime NULL, \`attempt_count\` int NOT NULL DEFAULT '0', INDEX \`IDX_f421fb11eec32765c77b21681b\` (\`expires_at\`), INDEX \`IDX_05289608db8645409c85ceb591\` (\`user_id\`, \`purpose\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`otp_tokens\` ADD CONSTRAINT \`FK_7003728e208144a06a974b2dbe2\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`otp_tokens\` DROP FOREIGN KEY \`FK_7003728e208144a06a974b2dbe2\``);
        await queryRunner.query(`DROP INDEX \`IDX_05289608db8645409c85ceb591\` ON \`otp_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_f421fb11eec32765c77b21681b\` ON \`otp_tokens\``);
        await queryRunner.query(`DROP TABLE \`otp_tokens\``);
    }

}
