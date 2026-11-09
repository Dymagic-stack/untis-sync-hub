import os
from dotenv import load_dotenv

load_dotenv()

UNTIS_SERVER = os.getenv("UNTIS_SERVER", "https://arche.webuntis.com")
UNTIS_SCHOOL = os.getenv("UNTIS_SCHOOL", "atiw-paderborn")
UNTIS_USER = os.getenv("UNTIS_USER", "")
UNTIS_PASSWORD = os.getenv("UNTIS_PASSWORD", "")