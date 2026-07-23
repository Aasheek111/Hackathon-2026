import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { SubscriptionPlan, PaymentStatus } from '@prisma/client';

const router = Router();

const plans = [
  { id: 'MONTH_1', name: '1 Month', price: 499, currency: 'NPR', durationDays: 30 },
  { id: 'MONTH_3', name: '3 Months', price: 1299, currency: 'NPR', durationDays: 90 },
  { id: 'MONTH_6', name: '6 Months', price: 2299, currency: 'NPR', durationDays: 180 }
];

router.get('/plans', (req: Request, res: Response) => {
  res.json(plans);
});

router.post('/initiate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    const selectedPlan = plans.find(p => p.id === plan);
    
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const userId = req.user!.id;
    const transactionUuid = crypto.randomUUID();

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: plan as SubscriptionPlan,
        paymentStatus: PaymentStatus.PENDING,
        transactionId: transactionUuid
      },
      update: {
        plan: plan as SubscriptionPlan,
        paymentStatus: PaymentStatus.PENDING,
        transactionId: transactionUuid
      }
    });

    const amount = selectedPlan.price;
    const merchantCode = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
    const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';

    const signatureString = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${merchantCode}`;
    const signature = crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64');

    const formData = {
      amount: amount.toString(),
      tax_amount: '0',
      total_amount: amount.toString(),
      transaction_uuid: transactionUuid,
      product_code: merchantCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: process.env.ESEWA_SUCCESS_URL || 'http://localhost:5000/api/subscription/verify',
      failure_url: process.env.ESEWA_FAILURE_URL || 'http://localhost:5173/subscription?error=payment_failed',
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature
    };

    res.json({
      esewaUrl: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
      formData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

router.get('/verify', async (req: Request, res: Response) => {
  try {
    const { data } = req.query;
    if (!data || typeof data !== 'string') {
      return res.redirect(`${process.env.FRONTEND_URL}/subscription?error=invalid_data`);
    }

    const decodedStr = Buffer.from(data, 'base64').toString('utf-8');
    const paymentData = JSON.parse(decodedStr);

    const { transaction_uuid, status } = paymentData;

    if (status !== 'COMPLETE') {
      return res.redirect(`${process.env.FRONTEND_URL}/subscription?error=payment_failed`);
    }

    const subscription = await prisma.subscription.findFirst({
      where: { transactionId: transaction_uuid }
    });

    if (!subscription) {
      return res.redirect(`${process.env.FRONTEND_URL}/subscription?error=subscription_not_found`);
    }

    const selectedPlan = plans.find(p => p.id === subscription.plan);
    const durationDays = selectedPlan ? selectedPlan.durationDays : 30;

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        paymentStatus: PaymentStatus.SUCCESS,
        startDate,
        expiryDate
      }
    });

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?payment=success`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/subscription?error=verification_failed`);
  }
});

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id }
    });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

export default router;
