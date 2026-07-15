"""Test de charge minimal (locust).

Usage :
    locust -f tests/load/locustfile.py --host http://localhost:8000 \
        --users 50 --spawn-rate 5 --run-time 1m --headless

Note : relever RATE_LIMIT_DEFAULT côté API pour un tir de charge, sinon les 429
du rate limiting fausseraient la mesure.
"""

from locust import HttpUser, between, task


class PublicApiUser(HttpUser):
    wait_time = between(0.5, 2)

    @task(3)
    def latest_draw(self) -> None:
        self.client.get("/api/v1/draws/latest", name="/draws/latest")

    @task(3)
    def draws_page(self) -> None:
        self.client.get("/api/v1/draws?page=1&page_size=20", name="/draws")

    @task(4)
    def frequencies(self) -> None:
        self.client.get("/api/v1/stats/frequencies", name="/stats/frequencies")

    @task(2)
    def delays(self) -> None:
        self.client.get("/api/v1/stats/delays?window=50", name="/stats/delays")

    @task(2)
    def shapes(self) -> None:
        self.client.get("/api/v1/stats/shapes", name="/stats/shapes")

    @task(1)
    def generator(self) -> None:
        self.client.post(
            "/api/v1/generator",
            json={"method": "random", "count": 1},
            name="/generator",
        )

    @task(1)
    def health(self) -> None:
        self.client.get("/health", name="/health")
