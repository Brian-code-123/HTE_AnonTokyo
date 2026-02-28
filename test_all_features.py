#!/usr/bin/env python3
"""
Integration test for ALL 5 new features.

Tests:
  1. Teacher CRUD
  2. Analysis save/get
  3. Custom Rubric CRUD
  4. Shareable Links
  5. Comparison endpoint
  6. Teacher Timeline
  7. PDF Export
"""
import json
import sys
import requests

BASE = "http://127.0.0.1:8899/api"
PASS = 0
FAIL = 0


def test(name: str, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        print(f"  ✅ {name}")
    except Exception as e:
        FAIL += 1
        print(f"  ❌ {name}: {e}")


def main():
    global PASS, FAIL
    print("\n=== Testing 5 New Features ===\n")

    # ── 1. Teachers ─────────────────────────────
    print("📌 Feature 1: Teacher Management")

    def test_create_teacher():
        r = requests.post(f"{BASE}/teachers", json={
            "id": "t001", "name": "Alice Chen", "subject": "Mathematics"
        })
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        d = r.json()
        assert d["id"] == "t001"
        assert d["name"] == "Alice Chen"
    test("Create teacher", test_create_teacher)

    def test_create_teacher2():
        r = requests.post(f"{BASE}/teachers", json={
            "id": "t002", "name": "Bob Lee", "subject": "Physics"
        })
        assert r.status_code == 200
    test("Create second teacher", test_create_teacher2)

    def test_list_teachers():
        r = requests.get(f"{BASE}/teachers")
        assert r.status_code == 200
        d = r.json()
        assert len(d) >= 2
    test("List teachers", test_list_teachers)

    # ── 2. Analysis Storage ─────────────────────
    print("\n📌 Feature 2: Analysis Storage & Retrieval")

    analyses_ids = []
    for i, (title, date, scores) in enumerate([
        ("Algebra 101", "2024-09-01", {"overall": 75, "pace": 70, "body": 72, "clarity": 78, "engagement": 76}),
        ("Calculus Intro", "2024-10-01", {"overall": 82, "pace": 80, "body": 78, "clarity": 85, "engagement": 81}),
        ("Linear Algebra", "2024-11-01", {"overall": 88, "pace": 85, "body": 84, "clarity": 90, "engagement": 87}),
    ]):
        aid = f"a{i+1:03d}"
        analyses_ids.append(aid)

        def test_save(aid=aid, title=title, date=date, scores=scores):
            r = requests.post(f"{BASE}/analyses", json={
                "analysis_id": aid,
                "teacher_id": "t001",
                "teacher_name": "Alice Chen",
                "lesson_title": title,
                "lesson_date": date,
                "scores": scores,
                "payload": {"transcript": {"full_text": "Sample transcript..."}}
            })
            assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        test(f"Save analysis {i+1} ({title})", test_save)

    def test_get_analysis():
        r = requests.get(f"{BASE}/analyses/a001")
        assert r.status_code == 200
        d = r.json()
        assert d["lesson_title"] == "Algebra 101"
        assert d["overall_score"] == 75
    test("Get single analysis", test_get_analysis)

    def test_list_analyses():
        r = requests.get(f"{BASE}/analyses")
        assert r.status_code == 200
        d = r.json()
        assert len(d) >= 3
    test("List all analyses", test_list_analyses)

    # ── 3. Custom Rubrics ───────────────────────
    print("\n📌 Feature 3: Custom Rubric Builder")

    rubric_id = None

    def test_create_rubric():
        nonlocal rubric_id
        r = requests.post(f"{BASE}/rubrics", json={
            "name": "My Teaching Rubric",
            "dimensions": [
                {"name": "Clarity", "weight": 1.2, "description": "How clear is the explanation", "max_score": 5},
                {"name": "Engagement", "weight": 1.0, "description": "Student interaction", "max_score": 5},
                {"name": "Pacing", "weight": 0.8, "description": "Speed of delivery", "max_score": 5},
            ]
        })
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        d = r.json()
        rubric_id = d["id"]
        assert d["name"] == "My Teaching Rubric"
        assert len(d["dimensions"]) == 3
    test("Create rubric", test_create_rubric)

    def test_list_rubrics():
        r = requests.get(f"{BASE}/rubrics")
        assert r.status_code == 200
        d = r.json()
        assert len(d) >= 1
    test("List rubrics", test_list_rubrics)

    def test_get_rubric():
        r = requests.get(f"{BASE}/rubrics/{rubric_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "My Teaching Rubric"
    test("Get rubric by ID", test_get_rubric)

    def test_delete_rubric():
        # Create a temp rubric then delete
        r = requests.post(f"{BASE}/rubrics", json={
            "name": "Temp Rubric",
            "dimensions": [{"name": "X", "weight": 1.0, "description": "", "max_score": 5}]
        })
        tmp_id = r.json()["id"]
        r2 = requests.delete(f"{BASE}/rubrics/{tmp_id}")
        assert r2.status_code == 200
    test("Delete rubric", test_delete_rubric)

    # ── 4. Shareable Links ──────────────────────
    print("\n📌 Feature 4: Shareable Links")

    share_token = None

    def test_create_share():
        nonlocal share_token
        r = requests.post(f"{BASE}/shares", json={"analysis_id": "a001", "days": 30})
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        d = r.json()
        share_token = d["share_token"]
        assert len(share_token) > 10
        assert "share_url" in d
        assert "expires_at" in d
    test("Create share link", test_create_share)

    def test_access_share():
        r = requests.get(f"{BASE}/shares/{share_token}")
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        d = r.json()
        assert d["analysis"]["lesson_title"] == "Algebra 101"
    test("Access shared analysis", test_access_share)

    def test_invalid_share():
        r = requests.get(f"{BASE}/shares/invalid_token_xyz")
        assert r.status_code == 404
    test("Invalid share token → 404", test_invalid_share)

    # ── 5. Comparison ───────────────────────────
    print("\n📌 Feature 5a: Side-by-Side Comparison")

    def test_compare():
        r = requests.post(f"{BASE}/comparison", json={"analysis_ids": ["a001", "a002", "a003"]})
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        d = r.json()
        assert len(d["items"]) == 3
        assert "score_differences" in d
        assert "overall_score" in d["score_differences"]
    test("Compare 3 analyses", test_compare)

    def test_compare_too_few():
        r = requests.post(f"{BASE}/comparison", json={"analysis_ids": ["a001"]})
        assert r.status_code == 400
    test("Compare <2 → 400 error", test_compare_too_few)

    # ── 5b. Teacher Timeline ────────────────────
    print("\n📌 Feature 5b: Teacher Longitudinal Tracking")

    def test_timeline():
        r = requests.get(f"{BASE}/teachers/t001/timeline")
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        d = r.json()
        assert d["teacher_name"] == "Alice Chen"
        assert d["total_lessons"] == 3
        assert d["aggregated_metrics"]["avg_overall"] > 0
        assert "trend_overall" in d["aggregated_metrics"]
    test("Teacher timeline with trends", test_timeline)

    def test_timeline_empty():
        r = requests.get(f"{BASE}/teachers/t002/timeline")
        assert r.status_code == 404  # No analyses for t002
    test("Empty teacher timeline → 404", test_timeline_empty)

    # ── 6. PDF Export ───────────────────────────
    print("\n📌 Feature 6: PDF Export")

    def test_pdf_export():
        r = requests.post(f"{BASE}/export/pdf", json={
            "analysis_id": "a001",
            "include_body_language": True,
            "include_knowledge_points": True,
            "include_transcript": True,
        })
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        assert len(r.content) > 100
        # Should contain HTML (since weasyprint likely not installed)
        content = r.content.decode("utf-8", errors="replace")
        assert "Teaching Analysis Report" in content
        assert "Alice Chen" in content
    test("Export PDF report", test_pdf_export)

    def test_pdf_missing():
        r = requests.post(f"{BASE}/export/pdf", json={
            "analysis_id": "nonexistent"
        })
        assert r.status_code == 404
    test("PDF export missing analysis → 404", test_pdf_missing)

    # ── Summary ─────────────────────────────────
    print(f"\n{'='*40}")
    print(f"  Results: {PASS} passed, {FAIL} failed")
    print(f"{'='*40}")

    if FAIL:
        sys.exit(1)
    else:
        print("  🎉 All tests passed!\n")


if __name__ == "__main__":
    main()
