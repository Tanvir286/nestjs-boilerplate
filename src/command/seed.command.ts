import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaClient, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface SeedCommandOptions {
  reset?: boolean;
}

@Command({
  name: 'seed',
  description: 'Seed database with initial data',
})
export class SeedCommand extends CommandRunner {
  private readonly prisma = new PrismaClient();

  async run(_: string[], options?: SeedCommandOptions) {
    const reset = options?.reset ?? false;
    await this.main({ reset });
  }

  @Option({
    flags: '--reset',
    description: 'Reset existing seeded data before re-seeding',
  })
  parseReset(): boolean {
    return true;
  }

  private async main({ reset = false }: SeedCommandOptions) {
    try {
      const password = await bcrypt.hash('123456', 10);

      console.log('👤 Users seeding started...');

      if (reset) {
        console.log('🧹 Cleaning old seeded users...');
        await this.prisma.user.deleteMany({
          where: {
            email: {
              in: ['admin@gmail.com', 'user1@gmail.com', 'user2@gmail.com'],
            },
          },
        });
      }

      const usersData = [
        {
          name: 'Admin User',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@gmail.com',
          password,
          type: UserType.ADMIN,
          city: 'Dhaka',
          bio: 'System administrator',
          emailVerifiedAt: new Date(),
        },
        {
          name: 'User One',
          firstName: 'User',
          lastName: 'One',
          email: 'user1@gmail.com',
          password,
          type: UserType.USER,
          city: 'Dhaka',
          bio: 'First test user',
          emailVerifiedAt: new Date(),
        },
        {
          name: 'User Two',
          firstName: 'User',
          lastName: 'Two',
          email: 'user2@gmail.com',
          password,
          type: UserType.USER,
          city: 'Dhaka',
          bio: 'Second test user',
          emailVerifiedAt: new Date(),
        },
      ];

      // Upsert: old
      for (const user of usersData) {
        await this.prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            password: user.password,
            type: user.type,
            city: user.city,
            bio: user.bio,
            emailVerifiedAt: user.emailVerifiedAt,
          },
          create: user,
        });
      }

      console.log('✅ Users seeding completed');
      console.log('🎉 Seed completed successfully!');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}