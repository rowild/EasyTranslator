# EasyTranslator Monetization Implementation Plan

## Executive Summary

This plan covers implementing:
1. **Voxtral usage tracking** (foundation for billing)
2. **Supabase authentication** (user accounts)
3. **Usage quota system** (free tier + paid tiers)
4. **Stripe integration** (subscriptions, EU focus)
5. **Mollie integration** (Dutch/EU payments, iDEAL)

---

## Part 1: Voxtral Cost Analysis (CRITICAL FOUNDATION)

### Voxtral Pricing

| Model | Price | Best For |
|-------|-------|----------|
| **Voxtral Mini** | $0.001/minute | Cost-sensitive, edge deployment |
| **Voxtral Small** | $0.004/minute | Production quality (current app) |

**Your cost per translation:** ~$0.004 × audio_minutes

### What Voxtral Returns

The app ALREADY tracks usage! In `main` branch, the API returns:

```json
{
  "usage": {
    "prompt_audio_seconds": 12.5,    // Audio duration - THIS IS YOUR COST BASIS
    "prompt_tokens": 234,
    "completion_tokens": 156,
    "total_tokens": 390
  }
}
```

**Key insight:** Billing is based on `prompt_audio_seconds`, NOT tokens. Tokens are for the text processing, but the primary cost is audio duration.

### Cost Calculation Example

| Audio Duration | Voxtral Cost | Your Margin (2x) | User Pays |
|----------------|--------------|------------------|-----------|
| 10 seconds | $0.00067 | $0.00134 | ~$0.001 |
| 1 minute | $0.004 | $0.008 | ~$0.01 |
| 10 minutes | $0.04 | $0.08 | ~$0.10 |

---

## Part 2: Database Schema (Supabase)

### Tables Required

```sql
-- Users (handled by Supabase Auth, extended with profile)
create table public.profiles (
  id uuid references auth.users primary key,
  email text,
  display_name text,
  created_at timestamp with time zone default now(),
  subscription_tier text default 'free',  -- 'free', 'basic', 'pro'
  subscription_status text default 'active', -- 'active', 'cancelled', 'past_due'
  stripe_customer_id text,
  mollie_customer_id text,
  subscription_expires_at timestamp with time zone
);

-- Usage tracking (per translation)
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  audio_seconds numeric not null,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  target_languages integer default 1,  -- Number of languages translated to
  cost_eur numeric  -- Calculated cost in EUR
);

-- Monthly usage aggregation (for quota checks)
create table public.monthly_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  month date not null,  -- First day of month
  total_audio_seconds numeric default 0,
  total_translations integer default 0,
  total_cost_eur numeric default 0,
  unique(user_id, month)
);

-- Subscription plans
create table public.plans (
  id text primary key,  -- 'free', 'basic', 'pro'
  name text not null,
  price_eur numeric not null,
  monthly_audio_minutes integer not null,  -- Quota
  monthly_translations integer,  -- Alternative quota (NULL = unlimited)
  features jsonb
);

-- Insert default plans
insert into public.plans values
  ('free', 'Free Trial', 0, 5, 5, '{"max_languages": 1}'),
  ('basic', 'Basic', 4.99, 60, null, '{"max_languages": 3}'),
  ('pro', 'Pro', 9.99, 300, null, '{"max_languages": 10}');
```

### Row Level Security (RLS)

```sql
-- Users can only read/write their own data
alter table public.profiles enable row level security;
alter table public.usage_logs enable row level security;
alter table public.monthly_usage enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can view own usage"
  on public.usage_logs for select using (auth.uid() = user_id);
```

---

## Part 3: Free Tier Implementation

### Option A: Translation Count (Simpler)
- **5 free translations** (regardless of duration)
- Easy to understand for users
- Simple to implement

### Option B: Audio Minutes (Fairer)
- **5 free minutes** of audio
- More aligned with actual costs
- Requires tracking audio seconds

### Recommendation: **Start with Option A** (5 translations)
- Easier to communicate: "Try 5 translations free!"
- Switch to minutes-based for paid tiers

### Quota Check Flow

