import { createClient } from '@supabase/supabase-js'

// Make sure to set these in your environment (e.g., .env.local)
// NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
// NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	// Help during development: throw a clear error only on server-side or dev
	if (typeof window === 'undefined') {
		throw new Error(
			'Missing Supabase env vars. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
		)
	} else {
		// In the browser, log a concise error to avoid breaking hydration if user navigates before env is loaded
		// eslint-disable-next-line no-console
		console.error(
			'Supabase is not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
		)
	}
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string)

export default supabase
