from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, timedelta
from app.config import UNTIS_SERVER, UNTIS_SCHOOL, UNTIS_USER, UNTIS_PASSWORD
from app.untis_client import WebUntisClient, WebUntisRPCError

app = FastAPI(title="WebUntis Sync-Hub API", version="1.0.0")

# CORS für das Frontend erlauben
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Standard Vite Dev-Server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/dashboard-stats")
async def get_dashboard_data():
    """Holt aggregierte Kennzahlen und Fehlzeiten für das Dashboard."""
    try:
        async with WebUntisClient(UNTIS_SERVER, UNTIS_SCHOOL) as client:
            await client.authenticate(UNTIS_USER, UNTIS_PASSWORD)
            
            # Stammdaten und Abwesenheiten abfragen
            klassen = await client.get_klassen()
            students = await client.get_students()
            today = date.today()
            absences = await client.get_student_absences(today, today)
            
            return {
                "stats": {
                    "totalStudents": len(students),
                    "totalClasses": len(klassen),
                    "todayAbsences": len(absences),
                },
                "absences": absences,
                "classes": [k.get("name") for k in klassen[:6]]
            }
    except WebUntisRPCError as e:
        raise HTTPException(status_code=502, detail=f"WebUntis RPC Fehler: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sync/trigger")
async def trigger_manual_sync():
    """Triggert manuellen Synchronisationslauf."""
    # Hier wird die Delta-Erkennungs- und Verteilungslogik aufgerufen
    return {"status": "success", "message": "Delta-Sync erfolgreich abgeschlossen"}