```
User clicks Record
    ↓
Check: Is user logged in?
    ├─ No → Show "Sign up for 5 free translations"
    └─ Yes → Check quota
              ├─ Has remaining quota → Allow recording
              └─ Quota exceeded → Show upgrade prompt
```

---

## Part 4: Supabase Authentication

### Setup Steps

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project (EU region: Frankfurt recommended)
   - Note: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

2. **Configure Auth Providers**
   - Email/Password (default)
   - Google OAuth (recommended for conversion)
   - Apple Sign-In (for iOS PWA users)

3. **Install Supabase Client**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Environment Variables**
   ```env
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

### Vue Integration

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(true)

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  // Check remaining quota
  const checkQuota = async () => {
    if (!user.value) return { allowed: false, remaining: 0 }

    const { data } = await supabase
      .from('monthly_usage')
      .select('total_translations')
      .eq('user_id', user.value.id)
      .eq('month', new Date().toISOString().slice(0, 7) + '-01')
      .single()

    const plan = profile.value?.subscription_tier || 'free'
    const limits = { free: 5, basic: null, pro: null }
    const limit = limits[plan]
    const used = data?.total_translations || 0

    return {
      allowed: limit === null || used < limit,
      remaining: limit === null ? Infinity : limit - used,
      limit
    }
  }

  return { user, profile, loading, signIn, signUp, signOut, checkQuota }
})
```

---

## Part 5: Stripe Integration (EU Focus)

### Pricing Tiers (EUR)

| Tier | Price | Included | Extra |
|------|-------|----------|-------|
| **Free** | €0 | 5 translations | - |
| **Basic** | €4.99/mo | 60 min audio | €0.01/min over |
| **Pro** | €9.99/mo | 300 min audio | €0.008/min over |

### Setup Steps

