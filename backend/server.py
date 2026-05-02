from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------------- DB ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


# ---------------- Auth helpers ----------------
JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=12 * 60 * 60,
        path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------- Models ----------------
class LoginPayload(BaseModel):
    email: str  # accepts username like "admin" or a real email
    password: str


class RegisterPayload(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class EmployeeIn(BaseModel):
    name: str
    mobile: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    address: Optional[str] = ""
    address_proof_type: Optional[str] = ""  # e.g. Aadhaar, PAN, Voter ID
    address_proof_number: Optional[str] = ""
    salary: Optional[float] = 0
    joining_date: Optional[str] = None
    status: Optional[Literal["current", "ex"]] = "current"
    employment_type: Optional[Literal["regular", "contract"]] = "regular"
    notes: Optional[str] = ""


class LeaveEntryItem(BaseModel):
    employee_id: str
    days: float = 0


class LeaveBulkPayload(BaseModel):
    entries: List[LeaveEntryItem]


class AdvanceEntryItem(BaseModel):
    employee_id: str
    amount: float = 0


class AdvanceBulkPayload(BaseModel):
    date: str  # YYYY-MM-DD
    entries: List[AdvanceEntryItem]


# ---------------- App ----------------
app = FastAPI(title="Nellai Karupatti Coffee — Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "Nellai Karupatti Coffee — Manager API"}


# ---------- Auth routes ----------
@api.post("/auth/login")
async def login(payload: LoginPayload, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, access)
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}


@api.post("/auth/register")
async def register(payload: RegisterPayload, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    access = create_access_token(user_id, email, "admin")
    set_auth_cookie(response, access)
    return {"id": user_id, "name": payload.name, "email": email, "role": "admin"}


@api.post("/auth/logout")
async def logout(response: Response):
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        secure=True,
        samesite="none",
        max_age=0,
        expires=0,
        path="/",
    )
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Employees ----------
@api.get("/employees")
async def list_employees(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query: dict = {}
    if status in ("current", "ex"):
        query["status"] = status
    docs = await db.employees.find(query, {"_id": 0}).sort("name", 1).to_list(2000)
    return docs


@api.get("/employees/{emp_id}")
async def get_employee(emp_id: str, user: dict = Depends(get_current_user)):
    emp = await db.employees.find_one({"id": emp_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@api.post("/employees")
async def create_employee(payload: EmployeeIn, user: dict = Depends(get_current_user)):
    emp_id = str(uuid.uuid4())
    doc = {
        "id": emp_id,
        "name": payload.name,
        "mobile": payload.mobile or "",
        "emergency_contact": payload.emergency_contact or "",
        "address": payload.address or "",
        "address_proof_type": payload.address_proof_type or "",
        "address_proof_number": payload.address_proof_number or "",
        "salary": float(payload.salary or 0),
        "joining_date": payload.joining_date or datetime.now(timezone.utc).date().isoformat(),
        "status": payload.status or "current",
        "employment_type": payload.employment_type or "regular",
        "notes": payload.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.employees.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/employees/{emp_id}")
async def update_employee(emp_id: str, payload: EmployeeIn, user: dict = Depends(get_current_user)):
    update = {
        "name": payload.name,
        "mobile": payload.mobile or "",
        "emergency_contact": payload.emergency_contact or "",
        "address": payload.address or "",
        "address_proof_type": payload.address_proof_type or "",
        "address_proof_number": payload.address_proof_number or "",
        "salary": float(payload.salary or 0),
        "joining_date": payload.joining_date or datetime.now(timezone.utc).date().isoformat(),
        "status": payload.status or "current",
        "employment_type": payload.employment_type or "regular",
        "notes": payload.notes or "",
    }
    res = await db.employees.update_one({"id": emp_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp = await db.employees.find_one({"id": emp_id}, {"_id": 0})
    return emp


@api.patch("/employees/{emp_id}/status")
async def toggle_status(emp_id: str, body: dict, user: dict = Depends(get_current_user)):
    new_status = body.get("status")
    if new_status not in ("current", "ex"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.employees.update_one({"id": emp_id}, {"$set": {"status": new_status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"ok": True, "status": new_status}


@api.delete("/employees/{emp_id}")
async def delete_employee(emp_id: str, user: dict = Depends(get_current_user)):
    res = await db.employees.delete_one({"id": emp_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    # Cascade: remove orphan leave + advance records for this employee
    await db.leave_entries.delete_many({"employee_id": emp_id})
    await db.advance_entries.delete_many({"employee_id": emp_id})
    return {"ok": True}


# ---------- Leave Management ----------
def _validate_month(month: str):
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")


@api.get("/leaves/month/{month}")
async def leaves_for_month(month: str, user: dict = Depends(get_current_user)):
    _validate_month(month)
    employees = await db.employees.find({"status": "current"}, {"_id": 0}).sort("name", 1).to_list(2000)
    saved = await db.leave_entries.find({"month": month}, {"_id": 0}).to_list(5000)
    by_emp = {s["employee_id"]: s for s in saved}
    rows = []
    for e in employees:
        s = by_emp.get(e["id"])
        rows.append({
            "employee_id": e["id"],
            "name": e["name"],
            "salary": e["salary"],
            "days": s["days"] if s else 0,
            "updated_at": s["updated_at"] if s else None,
        })
    return {"month": month, "rows": rows}


@api.post("/leaves/month/{month}")
async def save_leaves(month: str, payload: LeaveBulkPayload, user: dict = Depends(get_current_user)):
    _validate_month(month)
    now_iso = datetime.now(timezone.utc).isoformat()
    for item in payload.entries:
        await db.leave_entries.update_one(
            {"employee_id": item.employee_id, "month": month},
            {"$set": {"days": float(item.days or 0), "updated_at": now_iso}, "$setOnInsert": {"id": str(uuid.uuid4())}},
            upsert=True,
        )
    return {"ok": True, "saved": len(payload.entries)}


# ---------- Advance Entry ----------
@api.post("/advances")
async def save_advances(payload: AdvanceBulkPayload, user: dict = Depends(get_current_user)):
    try:
        datetime.strptime(payload.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    now_iso = datetime.now(timezone.utc).isoformat()
    saved_count = 0
    for item in payload.entries:
        amt = float(item.amount or 0)
        if amt <= 0:
            # Delete any existing zero entry to keep ledger clean
            await db.advance_entries.delete_one({"employee_id": item.employee_id, "date": payload.date})
            continue
        await db.advance_entries.update_one(
            {"employee_id": item.employee_id, "date": payload.date},
            {"$set": {"amount": amt, "updated_at": now_iso}, "$setOnInsert": {"id": str(uuid.uuid4())}},
            upsert=True,
        )
        saved_count += 1
    return {"ok": True, "saved": saved_count}


@api.get("/advances/date/{date}")
async def advances_for_date(date: str, user: dict = Depends(get_current_user)):
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    employees = await db.employees.find({"status": "current"}, {"_id": 0}).sort("name", 1).to_list(2000)
    saved = await db.advance_entries.find({"date": date}, {"_id": 0}).to_list(5000)
    by_emp = {s["employee_id"]: s for s in saved}
    rows = []
    for e in employees:
        s = by_emp.get(e["id"])
        rows.append({
            "employee_id": e["id"],
            "name": e["name"],
            "amount": s["amount"] if s else 0,
        })
    return {"date": date, "rows": rows}


@api.get("/advances/month/{month}")
async def advances_for_month(month: str, user: dict = Depends(get_current_user)):
    _validate_month(month)
    docs = await db.advance_entries.find(
        {"date": {"$regex": f"^{month}"}},
        {"_id": 0},
    ).sort("date", 1).to_list(5000)
    # attach name
    emps = await db.employees.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(2000)
    name_by_id = {e["id"]: e["name"] for e in emps}
    for d in docs:
        d["employee_name"] = name_by_id.get(d["employee_id"], "Unknown")
    return docs


# ---------- Salary Management ----------
def _prev_month(month: str) -> str:
    y, m = map(int, month.split("-"))
    if m == 1:
        return f"{y - 1}-12"
    return f"{y}-{m - 1:02d}"


async def _compute_month_breakdown(employee: dict, month: str) -> dict:
    """Compute salary breakdown for one employee for a given month (no recursion)."""
    salary = float(employee.get("salary") or 0)
    employment_type = employee.get("employment_type") or "regular"
    emp_id = employee["id"]

    leave_entry = await db.leave_entries.find_one(
        {"employee_id": emp_id, "month": month}, {"_id": 0}
    )
    leave_days = float(leave_entry["days"]) if leave_entry else 0

    advances = await db.advance_entries.find(
        {"employee_id": emp_id, "date": {"$regex": f"^{month}"}},
        {"_id": 0},
    ).sort("date", 1).to_list(500)
    advance_total = sum(float(a["amount"]) for a in advances)

    per_day = salary / 30.0 if salary else 0

    if employment_type == "contract":
        free_days = 0
        chargeable_days = leave_days
    else:  # regular
        free_days = min(leave_days, 2)
        chargeable_days = max(0, leave_days - 2)

    leave_deduction = round(per_day * chargeable_days, 2)
    net_before_due = round(salary - leave_deduction - advance_total, 2)

    return {
        "salary": salary,
        "employment_type": employment_type,
        "leave_days": leave_days,
        "free_leave_days": free_days,
        "chargeable_leave_days": chargeable_days,
        "per_day_rate": round(per_day, 2),
        "leave_deduction": leave_deduction,
        "advance_total": round(advance_total, 2),
        "advances": [{"date": a["date"], "amount": float(a["amount"])} for a in advances],
        "net_before_due": net_before_due,
    }


@api.get("/salary/month/{month}")
async def salary_for_month(month: str, user: dict = Depends(get_current_user)):
    _validate_month(month)
    prev = _prev_month(month)
    employees = await db.employees.find({"status": "current"}, {"_id": 0}).sort("name", 1).to_list(2000)

    rows = []
    for e in employees:
        cur = await _compute_month_breakdown(e, month)
        prev_calc = await _compute_month_breakdown(e, prev)
        previous_month_due = round(min(0.0, prev_calc["net_before_due"]), 2)
        net_payable = round(cur["net_before_due"] + previous_month_due, 2)
        rows.append({
            "employee_id": e["id"],
            "name": e["name"],
            "mobile": e.get("mobile", ""),
            "employment_type": cur["employment_type"],
            "salary": cur["salary"],
            "leave_days": cur["leave_days"],
            "leave_deduction": cur["leave_deduction"],
            "advance_total": cur["advance_total"],
            "previous_month_due": previous_month_due,
            "net_payable": net_payable,
        })

    totals = {
        "salary": round(sum(r["salary"] for r in rows), 2),
        "leave_days": round(sum(r["leave_days"] for r in rows), 2),
        "leave_deduction": round(sum(r["leave_deduction"] for r in rows), 2),
        "advance_total": round(sum(r["advance_total"] for r in rows), 2),
        "previous_month_due": round(sum(r["previous_month_due"] for r in rows), 2),
        "net_payable": round(sum(r["net_payable"] for r in rows), 2),
    }
    return {"month": month, "previous_month": prev, "rows": rows, "totals": totals}


@api.get("/salary/breakup/{month}/{employee_id}")
async def salary_breakup(month: str, employee_id: str, user: dict = Depends(get_current_user)):
    _validate_month(month)
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    prev = _prev_month(month)
    cur = await _compute_month_breakdown(emp, month)
    prev_calc = await _compute_month_breakdown(emp, prev)
    previous_month_due = round(min(0.0, prev_calc["net_before_due"]), 2)
    net_payable = round(cur["net_before_due"] + previous_month_due, 2)

    return {
        "month": month,
        "previous_month": prev,
        "employee": {
            "id": emp["id"],
            "name": emp["name"],
            "mobile": emp.get("mobile", ""),
            "employment_type": cur["employment_type"],
            "status": emp.get("status", "current"),
            "joining_date": emp.get("joining_date"),
        },
        "salary": cur["salary"],
        "per_day_rate": cur["per_day_rate"],
        "leave_days": cur["leave_days"],
        "free_leave_days": cur["free_leave_days"],
        "chargeable_leave_days": cur["chargeable_leave_days"],
        "leave_deduction": cur["leave_deduction"],
        "advance_total": cur["advance_total"],
        "advances": cur["advances"],
        "previous_month_net": prev_calc["net_before_due"],
        "previous_month_due": previous_month_due,
        "net_payable": net_payable,
    }


# ---------- Dashboard ----------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    month = today.isoformat()[:7]
    current = await db.employees.count_documents({"status": "current"})
    ex = await db.employees.count_documents({"status": "ex"})

    advances = await db.advance_entries.find(
        {"date": {"$regex": f"^{month}"}}, {"_id": 0, "amount": 1}
    ).to_list(5000)
    month_advance_total = round(sum(float(a["amount"]) for a in advances), 2)

    leaves = await db.leave_entries.find({"month": month}, {"_id": 0, "days": 1}).to_list(5000)
    month_leave_total = round(sum(float(l["days"]) for l in leaves), 2)

    payroll = await db.employees.aggregate([
        {"$match": {"status": "current"}},
        {"$group": {"_id": None, "total": {"$sum": "$salary"}}},
    ]).to_list(1)
    total_payroll = round(payroll[0]["total"], 2) if payroll else 0

    recent = await db.employees.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return {
        "current_employees": current,
        "ex_employees": ex,
        "month": month,
        "month_advance_total": month_advance_total,
        "month_leave_total": month_leave_total,
        "total_monthly_payroll": total_payroll,
        "recent_employees": recent,
    }


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.employees.create_index("status")
    await db.leave_entries.create_index([("employee_id", 1), ("month", 1)], unique=True)
    await db.advance_entries.create_index([("employee_id", 1), ("date", 1)], unique=True)

    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Owner",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )

    # Legacy: remove earlier seeded accounts that are no longer the default
    await db.users.delete_many({
        "email": {"$in": ["admin@workforce.com", "manager@workforce.com"]},
        "email": {"$ne": admin_email},
    })


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
