# FlowState Deployment Guide

This guide covers how to deploy the FlowState application to Vercel and connect it to a production Supabase backend.

## Prerequisites

1. A [GitHub](https://github.com/) account
2. A [Vercel](https://vercel.com/) account
3. A [Supabase](https://supabase.com/) account

---

## 1. Supabase Setup

FlowState requires a Supabase backend for database, authentication, and API.

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Once created, go to the **SQL Editor** in the left sidebar.
3. Click "New Query" and paste the contents of the `02-Database-Schema.sql` file (from your complete package) into the editor.
4. Run the query to create all required tables, functions, and security policies.
5. Go to **Project Settings > API** to find your URLs and Keys. You will need these for Vercel.

---

## 2. GitHub Setup

You need to push your local repository to GitHub so Vercel can deploy it.

1. Create a new repository on GitHub.
2. In your local terminal, initialize git (if not already done) and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

---

## 3. Vercel Deployment

1. Go to [Vercel](https://vercel.com/) and log in.
2. Click **Add New... > Project**.
3. Import your GitHub repository.
4. In the **Configure Project** section, expand the **Environment Variables** panel.
5. Add the following variables (matching what you found in Supabase API settings):
   - `NEXT_PUBLIC_SUPABASE_URL` = (Your Project URL, e.g., `https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Your `anon` `public` key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (Your `service_role` `secret` key)
6. Click **Deploy**.

---

## 4. Post-Deployment Authentication Setup

Once Vercel has deployed your site, you need to tell Supabase to allow logins from your new domain.

1. Copy your Vercel deployment URL (e.g., `https://flowstate-app.vercel.app`).
2. Go to your Supabase Dashboard.
3. Navigate to **Authentication > URL Configuration**.
4. Set your **Site URL** to your Vercel URL.
5. Under **Redirect URLs**, add `https://your-vercel-url.vercel.app/**` to allow all auth callbacks to function correctly.

## 5. Ongoing Updates

Because you deployed via Vercel's GitHub integration, any time you push new commits to your `main` branch, Vercel will automatically trigger a new deployment.
