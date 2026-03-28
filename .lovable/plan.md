

# Plan: Remove Authentication Guards for Testing

## Summary
Temporarily bypass all authentication checks so you can freely test every page and feature without logging in.

## Changes

### 1. Update ProtectedRoute to pass through all children
**File:** `src/components/ProtectedRoute.tsx`
- Remove the auth checks (loading, user, role)
- Simply render `{children}` directly

### 2. Update useAuth hook to provide mock data
**File:** `src/hooks/useAuth.tsx`
- Set `loading` to always be `false`
- Provide a mock user/session so components that reference `user.id` or `user.email` don't break
- Set `hasRole` to always return `true`
- Keep `signIn`/`signUp`/`signOut` as no-ops

### 3. Update Navbar to show dashboard links
**File:** `src/components/landing/Navbar.tsx`
- Change "Sign In" / "Get Started" to link to `/dashboard` instead of login/register

## Technical Notes
- This is a temporary testing change — authentication should be re-enabled before going live
- Mock user data will use a placeholder UUID and email so database queries still function (though they may return empty results without a real session)
- RLS policies on the database will still block actual data operations since there's no real JWT — you'll be able to navigate all pages but data-dependent features may show empty states

