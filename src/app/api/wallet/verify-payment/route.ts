import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

if (!process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay secret key');
}

// Production mode check
const isLiveMode = process.env.RAZORPAY_KEY_SECRET?.length > 0;
if (isLiveMode) {
  console.log('🔴 LIVE MODE: Verifying real payment');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

interface PaymentVerificationBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  userId: number;
}

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
    } = (await request.json()) as PaymentVerificationBody;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required payment fields' },
        { status: 400 }
      );
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Payment verification failed - Invalid signature' },
        { status: 400 }
      );
    }

    // Fetch order from database
    const { data: orderRecord, error: fetchError } = await supabase
      .from('razorpay_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (fetchError || !orderRecord) {
      return NextResponse.json(
        { error: 'Order not found in database' },
        { status: 404 }
      );
    }

    // Prevent duplicate payment processing
    if (orderRecord.status === 'verified' || orderRecord.status === 'completed') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      );
    }

    // Verify userId matches the order
    if (orderRecord.user_id !== userId) {
      return NextResponse.json(
        { error: 'User ID mismatch - Unauthorized' },
        { status: 403 }
      );
    }

    // Update order status to verified
    const { error: updateOrderError } = await supabase
      .from('razorpay_orders')
      .update({
        status: 'verified',
        payment_id: razorpay_payment_id,
        razorpay_signature,
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id);

    if (updateOrderError) {
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Update wallet balance
    const { data: walletData, error: walletFetchError } = await supabase
      .from('wallet_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletFetchError) {
      // Create wallet if it doesn't exist
      const { error: createWalletError } = await supabase
        .from('wallet_balances')
        .insert([
          {
            user_id: userId,
            balance: orderRecord.coins,
            currency: 'INR',
          },
        ]);

      if (createWalletError) {
        return NextResponse.json(
          { error: 'Failed to create wallet' },
          { status: 500 }
        );
      }
    } else {
      // Update existing wallet
      const { error: updateWalletError } = await supabase
        .from('wallet_balances')
        .update({
          balance: walletData.balance + orderRecord.coins,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateWalletError) {
        return NextResponse.json(
          { error: 'Failed to update wallet balance' },
          { status: 500 }
        );
      }
    }

    // Update transaction status
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .update({
        status: 'completed',
        payment_id: razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id);

    if (transactionError) {
      console.error('Error updating transaction:', transactionError);
    }

    // Log successful payment
    console.log(`✅ Payment verified: Order ${razorpay_order_id}, User ${userId}, Coins ${orderRecord.coins}`);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      coins: orderRecord.coins,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Payment verification failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
