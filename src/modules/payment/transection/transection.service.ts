import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransectionService {

  constructor(
    private readonly prisma: PrismaService
  ) {}

  /*--------------------------------  
            TRANSECTION LIST
  ----------------------------------*/
  async findAll(
    userId: string
  ) {
  
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        userId: userId,
        type: 'TOPUP',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedTransection = transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      status: t.status,
      createdAt: t.createdAt,
    }));

    return {
      success: true,
      message: 'Transection list retrieved successfully',
      data: formattedTransection,
    };
  }

   


  
}
