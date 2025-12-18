import { NextResponse, NextRequest } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

const livekitHost = process.env.LIVEKIT_URL || '';
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';

const safeBigIntToNumber = (value: any): number => {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
};

export async function GET() {
  try {
    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
    const rooms = await roomService.listRooms();
    
    return NextResponse.json({ 
      success: true, 
      rooms: rooms.map(room => ({
        sid: room.sid,
        name: room.name,
        emptyTimeout: safeBigIntToNumber(room.emptyTimeout),
        maxParticipants: safeBigIntToNumber(room.maxParticipants),
        creationTime: safeBigIntToNumber(room.creationTime),
        numParticipants: safeBigIntToNumber(room.numParticipants),
        metadata: room.metadata || '',
      }))
    });
  } catch (error: any) {
    console.error('❌ Error listing rooms:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { roomName } = await req.json();

    if (!roomName) {
      return NextResponse.json(
        { success: false, error: 'Missing roomName' },
        { status: 400 }
      );
    }

    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
    await roomService.deleteRoom(roomName);

    return NextResponse.json({ 
      success: true,
      message: `Room ${roomName} deleted successfully` 
    });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return NextResponse.json({ 
        success: true,
        message: 'Room already deleted' 
      });
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}