// ========================================
// AI Blender Script Generator
// Dựa trên gptBLEND + Arcanea UI
// ========================================

const chatArea = document.getElementById('chatArea');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const scriptOutput = document.getElementById('scriptOutput');
const outputPanel = document.getElementById('outputPanel');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const keyBtn = document.getElementById('keyBtn');
const keyPanel = document.getElementById('keyPanel');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const modelSelect = document.getElementById('modelSelect');

// ========================================
// Quản lý API Key (BYOK - Bring Your Own Key)
// ========================================
function getApiKey() {
    return localStorage.getItem('openai_key') || '';
}

function saveApiKey(key) {
    localStorage.setItem('openai_key', key);
}

keyBtn.addEventListener('click', () => {
    keyPanel.classList.toggle('active');
    apiKeyInput.value = getApiKey();
});

saveKeyBtn.addEventListener('click', () => {
    saveApiKey(apiKeyInput.value.trim());
    keyPanel.classList.remove('active');
    addMessage('ai', '✅ API Key đã được lưu! Bây giờ bạn có thể mô tả mô hình 3D.');
});

// ========================================
// Giao diện chat
// ========================================
function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `message ${role}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'ai' ? '✦' : '👤';
    
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    
    msg.appendChild(avatar);
    msg.appendChild(bubble);
    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// ========================================
// System Prompt - Hướng dẫn AI sinh script Blender
// ========================================
const SYSTEM_PROMPT = `Bạn là chuyên gia Blender Python. Nhiệm vụ: sinh script Python hoàn chỉnh (bpy) từ mô tả tiếng Việt.

QUY TẮC BẮT BUỘC:
1. Chỉ trả về CODE PYTHON, không giải thích, không markdown.
2. Script phải chạy được trong Blender 3.0+.
3. Bọc toàn bộ code trong try/except để tránh crash Blender.
4. Bắt đầu bằng xóa scene cũ: bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
5. Tạo vật liệu (material) cho mỗi object.
6. Thêm camera và ánh sáng (light) đầy đủ.
7. In thông báo "✅ Hoàn thành!" ở cuối.

Cấu trúc mẫu:
import bpy
import math

try:
    # Xóa scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # Tạo vật liệu
    def create_mat(name, color, metallic=0.0, roughness=0.5):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        return mat
    
    # [CODE TẠO MÔ HÌNH Ở ĐÂY]
    
    # Camera & Light
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
    bpy.ops.object.camera_add(location=(7, -7, 5))
    bpy.context.scene.camera = bpy.context.active_object
    bpy.context.active_object.rotation_euler = (math.radians(60), 0, math.radians(45))
    
    print("✅ Hoàn thành!")
    
except Exception as e:
    print(f"❌ Lỗi: {e}")`;

// ========================================
// Gọi OpenAI API
// ========================================
async function generateScript(prompt) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Chưa có API Key. Nhấn nút 🔑 ở góc trên để nhập.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelSelect.value,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API lỗi ${response.status}`);
    }

    const data = await response.json();
    let script = data.choices[0].message.content.trim();
    
    // Loại bỏ markdown code block nếu có
    script = script.replace(/^```python\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    
    return script;
}

// ========================================
// Xử lý gửi
// ========================================
sendBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        alert('Vui lòng nhập mô tả mô hình!');
        return;
    }

    // Hiển thị tin nhắn user
    addMessage('user', prompt);
    promptInput.value = '';
    
    // Disable nút
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span>⏳ Đang tạo...</span>';

    try {
        const script = await generateScript(prompt);
        
        // Hiển thị output
        scriptOutput.textContent = script;
        outputPanel.classList.add('active');
        
        addMessage('ai', '✅ Đã sinh script thành công! Bạn có thể sao chép hoặc tải xuống bên dưới.');
        
    } catch (error) {
        addMessage('ai', `❌ Lỗi: ${error.message}`);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>Tạo Script</span><span class="arrow">→</span>';
    }
});

// Enter để gửi (Shift+Enter xuống dòng)
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// ========================================
// Copy & Download
// ========================================
copyBtn.addEventListener('click', () => {
    const text = scriptOutput.textContent;
    if (!text || text.includes('Script sẽ xuất hiện')) {
        alert('Chưa có script để sao chép!');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✅ Đã chép!';
        setTimeout(() => copyBtn.textContent = '📋 Sao chép', 2000);
    });
});

downloadBtn.addEventListener('click', () => {
    const text = scriptOutput.textContent;
    if (!text || text.includes('Script sẽ xuất hiện')) {
        alert('Chưa có script để tải!');
        return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blender_script.py';
    a.click();
    URL.revokeObjectURL(url);
});

// ========================================
// Khởi động
// ========================================
if (getApiKey()) {
    keyPanel.classList.remove('active');
} else {
    keyPanel.classList.add('active');
}
