import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

/**
 * Singleton Prisma Client with logging configuration
 */
const prismaClientSingleton = (): PrismaClient => {
  const prisma = new PrismaClient({
    log: [
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
  });

  return prisma;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
