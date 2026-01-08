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

    // Server-side validation for DAILY_LOGIN
    // Prevent duplicate claims using atomic UPDATE-If-Not-Today pattern
    if (action === 'DAILY_LOGIN' || action === 'daily_login') {
      const today = new Date().toISOString().split('T')[0];

      // Attempt to update last_login_date ONLY if it is NOT today
      // This atomic operation guarantees that only one request can succeed per day
      const { data: updatedUser, error: updateError } = await supabase
        .from('user')
        .update({ last_login_date: today })
        .eq('user_id', parseInt(user_id))
        .neq('last_login_date', today) // The atomic lock condition
        .select();

      if (updateError) {
        console.error('Error locking daily login:', updateError);
        return NextResponse.json({ error: 'Failed to process daily login' }, { status: 500 });
      }

      // If no rows were returned, it means the condition .neq('last_login_date', today) failed
      // Therefore, the user has already logged in/claimed today.
      if (!updatedUser || updatedUser.length === 0) {
        console.warn(`Duplicate daily login attempt for user ${user_id} (Atomic Lock)`);
        return NextResponse.json({ error: 'Daily login already claimed today' }, { status: 400 });
      }
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

    // Get current user points
    const { data: currentUser, error: fetchError } = await supabase
      .from('user')
      .select('points')
      .eq('user_id', parseInt(user_id))
      .single();

    if (fetchError) {
      console.error('Error fetching current user points:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch current points' }, { status: 500 });
    }

    // Update user points
    const { error: updateError } = await supabase
      .from('user')
      .update({
        points: (currentUser?.points || 0) + parseInt(points),
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
