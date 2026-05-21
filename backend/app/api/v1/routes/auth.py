from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def auth_health_check():
    """
    Placeholder health check for the auth service.
    Authentication is primarily handled directly by Supabase on the frontend and middleware.
    This route will be expanded later if backend-specific auth verification is needed (e.g., verifying Supabase JWTs in API routes).
    """
    return {"status": "ok", "message": "Auth service is reachable."}
