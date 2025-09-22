// src/worker.ts
// =======================================================
// BACKGROUND WORKER - CỖ MÁY XỬ LÝ DỮ LIỆU
// =======================================================
import { Worker, Job } from 'bullmq';
import { prisma } from '@/app/lib/prisma';
import { downloadFileFromS3 } from '@/app/lib/s3';
import { DataProcessingPipeline } from '@/app/lib/services/data-processing-pipeline';
import { FileProcessingStatus, OCRStatus, ReviewStatus } from '@prisma/client';

// Kết nối tới Redis
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Định nghĩa kiểu dữ liệu của job
interface FileJobPayload {
  fileId: string;
}

/**
 * Logic chính để xử lý một file.
 */
const processFile = async (job: Job<FileJobPayload>) => {
  const { fileId } = job.data;
  console.log(`[Worker] Bắt đầu xử lý file ID: ${fileId}`);

  try {
    // 1. Lấy thông tin file từ CSDL
    const sourceFile = await prisma.sourceFile.findUnique({ where: { id: fileId } });
    if (!sourceFile) throw new Error(`File với ID ${fileId} không tồn tại.`);

    await prisma.sourceFile.update({
      where: { id: fileId },
      data: { status: FileProcessingStatus.PROCESSING },
    });
    
    // 2. Tải file từ MinIO
    const fileBuffer = await downloadFileFromS3(sourceFile.cloudStoragePath);

    // 3. Chạy pipeline xử lý
    const pipeline = new DataProcessingPipeline();
    const isOCRRequired = sourceFile.ocrStatus === OCRStatus.PENDING;
    const result = await pipeline.run(fileBuffer, isOCRRequired);

    // 4. Lưu kết quả vào CSDL
    await prisma.$transaction(async (tx) => {
      // Cập nhật SourceFile
      await tx.sourceFile.update({
        where: { id: fileId },
        data: {
          status: FileProcessingStatus.COMPLETED,
          extractedText: result.extractedText,
          ocrStatus: isOCRRequired ? OCRStatus.COMPLETED : OCRStatus.NOT_REQUIRED,
          ocrProcessedAt: isOCRRequired ? new Date() : null,
        },
      });

      // Tạo CleanedRecord
      await tx.cleanedRecord.create({
        data: {
          sourceFileId: fileId,
          cleanedText: result.cleanedText,
          category: result.category,
          keywords: result.keywords,
          qualityScore: result.qualityScore,
          confidenceScore: result.confidenceScore,
          reviewStatus: ReviewStatus.PENDING,
          cleaningOps: {}, // Sẽ cập nhật sau
        },
      });
    });

    console.log(`[Worker] ✅ Hoàn thành xử lý file ID: ${fileId}`);
  } catch (error) {
    console.error(`[Worker] ❌ Lỗi khi xử lý file ID: ${fileId}`, error);
    // Cập nhật trạng thái lỗi vào CSDL
    await prisma.sourceFile.update({
      where: { id: fileId },
      data: {
        status: FileProcessingStatus.ERROR,
        errorMessage: (error as Error).message,
      },
    });
    // Ném lỗi để BullMQ biết job thất bại và có thể thử lại
    throw error;
  }
};

// Khởi tạo Worker
console.log('[Worker] Khởi động...');
new Worker('file-processing', processFile, {
  connection: redisConnection,
  concurrency: 5, // Xử lý tối đa 5 file cùng lúc
});
console.log('[Worker] Đã sẵn sàng và đang lắng nghe công việc từ hàng đợi...');