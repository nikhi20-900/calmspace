from fastapi.testclient import TestClient

from app import main


def test_spa_serves_build_files_and_falls_back_for_client_routes(tmp_path, monkeypatch):
    build_root = tmp_path / "dist"
    build_root.mkdir()
    (build_root / "index.html").write_text("<main>Calmspace</main>")
    (build_root / "app.js").write_text("console.log('calmspace')")
    monkeypatch.setattr(main, "frontend_dist", str(build_root))

    client = TestClient(main.app)

    asset_response = client.get("/app.js")
    route_response = client.get("/checkin/result")

    assert asset_response.status_code == 200
    assert asset_response.text == "console.log('calmspace')"
    assert route_response.status_code == 200
    assert route_response.text == "<main>Calmspace</main>"


def test_spa_rejects_traversal_to_sensitive_files(tmp_path, monkeypatch):
    app_root = tmp_path / "app"
    build_root = app_root / "frontend" / "dist"
    build_root.mkdir(parents=True)
    (build_root / "index.html").write_text("<main>Calmspace</main>")
    sensitive_file = app_root / "backend" / ".env.example"
    sensitive_file.parent.mkdir()
    sensitive_file.write_text("SECRET=must-not-be-served")
    monkeypatch.setattr(main, "frontend_dist", str(build_root))

    client = TestClient(main.app)
    traversal_paths = [
        "/%2e%2e/backend/.env.example",
        "/%2e%2e%2fbackend%2f.env.example",
    ]

    for path in traversal_paths:
        response = client.get(path)
        assert response.status_code == 404, path
        assert "SECRET=must-not-be-served" not in response.text


def test_spa_rejects_symlinks_that_escape_build_directory(tmp_path, monkeypatch):
    build_root = tmp_path / "dist"
    build_root.mkdir()
    (build_root / "index.html").write_text("<main>Calmspace</main>")
    sensitive_file = tmp_path / ".env.example"
    sensitive_file.write_text("SECRET=must-not-be-served")
    (build_root / "leak.txt").symlink_to(sensitive_file)
    monkeypatch.setattr(main, "frontend_dist", str(build_root))

    response = TestClient(main.app).get("/leak.txt")

    assert response.status_code == 404
    assert "SECRET=must-not-be-served" not in response.text


def test_unknown_api_routes_return_404_not_spa(tmp_path, monkeypatch):
    build_root = tmp_path / "dist"
    build_root.mkdir()
    (build_root / "index.html").write_text("<main>Calmspace</main>")
    monkeypatch.setattr(main, "frontend_dist", str(build_root))

    response = TestClient(main.app).get("/api/not-a-real-endpoint")

    assert response.status_code == 404
    assert "Calmspace" not in response.text


def test_missing_frontend_build_directory_returns_404(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "frontend_dist", str(tmp_path / "missing-dist"))

    response = TestClient(main.app).get("/checkin/result")

    assert response.status_code == 404
