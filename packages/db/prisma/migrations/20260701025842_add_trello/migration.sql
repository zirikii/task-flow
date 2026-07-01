-- CreateTable
CREATE TABLE "trello_boards" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trello_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trello_lists" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trello_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trello_cards" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trello_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trello_boards_workspaceId_idx" ON "trello_boards"("workspaceId");

-- CreateIndex
CREATE INDEX "trello_lists_boardId_idx" ON "trello_lists"("boardId");

-- CreateIndex
CREATE INDEX "trello_cards_listId_idx" ON "trello_cards"("listId");

-- AddForeignKey
ALTER TABLE "trello_boards" ADD CONSTRAINT "trello_boards_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trello_lists" ADD CONSTRAINT "trello_lists_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "trello_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trello_cards" ADD CONSTRAINT "trello_cards_listId_fkey" FOREIGN KEY ("listId") REFERENCES "trello_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
