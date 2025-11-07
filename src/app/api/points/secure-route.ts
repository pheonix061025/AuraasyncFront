import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserPoints, updateUserPoints, awardPoints, deductPoints, hasEnoughPoints } from '@/lib/securePoints';

// Simple token verification using Firebase REST API
async function verifyIdToken(idToken: string) {
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.users || !data.users[0]) {
      throw new Error('Invalid token');
    }
    
    const user = data.users[0];
    return {
      uid: user.localId,
      email: user.email,
      name: user.displayName,
      picture: user.photoUrl,
      emailVerified: user.emailVerified
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

// GET /api/points/secure - Get user points
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const firebaseUser = await verifyIdToken(idToken);
    
    if (!firebaseUser?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('user')
      .select('user_id, points')
      .eq('email', firebaseUser.email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get fresh points from database
    const currentPoints = await getUserPoints(user.user_id);

    return NextResponse.json({ 
      points: currentPoints,
      user_id: user.user_id,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/points/secure:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/points/secure - Update points (award/deduct)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const firebaseUser = await verifyIdToken(idToken);
    
    if (!firebaseUser?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { action, points, reason } = body;

    if (!action || !reason) {
      return NextResponse.json({ error: 'Action and reason are required' }, { status: 400 });
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('user')
      .select('user_id')
      .eq('email', firebaseUser.email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let result;

    switch (action) {
      case 'award':
        result = await awardPoints(user.user_id, reason, points);
        break;
      case 'deduct':
        if (!points || points <= 0) {
          return NextResponse.json({ error: 'Valid points amount required for deduction' }, { status: 400 });
        }
        result = await deductPoints(user.user_id, points, reason);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      new_points: result.newPoints,
      message: `Points ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error in POST /api/points/secure:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/points/secure - Check if user has enough points
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const firebaseUser = await verifyIdToken(idToken);
    
    if (!firebaseUser?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { required_points } = body;

    if (!required_points || required_points <= 0) {
      return NextResponse.json({ error: 'Valid required_points is required' }, { status: 400 });
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('user')
      .select('user_id')
      .eq('email', firebaseUser.email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasEnough = await hasEnoughPoints(user.user_id, required_points);
    const currentPoints = await getUserPoints(user.user_id);

    return NextResponse.json({
      has_enough_points: hasEnough,
      current_points: currentPoints,
      required_points: required_points
    });

  } catch (error) {
    console.error('Error in PUT /api/points/secure:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
