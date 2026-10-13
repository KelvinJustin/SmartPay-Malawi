-- Align the database with prisma/schema.prisma:
--   password -> passwordHash
--   PIN      -> pinHash   (and drop its unique index; hashes should not be unique)
--
-- RENAME COLUMN keeps any existing data, unlike the drop + add that
-- `prisma migrate dev` would generate on its own.

-- DropIndex
DROP INDEX "merchants_PIN_key";

-- RenameColumn
ALTER TABLE "merchants" RENAME COLUMN "password" TO "passwordHash";
ALTER TABLE "merchants" RENAME COLUMN "PIN" TO "pinHash";
