from sqlalchemy.orm import Session
from database import SessionLocal
from models import auth_models

def print_all_users():
    db: Session = SessionLocal()
    try:
        users = db.query(auth_models.User).all()
        print("\n" + "="*50)
        print(f"{'ID':<5} | {'EMAIL':<30} | {'ROLE':<15}")
        print("="*50)
        
        for user in users:
            user_id = str(getattr(user, "id", "N/A"))
            email = str(getattr(user, "email", "N/A"))
            role = str(getattr(user, "role", "None"))
            print(f"{user_id:<5} | {email:<30} | {role:<15}")
            
        print("="*50 + "\n")
    finally:
        db.close()

if __name__ == "__main__":
    print_all_users()