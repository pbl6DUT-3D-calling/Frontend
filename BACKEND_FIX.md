# Fix Server Code

Thay thế hàm `process_frame` trong server:

```python
def process_frame(base64_string):
    """
    Xử lý base64 image từ frontend
    Frontend gửi base64 thuần (không có prefix data:image/jpeg;base64,)
    """
    try:
        # Decode Base64 sang ảnh OpenCV
        # Frontend đã strip prefix, nên decode trực tiếp
        decoded_data = base64.b64decode(base64_string)
        np_data = np.frombuffer(decoded_data, np.uint8)
        frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
        
        if frame is None:
            print("❌ Failed to decode image")
            return None

        print(f"✅ Image decoded: {frame.shape}")

        # Detect khuôn mặt (Lấy mặt to nhất)
        faces = face_detector.detect_faces(frame)
        print(f"🔍 Detected {len(faces)} faces")

        if len(faces) == 0:
            return {"found": False, "message": "No face detected"}

        target_face = max(faces, key=lambda item: item[2] * item[3])
        (x, y, w, h) = target_face
        print(f"👤 Processing face at ({x},{y}) size {w}x{h}")

        # Cắt mặt & Preprocess
        input_face = frame[y:y + h, x:x + w]
        if input_face.shape[0] == 0 or input_face.shape[1] == 0:
            print("❌ Invalid face crop")
            return None

        input_face = cv2.resize(input_face, (112, 112))
        input_face = transforms.ToTensor()(input_face).to(device)
        input_face = torch.unsqueeze(input_face, 0)

        # Inference
        with torch.no_grad():
            _, landmarks = pfld(input_face)
            landmarks = landmarks.cpu().reshape(98, 2).numpy()

            # Tính góc Euler
            _, _, euler_angles = head_pose.eular_angles_from_landmarks(
                np.copy(landmarks * (w, h)).astype(np.float64)
            )
            pitch, yaw, roll = euler_angles

            # Convert landmark về toạ độ ảnh 240x180 (size frontend gửi)
            # Vì frontend resize về 240x180 trước khi gửi
            scale_x = 240 / frame.shape[1]
            scale_y = 180 / frame.shape[0]
            
            landmarks_real = []
            for (lx, ly) in landmarks:
                real_x = (x + lx * w) * scale_x
                real_y = (y + ly * h) * scale_y
                landmarks_real.append({'x': float(real_x), 'y': float(real_y)})

            result = {
                "found": True,
                "pitch": float(pitch),
                "yaw": float(yaw),
                "roll": float(roll),
                "landmarks": landmarks_real
            }
            
            print(f"✅ Result: Pitch={pitch:.2f}, Yaw={yaw:.2f}, Roll={roll:.2f}")
            return result

    except Exception as e:
        print(f"❌ Error in process_frame: {e}")
        import traceback
        traceback.print_exc()
        return None
```

Và update WebSocket endpoint:

```python
@app.websocket("/ws/face-tracking")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ Client connected")
    
    try:
        while True:
            # Nhận dữ liệu từ Frontend (base64 thuần, không có prefix)
            base64_data = await websocket.receive_text()
            print(f"📥 Received frame: {len(base64_data)} bytes")

            # Xử lý AI
            result = process_frame(base64_data)

            if result and result.get("found"):
                # Gửi kết quả về Frontend
                await websocket.send_json(result)
                print(f"📤 Sent result with {len(result['landmarks'])} landmarks")
            else:
                await websocket.send_json({
                    "found": False,
                    "landmarks": [],
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                })
                print("⚠️ No face found, sent empty result")

    except Exception as e:
        print(f"❌ Client disconnected: {e}")
        import traceback
        traceback.print_exc()
```

## 🔧 **Những thay đổi chính:**

1. ✅ **Xóa `.split(',')[1]`** - Frontend gửi base64 thuần
2. ✅ **Thêm error handling** đầy đủ với try-catch
3. ✅ **Scale landmarks** về đúng 240x180 (size frontend)
4. ✅ **Thêm logs** để debug mỗi bước
5. ✅ **Trả về format đúng** khi không tìm thấy mặt

## 📝 **Test sau khi fix:**

Server logs sẽ hiện:
```
✅ Client connected
📥 Received frame: 2784 bytes
✅ Image decoded: (480, 640, 3)
🔍 Detected 1 faces
👤 Processing face at (x,y) size WxH
✅ Result: Pitch=1.52, Yaw=4.27, Roll=3.39
📤 Sent result with 98 landmarks
```

Frontend console sẽ hiện:
```
📨 Received data from server
🎯 Landmarks received: 98 Pitch: 1.52
⏱️ FPS: 25
```
