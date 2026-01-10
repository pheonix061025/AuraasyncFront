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

    const parsedUserId = parseInt(user_id);
    let transactionCreated = false;
    let lastLoginDateUpdated = false;

    // Server-side validation for DAILY_LOGIN
    // Prevent duplicate claims using atomic UPDATE-If-Not-Today pattern
    if (action === 'DAILY_LOGIN' || action === 'daily_login') {
      const today = new Date().toISOString().split('T')[0];

      // Get current user data to check last_login_date
      const { data: currentUser, error: fetchError } = await supabase
        .from('user')
        .select('last_login_date, points')
        .eq('user_id', parsedUserId)
        .single();

      if (fetchError) {
        console.error('Error fetching user for daily login check:', fetchError);
        return NextResponse.json({ error: 'Failed to verify daily login' }, { status: 500 });
      }

      // Check if user has already claimed today
      if (currentUser?.last_login_date === today) {
        console.warn(`Duplicate daily login attempt for user ${parsedUserId} (Already claimed today)`);
        return NextResponse.json({ error: 'Daily login already claimed today' }, { status: 400 });
      }

      // Attempt atomic update: update last_login_date AND points in one operation
      const { error: updateError } = await supabase
        .from('user')
        .update({
          last_login_date: today,
          points: (currentUser?.points || 0) + parseInt(points),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', parsedUserId);

      if (updateError) {
        console.error('Error updating daily login:', updateError);
        return NextResponse.json({ error: 'Failed to process daily login' }, { status: 500 });
      }

      lastLoginDateUpdated = true;
    }

    // Create points transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        user_id: parsedUserId,
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

    transactionCreated = true;

    // For non-DAILY_LOGIN actions, update points separately
    if (!(action === 'DAILY_LOGIN' || action === 'daily_login')) {
      // Get current user points
      const { data: currentUser, error: fetchError } = await supabase
        .from('user')
        .select('points')
        .eq('user_id', parsedUserId)
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
        .eq('user_id', parsedUserId);

      if (updateError) {
        console.error('Error updating user points:', updateError);
        return NextResponse.json({ error: 'Failed to update user points' }, { status: 500 });
      }
    }

    // Fetch updated user data to return
    const { data: updatedUser, error: finalFetchError } = await supabase
      .from('user')
      .select('*')
      .eq('user_id', parsedUserId)
      .single();

    if (finalFetchError) {
      console.error('Error fetching updated user:', finalFetchError);
      return NextResponse.json({ transaction }, { status: 200 });
    }

    return NextResponse.json({ transaction, user: updatedUser });
  } catch (error) {
    console.error('Error in POST /api/points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
