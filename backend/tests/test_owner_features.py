"""Backend tests for QuickTurf Owner Dashboard features"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def owner_session():
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"identifier": "testowner", "password": "owner123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return session

class TestAuth:
    def test_owner_login(self):
        # Login returns user object directly (not wrapped in "user")
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"identifier": "testowner", "password": "owner123"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "turf_owner"
        print(f"Login OK: {data['username']}")

    def test_player_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"identifier": "shahid", "password": "shahid123"})
        assert resp.status_code == 200
        assert resp.json()["role"] == "player"

class TestOwnerTurfs:
    def test_get_owner_turfs(self, owner_session):
        resp = owner_session.get(f"{BASE_URL}/api/owner/turfs")
        assert resp.status_code == 200
        turfs = resp.json()
        assert isinstance(turfs, list)
        assert len(turfs) > 0
        print(f"Owner turfs: {[t['name'] for t in turfs]}")

    def test_turf_has_required_fields(self, owner_session):
        resp = owner_session.get(f"{BASE_URL}/api/owner/turfs")
        turf = resp.json()[0]
        for field in ["id", "name", "pricePerHour", "openHour", "closeHour"]:
            assert field in turf, f"Missing field: {field}"

class TestOwnerAnalytics:
    def test_get_analytics(self, owner_session):
        resp = owner_session.get(f"{BASE_URL}/api/owner/analytics")
        assert resp.status_code == 200
        data = resp.json()
        for key in ["totalRevenue", "totalBookings", "cancelledBookings", "occupancyRate", "monthlyRevenue"]:
            assert key in data, f"Missing key: {key}"
        print(f"Analytics: revenue={data['totalRevenue']}, bookings={data['totalBookings']}")

    def test_monthly_revenue_has_6_months(self, owner_session):
        resp = owner_session.get(f"{BASE_URL}/api/owner/analytics")
        data = resp.json()
        assert len(data["monthlyRevenue"]) == 6

class TestEditTurfProfile:
    def test_patch_turf_price(self, owner_session):
        resp = owner_session.patch(f"{BASE_URL}/api/owner/turf/profile", json={"pricePerHour": 1500})
        assert resp.status_code == 200
        data = resp.json()
        assert data["pricePerHour"] == 1500
        print(f"Price updated to: {data['pricePerHour']}")

    def test_patch_turf_operating_hours(self, owner_session):
        resp = owner_session.patch(f"{BASE_URL}/api/owner/turf/profile", json={"openHour": 8, "closeHour": 20})
        assert resp.status_code == 200
        data = resp.json()
        assert data["openHour"] == 8
        assert data["closeHour"] == 20

    def test_patch_price_too_low(self, owner_session):
        resp = owner_session.patch(f"{BASE_URL}/api/owner/turf/profile", json={"pricePerHour": 50})
        assert resp.status_code == 400

class TestOwnerBookings:
    def test_get_owner_bookings(self, owner_session):
        turfs = owner_session.get(f"{BASE_URL}/api/owner/turfs").json()
        if not turfs:
            pytest.skip("No turf found")
        turf_id = turfs[0]["id"]
        resp = owner_session.get(f"{BASE_URL}/api/owner/turfs/{turf_id}/bookings")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        print(f"Bookings count: {len(resp.json())}")

class TestOwnerReviews:
    def test_get_owner_reviews(self, owner_session):
        turfs = owner_session.get(f"{BASE_URL}/api/owner/turfs").json()
        if not turfs:
            pytest.skip("No turf found")
        turf_id = turfs[0]["id"]
        resp = owner_session.get(f"{BASE_URL}/api/owner/turfs/{turf_id}/reviews")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        print(f"Reviews count: {len(resp.json())}")
