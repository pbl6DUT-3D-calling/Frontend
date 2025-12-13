# Tối ưu Server Python để giảm latency

## 🐛 Vấn đề hiện tại
- **Latency: 4-5 giây** (không chấp nhận được!)
- Landmark di chuyển chậm trễ
- Model 3D lag nghiêm trọng

## 🎯 Mục tiêu
- **Latency < 100ms** (realtime)
- FPS ổn định 20-25 FPS

---

## ✅ Fix 1: Giảm resolution ảnh

Frontend đã giảm từ 240x180 → **160x120**, server cần update scale:

```python
def process_frame(base64_string):
    try:
        decoded_data = base64.b64decode(base64_string)
        np_data = np.frombuffer(decoded_data, np.uint8)
        frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
        
        if frame is None:
            return None

        # UPDATE: Scale landmarks về 160x120 (thay vì 240x180)
        scale_x = 160 / frame.shape[1]  # ← ĐỔI TỪ 240
        scale_y = 120 / frame.shape[0]  # ← ĐỔI TỪ 180
        
        # ... phần xử lý AI ...
        
        landmarks_real = []
        for (lx, ly) in landmarks:
            real_x = (x + lx * w) * scale_x
            real_y = (y + ly * h) * scale_y
            landmarks_real.append({'x': float(real_x), 'y': float(real_y)})
```

---

## ✅ Fix 2: Tắt logs không cần thiết

```python
def process_frame(base64_string):
    try:
        decoded_data = base64.b64decode(base64_string)
        np_data = np.frombuffer(decoded_data, np.uint8)
        frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
        
        # ❌ XÓA TẤT CẢ PRINT DEBUG
        # print(f"✅ Image decoded: {frame.shape}")
        # print(f"🔍 Detected {len(faces)} faces")
        # print(f"👤 Processing face at ({x},{y}) size {w}x{h}")
        # print(f"✅ Result: Pitch={pitch:.2f}, Yaw={yaw:.2f}, Roll={roll:.2f}")
        
        # CHỈ GIỮ print khi lỗi
        if frame is None:
            print("❌ Failed to decode image")
            return None
            
        # ... xử lý ...
        
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None
```

---

## ✅ Fix 3: Tối ưu WebSocket handler

```python
@app.websocket("/ws/face-tracking")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Nhận dữ liệu
            base64_data = await websocket.receive_text()
            
            # ❌ XÓA LOG
            # print(f"📥 Received frame: {len(base64_data)} bytes")
            
            # Xử lý AI
            result = process_frame(base64_data)

            if result and result.get("found"):
                # Gửi ngay lập tức
                await websocket.send_json(result)
                
                # ❌ XÓA LOG
                # print(f"📤 Sent result with {len(result['landmarks'])} landmarks")
            else:
                # Gửi empty result nhanh
                await websocket.send_json({
                    "found": False,
                    "landmarks": [],
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                })

    except Exception as e:
        print(f"❌ Client disconnected: {e}")
```

---

## ✅ Fix 4: Tối ưu Face Detection

```python
# Giảm face detection size để tăng tốc
def process_frame(base64_string):
    try:
        decoded_data = base64.b64decode(base64_string)
        np_data = np.frombuffer(decoded_data, np.uint8)
        frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
        
        if frame is None:
            return None

        # RESIZE FRAME nhỏ hơn để detect nhanh hơn
        detection_frame = cv2.resize(frame, (160, 120))
        faces = face_detector.detect_faces(detection_frame)

        if len(faces) == 0:
            return {"found": False}

        # Scale face bounds về frame gốc
        target_face = max(faces, key=lambda item: item[2] * item[3])
        scale_x = frame.shape[1] / 160
        scale_y = frame.shape[0] / 120
        
        x = int(target_face[0] * scale_x)
        y = int(target_face[1] * scale_y)
        w = int(target_face[2] * scale_x)
        h = int(target_face[3] * scale_y)
        
        # Cắt mặt từ frame gốc
        input_face = frame[y:y + h, x:x + w]
        # ... tiếp tục xử lý ...
```

---

## ✅ Fix 5: Cache model và warm-up

```python
import time

# Load models 1 lần duy nhất khi start server
print("🔄 Loading models...")
face_detector = ...
pfld = ...
head_pose = ...
print("✅ Models loaded")

# WARM-UP: Chạy 1 lần để models load vào GPU/RAM
dummy_frame = np.zeros((112, 112, 3), dtype=np.uint8)
dummy_tensor = transforms.ToTensor()(dummy_frame).to(device)
dummy_tensor = torch.unsqueeze(dummy_tensor, 0)
with torch.no_grad():
    _, _ = pfld(dummy_tensor)
print("✅ Models warmed up")

# Bây giờ mới start server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## ✅ Fix 6: Thêm timing để đo performance

```python
def process_frame(base64_string):
    start_time = time.time()
    
    try:
        # Decode (đo thời gian)
        t1 = time.time()
        decoded_data = base64.b64decode(base64_string)
        np_data = np.frombuffer(decoded_data, np.uint8)
        frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
        decode_time = (time.time() - t1) * 1000
        
        # Face detection (đo thời gian)
        t2 = time.time()
        faces = face_detector.detect_faces(frame)
        detect_time = (time.time() - t2) * 1000
        
        # AI inference (đo thời gian)
        t3 = time.time()
        _, landmarks = pfld(input_face)
        inference_time = (time.time() - t3) * 1000
        
        total_time = (time.time() - start_time) * 1000
        
        # Log chỉ khi > 100ms
        if total_time > 100:
            print(f"⚠️ SLOW: Total={total_time:.1f}ms (Decode={decode_time:.1f}ms, Detect={detect_time:.1f}ms, Infer={inference_time:.1f}ms)")
        
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None
```

---

## 📊 Kết quả mong đợi

**Trước:**
- Decode: ~50ms
- Face detect: ~100-200ms ← **CHAI CỔ BÌNH**
- Inference: ~20-30ms
- **Total: ~200-300ms** (chưa kể network)

**Sau:**
- Decode: ~20ms (160x120 nhỏ hơn)
- Face detect: ~30-50ms (resize nhỏ)
- Inference: ~20-30ms
- **Total: ~70-100ms**

**Network latency:**
- Localhost: ~5-10ms
- **TỔNG END-TO-END: ~80-110ms** ✅

---

## 🚀 Checklist

- [ ] Update scale landmarks: 240x180 → 160x120
- [ ] Xóa tất cả `print()` debug
- [ ] Resize frame trước face detection
- [ ] Warm-up models khi start server
- [ ] Thêm timing để monitor performance
- [ ] Test latency < 100ms

---

## 🧪 Test sau khi fix

Frontend console sẽ hiện:
```
⏱️ FPS: 24 | Latency: 85ms
⏱️ FPS: 25 | Latency: 78ms
⏱️ FPS: 23 | Latency: 92ms
```

**Nếu vẫn > 200ms:**
1. Check CPU usage → Nếu 100%, cần GPU
2. Check `face_detector.detect_faces()` → Có thể thay bằng MTCNN hoặc YuNet (nhanh hơn)
3. Check model inference → Có thể dùng TensorRT hoặc ONNX Runtime
