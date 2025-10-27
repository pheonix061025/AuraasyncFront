import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get points transactions for user
    const { data: transactions, error } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', parseInt(user_id))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error('Error in GET /api/points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, action, points, description } = body;

    if (!user_id || !action || points === undefined || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create points transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        user_id: parseInt(user_id),
        action,
        points: parseInt(points),
        description
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // Update user points
    const { error: updateError } = await supabase
      .from('user')
      .update({ 
        points: supabase.raw(`points + ${parseInt(points)}`),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', parseInt(user_id));

    if (updateError) {
      console.error('Error updating user points:', updateError);
      return NextResponse.json({ error: 'Failed to update user points' }, { status: 500 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error in POST /api/points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
