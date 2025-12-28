# Razorpay Integration Guide - AuraaSync Wallet

## Overview
This guide covers the Razorpay integration for the AuraaSync wallet system. Users can purchase coins through Razorpay's secure payment gateway with instant verification.

**Note:** This implementation uses client-side payment verification without webhooks for simplicity.

## Prerequisites

1. **Razorpay Account**: Sign up at [https://razorpay.com](https://razorpay.com)
2. **API Keys**: Obtain from Razorpay Dashboard
3. **Environment Variables**: Set up in `.env.local`
4. **Database**: Run the wallet migrations

## Environment Variables

Add these to your `.env.local` file:

```env
# Razorpay Keys (from Razorpay Dashboard)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### How to Get Razorpay Keys

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings → API Keys**
3. Copy your **Key ID** (starts with `rzp_live_` or `rzp_test_`)
4. Copy your **Key Secret**

## Database Setup

Run the wallet migrations to create required tables:

```sql
-- Execute the SQL file: supabase-migrations/wallet_tables.sql
-- Tables created:
-- - wallet_balances
-- - razorpay_orders
-- - wallet_transactions
```

**Tables:**

### wallet_balances
```
- id (UUID, Primary Key)
- user_id (BigInt, Foreign Key to user)
- balance (Integer - coin count)
- currency (Text - default 'INR')
- created_at (Timestamp)
- updated_at (Timestamp)
```

### razorpay_orders
```
- id (UUID, Primary Key)
- user_id (BigInt, Foreign Key)
- razorpay_order_id (Text, Unique)
- amount (Integer - in paise)
- currency (Text)
- coins (Integer)
- status (Text - 'created', 'verified', 'paid', 'failed')
- payment_id (Text - Razorpay payment ID)
- razorpay_signature (Text)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### wallet_transactions
```
- id (UUID, Primary Key)
- user_id (BigInt, Foreign Key)
- transaction_type (Text - 'purchase', 'refund', 'bonus')
- amount (Integer - in rupees)
- coins (Integer)
- description (Text)
- razorpay_order_id (Text)
- payment_id (Text)
- status (Text - 'pending', 'completed', 'failed')
- created_at (Timestamp)
- updated_at (Timestamp)
```

## API Endpoints

### 1. Create Order
**POST** `/api/wallet/create-order`

Creates a Razorpay order for coin purchase.

**Request:**
```json
{
  "userId": 123,
  "amount": 99,
  "coins": 750
}
```

**Response:**
```json
{
  "orderId": "order_2xwUUIFzDKlVb5",
  "amount": 99,
  "currency": "INR",
  "coins": 750,
  "message": "Order created successfully"
}
```

### 2. Verify Payment
**POST** `/api/wallet/verify-payment`

Verifies the payment signature and updates wallet balance. Called immediately after user completes payment in Razorpay checkout.

**Request:**
```json
{
  "razorpay_order_id": "order_2xwUUIFzDKlVb5",
  "razorpay_payment_id": "pay_2xwUUIFzDKlVb5",
  "razorpay_signature": "signature_hash",
  "userId": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "coins": 750,
  "orderId": "order_2xwUUIFzDKlVb5",
  "paymentId": "pay_2xwUUIFzDKlVb5"
}
```

## Components

### WalletButton Component
**Location:** `src/components/WalletButton.tsx`

Features:
- Floating wallet button with coin balance display
- Coin package selection grid (100 to 5000 coins)
- Razorpay checkout integration
- Real-time payment status updates
- Auto-refresh wallet balance after successful payment
- Error handling and user feedback

**Usage:**
```tsx
import WalletButton from '@/components/WalletButton';

export default function Page() {
  return (
    <>
      <WalletButton />
      {/* Your page content */}
    </>
  );
}
```

## Coin Packages

Pre-configured packages in the system:

| Coins | Price | Badge |
|-------|-------|-------|
| 100 | ₹19 | SAVE 10% |
| 310 | ₹39 | POPULAR |
| 750 | ₹99 | SAVE 15% |
| 1200 | ₹199 | BEST DEAL |
| 2400 | ₹399 | PREMIUM |
| 5000 | ₹999 | ULTIMATE |

## Payment Flow

```
1. User clicks "BUY NOW" button
   ↓
2. Frontend calls /api/wallet/create-order
   ↓
3. Backend creates Razorpay order
   ↓
4. Razorpay checkout modal opens
   ↓
5. User completes payment
   ↓
6. Razorpay callback handler fires
   ↓
7. Frontend calls /api/wallet/verify-payment
   ↓
8. Backend verifies signature & updates wallet
   ↓
9. Coins added to user's wallet
   ↓
10. Wallet balance refreshed in UI
```

## Testing

### Test Mode
To use Razorpay in test mode:
1. Get test keys from Razorpay Dashboard (use sandbox/test keys)
2. Use test credit card numbers:
   - **Visa:** 4111 1111 1111 1111
   - **Mastercard:** 5555 5555 5555 4444
   - **Expiry:** Any future date (e.g., 12/25)
   - **CVV:** Any 3 digits (e.g., 123)

### Test Payment Steps
1. Open wallet
2. Click "BUY NOW" on any coin package
3. Use test card number above
4. Complete payment
5. Coins should be added to wallet

## Security Considerations

1. **Signature Verification**: All payments verified using HMAC-SHA256
2. **Environment Variables**: Never commit keys to version control
3. **Server-Side Verification**: Payment verification happens on backend only
4. **User Validation**: User ID validated before processing payments
5. **Transaction Records**: All transactions logged for audit trail
6. **No Webhooks**: Eliminates webhook configuration complexity and security concerns

## Architecture Benefits

- **No Webhook Configuration**: Simpler deployment, no external endpoint needed
- **Immediate Verification**: Payment verified immediately after checkout callback
- **Client-Driven**: User controls when verification happens
- **Lower Latency**: No delay waiting for webhook delivery
- **Easier Debugging**: All payment events in application logs

## Database Queries

### Check wallet balance
```sql
SELECT * FROM wallet_balances WHERE user_id = 123;
```

### View payment history
```sql
SELECT * FROM razorpay_orders WHERE user_id = 123 ORDER BY created_at DESC;
```

### View all transactions
```sql
SELECT * FROM wallet_transactions WHERE user_id = 123 ORDER BY created_at DESC;
```

### Check pending orders (older than 1 hour)
```sql
SELECT * FROM razorpay_orders WHERE status = 'created' AND created_at < NOW() - INTERVAL '1 hour';
```

## Production Deployment

1. **Switch to Live Keys**:
   - Update environment variables with live Razorpay keys
   - Ensure keys start with `rzp_live_`

2. **Enable HTTPS**:
   - Razorpay works with both HTTP and HTTPS
   - Recommended to use HTTPS in production

3. **Monitor Transactions**:
   - Set up alerts for payment failures
   - Monitor wallet balance consistency

4. **Backup & Recovery**:
   - Regular database backups
   - Document recovery procedures

## Error Handling

The system handles these error scenarios:

| Error | Status | Action |
|-------|--------|--------|
| Missing fields | 400 | Return validation error |
| User not found | 404 | Return user not found error |
| Order creation failed | 500 | Log and return error |
| Signature invalid | 400 | Reject payment |
| Wallet update failed | 500 | Log error, show user message |

## Troubleshooting

### "Order not found in database"
- Verify the create-order API was called successfully
- Check database connection

### "Payment verification failed - Invalid signature"
- Ensure `RAZORPAY_KEY_SECRET` is correct in environment
- Verify payment data matches the signature

### Checkout modal not opening
- Ensure Razorpay script loaded: `https://checkout.razorpay.com/v1/checkout.js`
- Check browser console for errors
- Verify `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set

### Coins not added after payment
- Check order status in `razorpay_orders` table
- Verify payment status is "verified"
- Check user_id matches in `wallet_balances`
- Review transaction records in `wallet_transactions`

## API Error Responses

### Create Order Errors
```json
{
  "error": "Missing required fields: userId, amount, coins"
}
```

```json
{
  "error": "User not found"
}
```

### Verify Payment Errors
```json
{
  "error": "Missing required payment fields"
}
```

```json
{
  "error": "Payment verification failed - Invalid signature"
}
```

## Next Steps

1. ✅ Set up environment variables in `.env.local`
2. ✅ Run wallet SQL migrations in Supabase
3. ✅ Test with Razorpay test keys
4. ✅ Deploy to production with live keys
5. ✅ Monitor transactions and wallet balances

## Support

For issues or questions:
- Razorpay Support: [https://razorpay.com/support](https://razorpay.com/support)
- Documentation: [https://razorpay.com/docs](https://razorpay.com/docs)

## References

- [Razorpay Checkout Documentation](https://razorpay.com/docs/checkout/web)
- [Razorpay API Reference](https://razorpay.com/docs/api)
- [Payment Integration Best Practices](https://razorpay.com/docs/payment-gateway/payment-flow)

