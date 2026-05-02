"""Backend API tests for Nellai Karupatti Coffee Manager."""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://staff-dashboard-63.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@workforce.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def auth():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"
    return s


_created_ids = []


class TestAuth:
    def test_me(self, auth):
        r = auth.get(f"{API}/auth/me")
        assert r.status_code == 200
        me = r.json()
        assert me["email"] == ADMIN_EMAIL
        assert "password_hash" not in me

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


class TestEmployees:
    def test_create_employee(self, auth):
        payload = {
            "name": "TEST_Karthik",
            "mobile": "+91 9876543210",
            "emergency_contact": "Mother 9999999999",
            "address": "12, Tea Street, Nellai",
            "address_proof_type": "Aadhaar",
            "address_proof_number": "1111 2222 3333",
            "salary": 18000,
            "status": "current",
        }
        r = auth.post(f"{API}/employees", json=payload)
        assert r.status_code == 200, r.text
        emp = r.json()
        for k in ["name", "mobile", "emergency_contact", "address", "address_proof_type", "address_proof_number"]:
            assert emp[k] == payload[k]
        assert emp["salary"] == 18000
        assert emp["status"] == "current"
        assert "id" in emp
        _created_ids.append(emp["id"])

    def test_list_filters(self, auth):
        assert _created_ids, "no employee created"
        rc = auth.get(f"{API}/employees?status=current").json()
        assert any(e["id"] == _created_ids[0] for e in rc)
        re = auth.get(f"{API}/employees?status=ex").json()
        assert all(e["status"] == "ex" for e in re)

    def test_update_employee(self, auth):
        eid = _created_ids[0]
        r = auth.put(f"{API}/employees/{eid}", json={
            "name": "TEST_Karthik R",
            "mobile": "+91 9000000000",
            "emergency_contact": "Mother 9999999999",
            "address": "updated",
            "address_proof_type": "PAN",
            "address_proof_number": "ABCDE1234F",
            "salary": 20000,
            "status": "current",
        })
        assert r.status_code == 200
        assert r.json()["salary"] == 20000
        g = auth.get(f"{API}/employees/{eid}").json()
        assert g["salary"] == 20000
        assert g["name"] == "TEST_Karthik R"

    def test_toggle_status(self, auth):
        eid = _created_ids[0]
        r = auth.patch(f"{API}/employees/{eid}/status", json={"status": "ex"})
        assert r.status_code == 200 and r.json()["status"] == "ex"
        g = auth.get(f"{API}/employees/{eid}").json()
        assert g["status"] == "ex"
        r2 = auth.patch(f"{API}/employees/{eid}/status", json={"status": "current"})
        assert r2.status_code == 200
        bad = auth.patch(f"{API}/employees/{eid}/status", json={"status": "garbage"})
        assert bad.status_code == 400


class TestLeaves:
    MONTH = "2026-05"

    def test_get_month(self, auth):
        r = auth.get(f"{API}/leaves/month/{self.MONTH}")
        assert r.status_code == 200
        data = r.json()
        assert data["month"] == self.MONTH
        assert isinstance(data["rows"], list)
        assert any(row["employee_id"] == _created_ids[0] for row in data["rows"])

    def test_save_leaves_upsert(self, auth):
        eid = _created_ids[0]
        r = auth.post(f"{API}/leaves/month/{self.MONTH}", json={"entries": [{"employee_id": eid, "days": 2}]})
        assert r.status_code == 200
        rows = auth.get(f"{API}/leaves/month/{self.MONTH}").json()["rows"]
        row = next(r for r in rows if r["employee_id"] == eid)
        assert row["days"] == 2
        auth.post(f"{API}/leaves/month/{self.MONTH}", json={"entries": [{"employee_id": eid, "days": 3}]})
        rows2 = auth.get(f"{API}/leaves/month/{self.MONTH}").json()["rows"]
        row2 = next(r for r in rows2 if r["employee_id"] == eid)
        assert row2["days"] == 3
        auth.post(f"{API}/leaves/month/{self.MONTH}", json={"entries": [{"employee_id": eid, "days": 2}]})

    def test_invalid_month(self, auth):
        r = auth.get(f"{API}/leaves/month/2026-13")
        assert r.status_code == 400


