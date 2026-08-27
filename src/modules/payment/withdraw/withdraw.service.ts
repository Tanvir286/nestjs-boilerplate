import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreateWithdrawDto, WithdrawResponse } from './dto/create-withdraw.dto';
import { UpdateWithdrawDto } from './dto/update-withdraw.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Injectable()
export class WithdrawService {
  constructor(private readonly prisma: PrismaService) {}

  /*--------------------------------  
       STRIPE CONNECTED ACCOUNT
  ----------------------------------*/
  async createConnectedAccount(
    userId: string,
    email: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { accountId: string };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.stripeConnectId) {
      throw new BadRequestException('You already have a payout account');
    }

    try {
      const connectedAccount = await StripePayment.createConnectedAccount(email);
      // Save banking_id in user's profile
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          stripeConnectId: connectedAccount.id,
        },
      });

      return {
        success: true,
        message: 'Connected account created successfully',
        data: {
          accountId: connectedAccount.id,
        },
      };
    } catch (error: any) {
      console.error('Connected account error:', error?.raw ?? error?.message ?? error);

      const message =
        error?.raw?.message || error?.message || 'Failed to create payout account.';

      if (message.includes('signed up for Connect') || message.includes('create new accounts')) {
        throw new BadRequestException(
          'Stripe Connect is not enabled for this platform. Enable Connect at https://dashboard.stripe.com/connect and retry.',
        );
      }

      throw new HttpException(
        'Failed to create payout account. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

 
  /*---------------------------------
   STRIPE CONNECTED ACCOUNT ONBOARDING
  ----------------------------------*/ 
  async createOnboardingLink(accountId: string): Promise<{
    success: boolean;
    message: string;
    data: { url: string };
  }> {
    try {
      const accountLink =
        await StripePayment.createOnboardingAccountLink(accountId);
      return {
        success: true,
        message: 'Onboarding link created successfully',
        data: {
          url: accountLink.url,
        },
      };
    } catch (error: any) {
      console.error('Onboarding link error:', error);
      throw new HttpException(
        'Failed to create onboarding link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  /*--------------------------------  
       Withdraw Request
  ----------------------------------*/
  async processWithdraw(
    userId: string,
    withdrawDto: CreateWithdrawDto,
  ): Promise<WithdrawResponse> {
    const { amount, currency = 'usd' } = withdrawDto;

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a connected account
    if (!user.stripeConnectId) {
      throw new BadRequestException('Please set up a payout account first');
    }

    // Check if user has available balance
    if (!user.balance || user.balance.toNumber() <= 0) {
      throw new BadRequestException('Insufficient balance to withdraw');
    }

    // Check minimum withdraw amount (minimum $20)
    if (amount < 2) {
      throw new BadRequestException('Minimum withdraw amount is $20');
    }

    // Check if withdraw amount exceeds available balance
    if (amount > user.balance.toNumber?.() || amount > Number(user.balance)) {
      throw new BadRequestException(
        'Withdraw amount exceeds available balance',
      );
    }

    try {
      // Create Stripe Transfer (from platform to connected account)
      const transfer = await StripePayment.createTransfer(
        user.stripeConnectId,
        amount,
        currency,
      );

      // Update user's available balance
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Save transaction record
      await this.prisma.paymentTransaction.create({
        data: {
          userId: userId,
          type: 'WITHDRAWAL',
          withdrawVia: 'stripe',
          provider: 'stripe',
          referenceNumber: transfer.id,
          status: 'COMPLETED',
          amount: amount,
          currency: currency,
          paidAmount: amount,
          paidCurrency: currency,
        },
      });

      return {
        success: true,
        message: 'Withdraw processed successfully',
        data: {
          transfer_id: transfer.id,
          amount: amount,
          currency: currency,
          status: 'completed',
        },
      };
    } catch (error: any) {
      console.error('Withdraw processing error:', error);

      await this.prisma.paymentTransaction.create({
        data: {
          userId: userId,
          type: 'WITHDRAWAL',
          withdrawVia: 'stripe',
          provider: 'stripe',
          status: 'FAILED',
          amount: amount,
          currency: currency,
        },
      });

      let errorMessage = 'please add onboarding link to your stripe connected account and try again';
      if (error?.code === 'balance_insufficient') {
        errorMessage =
          'Stripe account have not enough balance. Please try again later.';
      }
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  /*--------------------------------  
    Check Connected Account Balance
  ----------------------------------*/
  async checkAccountBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectId: true },
    });

    if (!user || !user.stripeConnectId) {
      throw new BadRequestException('No connected account found');
    }

    try {
      const balance = await StripePayment.checkBalance(user.stripeConnectId);

      const availableAmount = balance.available?.[0]?.amount || 0;
      const pendingAmount = balance.pending?.[0]?.amount || 0;
      const currency = balance.available?.[0]?.currency || 'usd';

      return {
        success: true,
        data: {
          stripe_id: user.stripeConnectId,
          available: {
            amount: availableAmount / 100,
            amount_in_cents: availableAmount,
            currency: currency,
            display: `$${(availableAmount / 100).toFixed(2)} ${currency.toUpperCase()}`,
          },
          pending: {
            amount: pendingAmount / 100,
            amount_in_cents: pendingAmount,
            currency: currency,
            display: `$${(pendingAmount / 100).toFixed(2)} ${currency.toUpperCase()}`,
          },
          total: {
            amount: (availableAmount + pendingAmount) / 100,
            display: `$${((availableAmount + pendingAmount) / 100).toFixed(2)} ${currency.toUpperCase()}`,
          },
        },
      };
    } catch (error: any) {
      console.error('Error checking balance:', error);
      throw new HttpException(
        'Failed to check balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /*--------------------------------  
       Withdraw History
  ----------------------------------*/
  async getWithdrawHistory(userId: string) {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        userId: userId,
        type: 'WITHDRAWAL',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: transactions,
    };
  }


  /*--------------------------------  
      Get Connected Account Info
  ----------------------------------*/
  async getConnectedAccountInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectId: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Connected account info retrieved successfully',
      data: {
        hasConnectedAccount: !!user.stripeConnectId,
        accountId: user.stripeConnectId,
        email: user.email,
        name: user.name,
      },
    };
  }

  /*-------------------------------------
    Check onboarding connected account
  --------------------------------------*/

  async isOnboardingComplete(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectId: true },
    });

    if (!user || !user.stripeConnectId) {
      return { success: true, onboarded: false };
    }
    try {
      const account = await StripePayment.getAccount(user.stripeConnectId);
      const onboarded = !!( account.charges_enabled || (account as any).payouts_enabled || account.details_submitted );
      return { success: true, onboarded };
    } catch (error: any) {
      console.error('Error retrieving Stripe account:', error);
      throw new HttpException('Failed to retrieve account status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  
}
