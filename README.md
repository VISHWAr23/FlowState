# FlowState

FlowState is a comprehensive productivity and life management application designed to help you stay focused, build habits, achieve your goals, and track your daily progress.

## Features

- **Dashboard**: A daily scorecard to track your essentials (coding practice, exercise, reading, meditation) and a centralized view of your daily tasks and active habits.
- **Goals Tracking**: Set, manage, and edit your long-term goals with prioritized key results and life area categorization.
- **Habits Builder**: Form new habits with target durations and consistency streaks.
- **Focus Sessions**: A built-in Pomodoro-style timer to manage your deep work sessions and track your focus hours.
- **AI Assistant**: A personalized productivity coach powered by AI, aware of your current tasks and habits, ready to give you tailored advice and motivation.
- **Analytics & Roadmaps**: Visualize your progress and plan your learning journey.
- **Spaced Revision**: Manage your learning materials with spaced repetition techniques.
- **Market Checklist**: A specialized daily checklist for trading and market analysis routines.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Framer Motion for smooth animations
- **State Management**: Zustand
- **Database & Authentication**: Supabase
- **Data Fetching**: TanStack React Query
- **AI Integration**: Vercel AI SDK with Hugging Face Inference

## Getting Started

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add the following keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application in action.

## Deployment

The easiest way to deploy your FlowState app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
