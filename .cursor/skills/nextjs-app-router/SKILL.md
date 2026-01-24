---
name: nextjs-app-router
description: Next.js 14 App Router patterns for AWA project. Use when creating or modifying pages, API routes, layouts, or server components. Covers App Router structure, server/client components, data fetching, and routing patterns.
---

# Next.js App Router Patterns for AWA Project

## Project Structure

```
apps/frontend/src/
├── app/                    # App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── (flow)/             # Flow routes (grouped)
│   │   ├── onboarding/
│   │   ├── profile/
│   │   └── ...
│   ├── api/                # API routes
│   │   ├── generate/
│   │   └── ...
│   └── space/[id]/        # Dynamic routes
├── components/             # React components
├── hooks/                  # Custom hooks
├── lib/                    # Utilities
└── types/                  # TypeScript types
```

## App Router Basics

### Pages

```typescript
// app/page.tsx - Server Component (default)
export default function LandingPage() {
  return <LandingScreen />;
}

// app/flow/onboarding/page.tsx
export default function OnboardingPage() {
  return <OnboardingScreen />;
}
```

### Layouts

```typescript
// app/layout.tsx - Root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

// app/(flow)/layout.tsx - Flow group layout
export default function FlowLayout({ children }) {
  return <FlowContainer>{children}</FlowContainer>;
}
```

### Dynamic Routes

```typescript
// app/space/[id]/page.tsx
export default function SpacePage({ params }: { params: { id: string } }) {
  const spaceId = params.id;
  // ...
}
```

## Server vs Client Components

### Server Components (default)

- No `'use client'` directive
- Can directly access server resources
- No hooks, no event handlers
- Better for data fetching

```typescript
// app/api/data/page.tsx
import { fetchLatestSessionSnapshot } from '@/lib/supabase';

export default async function DataPage() {
  const data = await fetchLatestSessionSnapshot(userHash);
  return <DataDisplay data={data} />;
}
```

### Client Components

- Need `'use client'` directive
- Can use hooks, event handlers
- Required for interactivity

```typescript
'use client';

import { useState } from 'react';

export default function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## API Routes

### Route Handlers

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Server-side logic
  const result = await generateImage(body);
  
  return NextResponse.json({ result });
}
```

### Common Patterns

```typescript
// GET handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  // ...
}

// Error handling
export async function POST(request: NextRequest) {
  try {
    // ...
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## Data Fetching

### Server Components

```typescript
// Direct async in Server Component
export default async function Page() {
  const data = await fetchData();
  return <Display data={data} />;
}
```

### Client Components

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function ClientPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return <Display data={data} />;
}
```

## Routing Patterns

### Route Groups

```typescript
// (flow)/onboarding/page.tsx
// URL: /onboarding (not /flow/onboarding)
```

### Parallel Routes

```typescript
// app/@analytics/page.tsx
// app/@dashboard/page.tsx
// app/layout.tsx
export default function Layout({ analytics, dashboard }) {
  return (
    <>
      {analytics}
      {dashboard}
    </>
  );
}
```

### Intercepting Routes

```typescript
// app/@modal/(.)space/[id]/page.tsx
// Intercepts /space/[id] for modal display
```

## Authentication

### Auth Callback

```typescript
// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  
  useEffect(() => {
    // Handle OAuth callback
    router.push('/dashboard');
  }, []);
  
  return <Loading />;
}
```

## Environment Variables

```typescript
// Server-side (always available)
const apiKey = process.env.API_KEY;

// Client-side (must be NEXT_PUBLIC_*
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

## Metadata

```typescript
// app/page.tsx
export const metadata = {
  title: 'AWA Project',
  description: 'AI Interior Design',
};

// Dynamic metadata
export async function generateMetadata({ params }) {
  return {
    title: `Space ${params.id}`,
  };
}
```

## Best Practices

1. **Use Server Components by default** - Only add `'use client'` when needed
2. **Fetch data in Server Components** - Better performance, SEO
3. **Group related routes** - Use route groups `(flow)` for organization
4. **Handle errors gracefully** - Use error boundaries and try/catch
5. **Optimize images** - Use `next/image` component
6. **Use TypeScript** - Type all params, searchParams, etc.

## Common Patterns in AWA

### Flow Screens

```typescript
// app/(flow)/onboarding/page.tsx
'use client';

import { OnboardingScreen } from '@/components/screens/OnboardingScreen';

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
```

### API Routes for Backend

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { prompt, parameters } = await request.json();
  
  // Call Modal.com backend
  const response = await fetch(MODAL_API_URL + '/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, parameters }),
  });
  
  return NextResponse.json(await response.json());
}
```

### Dynamic Space Pages

```typescript
// app/space/[id]/page.tsx
export default async function SpacePage({ params }: { params: { id: string } }) {
  const space = await getSpace(params.id);
  return <SpaceView space={space} />;
}
```
