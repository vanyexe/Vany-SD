<div align="center">
  <img src="public/favicon.ico" alt="Vyra Logo" width="80" height="80" />
  
  # Vyra
  **Your Ultimate Digital Life Operating System**

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  </p>
</div>

## 🚀 Overview

**Vyra** is a flagship productivity, gamification, and lifestyle tracking platform. Built for high achievers, Vyra unifies task management, fitness tracking, journaling, coding preparation, and team collaboration into a single, beautifully designed application.

Stop jumping between five different apps to manage your life. Vyra gamifies your personal growth and keeps you focused on what matters most.

---

## ✨ Features

- 🎯 **Advanced Goal & Task Tracking**: Break massive goals into actionable milestones, daily tasks, and custom habits.
- ⏱️ **Focus Sessions**: Built-in Pomodoro timers that sync with your tasks to maximize deep work.
- 🏋️ **Fitness & PR Tracking**: Log workouts, track exercise metrics, participate in fitness challenges, and hit new Personal Records.
- 📓 **Intelligent Journaling & Timelines**: Reflect on your day, track your mood, and visualize your entire life's journey on an interactive timeline.
- 💻 **DSA Tracker**: Dedicated tracking for Data Structures and Algorithms practice to ace your coding interviews.
- 🤝 **Team Collaboration**: Invite friends or colleagues, create teams, and tackle group challenges together.
- 🏆 **Gamification & Achievements**: Earn XP, unlock vault achievements, and level up as you complete tasks and hit your goals.
- 🔒 **Enterprise-Grade Security**: Powered by Supabase Auth and strict PostgreSQL Row Level Security (RLS) policies.

---

## 🛠️ Architecture & Tech Stack

Vyra is built for scale, performance, and type-safety:

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), React 18
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom design system
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Links, OAuth)
- **Database Security**: Strictly enforced Row Level Security (RLS) for multi-tenant isolation
- **Language**: 100% [TypeScript](https://www.typescriptlang.org/)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) and npm installed.

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/vyra.git
cd vyra
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Ensure you have the Supabase CLI installed, then link your project and push the schema:
```bash
npx supabase link --project-ref your_project_ref
npx supabase db push
```

### 5. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to explore Vyra.

---

## 🤝 Contributing

We welcome contributions to make Vyra even better! 
Please check out our [Contributing Guidelines](CONTRIBUTING.md) and use the standard Issue/PR templates provided in `.github/`.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <i>Designed and Built for the Future of Productivity.</i>
</div>
