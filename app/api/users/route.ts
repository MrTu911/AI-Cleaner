// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(request: Request) {
  // 1. Xác thực và phân quyền
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Không được phép.' }, { status: 403 }); // 403 Forbidden
  }

  // 2. Lấy các tham số từ URL (phân trang & tìm kiếm)
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';

  const skip = (page - 1) * limit;

  // 3. Xây dựng điều kiện truy vấn
  const whereClause = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  try {
    // 4. Thực hiện 2 truy vấn song song để lấy dữ liệu và tổng số bản ghi
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        select: { // Chỉ chọn những trường cần thiết, không bao giờ trả về password
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    // 5. Trả về kết quả
    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Users API Error]', error);
    return NextResponse.json({ error: 'Lỗi hệ thống khi lấy danh sách người dùng.' }, { status: 500 });
  }
}