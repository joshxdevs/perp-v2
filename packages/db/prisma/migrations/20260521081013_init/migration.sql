-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "available" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locked" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "marketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,
    "liquidationPrice" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "marketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "filledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin" DOUBLE PRECISION NOT NULL,
    "orderType" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "status" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fill" (
    "id" SERIAL NOT NULL,
    "makerId" INTEGER NOT NULL,
    "takerId" INTEGER NOT NULL,
    "marketId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "longId" INTEGER NOT NULL,
    "shortId" INTEGER NOT NULL,

    CONSTRAINT "Fill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
