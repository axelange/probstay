-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'AGENT');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MANAGE_USERS', 'MANAGE_OWNERS', 'MANAGE_PROPERTIES', 'MANAGE_RENTALS', 'MANAGE_INVOICES', 'MANAGE_REGISTERS', 'VIEW_FINANCIALS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "permission" "Permission" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apimoId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "iban" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apimoId" INTEGER,
    "reference" INTEGER,
    "apimoAgencyId" INTEGER,
    "ownerId" UUID,
    "agentId" UUID,
    "apimoAgentId" INTEGER,
    "category" INTEGER,
    "subcategory" INTEGER,
    "type" INTEGER,
    "subtype" INTEGER,
    "status" INTEGER,
    "step" INTEGER,
    "quality" INTEGER,
    "name" TEXT,
    "address" TEXT,
    "addressMore" TEXT,
    "publishAddress" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "region" TEXT,
    "regionApimoId" INTEGER,
    "city" TEXT,
    "cityApimoId" INTEGER,
    "zipcode" TEXT,
    "district" TEXT,
    "districtApimoId" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitude" INTEGER,
    "areaValue" DOUBLE PRECISION,
    "areaUnit" INTEGER,
    "areaTotal" DOUBLE PRECISION,
    "rooms" INTEGER,
    "bedrooms" INTEGER,
    "sleeps" INTEGER,
    "priceValue" DECIMAL(12,2),
    "priceMax" DECIMAL(12,2),
    "priceCurrency" TEXT,
    "pricePeriod" INTEGER,
    "priceCommission" DECIMAL(12,2),
    "priceDeposit" DECIMAL(12,2),
    "priceFees" DECIMAL(12,2),
    "condition" INTEGER,
    "standing" INTEGER,
    "constructionYear" INTEGER,
    "renovationYear" INTEGER,
    "availability" TEXT,
    "availableAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "services" INTEGER[],
    "proximities" INTEGER[],
    "tags" INTEGER[],
    "url" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_pictures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "apimoId" INTEGER NOT NULL,
    "rank" INTEGER,
    "url" TEXT NOT NULL,
    "widthMax" INTEGER,
    "heightMax" INTEGER,
    "isPanorama" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_pictures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_permission_key" ON "user_permissions"("userId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "owners_apimoId_key" ON "owners"("apimoId");

-- CreateIndex
CREATE UNIQUE INDEX "properties_apimoId_key" ON "properties"("apimoId");

-- CreateIndex
CREATE UNIQUE INDEX "property_pictures_apimoId_key" ON "property_pictures"("apimoId");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_pictures" ADD CONSTRAINT "property_pictures_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