class TestAdvances:
    DATE = "2026-05-15"
    MONTH = "2026-05"

    def test_post_and_get_date(self, auth):
        eid = _created_ids[0]
        r = auth.post(f"{API}/advances", json={"date": self.DATE, "entries": [{"employee_id": eid, "amount": 500}]})
        assert r.status_code == 200
        data = auth.get(f"{API}/advances/date/{self.DATE}").json()
        row = next(r for r in data["rows"] if r["employee_id"] == eid)
        assert row["amount"] == 500

    def test_zero_deletes(self, auth):
        eid = _created_ids[0]
        auth.post(f"{API}/advances", json={"date": "2026-05-16", "entries": [{"employee_id": eid, "amount": 200}]})
        row1 = next(r for r in auth.get(f"{API}/advances/date/2026-05-16").json()["rows"] if r["employee_id"] == eid)
        assert row1["amount"] == 200
        auth.post(f"{API}/advances", json={"date": "2026-05-16", "entries": [{"employee_id": eid, "amount": 0}]})
        row2 = next(r for r in auth.get(f"{API}/advances/date/2026-05-16").json()["rows"] if r["employee_id"] == eid)
        assert row2["amount"] == 0

    def test_month_list_has_name(self, auth):
        docs = auth.get(f"{API}/advances/month/{self.MONTH}").json()
        assert isinstance(docs, list)
        if docs:
            assert all("employee_name" in d for d in docs)


class TestSalary:
    def test_salary_computation(self, auth):
        eid = _created_ids[0]
        auth.put(f"{API}/employees/{eid}", json={
            "name": "TEST_Karthik R",
            "mobile": "+91 9000000000",
            "emergency_contact": "x",
            "address": "x",
            "address_proof_type": "PAN",
            "address_proof_number": "x",
            "salary": 18000,
            "status": "current",
        })
        auth.post(f"{API}/leaves/month/2026-05", json={"entries": [{"employee_id": eid, "days": 2}]})
        auth.post(f"{API}/advances", json={"date": "2026-05-16", "entries": [{"employee_id": eid, "amount": 0}]})
        auth.post(f"{API}/advances", json={"date": "2026-05-15", "entries": [{"employee_id": eid, "amount": 500}]})

        data = auth.get(f"{API}/salary/month/2026-05").json()
        row = next(r for r in data["rows"] if r["employee_id"] == eid)
        assert row["salary"] == 18000
        assert row["leave_days"] == 2
        # Regular employee: first 2 leaves free -> no leave deduction
        assert row["leave_deduction"] == 0.0
        assert row["advance_total"] == 500.0
        # 18000 - 0 - 500 = 17500
        assert row["net_payable"] == 17500.0
        assert "totals" in data


class TestDashboard:
    def test_stats(self, auth):
        r = auth.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["current_employees", "ex_employees", "month_advance_total", "total_monthly_payroll", "recent_employees"]:
            assert k in d
        assert isinstance(d["recent_employees"], list)


class TestCascadeDelete:
    """Verify DELETE /api/employees/{id} cascades into leave_entries and advance_entries."""
    def test_delete_cascades_leaves_and_advances(self, auth):
        from datetime import datetime
        payload = {
            "name": "TEST_Cascade_User",
            "mobile": "+91 9123456789",
            "emergency_contact": "x",
            "address": "x",
            "address_proof_type": "PAN",
            "address_proof_number": "ABCDE9999Z",
            "salary": 12000,
            "status": "current",
        }
        r = auth.post(f"{API}/employees", json=payload)
        assert r.status_code == 200
        eid = r.json()["id"]

        today = datetime.utcnow().strftime("%Y-%m-%d")
        month = today[:7]

        # seed one leave entry for current month
        lr = auth.post(f"{API}/leaves/month/{month}", json={"entries": [{"employee_id": eid, "days": 3}]})
        assert lr.status_code == 200

        # seed one advance entry for today
        ar = auth.post(f"{API}/advances", json={"date": today, "entries": [{"employee_id": eid, "amount": 200}]})
        assert ar.status_code == 200

        # verify presence before delete
        leaves = auth.get(f"{API}/leaves/month/{month}").json()["rows"]
        assert any(row["employee_id"] == eid and row["days"] == 3 for row in leaves)
        advs = auth.get(f"{API}/advances/date/{today}").json()["rows"]
        assert any(row["employee_id"] == eid and row["amount"] == 200 for row in advs)

        # salary spot-check for Regular: 12000 salary, 3 leaves (first 2 free, 1 chargeable),
        # per_day = 12000/30 = 400, deduction = 400, advance = 200 => net = 12000 - 400 - 200 = 11400
        sal = auth.get(f"{API}/salary/month/{month}").json()
        srow = next(r for r in sal["rows"] if r["employee_id"] == eid)
        assert srow["salary"] == 12000
        assert srow["leave_days"] == 3
        assert srow["leave_deduction"] == 400.0
        assert srow["advance_total"] == 200.0
        assert srow["net_payable"] == 11400.0

        # delete employee
        d = auth.delete(f"{API}/employees/{eid}")
        assert d.status_code == 200

        # employee is gone
        g = auth.get(f"{API}/employees/{eid}")
        assert g.status_code == 404

        # leave_entries no longer contain the employee (row missing from month view)
        leaves_after = auth.get(f"{API}/leaves/month/{month}").json()["rows"]
        assert not any(row["employee_id"] == eid for row in leaves_after), "leave_entries not cascaded"

        # advance_entries no longer contain the employee for that date
        advs_after = auth.get(f"{API}/advances/date/{today}").json()["rows"]
        assert not any(row["employee_id"] == eid for row in advs_after), "advance_entries not cascaded"

        # month advances list also has no trace
        month_advs = auth.get(f"{API}/advances/month/{month}").json()
        assert not any(d.get("employee_id") == eid for d in month_advs), "month advance_entries not cascaded"


