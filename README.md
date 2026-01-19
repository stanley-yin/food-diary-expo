# 🥗 Food Diary (WIP)

> A mobile-first food diary app designed to reduce friction in diet tracking during fitness training.

🚧 **This project is a work in progress.**  
This repository documents both the **implementation** and the **technical decision-making process**.

---

## Problem

During fitness training, users often need to report their daily meals to coaches.  
Using chat apps like LINE usually requires manually typing:

- Meal time
- Food details
- Context for each photo

This process is time-consuming and makes it difficult to **review, analyze, or track progress** over time.

---

## Solution

Food Diary minimizes manual effort when logging meals:

- Users upload meal photos via a mobile app
- Photo **metadata (e.g. capture time)** is automatically extracted
- An image analysis API generates **food-related tags**
- Centralized records make it easier to:
    - Review personal diet history
    - Analyze patterns using tags
    - Share insights with coaches or others in the future

---

## Project Goals

1. Solve a real-life problem
2. Practice modern mobile development with **React Native and Expo**
3. Build a production-minded project for a future portfolio

---

## Architecture Overview

### Core Features

- Google authentication
- Photo upload
- Image metadata extraction
- Image recognition and tag generation

---

### Planned Features

- Food calendar
    - Monthly / weekly / daily views
- Meal feedback and evaluation by others (e.g. coaches)
- Multi-tenant support (coach / trainee)

---

## Tech Stack

### Frontend (Mobile App)

- React Native
- Expo
- TypeScript
- Expo Image Picker
- React Hook Form

### Backend / BaaS

- Supabase
    - Authentication (Google OAuth)
    - Database
    - Storage (image uploads)

### Image Analysis

- Gemini API

### Code Quality

- ESLint
- Prettier

### Deployment

- Expo (EAS)
- Supabase Cloud

---

## Database Schema (Draft)

> Subject to change as the project evolves

- users
- food_logs
- food_images
- tags
- food_log_tags

---

## Roadmap

- [ ] Google OAuth authentication
- [ ] Image upload with metadata extraction
- [ ] Image analysis and tag generation
- [ ] Basic food diary list
- [ ] Calendar view
- [ ] Tag-based statistics and insights

---

## Notes

This project is intentionally developed incrementally.  
Some implementations may be temporary and refactored as the architecture matures.
