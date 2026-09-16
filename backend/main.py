
from fastapi import FastAPI
from schemas import EmergencyPacket
from fastapi.middleware.cors import CORSMiddleware
import sqlite3

app = FastAPI(title="Dead Zone Emergency Network API")

# Allow our React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "emergency.db"


def get_database():
    return sqlite3.connect(DATABASE)


def create_table():
    connection = get_database()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS emergencies (
            message_id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            emergency_type TEXT NOT NULL,
            message TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp TEXT NOT NULL,
            hop_count INTEGER DEFAULT 0,
            status TEXT NOT NULL
        )
        """
    )

    connection.commit()
    connection.close()


create_table()


@app.get("/")
def root():
    return {
        "message": "Dead Zone Emergency Network API is running"
    }

@app.post("/api/sos")
def create_sos(emergency: EmergencyPacket):
    connection = get_database()

    # Prevent duplicate SOS messages
    existing = connection.execute(
        "SELECT message_id FROM emergencies WHERE message_id = ?",
        (emergency.messageId,),
    ).fetchone()

    if existing:
        connection.close()

        return {
            "success": True,
            "message": "SOS already exists",
            "messageId": emergency.messageId,
        }

    connection.execute(
        """
        INSERT INTO emergencies (
            message_id,
            sender_id,
            emergency_type,
            message,
            latitude,
            longitude,
            timestamp,
            hop_count,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            emergency.messageId,
            emergency.senderId,
            emergency.type,
            emergency.message,
            emergency.latitude,
            emergency.longitude,
            emergency.timestamp,
            emergency.hopCount,
            emergency.status,
        ),
    )

    connection.commit()
    connection.close()

    return {
        "success": True,
        "message": "SOS received successfully",
        "messageId": emergency.messageId,
    }

@app.get("/api/sos")
def get_sos():
    connection = get_database()

    rows = connection.execute(
        """
        SELECT
            message_id,
            sender_id,
            emergency_type,
            message,
            latitude,
            longitude,
            timestamp,
            hop_count,
            status
        FROM emergencies
        ORDER BY timestamp DESC
        """
    ).fetchall()

    connection.close()

    emergencies = []

    for row in rows:
        emergencies.append(
            {
                "messageId": row[0],
                "senderId": row[1],
                "type": row[2],
                "message": row[3],
                "latitude": row[4],
                "longitude": row[5],
                "timestamp": row[6],
                "hopCount": row[7],
                "status": row[8],
            }
        )

    return emergencies