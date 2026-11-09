from __future__ import annotations

import asyncio
from typing import Awaitable, Callable


class SyncScheduler:
    def __init__(self, callback: Callable[[], Awaitable[None]], interval_seconds: int = 60):
        self.callback = callback
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None

    async def start(self):
        self._task = asyncio.create_task(self._run())

    async def stop(self):
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self):
        while True:
            await self.callback()
            await asyncio.sleep(self.interval_seconds)
