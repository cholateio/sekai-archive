# Sekai Archive

### An Intelligent Event Strategy Assistant for Project Sekai

![Status](https://img.shields.io/badge/Status-Beta-blue) ![License](https://img.shields.io/badge/License-MIT-green)

### [View Live Demo](https://sekai-archive.vercel.app/)

## Preview

<img width="959" height="413" alt="demo" src="https://github.com/user-attachments/assets/8011a0c1-a82b-400a-bf62-6ae61bfb42a8" />

## ⚡ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database & Logs:** Supabase (PostgreSQL + RLS)
- **AI Engine:** LangGraph + OpenAI API (In another repo)
- **Infrastructure:** Vercel (Edge & Serverless Functions), Upstash (Redis Rate Limiting)
- **Styling:** Tailwind CSS v4, Framer Motion, Recharts

## Why I Made This

I built this project because I really love the game. Also to solve the pain points of tracking live event rankings and calculating "safe distances" during competitive events. It serves as a comprehensive full-stack portfolio piece to practice LLM Agent Architecture (Router -> Tool -> Response), RAG, and Serverless deployment on Vercel.

## Features

- ✅ **AI Command Center**: Intelligent routing between general chat and data tools.
- ✅ **Judge Agent**: A lightweight model quickly classifies user intent (Chat vs. Query) to reduce latency.
- ✅ **Cost-Optimized Tools**: Implemented "Range Filtering" in API calls to prevent context window overflow.
- ✅ **Observability**: Full audit logging system (Input/Output Tokens, Latency, Cost USD).
