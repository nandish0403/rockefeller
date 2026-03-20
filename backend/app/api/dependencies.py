from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_token
from app.models.user import User

bearer = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = await User.get(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

async def require_officer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["admin", "safety_officer"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Safety officer access required")
    return current_user
