from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import httpx


class WebUntisRPCError(RuntimeError):
    def __init__(self, message: str, code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.code = code


class WebUntisClient:
    def __init__(self, server_url: str, school: str):
        self.server_url = server_url.rstrip("/")
        self.school = school
        self.base_url = f"{self.server_url}/WebUntis/jsonrpc.do"
        self.session_id: Optional[str] = None
        self.request_id = 1
        self.client = httpx.AsyncClient(timeout=20.0)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.logout()
        await self.client.aclose()

    async def _request(self, method: str, params: Optional[Dict[str, Any]] = None, *, requires_auth: bool = True):
        if requires_auth and not self.session_id:
            raise WebUntisRPCError("Client is not authenticated with WebUntis.")

        payload: Dict[str, Any] = {
            "id": self.request_id,
            "method": method,
            "params": params or {},
        }
        self.request_id += 1

        if self.session_id:
            payload["params"] = {"sessionId": self.session_id, **(params or {})}

        response = await self.client.post(self.base_url, json=payload)
        response.raise_for_status()
        data = response.json()

        if "error" in data and data["error"]:
            error = data["error"]
            message = error.get("message") or "WebUntis RPC error"
            code = error.get("code")
            raise WebUntisRPCError(message, code)

        return data.get("result")

    async def authenticate(self, username: str, password: str):
        payload = {
            "user": username,
            "password": password,
            "school": self.school,
        }
        result = await self._request("session.login", payload, requires_auth=False)
        self.session_id = (
            result.get("sessionId")
            if isinstance(result, dict)
            else result
        )
        return self.session_id

    async def logout(self):
        if not self.session_id:
            return True
        try:
            await self._request("session.logout")
        finally:
            self.session_id = None
        return True

    async def get_klassen(self):
        result = await self._request("class.list")
        if isinstance(result, list):
            return result
        return result.get("classes", []) if isinstance(result, dict) else []

    async def get_students(self):
        result = await self._request("student.list")
        if isinstance(result, list):
            return result
        return result.get("students", []) if isinstance(result, dict) else []

    async def get_student_absences(self, date_from: Any, date_to: Any):
        params = {
            "startDate": date_from.isoformat() if hasattr(date_from, "isoformat") else str(date_from),
            "endDate": date_to.isoformat() if hasattr(date_to, "isoformat") else str(date_to),
        }
        result = await self._request("absence.get", params)
        if isinstance(result, list):
            return result
        return result.get("absences", []) if isinstance(result, dict) else []

    async def get_timetable(self, start_date: Any, end_date: Any, klasse_id: Optional[str] = None):
        params = {
            "startDate": start_date.isoformat() if hasattr(start_date, "isoformat") else str(start_date),
            "endDate": end_date.isoformat() if hasattr(end_date, "isoformat") else str(end_date),
        }
        if klasse_id:
            params["classId"] = klasse_id
        result = await self._request("timetable.get", params)
        if isinstance(result, list):
            return result
        return result.get("timetable", []) if isinstance(result, dict) else []
