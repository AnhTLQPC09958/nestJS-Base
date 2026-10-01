import { UserDevice } from '../entities/user-device.entity';

export class UserDeviceResponseDto {
  id!: number;
  deviceId!: string;
  userAgent!: string | null;
  ipAddress!: string | null;
  lastActiveAt!: Date | null;
  createdAt!: Date;
  isCurrent!: boolean;

  static fromEntity(
    e: UserDevice,
    currentDeviceId?: string,
  ): UserDeviceResponseDto {
    return {
      id: e.id,
      deviceId: e.deviceId,
      userAgent: e.userAgent,
      ipAddress: e.ipAddress,
      lastActiveAt: e.lastActiveAt,
      createdAt: e.createdAt,
      isCurrent: currentDeviceId ? e.deviceId === currentDeviceId : false,
    };
  }
}