# ---------------- NEW FEATURE TESTS (employment_type, breakup, previous due) ----------------

_feature_ids = []


def _make_emp(auth, name, salary=30000, employment_type="regular"):
    r = auth.post(f"{API}/employees", json={
        "name": name, "mobile": "", "emergency_contact": "", "address": "",
        "address_proof_type": "", "address_proof_number": "",
        "salary": salary, "status": "current", "employment_type": employment_type,
    })
    assert r.status_code == 200, r.text
    eid = r.json()["id"]
    _feature_ids.append(eid)
    return eid, r.json()


class TestEmploymentType:
    """Persistence + default of employment_type."""

    def test_default_regular(self, auth):
        r = auth.post(f"{API}/employees", json={"name": "TEST_ET_Default", "salary": 10000})
        assert r.status_code == 200
        e = r.json()
        assert e["employment_type"] == "regular"
        _feature_ids.append(e["id"])

    def test_create_contract_persists(self, auth):
        eid, e = _make_emp(auth, "TEST_ET_Contract", salary=20000, employment_type="contract")
        assert e["employment_type"] == "contract"
        g = auth.get(f"{API}/employees/{eid}").json()
        assert g["employment_type"] == "contract"
        listed = auth.get(f"{API}/employees?status=current").json()
        assert any(x["id"] == eid and x["employment_type"] == "contract" for x in listed)

    def test_update_toggles_type(self, auth):
        eid, _ = _make_emp(auth, "TEST_ET_Toggle", salary=15000, employment_type="regular")
        r = auth.put(f"{API}/employees/{eid}", json={
            "name": "TEST_ET_Toggle", "salary": 15000, "status": "current",
            "employment_type": "contract",
        })
        assert r.status_code == 200
        assert r.json()["employment_type"] == "contract"
        assert auth.get(f"{API}/employees/{eid}").json()["employment_type"] == "contract"


class TestSalaryArithmetic:
    """Leave-deduction rules + previous-month-due carry-over."""

    MONTH = "2026-07"
    PREV = "2026-06"

    def _reset(self, auth, eid, month):
        # zero out leaves for that month
        auth.post(f"{API}/leaves/month/{month}", json={"entries": [{"employee_id": eid, "days": 0}]})

    def test_regular_3_leaves_charges_one(self, auth):
        eid, _ = _make_emp(auth, "TEST_Reg_3Leaves", salary=30000, employment_type="regular")
        auth.post(f"{API}/leaves/month/{self.MONTH}", json={"entries": [{"employee_id": eid, "days": 3}]})
        data = auth.get(f"{API}/salary/month/{self.MONTH}").json()
        row = next(r for r in data["rows"] if r["employee_id"] == eid)
        assert row["employment_type"] == "regular"
        assert row["salary"] == 30000
        assert row["leave_days"] == 3
        assert row["leave_deduction"] == 1000.0  # per_day=1000, chargeable=1
        assert row["advance_total"] == 0
        assert row["previous_month_due"] == 0
        assert row["net_payable"] == 29000.0

    def test_regular_2_leaves_no_charge(self, auth):
        eid, _ = _make_emp(auth, "TEST_Reg_2Leaves", salary=30000, employment_type="regular")
        auth.post(f"{API}/leaves/month/{self.MONTH}", json={"entries": [{"employee_id": eid, "days": 2}]})
        data = auth.get(f"{API}/salary/month/{self.MONTH}").json()
        row = next(r for r in data["rows"] if r["employee_id"] == eid)
        assert row["leave_deduction"] == 0.0
        assert row["net_payable"] == 30000.0

    def test_regular_0_leaves_no_charge(self, auth):
        eid, _ = _make_emp(auth, "TEST_Reg_0Leaves", salary=30000, employment_type="regular")
        data = auth.get(f"{API}/salary/month/{self.MONTH}").json()
        row = next(r for r in data["rows"] if r["employee_id"] == eid)
        assert row["leave_days"] == 0
        assert row["leave_deduction"] == 0.0
        assert row["net_payable"] == 30000.0

    def test_contract_3_leaves_charges_all(self, auth):
        eid, _ = _make_emp(auth, "TEST_Con_3Leaves", salary=30000, employment_type="contract")
        auth.post(f"{API}/leaves/month/{self.MONTH}", json={"entries": [{"employee_id": eid, "days": 3}]})
        data = auth.get(f"{API}/salary/month/{self.MONTH}").json()
        row = next(r for r in data["rows"] if r["employee_id"] == eid)
        assert row["employment_type"] == "contract"
        assert row["leave_deduction"] == 3000.0  # per_day=1000, chargeable=3
        assert row["net_payable"] == 27000.0

    def test_previous_month_due_negative_carryover(self, auth):
        """April: salary 30000, advance 40000 -> net=-10000; May: salary 30000, 3 leaves (regular) -> carry -10000 => 19000."""
        eid, _ = _make_emp(auth, "TEST_PrevDue_Neg", salary=30000, employment_type="regular")
        april = "2026-04"
        may = "2026-05"
        # April: heavy advance
        auth.post(f"{API}/advances", json={"date": f"{april}-10", "entries": [{"employee_id": eid, "amount": 40000}]})
        # May: 3 leaves, no advance
        auth.post(f"{API}/leaves/month/{may}", json={"entries": [{"employee_id": eid, "days": 3}]})

        may_data = auth.get(f"{API}/salary/month/{may}").json()
        assert may_data["previous_month"] == april
        row = next(r for r in may_data["rows"] if r["employee_id"] == eid)
        assert row["previous_month_due"] == -10000.0
        # net = 30000 - 1000 (1 chargeable leave) + (-10000) = 19000
        assert row["net_payable"] == 19000.0

    def test_previous_month_positive_does_not_carry(self, auth):
        """If prev month net was positive, previous_month_due must be 0."""
        eid, _ = _make_emp(auth, "TEST_PrevDue_Pos", salary=30000, employment_type="regular")
        # June: no leaves, no advance -> net 30000 (positive)
        # July: should not carry over positive
        data = auth.get(f"{API}/salary/month/{self.MONTH}").json()
        row = next(r for r in data["rows"] if r["employee_id"] == eid)
        assert row["previous_month_due"] == 0


