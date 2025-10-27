import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const product_id = searchParams.get('product_id');

    let query = supabase.from('reviews').select('*');

    if (user_id) {
      query = query.eq('user_id', parseInt(user_id));
    }

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    const { data: reviews, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json(reviews || []);
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, product_id, product_name, review_text, rating, points_awarded } = body;

    if (!user_id || !product_id || !review_text || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: parseInt(user_id),
        product_id,
        product_name,
        review_text,
        rating: parseInt(rating),
        points_awarded: points_awarded || 0
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }

    // If points were awarded, create a transaction
    if (points_awarded && points_awarded > 0) {
      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert({
          user_id: parseInt(user_id),
          action: 'review_submitted',
          points: points_awarded,
          description: `Review submitted for ${product_name}`
        });

      if (transactionError) {
        console.error('Error creating review transaction:', transactionError);
        // Don't fail the request, just log the error
      }

      // Update user points
      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          points: supabase.raw(`points + ${points_awarded}`),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', parseInt(user_id));

      if (updateError) {
        console.error('Error updating user points:', updateError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error in POST /api/reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
