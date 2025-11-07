import { NextRequest, NextResponse } from 'next/server';
import { getUserDataFromToken } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    console.log('Received ID token (first 50 chars):', idToken.substring(0, 50) + '...');

    // Check Firebase Admin environment variables
    const envVars = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing',
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Missing'
    };

    console.log('Firebase Admin Environment Variables:', envVars);

    try {
      // Try Firebase Admin verification
      const firebaseUser = await getUserDataFromToken(idToken);
      console.log('Firebase Admin verification successful:', firebaseUser);
      
      return NextResponse.json({
        success: true,
        method: 'Firebase Admin',
        user: firebaseUser,
        envVars
      });
    } catch (adminError) {
      console.error('Firebase Admin verification failed:', adminError);
      
      // Try fallback method
      try {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
        
        const data = await response.json();
        console.log('Firebase REST API response:', data);
        
        if (data.users && data.users[0]) {
          const firebaseUser = {
            uid: data.users[0].localId,
            email: data.users[0].email,
            name: data.users[0].displayName,
            picture: data.users[0].photoUrl
          };
          
          return NextResponse.json({
            success: true,
            method: 'Firebase REST API',
            user: firebaseUser,
            envVars,
            adminError: adminError.message
          });
        } else {
          throw new Error('Invalid token in REST API response');
        }
      } catch (fallbackError) {
        console.error('Fallback verification also failed:', fallbackError);
        
        return NextResponse.json({
          success: false,
          error: 'All verification methods failed',
          adminError: adminError.message,
          fallbackError: fallbackError.message,
          envVars
        }, { status: 401 });
      }
    }
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
