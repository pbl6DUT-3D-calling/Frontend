import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

const livekitHost = process.env.LIVEKIT_URL || '';
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';

// ⬅️ THÊM: Helper function để convert BigInt
const safeBigIntToNumber = (value: any): number => {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
};

export async function GET() {
  try {
    console.log('📡 GET /api/rooms - Fetching rooms from LiveKit...');
    
    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
    const rooms = await roomService.listRooms();
    
    console.log(`✅ Found ${rooms.length} rooms`);
    
    // ⬅️ SỬA: Convert BigInt trước khi JSON.stringify
    return NextResponse.json({ 
      success: true, 
      rooms: rooms.map(room => ({
        sid: room.sid,
        name: room.name,
        emptyTimeout: safeBigIntToNumber(room.emptyTimeout),
        maxParticipants: safeBigIntToNumber(room.maxParticipants),
        creationTime: safeBigIntToNumber(room.creationTime), // ⬅️ Convert BigInt
        numParticipants: safeBigIntToNumber(room.numParticipants), // ⬅️ Convert BigInt
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

