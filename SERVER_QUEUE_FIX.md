# Fix Server Queue Tích Lũy - KHẨN CẤP

## 🚨 Vấn đề hiện tại

**Triệu chứng:**
- Tắt camera → 10 giây sau server mới ngừng xử lý
- Delay tích lũy theo thời gian
- Landmarks di chuyển chậm 4-5 giây

**Nguyên nhân:** Server đang xử lý **FIFO queue** - frames cũ chưa xử lý xong đã nhận frames mới.

```
Frame 1 gửi → Server đang xử lý (200ms)
Frame 2 gửi → Queue +1
Frame 3 gửi → Queue +2
Frame 4 gửi → Queue +3
...
Frame 50 gửi → Queue +49

→ Khi tắt camera, server vẫn có 49 frames chưa xử lý!
```

---

## ✅ Giải pháp: Drop Old Frames

Thay vì xử lý FIFO queue, chỉ xử lý **frame MỚI NHẤT**.

---

## 🔧 Fix Code Server Python

### **Cách 1: Dùng asyncio.Queue với maxsize=1**

```python
import asyncio
from fastapi import WebSocket

# Tạo queue chỉ giữ 1 frame
frame_queue = asyncio.Queue(maxsize=1)

@app.websocket("/ws/face-tracking")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    async def receive_frames():
        """Task nhận frames từ client"""
        try:
            while True:
                base64_data = await websocket.receive_text()
                
                # Nếu queue đầy, DROP frame cũ
                if frame_queue.full():
                    try:
                        frame_queue.get_nowait()  # Xóa frame cũ
                    except:
                        pass
                
                # Thêm frame mới
                await frame_queue.put(base64_data)
                
        except Exception as e:
            print(f"❌ Receive error: {e}")
    
    async def process_frames():
        """Task xử lý frames"""
        try:
            while True:
                # Lấy frame mới nhất
                base64_data = await frame_queue.get()
                
                # Xử lý AI
                result = process_frame(base64_data)
                
                if result and result.get("found"):
                    await websocket.send_json(result)
                else:
                    await websocket.send_json({
                        "found": False,
                        "landmarks": [],
                        "pitch": 0,
                        "yaw": 0,
                        "roll": 0
                    })
                    
        except Exception as e:
            print(f"❌ Process error: {e}")
    
    # Chạy song song 2 tasks
    await asyncio.gather(
        receive_frames(),
        process_frames()
    )
```

---

### **Cách 2: Đơn giản hơn - Biến global**

```python
from fastapi import WebSocket
import asyncio

# Biến global lưu frame mới nhất
latest_frame = None
frame_lock = asyncio.Lock()

@app.websocket("/ws/face-tracking")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    global latest_frame
    
    async def receive_frames():
        """Nhận và cập nhật frame mới nhất"""
        global latest_frame
        try:
            while True:
                base64_data = await websocket.receive_text()
                
                # Cập nhật frame mới nhất (drop frame cũ)
                async with frame_lock:
                    latest_frame = base64_data
                    
        except Exception as e:
            print(f"❌ Receive stopped: {e}")
            latest_frame = None
    
    async def process_frames():
        """Xử lý frame mới nhất"""
        global latest_frame
        try:
            while True:
                # Đợi có frame
                if latest_frame is None:
                    await asyncio.sleep(0.01)
                    continue
                
                # Lấy frame
                async with frame_lock:
                    frame_to_process = latest_frame
                    latest_frame = None  # Đánh dấu đã xử lý
                
                # Xử lý AI (không block)
                result = process_frame(frame_to_process)
                
                if result and result.get("found"):
                    await websocket.send_json(result)
                else:
                    await websocket.send_json({
                        "found": False,
                        "landmarks": [],
                        "pitch": 0,
                        "yaw": 0,
                        "roll": 0
                    })
                    
        except Exception as e:
            print(f"❌ Process stopped: {e}")
    
    # Chạy song song
    try:
        await asyncio.gather(
            receive_frames(),
            process_frames()
        )
    except Exception as e:
        print(f"❌ Connection closed: {e}")
```

---

### **Cách 3: Đơn giản nhất - Skip nếu đang xử lý**

```python
from fastapi import WebSocket

@app.websocket("/ws/face-tracking")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    is_processing = False
    
    try:
        while True:
            # Nhận frame
            base64_data = await websocket.receive_text()
            
            # NẾU ĐANG XỬ LÝ → SKIP frame này
            if is_processing:
                print("⏭️ Skipping frame (server busy)")
                continue
            
            is_processing = True
            
            # Xử lý AI
            result = process_frame(base64_data)
            
            if result and result.get("found"):
                await websocket.send_json(result)
            else:
                await websocket.send_json({
                    "found": False,
                    "landmarks": [],
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                })
            
            is_processing = False
            
    except Exception as e:
        print(f"❌ Client disconnected: {e}")
```

---

## 📊 So sánh các cách

| Cách | Ưu điểm | Nhược điểm | Độ khó |
|------|---------|-----------|--------|
| **Cách 1: Queue maxsize=1** | Chính xác, không mất frames | Phức tạp | ⭐⭐⭐ |
| **Cách 2: Global variable** | Dễ hiểu, linh hoạt | Cần lock | ⭐⭐ |
| **Cách 3: Skip flag** | ĐƠN GIẢN NHẤT | Mất frames nếu gửi nhanh | ⭐ |

**→ KHUYẾN NGHỊ: Dùng Cách 3 (skip flag) để test nhanh**

---

## 🧪 Test sau khi fix

1. Bật camera → Xem FPS ổn định
2. Di chuyển đầu → Delay < 200ms
3. **TẮT CAMERA** → Server dừng NGAY LẬP TỨC (không còn log)

Console server sẽ hiện:
```
📥 Received frame
⏭️ Skipping frame (server busy)
⏭️ Skipping frame (server busy)
📤 Sent result
📥 Received frame
📤 Sent result
❌ Client disconnected  ← TẮT CAMERA → DỪNG NGAY
```

---

## 🚀 Bonus: Monitor queue depth

Nếu dùng Cách 1, thêm monitoring:

```python
@app.websocket("/ws/face-tracking")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    frame_count = 0
    
    async def receive_frames():
        nonlocal frame_count
        while True:
            base64_data = await websocket.receive_text()
            frame_count += 1
            
            if frame_queue.full():
                try:
                    frame_queue.get_nowait()
                    print(f"🗑️ Dropped old frame (queue full)")
                except:
                    pass
            
            await frame_queue.put(base64_data)
            
            # Log mỗi 100 frames
            if frame_count % 100 == 0:
                print(f"📊 Received {frame_count} frames, Queue size: {frame_queue.qsize()}")
```

---

## ⚠️ Lưu ý quan trọng

1. **Không dùng `while True` đồng bộ** - Dùng `async/await`
2. **Không `time.sleep()`** - Dùng `await asyncio.sleep()`
3. **Đóng WebSocket đúng cách** - Check connection state
4. **Monitor CPU** - Nếu 100% → Cần tối ưu model inference

---

## 🎯 Kết quả mong đợi

**Trước:**
- Tắt camera → 10s sau mới dừng
- Queue tích lũy 50-100 frames
- Delay tăng dần theo thời gian

**Sau:**
- Tắt camera → Dừng NGAY (<0.5s)
- Queue luôn 0-1 frames
- Delay ổn định ~100-200ms
