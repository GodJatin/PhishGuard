# PhishGuard: Smart Phishing URL Detection System

PhishGuard is a cybersecurity SaaS prototype for detecting phishing URLs using advanced AI models and heuristic rules.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Query
- **Backend:** FastAPI, Python 3.12+, Uvicorn, Pydantic
- **Database/Auth:** Supabase (PostgreSQL)

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.12+)

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Supabase credentials in `.env.local`.
4. Run the development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase and Postgres credentials in `.env`.
5. Run the FastAPI development server:
   ```bash
   python run.py
   ```
   The API will be available at `http://localhost:8000`. Documentation is available at `http://localhost:8000/api/v1/docs` (Swagger UI) or `/redoc`.

## Manual Setup Remaining
1. Set up a Supabase project and obtain your `URL` and `Anon Key` / `Service Role Key`.
2. Configure Supabase authentication.
3. Update the `.env.local` and `.env` files with your actual credentials.

## Future Roadmap
- Integration of actual ML models for threat detection.
- Heuristic rule engine setup.
- Advanced reporting and export functionality.
