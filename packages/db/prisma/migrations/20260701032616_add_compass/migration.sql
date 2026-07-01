-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('SERVICE', 'LIBRARY', 'APPLICATION', 'WEBSITE', 'DATA_PIPELINE');

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL DEFAULT 'SERVICE',
    "description" TEXT,
    "ownerTeam" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 3,
    "healthScore" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "components_workspaceId_idx" ON "components"("workspaceId");

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
