import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from 'src/common/utils/utils';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @MaxLength(100)
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  @MaxLength(100)
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsNotEmpty({ message: 'Tên đăng nhập không được phép để trống' })
  @IsString()
  username!: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP phải có đúng 6 ký tự' })
  @Matches(/^\d+$/, { message: 'OTP chỉ chứa chữ số' })
  otp!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

export class FirstChangePasswordDto {
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
  oldPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  @MaxLength(100)
  newPassword!: string;
}
