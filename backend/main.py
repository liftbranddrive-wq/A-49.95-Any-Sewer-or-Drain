from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from api.routers import auth, admin_authorization, services, ghl, notifications
from api.routers.notifications import start_scheduler, stop_scheduler
import os
from database import engine, Base

Base.metadata.create_all(bind=engine)

# Load environment variables from the .env file

# Import the router we just created

# Lifecycle manager for startup and shutdown actions
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    start_scheduler()
    yield
    # Shutdown logic
    stop_scheduler()

app = FastAPI(title="Sewer App Backend API")

load_dotenv()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication & GHL"])
app.include_router(admin_authorization.router, tags=["Admin Users"] )
app.include_router(services.router, tags=["Admin Services"] )
app.include_router(ghl.router, tags=["GoHighLevel Calendar"] )
app.include_router(notifications.router, tags=["Notifications"] )


@app.get("/")
async def root():
    return {"message": "FastAPI server is running perfectly! Routing is configured."}

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    uvicorn.run("app", host="0.0.0.0", port=8000, reload=True)