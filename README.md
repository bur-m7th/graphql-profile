# CJ Stats — GraphQL Profile Page

A personal profile dashboard built with vanilla HTML, CSS, and JavaScript, pulling real-time data from the Reboot01 platform via GraphQL.

## 🔗 Live Demo

[View Live](https://bur-m7th.github.io/graphql-profile)

---

## 📋 Description

CJ Stats is a GTA San Andreas-inspired profile page that displays your Reboot01 school journey through a clean stats dashboard. It authenticates via JWT, queries your personal data from the GraphQL API, and visualizes it using pure SVG graphs — no libraries, no frameworks.

---

## ✨ Features

- **JWT Authentication** — Login with username or email, secure token stored locally
- **User Identity Card** — Displays username, user ID, total XP, and audit ratio
- **Respect Level** — Your current level on the platform
- **Longest XP Streak** — Most consecutive days you earned XP
- **Criminal Record** — 5 most recent XP transactions
- **Top Projects by Respect** — Top 10 projects ranked by XP earned
- **Skills Radar Chart** — SVG spider chart of your top 8 skills
- **Project Pass/Fail Chart** — SVG donut chart showing your project pass rate
- **Logout** — Clears session and returns to login