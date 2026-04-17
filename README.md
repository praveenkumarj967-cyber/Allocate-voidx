# 🚀 Resource Navigator — Classic Amazing Edition

**High-Performance Resource Allocation & Intelligent Booking Engine**

Built for efficiency, transparency, and speed. Resource Navigator is a premium workspace management platform designed to handle mission-critical resource allocation using intelligent priority-based logic and real-time neural assistance.

![Platform Preview](https://images.unsplash.com/photo-1551288049-bbbda5366392?auto=format&fit=crop&q=80&w=2000)

## 💎 Key Features

- **🏆 Classic Amazing UI**: A high-density, glassmorphic interface designed for professional enterprise environments.
- **🧠 Neural Assistant**: Integrated AI chatbot that handles natural language booking, system navigation, and real-time support.
- **⚡ Intelligent Reallocation**: Priority-based engine that automatically suggests slot reassignments for emergency requests.
- **🔍 Global Search & Discovery**: High-performance catalog with multi-layer filtering and instant QR-based check-ins.
- **🛡️ Secure Identity**: Role-based access control (RBAC) powered by Supabase Auth and customized User Roles.
- **📊 Real-time Insights**: Live dashboard tracking system health, utilization peaks, and booking timelines.

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, TanStack Router, TanStack Query.
- **Styling**: Tailwind CSS with custom "Classic Amazing" enterprise tokens.
- **Backend/Database**: Supabase (PostgreSQL, Realtime, Auth, Storage).
- **Icons/UI**: Lucide React, Shadcn/UI (Radix primitives).
- **Utilities**: Date-fns for complex scheduling logic.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (Latest LTS)
- Supabase Project URL & Anonymous Key

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Running the Platform
```bash
npm run dev
```

## 🏗️ Architecture & Database

The system uses a robust PostgreSQL schema with advanced RLS (Row Level Security) policies:
- `resources`: The core catalog of labs, equipment, and rooms.
- `user_roles`: Role management (Admin/User).
- `bookings`: Real-time scheduling with priority markers.
- `notifications`: Live system alerts and reallocation triggers.

---

**Developed for the 2026 Hackathon Challenge.** 🏆
🚀 *Built for speed. Designed for excellence.*
