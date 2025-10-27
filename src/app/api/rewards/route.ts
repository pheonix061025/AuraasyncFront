import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    // Get all rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .order('cost', { ascending: true });

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError);
      return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
    }

    // If user_id is provided, check which rewards are already purchased
    if (user_id) {
      const { data: purchases, error: purchasesError } = await supabase
        .from('reward_purchases')
        .select('reward_id')
        .eq('user_id', parseInt(user_id));

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
        return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
      }

      const purchasedRewardIds = new Set(purchases?.map(p => p.reward_id) || []);
      
      const rewardsWithStatus = rewards?.map(reward => ({
        ...reward,
        isUnlocked: purchasedRewardIds.has(reward.id)
      })) || [];

      return NextResponse.json(rewardsWithStatus);
    }

    return NextResponse.json(rewards || []);
  } catch (error) {
    console.error('Error in GET /api/rewards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, reward_id } = body;

    if (!user_id || !reward_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get reward details
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', reward_id)
      .single();

    if (rewardError || !reward) {
      console.error('Error fetching reward:', rewardError);
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('points')
      .eq('user_id', parseInt(user_id))
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has enough points
    if (user.points < reward.cost) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });
    }

    // Check if reward is already purchased
    const { data: existingPurchase } = await supabase
      .from('reward_purchases')
      .select('id')
      .eq('user_id', parseInt(user_id))
      .eq('reward_id', reward_id)
      .single();

    if (existingPurchase) {
      return NextResponse.json({ error: 'Reward already purchased' }, { status: 400 });
    }

    // Create reward purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('reward_purchases')
      .insert({
        user_id: parseInt(user_id),
        reward_id
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
    }

    // Deduct points from user
    const { error: updateError } = await supabase
      .from('user')
      .update({ 
        points: user.points - reward.cost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', parseInt(user_id));

    if (updateError) {
      console.error('Error updating user points:', updateError);
      return NextResponse.json({ error: 'Failed to update user points' }, { status: 500 });
    }

    // Create points transaction
    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        user_id: parseInt(user_id),
        action: 'reward_purchased',
        points: -reward.cost,
        description: `Purchased reward: ${reward.name}`
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error('Error in POST /api/rewards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
