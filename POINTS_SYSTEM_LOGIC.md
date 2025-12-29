# Auraasync Points/Coins System Documentation

## Overview
This document describes the logic, flow, and best practices for the points/coins system in the Auraasync project. It covers how coins are awarded and deducted, how user balances are updated, how transactions are logged, and how the UI reflects changes. The schema is based on the provided `supbaseschema.md`.

---

## Database Schema Reference

### user (public.user)
- `user_id bigint PRIMARY KEY`
- `email character varying NOT NULL UNIQUE`
- `points integer NOT NULL DEFAULT 0` (main coin balance)
- Other profile fields...

### points_transactions (public.points_transactions)
- `id uuid PRIMARY KEY`
- `user_id bigint` (FK to user)
- `action text NOT NULL` (e.g., 'deduct', 'award', 'DAILY_LOGIN')
- `points integer NOT NULL` (positive for award, negative for deduction)
- `description text`
- `created_at timestamp`

---

## Points/Coin Logic in Codebase

### 1. Awarding and Deducting Points
- **All coin changes must be logged in `points_transactions` and reflected in the user's `points` column.**
- Deductions use negative `points` values; awards use positive values.

#### a. API Endpoint: `/api/points` (POST)
- Handles both awarding and deducting points atomically.
- Payload:
  - `user_id` (bigint)
  - `action` (string, e.g., 'deduct', 'award', 'DAILY_LOGIN')
  - `points` (integer, positive or negative)
  - `description` (string)
- Flow:
  1. Validate payload.
  2. Insert transaction into `points_transactions`.
  3. Fetch current user points.
  4. Update user points (`user.points = user.points + points`).
  5. Return transaction and updated user.
- **Error handling:**
  - Returns error if fields are missing, transaction fails, or user update fails.

#### b. Frontend Usage
- **Chatbot:**
  - Before sending a message, POSTs to `/api/points` with negative points to deduct coins.
  - Updates local user state and UI on success.
  - Shows error if not enough coins or deduction fails.
- **RewardModal:**
  - When claiming a reward, POSTs to `/api/points` with positive points to award coins.
  - Updates local user state and UI on success.
  - Handles daily login, referrals, reviews, etc.
- **OutfitCalendarGenerator and other paid features:**
  - Use the same `/api/points` POST logic for atomic deduction.

### 2. UI Updates
- User coin balance is shown in the UI and updated after every transaction.
- `user_points_updated` event is dispatched to sync UI across components.
- Error messages are shown if deduction/award fails or user is not authenticated.

### 3. Local User State
- User data is stored in localStorage (excluding points, which should always be fetched from the server after a transaction).
- `setUserData` and `getUserData` manage local user info.

### 4. Edge Cases & Best Practices
- Always check for sufficient balance before deducting coins.
- Always POST to `/api/points` for any coin change (never update balance directly from the frontend).
- Log every transaction in `points_transactions` for auditability.
- Handle errors gracefully and inform the user.
- Use the `user_id` bigint for all operations (not email or uuid).

---

## Example: Deducting Coins in Chatbot
```ts
const pointsRes = await fetch("/api/points", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id,
    action: "deduct",
    points: -cost,
    description: `Chatbot message (${type})`,
  }),
});
```

## Example: Awarding Coins in RewardModal
```ts
const pointsRes = await fetch("/api/points", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: userData.user_id,
    action: "award",
    points: task.points,
    description: actionId,
  }),
});
```

---

## Summary
- All coin changes are atomic, logged, and reflected in the user's balance.
- Use `/api/points` for all award/deduct actions.
- UI and local state are updated after every transaction.
- All logic is consistent with the schema and best practices for reliability and auditability.
