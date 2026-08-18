# Chatbot Ticketing System — SIH 2026

AI-powered event ticketing platform with chatbot-driven booking, QR-based tickets, and integrated payment gateway.

## Modules

| Module | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express + MongoDB |
| Chatbot | OpenAI / Gemini API |
| Payment | Razorpay |
| Ticket/QR | qrcode + PDFKit |

## Quick Start

```bash
cp .env.example .env
# fill in .env values

# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## Project Structure

```
chatbot-ticketing-system/
├── frontend/       # React UI
├── backend/        # Express API + MongoDB
├── chatbot/        # AI chatbot logic
├── payment/        # Payment gateway integration
├── ticket-system/  # QR code & ticket generation
└── docs/           # Documentation
```
