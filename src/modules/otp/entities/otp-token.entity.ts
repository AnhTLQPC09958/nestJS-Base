import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../database/entities';
import { User } from '../../users/entities/user.entity';

export enum OtpPurpose {
  FORGOT_PASSWORD = 'forgot_password',
  CHANGE_PASSWORD = 'change_password',
}

@Entity('otp_tokens')
@Index(['userId', 'purpose'])
@Index(['expiresAt'])
export class OtpToken extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** SHA256(otp) — KHÔNG lưu plain OTP */
  @Column({ name: 'code_hash', length: 255 })
  codeHash!: string;

  @Column({ type: 'enum', enum: OtpPurpose })
  purpose!: OtpPurpose;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt?: Date;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isUsed(): boolean {
    return !!this.usedAt;
  }

  isActive(): boolean {
    return !this.isUsed() && !this.isExpired();
  }
}
