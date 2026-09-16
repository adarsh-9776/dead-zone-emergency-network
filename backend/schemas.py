from pydantic import BaseModel


class EmergencyPacket(BaseModel):
    messageId: str
    senderId: str
    type: str
    message: str
    latitude: float
    longitude: float
    timestamp: str
    hopCount: int = 0
    status: str = "PENDING"