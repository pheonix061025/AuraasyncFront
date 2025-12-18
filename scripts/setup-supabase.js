#!/usr/bin/env node

/**
 * Supabase Dashboard Setup Script
 * 
 * This script helps set up the Supabase integration for the dashboard.
 * Run this after creating your Supabase project and setting up the database schema.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Supabase Dashboard Integration...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('Please create a .env.local file with your Supabase credentials:');
  console.log('');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.log('');
  process.exit(1);
}

// Read .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!hasSupabaseUrl || !hasSupabaseKey) {
  console.log('❌ Missing Supabase environment variables!');
  console.log('Please add the following to your .env.local file:');
  console.log('');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.log('');
  process.exit(1);
}

console.log('✅ Environment variables found');

// Check if Supabase client file exists
const supabasePath = path.join(process.cwd(), 'src/lib/supabase.ts');
if (!fs.existsSync(supabasePath)) {
  console.log('❌ Supabase client file not found!');
  console.log('Please ensure src/lib/supabase.ts exists');
  process.exit(1);
}

console.log('✅ Supabase client file found');

// Check if API routes exist
const apiRoutes = [
  'src/app/api/user/route.ts',
  'src/app/api/points/route.ts',
  'src/app/api/reviews/route.ts',
  'src/app/api/rewards/route.ts'
];

let allRoutesExist = true;
apiRoutes.forEach(route => {
  const routePath = path.join(process.cwd(), route);
  if (!fs.existsSync(routePath)) {
    console.log(`❌ API route not found: ${route}`);
    allRoutesExist = false;
  }
});

if (!allRoutesExist) {
  console.log('❌ Some API routes are missing!');
  process.exit(1);
}

console.log('✅ All API routes found');

// Check if dashboard is updated
const dashboardPath = path.join(process.cwd(), 'src/app/dashboard/page.tsx');
if (fs.existsSync(dashboardPath)) {
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  if (dashboardContent.includes('supabase') && dashboardContent.includes('from(\'user\')')) {
    console.log('✅ Dashboard is updated for Supabase');
  } else {
    console.log('⚠️  Dashboard may not be fully updated for Supabase');
  }
} else {
  console.log('❌ Dashboard file not found!');
}

console.log('\n🎉 Setup check completed!');
console.log('\nNext steps:');
console.log('1. Make sure you have created your Supabase project');
console.log('2. Run the SQL schema from supabaseschema.md in your Supabase SQL editor');
console.log('3. Seed the rewards table by running: node -e "require(\'./src/lib/seedRewards.ts\')"');
console.log('4. Start your development server: npm run dev');
console.log('5. Test the dashboard at http://localhost:3000/dashboard');
console.log('\nFor detailed setup instructions, see SUPABASE_DASHBOARD_INTEGRATION.md');
