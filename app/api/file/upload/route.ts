// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { uploadFileToS3 } from '@/app/lib/s3';
import { fileProcessingQueue } from '@/app/lib/queue';
import { createLoggerFromRequest } from '@/app/lib/audit-logger';
import { FileProcessingStatus, OCRStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const logger = await createLoggerFromRequest(request);

  // 1. Xác thực người dùng
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Không có file nào được cung cấp.' }, { status: 400 });
    }

    // 2. Validate file (type, size)
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    // ... (Thêm logic validate nếu cần) ...

    // 3. Upload file lên MinIO
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${uuidv4()}.${fileExtension}`;
    await uploadFileToS3(buffer, safeFileName, file.type);
    
    // 4. Tạo bản ghi trong CSDL
    const isOCRRequired = ['pdf', 'png', 'jpg', 'jpeg'].includes(fileExtension || '');
    const sourceFile = await prisma.sourceFile.create({
      data: {
        originalName: file.name,
        fileName: safeFileName,
        cloudStoragePath: safeFileName,
        fileType: fileExtension || '',
        fileSize: file.size,
        uploadedById: session.user.id,
        status: FileProcessingStatus.QUEUED, // Trạng thái: Đã xếp hàng
        ocrStatus: isOCRRequired ? OCRStatus.PENDING : OCRStatus.NOT_REQUIRED,
      },
    });

    // 5. Đẩy job vào hàng đợi để xử lý nền
    await fileProcessingQueue.add('process-new-file', {
      fileId: sourceFile.id,
    });
    
    // 6. Ghi log hành động
    await logger.audit({
      action: 'UPLOAD_FILE',
      resource: 'file',
      resourceId: sourceFile.id,
      newData: { name: sourceFile.originalName, size: sourceFile.fileSize },
    });
    
    // 7. Trả về response thành công
    return NextResponse.json(
      {
        message: 'Tải file thành công và đã được đưa vào hàng đợi xử lý.',
        file: sourceFile,
      },
      { status: 202 } // 202 Accepted: Yêu cầu được chấp nhận, sẽ xử lý sau.
    );

  } catch (error) {
    console.error('[Upload API Error]', error);
    await logger.security({
        eventType: 'SYSTEM_ERROR',
        description: `Lỗi khi upload file: ${(error as Error).message}`,
    });
    return NextResponse.json({ error: 'Đã xảy ra lỗi trong quá trình upload.' }, { status: 500 });
  }
}