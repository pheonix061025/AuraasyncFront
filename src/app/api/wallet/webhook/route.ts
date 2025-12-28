
// Webhook support removed - use verify-payment endpoint instead
// The verify-payment endpoint handles all payment verification on the client callback
// No server-side webhook configuration needed


export const dynamic = 'force-static';
export async function GET() {
	return new Response('Not implemented', { status: 404 });
}
