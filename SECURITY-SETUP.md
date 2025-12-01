# UCN Map - Security Setup Guide

## Overview
This guide walks you through securing the UCN Deployment Map with Supabase Row Level Security (RLS) and Authentication.

---

## Step 1: Enable Row Level Security

Run this SQL in your Supabase Dashboard (SQL Editor):

```sql
-- Enable Row Level Security on pins table
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can READ pins (public map needs this)
CREATE POLICY "Public read access" ON pins
    FOR SELECT
    USING (true);

-- Policy: Only authenticated users can INSERT
CREATE POLICY "Authenticated insert" ON pins
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Only authenticated users can UPDATE
CREATE POLICY "Authenticated update" ON pins
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Only authenticated users can DELETE
CREATE POLICY "Authenticated delete" ON pins
    FOR DELETE
    TO authenticated
    USING (true);
```

---

## Step 2: Create Admin User(s)

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create New User**
4. Enter email and password for your admin
5. Click **Create User**

You can create multiple admin users this way.

---

## Step 3: Enable Realtime (Optional but Recommended)

For live pin updates:

1. Go to **Database** → **Replication**
2. Find the `pins` table
3. Toggle ON for realtime

---

## Step 4: Verify Security

Test that security is working:

1. **Public map** (index.html) should load pins without login ✓
2. **Admin panel** (admin.html) should require email/password ✓
3. Try creating a pin without logging in (should fail) ✓
4. Log in and create a pin (should work) ✓

---

## What's Protected

| Action | Who Can Do It |
|--------|---------------|
| View pins | Anyone (public) |
| Create pins | Authenticated admins only |
| Edit pins | Authenticated admins only |
| Delete pins | Authenticated admins only |

---

## Troubleshooting

**"Failed to save pin" error after login:**
- Check that RLS policies were created correctly
- Verify user is in Supabase Auth (not just invited)

**Login not working:**
- Confirm email/password match what's in Supabase Auth
- Check browser console for specific error messages

**Pins not loading on public map:**
- Verify the "Public read access" policy exists
- Check that RLS is enabled on the table

---

## Security Notes

- The `anonKey` in config.js is safe to expose — it only allows what RLS permits
- Session tokens are handled automatically by Supabase
- Sessions persist in browser localStorage (auto-logout on token expiry)
- No passwords are stored in code
