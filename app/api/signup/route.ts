// app/api/signup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppLogger } from '@/app/lib/audit-logger';
import { SecurityEventType, UserStatus } from '@prisma/client';

// Định nghĩa schema để validate dữ liệu đầu vào
const signupSchema = z.object({
  email: z.string().email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  fullName: z.string().min(1, 'Họ tên không được để trống.'),
});

export async function POST(request: Request) {
  const logger = new AppLogger({ req: request as any }); // Khởi tạo logger

  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email đã tồn tại.' }, { status: 409 }); // 409 Conflict
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Tạo người dùng mới
    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        fullName: validatedData.fullName,
        status: UserStatus.ACTIVE, // Mặc định là active
      },
    });

    // Ghi log bảo mật cho sự kiện đăng ký thành công
    await new AppLogger({ user }).security({
      eventType: SecurityEventType.LOGIN_SUCCESS, // Coi đăng ký là lần đăng nhập đầu tiên
      description: `Người dùng mới đăng ký thành công: ${user.email}`,
    });

    // Trả về dữ liệu user (loại bỏ mật khẩu)
    const { password, ...userResult } = user;
    return NextResponse.json(userResult, { status: 201 }); // 201 Created

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.', details: error.errors }, { status: 400 });
    }

    console.error('[Signup API Error]', error);
    await logger.security({
        eventType: SecurityEventType.SYSTEM_ERROR,
        description: `Lỗi hệ thống khi đăng ký.`,
        metadata: { error: (error as Error).message }
    })
    return NextResponse.json({ error: 'Lỗi hệ thống, không thể đăng ký.' }, { status: 500 });
  }
}