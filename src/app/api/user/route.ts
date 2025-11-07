import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify token using Firebase REST API
    const firebaseUser = await verifyIdToken(idToken);
    
    if (!firebaseUser?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user data from Supabase
    const { data: userData, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', firebaseUser.email)
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error in GET /api/user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify token using Firebase REST API
    const firebaseUser = await verifyIdToken(idToken);
    
    if (!firebaseUser?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, gender, location, skin_tone, face_shape, body_shape, personality, onboarding_completed } = body;

    const userEmail = firebaseUser.email;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user')
      .select('user_id')
      .eq('email', userEmail)
      .single();

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('user')
        .update({
          name: name || firebaseUser.name,
          gender,
          location,
          skin_tone,
          face_shape,
          body_shape,
          personality,
          onboarding_completed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingUser.user_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      return NextResponse.json(updatedUser);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('user')
        .insert({
          email: userEmail,
          name: name || firebaseUser.name,
          gender,
          location,
          skin_tone,
          face_shape,
          body_shape,
          personality,
          onboarding_completed,
          points: 0,
          is_new_user: true,
          referral_code: `AURA${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          total_referrals: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      return NextResponse.json(newUser);
    }
  } catch (error) {
    console.error('Error in POST /api/user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, ...updateData } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update user data
    const { data: updatedUser, error } = await supabase
      .from('user')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error in PUT /api/user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}