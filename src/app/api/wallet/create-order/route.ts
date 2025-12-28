import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay environment variables');
}

// Production mode check
const isLiveMode = process.env.RAZORPAY_KEY_ID.startsWith('rzp_live_');
if (isLiveMode) {
  console.log('🔴 LIVE MODE: Real payments will be processed');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, coins } = await request.json();

    // Validate input
    if (!userId || !amount || !coins) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount, coins' },
        { status: 400 }
      );
    }

    // Validate positive numbers
    if (amount <= 0 || coins <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount or coins value' },
        { status: 400 }
      );
    }

    // Validate reasonable limits (max ₹10,000 per transaction)
    if (amount > 10000) {
      return NextResponse.json(
        { error: 'Amount exceeds maximum limit' },
        { status: 400 }
      );
    }

    // Check user exists
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise (smallest currency unit)
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId,
        coins,
        description: `Purchase ${coins} coins`,
      },
    });

    // Log order creation in production
    console.log(`💰 Order created: ${razorpayOrder.id} | User: ${userId} | Amount: ₹${amount} | Coins: ${coins}`);

    // Store order in database
    const { data: orderRecord, error: orderError } = await supabase
      .from('razorpay_orders')
      .insert([
        {
          user_id: userId,
          razorpay_order_id: razorpayOrder.id,
          amount,
          coins,
          status: 'created',
        },
      ])
      .select()
      .single();

    if (orderError) {
      return NextResponse.json(
        { error: 'Failed to create order record' },
        { status: 500 }
      );
    }

    // Also create a transaction record
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert([
        {
          user_id: userId,
          transaction_type: 'purchase',
          amount,
          coins,
          razorpay_order_id: razorpayOrder.id,
          status: 'pending',
          description: `Purchase ${coins} coins for ₹${amount}`,
        },
      ]);

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
    }

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: Number(razorpayOrder.amount) / 100,
      currency: razorpayOrder.currency,
      coins,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order', details: (error as Error).message },
      { status: 500 }
    );
  }
}
