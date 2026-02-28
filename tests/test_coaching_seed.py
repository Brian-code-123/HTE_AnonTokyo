"""
Quick smoke tests for the new coaching and seed endpoints.
"""
import os
os.environ.setdefault("DATABASE_PATH", "/tmp/test_hte_anontokyo.db")

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.services.persistence import init_db

app = create_app()

@pytest.fixture(autouse=True, scope="session")
def setup_db():
    init_db()

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_seed_demo_data():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/seed-demo")
        assert r.status_code == 200
        data = r.json()
        assert "teachers_created" in data
        assert "analyses_created" in data
        assert "rubrics_created" in data
        assert isinstance(data["message"], str)

@pytest.mark.anyio
async def test_seed_idempotent():
    """Calling seed twice should not duplicate data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/seed-demo")
        r2 = await client.post("/api/seed-demo")
        data = r2.json()
        assert data["teachers_created"] == 0
        assert data["analyses_created"] == 0

@pytest.mark.anyio
async def test_coaching_suggestions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Seed first
        await client.post("/api/seed-demo")
        # Get coaching
        r = await client.post("/api/coaching/suggestions", json={"teacher_id": "demo-teacher-1"})
        assert r.status_code == 200
        plan = r.json()
        assert plan["teacher_name"] != ""
        assert "suggestions" in plan
        assert len(plan["suggestions"]) > 0
        for s in plan["suggestions"]:
            assert "area" in s
            assert "priority" in s
            assert s["priority"] in ("high", "medium", "low")
            assert "action_items" in s

@pytest.mark.anyio
async def test_coaching_no_data():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/coaching/suggestions", json={"teacher_id": "nonexistent"})
        assert r.status_code == 200
        plan = r.json()
        assert plan["suggestions"] == []

@pytest.mark.anyio
async def test_teachers_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/seed-demo")
        r = await client.get("/api/teachers")
        assert r.status_code == 200
        teachers = r.json()
        assert any(t["id"] == "demo-teacher-1" for t in teachers)
