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
      .maybeSingle(); // Use maybeSingle() to handle new users who don't exist yet

    if (error) {
      console.error('Error fetching user data:', error);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    if (!userData) {
      console.log('User not found in database - this is normal for new users');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('📊 GET /api/user - Fetched user data from Supabase:', {
      email: userData.email,
      onboarding_completed: userData.onboarding_completed,
      gender: userData.gender,
      user_id: userData.user_id
    });

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

    console.log('📝 POST /api/user - Received data:', {
      email: firebaseUser.email,
      name,
      gender,
      location,
      onboarding_completed,
      body_keys: Object.keys(body)
    });

    const userEmail = firebaseUser.email;

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('user')
      .select('user_id')
      .eq('email', userEmail)
      .maybeSingle(); // Use maybeSingle() to gracefully handle when user doesn't exist

    // Log any errors from the check query (but don't fail on "no rows" error)
    if (checkError) {
      console.error('Error checking for existing user:', checkError);
    }

    if (existingUser) {
      // Update existing user
      console.log('🔄 Updating existing user:', existingUser.user_id);
      
      // Build update data - only include onboarding_completed if explicitly set to true
      // This prevents intermediate steps from overwriting a completed onboarding
      const updateData: any = {
        name: name || firebaseUser.name,
        updated_at: new Date().toISOString()
      };
      
      // Only add fields if they have actual values (not undefined or empty string)
      if (gender !== undefined && gender !== null) updateData.gender = gender;
      if (location !== undefined && location !== null) updateData.location = location;
      if (skin_tone !== undefined && skin_tone !== null) updateData.skin_tone = skin_tone;
      if (face_shape !== undefined) updateData.face_shape = face_shape;
      if (body_shape !== undefined) updateData.body_shape = body_shape;
      if (personality !== undefined) updateData.personality = personality;
      
      // Only update onboarding_completed if it's being set to true
      // This prevents intermediate updates from setting it back to false
      if (onboarding_completed === true) {
        updateData.onboarding_completed = true;
      }
      
      console.log('📤 Update data being sent to Supabase:', updateData);
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('user')
        .update(updateData)
        .eq('user_id', existingUser.user_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      console.log('✅ User updated successfully:', {
        user_id: updatedUser.user_id,
        onboarding_completed: updatedUser.onboarding_completed,
        gender: updatedUser.gender
      });

      return NextResponse.json(updatedUser);
    } else {
      // Create new user
      console.log('🆕 Creating new user in database:', {
        email: userEmail,
        name: name || firebaseUser.name,
        gender,
        location
      });
      
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
          referral_code: `AURA${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          total_referrals: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', {
          error: createError,
          code: createError.code,
          message: createError.message,
          details: createError.details
        });
        return NextResponse.json({ 
          error: 'Failed to create user', 
          details: createError.message 
        }, { status: 500 });
      }

      console.log('✅ New user created successfully:', {
        user_id: newUser.user_id,
        email: newUser.email,
        gender: newUser.gender
      });

      return NextResponse.json(newUser);
    }
  } catch (error) {
    console.error('❌ Error in POST /api/user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
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