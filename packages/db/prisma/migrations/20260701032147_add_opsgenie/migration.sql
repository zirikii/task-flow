-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('P1', 'P2', 'P3', 'P4', 'P5');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKED', 'CLOSED');

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "AlertPriority" NOT NULL DEFAULT 'P3',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "ackedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oncall_schedules" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oncall_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oncall_shifts" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oncall_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_workspaceId_status_idx" ON "alerts"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "oncall_schedules_workspaceId_idx" ON "oncall_schedules"("workspaceId");

-- CreateIndex
CREATE INDEX "oncall_shifts_scheduleId_idx" ON "oncall_shifts"("scheduleId");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_ackedById_fkey" FOREIGN KEY ("ackedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oncall_schedules" ADD CONSTRAINT "oncall_schedules_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oncall_shifts" ADD CONSTRAINT "oncall_shifts_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "oncall_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oncall_shifts" ADD CONSTRAINT "oncall_shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