class TestSalaryBreakup:
    """GET /api/salary/breakup/{month}/{employee_id}"""

    MONTH = "2026-08"

    def test_breakup_full_structure(self, auth):
        eid, _ = _make_emp(auth, "TEST_Breakup_User", salary=30000, employment_type="regular")
        auth.post(f"{API}/leaves/month/{self.MONTH}", json={"entries": [{"employee_id": eid, "days": 4}]})
        auth.post(f"{API}/advances", json={"date": f"{self.MONTH}-05", "entries": [{"employee_id": eid, "amount": 2000}]})
        auth.post(f"{API}/advances", json={"date": f"{self.MONTH}-20", "entries": [{"employee_id": eid, "amount": 1500}]})

        r = auth.get(f"{API}/salary/breakup/{self.MONTH}/{eid}")
        assert r.status_code == 200
        b = r.json()

        # meta
        assert b["month"] == self.MONTH
        assert b["previous_month"] == "2026-07"
        assert b["employee"]["id"] == eid
        assert b["employee"]["name"] == "TEST_Breakup_User"
        assert b["employee"]["employment_type"] == "regular"

        # numeric
        assert b["salary"] == 30000
        assert b["per_day_rate"] == 1000.0
        assert b["leave_days"] == 4
        assert b["free_leave_days"] == 2
        assert b["chargeable_leave_days"] == 2
        assert b["leave_deduction"] == 2000.0  # 1000 * 2
        assert b["advance_total"] == 3500.0

        # advances list (only this month, sum matches)
        assert isinstance(b["advances"], list)
        assert len(b["advances"]) == 2
        for a in b["advances"]:
            assert a["date"].startswith(self.MONTH)
            assert "amount" in a
        assert round(sum(a["amount"] for a in b["advances"]), 2) == 3500.0

        # previous due = 0 (no prior month issues)
        assert b["previous_month_due"] == 0
        # net = 30000 - 2000 - 3500 + 0 = 24500
        assert b["net_payable"] == 24500.0

    def test_breakup_unknown_employee(self, auth):
        r = auth.get(f"{API}/salary/breakup/{self.MONTH}/no-such-id-xyz")
        assert r.status_code == 404

    def test_breakup_invalid_month(self, auth):
        # need a valid employee id to isolate month validation
        eid, _ = _make_emp(auth, "TEST_Breakup_InvMonth", salary=10000)
        r = auth.get(f"{API}/salary/breakup/2026-13/{eid}")
        assert r.status_code == 400


class TestZZCleanup:
    def test_delete_employees(self, auth):
        for eid in _created_ids + _feature_ids:
            auth.delete(f"{API}/employees/{eid}")