1. **Create Stripe Account**
   - Register at [stripe.com](https://stripe.com)
   - Set default currency to EUR
   - Enable EU payment methods (SEPA, iDEAL via Stripe)

2. **Create Products & Prices in Stripe Dashboard**
   ```
   Product: EasyTranslator Basic
   Price: €4.99/month, recurring

   Product: EasyTranslator Pro
   Price: €9.99/month, recurring
   ```

3. **Install Stripe**
   ```bash
   npm install @stripe/stripe-js
   ```

4. **Environment Variables**
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   # Server-side only (for webhooks):
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Checkout Flow (Client-side)

```typescript
// src/lib/stripe.ts
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export const redirectToCheckout = async (priceId: string, userId: string) => {
  const stripe = await stripePromise

  // Call your backend to create checkout session
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId })
  })

  const { sessionId } = await response.json()

  await stripe.redirectToCheckout({ sessionId })
}
```

### Webhook Handler (Vercel Serverless)

```typescript
// api/stripe-webhook.ts
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Service key for admin access
)

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature']
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  )

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      await supabase
        .from('profiles')
        .update({
          subscription_tier: session.metadata.tier,
          subscription_status: 'active',
          stripe_customer_id: session.customer
        })
        .eq('id', session.metadata.user_id)
      break

    case 'customer.subscription.deleted':
      // Handle cancellation
      break

    case 'invoice.payment_failed':
      // Handle failed payment
      break
  }

  res.json({ received: true })
}
```

---

## Part 6: Mollie Integration (Dutch/EU)

### Why Mollie?
- Native iDEAL support (dominant in Netherlands)
- Lower fees for EU payment methods
- No monthly fees, pay-per-transaction

### Mollie Pricing

| Method | Fee |
|--------|-----|
| iDEAL | €0.29 per transaction |
| Credit Card | 1.8% + €0.25 |
| SEPA Direct Debit | €0.25 + €0.35 |
| Bancontact | 1.4% + €0.25 |

### Setup Steps

1. **Create Mollie Account**
   - Register at [mollie.com](https://mollie.com)
   - Complete verification (EU business required)

2. **Install Mollie Client**
   ```bash
   npm install @mollie/api-client  # Server-side only!
   ```

3. **Environment Variables**
   ```env
   MOLLIE_API_KEY=live_...
   ```

### Important: iDEAL 2.0 Migration

> **Deadline: March 1, 2025**
>
> iDEAL is migrating to iDEAL 2.0. You no longer send the issuer ID;
> instead, Mollie returns a hosted checkout URL where users select their bank.

### Mollie Payment Flow

```typescript
// api/create-mollie-payment.ts
import { createMollieClient } from '@mollie/api-client'

const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY })

export default async function handler(req, res) {
  const { amount, userId, tier } = req.body

  const payment = await mollie.payments.create({
    amount: {
      currency: 'EUR',
      value: amount  // e.g., '4.99'
    },
    description: `EasyTranslator ${tier} subscription`,
    redirectUrl: `${process.env.APP_URL}/payment/success`,
    webhookUrl: `${process.env.APP_URL}/api/mollie-webhook`,
    metadata: { userId, tier },
    method: 'ideal'  // or leave empty for all methods
  })

  res.json({ checkoutUrl: payment.getCheckoutUrl() })
}
```

---

## Part 7: Implementation Phases

### Phase 1: Usage Tracking (Week 1)
- [ ] Add Supabase client to project
- [ ] Create database tables
- [ ] Log usage after each translation (audio_seconds from API response)
- [ ] Display usage in user profile

### Phase 2: Authentication (Week 2)
- [ ] Create auth store
- [ ] Add login/signup UI components
- [ ] Create profile page
- [ ] Gate recording behind auth for new users

### Phase 3: Free Tier Quota (Week 3)
- [ ] Implement quota checking
- [ ] Add "X translations remaining" UI
- [ ] Show upgrade prompt when quota exceeded
- [ ] Allow anonymous "demo" mode (1 translation, no save)

### Phase 4: Stripe Subscriptions (Week 4)
- [ ] Set up Stripe products/prices
- [ ] Create checkout session endpoint
- [ ] Implement webhook handler
- [ ] Add subscription management UI
- [ ] Customer portal for cancellation

### Phase 5: Mollie Integration (Week 5)
- [ ] Set up Mollie account
- [ ] Create payment endpoint
- [ ] Implement webhook handler
- [ ] Add iDEAL as payment option for NL users
- [ ] Detect user country for payment method suggestion

### Phase 6: Polish & Launch (Week 6)
- [ ] Usage dashboard for users
- [ ] Admin dashboard for you
- [ ] Email notifications (welcome, quota warning, payment failed)
- [ ] Terms of service & privacy policy
- [ ] GDPR compliance check

---

## Part 8: What You Need to Prepare

### Accounts to Create
- [ ] **Supabase** account (free tier is fine to start)
- [ ] **Stripe** account (requires business verification)
- [ ] **Mollie** account (requires EU business registration)

### Business Requirements
- [ ] EU business registration (for Mollie)
- [ ] VAT number (for B2C sales in EU)
- [ ] Privacy policy document
- [ ] Terms of service document

### Technical Setup
- [ ] Decide on Vercel plan (free tier may hit limits with webhooks)
- [ ] Set up environment variables in Vercel
- [ ] Configure webhook endpoints in Stripe/Mollie dashboards

### Pricing Decisions
- [ ] Final tier pricing (€4.99/€9.99 suggested)
- [ ] Free tier limits (5 translations suggested)
- [ ] Overage pricing (if any)

---

## Quick Start Checklist

1. **Today:** Create Supabase project, run SQL to create tables
2. **This week:** Add auth to the app, gate recording
3. **Next week:** Implement free tier with 5 translation limit
4. **Then:** Add Stripe, test with test keys
5. **Finally:** Add Mollie for Dutch users

---

## Sources

- [Mistral AI Pricing](https://mistral.ai/pricing)
- [Voxtral Announcement](https://mistral.ai/news/voxtral)
- [Stripe Subscriptions Docs](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Vue Stripe](https://vuestripe.com/)
- [Mollie API Documentation](https://docs.mollie.com/)
- [Mollie iDEAL 2.0 Migration](https://help.mollie.com/hc/en-us/articles/19100313768338-iDEAL-2-0)
- [Mollie Pricing](https://blog.finexer.com/mollie-pricing/)
