# WFLW Face Tracking Integration

## 📝 Tổng quan

Đã thay thế **MediaPipe Holistic** bằng **WFLW 98 landmarks** model qua WebSocket để tracking khuôn mặt cho VRM Avatar.

## 🎯 Những gì đã làm

### 1. Tạo WFLW to VRM Adapter (`utils/wflwToVRM.ts`)

Chuyển đổi 98 landmarks WFLW sang format VRM-compatible:

**Input từ server:**
```json
{
  "landmarks": [
    {"x": 120.5, "y": 98.3},  // 98 điểm
    ...
  ],
  "pitch": 1.52,
  "yaw": 4.27,
  "roll": 3.39
}
```

**Output cho VRM:**
```javascript
{
  eye: { l: -0.3, r: 0.2 },      // Pupil X position
  pupil: { x: -0.05, y: 0.1 },   // Combined pupil position
  blink: { l: 0, r: 0.1 },       // Blink value (0-1)
  brow: 0.5,                      // Eyebrow height
  mouth: {
    x: 0, y: 0,
    shape: {
      A: 0.3,  // aa - open mouth
      E: 0.5,  // ee - smile
      I: 0,    // ih
      O: 0.2,  // oh - round
      U: 0     // ou
    }
  },
  head: {
    x: 0.026, y: 0.074, z: 0.059,  // Pitch/Yaw/Roll (radians)
    width: 0.8,
    height: 1.0,
    position: { x: 0, y: 0, z: 0 }
  }
}
```

**Mapping WFLW Landmarks:**
- **Face contour:** 0-32
- **Left eyebrow:** 33-41  
- **Right eyebrow:** 42-50
- **Nose:** 51-59
- **Left eye:** 60-67 (Pupil: 96)
- **Right eye:** 68-75 (Pupil: 97)
- **Mouth:** 76-95

### 2. Thay đổi `video-call-room.tsx`

**Cũ (MediaPipe):**
- Load scripts từ CDN
- Khởi tạo Holistic + Camera
- Xử lý 468 face landmarks + pose + hands
- FPS: ~15-20

**Mới (WFLW WebSocket):**
```typescript
// Kết nối WebSocket
const ws = new WebSocket("ws://localhost:8000/ws/face-tracking")

// Gửi frame (Ping-Pong mechanism)
- Resize: 640x480 → 240x180
- JPEG quality: 0.3
- Base64 encode
- Chỉ gửi khi đã nhận xong frame trước

// Nhận kết quả
ws.onmessage = (event) => {
  const data = JSON.parse(event.data) // WFLW data
  const vrmRig = wflwToVRMRig(data, 240, 180)
  setRiggedFace(vrmRig) // Gửi tới VRMAvatar
}
```

**Features:**
- ✅ **FPS Counter** - Hiển thị real-time FPS
- ✅ **Ping-Pong** - Tránh delay tích tụ
- ✅ **Auto resize** - 240x180 trước khi gửi
- ✅ **Landmark visualization** - Vẽ 98 điểm + pupils màu đỏ

### 3. Cập nhật `VRMAvatar.jsx`

**Tắt body và hand tracking:**
```javascript
// ❌ DISABLED
// - Body pose (Pose.solve)
// - Left hand (Hand.solve)
// - Right hand (Hand.solve)
```

**Sử dụng WFLW data:**
```javascript
const riggedFaceFromContext = useVideoRecognition((state) => state.riggedFace)
useEffect(() => {
  if (riggedFaceFromContext) {
    riggedFace.current = riggedFaceFromContext
  }
}, [riggedFaceFromContext])
```

### 4. Cập nhật Zustand Store (`hooks/useVideoRecognition.js`)

```javascript
{
  videoElement: null,
  setVideoElement: (videoElement) => set({ videoElement }),
  resultsCallback: null,
  setResultsCallback: (resultsCallback) => set({ resultsCallback }),
  riggedFace: null, // ← NEW: WFLW face rig
  setRiggedFace: (riggedFace) => set({ riggedFace }), // ← NEW
}
```

## 🚀 Yêu cầu Server

### WebSocket Endpoint
```
ws://localhost:8000/ws/face-tracking
```

### Input (từ client)
```
Base64-encoded JPEG image (240x180, quality 0.3)
```

### Output (từ server)
```json
{
  "landmarks": [
    {"x": 120.5, "y": 98.3},
    ...  // 98 points
  ],
  "pitch": 1.52106656,
  "yaw": 4.27234960,
  "roll": 3.38833867
}
```

## 📊 So sánh Performance

| Metric | MediaPipe Holistic | WFLW WebSocket |
|--------|-------------------|----------------|
| **Landmarks** | 468 (face) + 33 (pose) + 42 (hands) | 98 (face only) |
| **Target FPS** | 15-20 | 25+ |
| **Network** | No | Yes (WebSocket) |
| **Model Size** | ~20MB (WASM) | Server-side |
| **Latency** | Low (local) | Depends on network |
| **Body/Hands** | ✅ Yes | ❌ No |

## 🎮 Cách sử dụng

1. **Start Backend Server:**
```bash
# Chạy server WebSocket của bạn
python your_server.py  # hoặc tương tự
```

2. **Start Frontend:**
```bash
cd my-app
npm run dev
```

3. **Test:**
- Mở http://localhost:3000
- Click nút Video để bật camera
- Xem FPS counter ở góc camera widget
- Avatar sẽ tracking khuôn mặt real-time

## 🐛 Troubleshooting

### Camera không bật
- Kiểm tra browser console
- Allow camera permissions
- Đảm bảo không app nào đang dùng camera

### WebSocket không kết nối
```bash
# Kiểm tra server đang chạy
curl http://localhost:8000/health  # nếu có health endpoint
```

### FPS thấp (<15)
- Giảm video resolution trong `getUserMedia`
- Tăng JPEG quality trong `toDataURL` (hiện tại 0.3)
- Kiểm tra server processing time

### Avatar không cử động
- Mở DevTools → Console
- Kiểm tra log: "✅ WebSocket connected"
- Kiểm tra có nhận được data: `console.log(vrmRig)`

## 📁 Files đã thay đổi

```
my-app/
├── utils/
│   └── wflwToVRM.ts          ← NEW: WFLW → VRM adapter
├── components/
│   ├── video-call-room.tsx   ← REPLACED: WebSocket tracking
│   ├── video-call-room-old.tsx ← BACKUP: MediaPipe version
│   └── VRMAvatar.jsx         ← MODIFIED: Disabled body/hands
└── hooks/
    └── useVideoRecognition.js ← MODIFIED: Added riggedFace state
```

## 🔮 Next Steps

### Cải thiện độ chính xác:
1. **Mouth shapes** - Hiện tại dùng heuristics đơn giản, cần ML model riêng
2. **Smooth interpolation** - Thêm low-pass filter cho landmarks
3. **Expression recognition** - Nhận diện cảm xúc (happy, sad, angry)

### Thêm features:
1. **Body pose** - Tích hợp body tracking model khác
2. **Hand gestures** - Tích hợp hand tracking model
3. **Recording** - Ghi lại session và replay
4. **Multi-user** - Hỗ trợ nhiều người trong room

## 📞 Contact

Nếu cần support, check:
- Server logs: `ws://localhost:8000/ws/face-tracking`
- Client console: Browser DevTools
- FPS counter: Camera widget (góc trên trái)
