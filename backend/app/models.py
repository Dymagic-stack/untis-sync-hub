from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class AbsenceRecord(BaseModel):
    id: Optional[str] = None
    student_id: Optional[str] = Field(default=None, alias="studentId")
    student_name: Optional[str] = Field(default=None, alias="studentName")
    class_name: Optional[str] = Field(default=None, alias="className")
    date: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None

    class Config:
        populate_by_name = True


class DashboardStats(BaseModel):
    total_students: int = Field(default=0, alias="totalStudents")
    total_classes: int = Field(default=0, alias="totalClasses")
    today_absences: int = Field(default=0, alias="todayAbsences")

    class Config:
        populate_by_name = True
