// prisma/seed.ts
// =======================================================
//       SEED SCRIPT NÂNG CAO - TẠO DỮ LIỆU LỚN
// -------------------------------------------------------
// - Tạo Super Admin, Admin, Reviewer, User roles.
// - Tạo tài khoản mẫu cho từng role.
// - Sử dụng Faker.js để sinh ~1000 bản ghi dữ liệu ngẫu nhiên.
// =======================================================
import { PrismaClient, UserRole, UserStatus, ReviewStatus, FileProcessingStatus, OCRStatus,} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker/locale/vi'; // Sử dụng locale tiếng Việt

const prisma = new PrismaClient();

// Hàm tiện ích để log cho đẹp
const log = (message: string) => console.log(`[🌱 Seed] ${message}`);

async function main() {
  log('🚀 Bắt đầu quá trình seeding dữ liệu lớn...');

  // --- 1. Xóa dữ liệu cũ (để đảm bảo idempotency) ---
  log('🔥 Dọn dẹp CSDL cũ...');
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.fileProcessingJob.deleteMany({});
  await prisma.cleanedRecord.deleteMany({});
  await prisma.sourceFile.deleteMany({});
  await prisma.dictionary.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});


  // --- 2. Tạo Quyền (Permissions) ---
  log('🔑 Tạo các quyền (Permissions)...');
  const resources = ['users', 'roles', 'files', 'dictionary', 'system', 'departments'];
  const actions = ['read', 'write', 'delete', 'admin'];
  const permissionsData = [];
  for (const resource of resources) {
    for (const action of actions) {
      permissionsData.push({
        name: `${resource}:${action}`,
        resource,
        action,
        description: `Quyền ${action} trên tài nguyên ${resource}`,
      });
    }
  }
  await prisma.permission.createMany({ data: permissionsData });
  const allPermissions = await prisma.permission.findMany();
  log(`✅ Đã tạo ${allPermissions.length} quyền.`);


  // --- 3. Tạo các Vai trò (Roles) ---
  log('👑 Tạo các vai trò (Roles)...');
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'Super Administrator',
      code: 'SUPER_ADMIN',
      level: 100,
      permissions: { create: allPermissions.map(p => ({ permissionId: p.id })) },
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      name: 'Administrator',
      code: 'ADMIN',
      level: 90,
      permissions: {
        create: allPermissions
          .filter(p => p.resource !== 'system') // Admin không có quyền hệ thống
          .map(p => ({ permissionId: p.id })),
      },
    },
  });

  const reviewerRole = await prisma.role.create({
    data: {
      name: 'Reviewer',
      code: 'REVIEWER',
      level: 50,
      permissions: {
        create: allPermissions
          .filter(p => p.resource === 'files' || (p.resource === 'dictionary' && p.action === 'read'))
          .map(p => ({ permissionId: p.id })),
      },
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'User',
      code: 'USER',
      level: 10,
      permissions: {
        create: allPermissions
          .filter(p => p.resource === 'files' && p.action === 'read')
          .map(p => ({ permissionId: p.id })),
      },
    },
  });
  log('✅ Đã tạo 4 vai trò: SUPER_ADMIN, ADMIN, REVIEWER, USER.');


  // --- 4. Tạo các tài khoản chính và nhân viên ---
  log('👤 Tạo các tài khoản người dùng chính...');
  const hashPassword = (pw: string) => bcrypt.hashSync(pw, 12);

  const superAdminUser = await prisma.user.create({
    data: {
      email: 'superadmin@hvhc.vn',
      password: hashPassword('SuperAdmin@123'),
      fullName: 'Super Admin',
      role: UserRole.ADMIN, // Prisma schema enum
      status: UserStatus.ACTIVE,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hvhc.vn',
      password: hashPassword('Admin@123'),
      fullName: 'Quản trị viên',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const reviewerUser = await prisma.user.create({
    data: {
      email: 'reviewer@hvhc.vn',
      password: hashPassword('Reviewer@123'),
      fullName: 'Kiểm duyệt viên',
      role: UserRole.REVIEWER,
      status: UserStatus.ACTIVE,
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@hvhc.vn',
      password: hashPassword('User@123'),
      fullName: 'Người dùng Cơ bản',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });
  
  // Tạo các phòng ban
  const hocVien = await prisma.department.create({ data: { name: 'Học viện Hậu cần', code: 'HVHC' }});
  
  // Tạo hồ sơ nhân viên
  await prisma.employee.create({ data: { userId: superAdminUser.id, employeeCode: 'SA001', departmentId: hocVien.id, roleId: superAdminRole.id, position: 'Super Admin' , hireDate: new Date() }});
  await prisma.employee.create({ data: { userId: adminUser.id, employeeCode: 'A001', departmentId: hocVien.id, roleId: adminRole.id, position: 'Admin', hireDate: new Date() }});
  await prisma.employee.create({ data: { userId: reviewerUser.id, employeeCode: 'R001', departmentId: hocVien.id, roleId: reviewerRole.id, position: 'Reviewer', hireDate: new Date() }});
  await prisma.employee.create({ data: { userId: regularUser.id, employeeCode: 'U001', departmentId: hocVien.id, roleId: userRole.id, position: 'User', hireDate: new Date() }});

  log('✅ Đã tạo các tài khoản và hồ sơ nhân viên chính.');
  
  // --- 5. Sinh dữ liệu ngẫu nhiên ---
  log('🌍 Bắt đầu sinh dữ liệu ngẫu nhiên...');

  // Tạo thêm 50 người dùng ngẫu nhiên
  const users = [superAdminUser, adminUser, reviewerUser, regularUser];
  for (let i = 0; i < 50; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: hashPassword('Password@123'),
        fullName: faker.person.fullName(),
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
      },
    });
    users.push(user);
  }
  log(`✅ Đã tạo thêm ${users.length - 4} người dùng ngẫu nhiên.`);

  // Tạo 50 file nguồn (SourceFile)
  const sourceFiles = [];
  for (let i = 0; i < 50; i++) {
    const uploader = users[faker.number.int({ min: 0, max: users.length - 1 })];
    const originalName = faker.system.commonFileName('txt');
    
    const file = await prisma.sourceFile.create({
      data: {
        originalName,
        fileName: `${faker.string.uuid()}}.txt`,
        cloudStoragePath: `uploads/${originalName}`,
        fileType: 'txt',
        fileSize: faker.number.int({ min: 1000, max: 50000 }),
        uploadedById: uploader.id,
        status: FileProcessingStatus.COMPLETED,
        ocrStatus: OCRStatus.NOT_REQUIRED,
        extractedText: faker.lorem.paragraphs(3),
      },
    });
    sourceFiles.push(file);
  }
  log(`✅ Đã tạo ${sourceFiles.length} file nguồn.`);

  // Tạo ~1000 bản ghi đã làm sạch (CleanedRecord)
  let cleanedCount = 0;
  for (const file of sourceFiles) {
    const recordsToCreate = faker.number.int({ min: 15, max: 25 });
    const recordsData = [];
    for (let i = 0; i < recordsToCreate; i++) {
      recordsData.push({
        sourceFileId: file.id,
        cleanedText: faker.lorem.sentence(),
        category: faker.helpers.arrayElement(['quân nhu', 'kỹ thuật', 'vận tải', 'quân y']),
        qualityScore: faker.number.float({ min: 0.7, max: 0.99, fractionDigits: 2 }),
        confidenceScore: faker.number.float({ min: 0.8, max: 0.99, fractionDigits: 2 }),
        reviewStatus: faker.helpers.arrayElement([ReviewStatus.APPROVED, ReviewStatus.PENDING, ReviewStatus.REJECTED]),
        keywords: faker.lorem.words(5).split(' '),
        cleaningOps: { "steps": ["normalized_whitespace", "removed_stopwords"] },
      });
    }
    await prisma.cleanedRecord.createMany({ data: recordsData });
    cleanedCount += recordsToCreate;
  }
  log(`✅ Đã tạo ~${cleanedCount} bản ghi đã được làm sạch.`);

  console.log('🎉 Seeding hoàn tất!');
}

main()
  .catch(async (e) => {
    console.error('❌ Lỗi trong quá trình seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });