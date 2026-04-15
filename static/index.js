const URL = "/static/my_model/";

let model, labelContainer, maxPredictions;
let img, canvas, ctx;
let isModelLoaded = false;

// Đối tượng âm thanh
const amThanhCuu = new Audio('/static/sound/Nguy_hiem.mp3');
const amThanhTeTe = new Audio('/static/sound/Phat_hien_te_te.mp3');

// Biến trạng thái để tránh phát âm thanh lặp lại liên tục
let dangPhatCuu = false;
let dangPhatTeTe = false;

async function startIPCamera() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        isModelLoaded = true;

        img = document.getElementById("ipcam");
        canvas = document.getElementById("canvas");
        ctx = canvas.getContext("2d");

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        loop();
    } catch (error) {
        console.error("Không thể tải mô hình:", error);
    }
}

async function loop() {
    if (isModelLoaded) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        await predict();
    }
    requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(canvas);

    for (let i = 0; i < maxPredictions; i++) {
        const prob = prediction[i].probability.toFixed(2); // Lấy 2 chữ số thập phân
        const name = prediction[i].className;
        let text = "";

        if (name === "TeTe" && prob > 0.8) { // Tăng độ tin tưởng lên 0.8 để chính xác hơn
            text = `🟢 Phát hiện tê tê (${(prob * 100)}%)`;
            playAudioOnce('tete');
        } 
        else if (name === "Nguy hiem" && prob > 0.8) {
            text = `🚨 CẢNH BÁO: Tê tê gặp nạn! (${(prob * 100)}%)`;
            playAudioOnce('nguyhiem');
        } 
        else {
            text = "";
            resetAudioState(name); // Reset trạng thái khi không còn phát hiện
        }

        // Chỉ cập nhật nếu nội dung thay đổi để tiết kiệm CPU
        if (labelContainer.childNodes[i].innerHTML !== text) {
            labelContainer.childNodes[i].innerHTML = text;
        }
    }
}

// Hàm phát âm thanh thông minh: Chỉ phát khi âm thanh trước đó đã kết thúc
function playAudioOnce(type) {
    if (type === 'tete' && !dangPhatTeTe) {
        dangPhatTeTe = true;
        amThanhTeTe.play().catch(e => console.log("Chờ người dùng tương tác để phát nhạc"));
        amThanhTeTe.onended = () => { dangPhatTeTe = false; };
    } 
    else if (type === 'nguyhiem' && !dangPhatCuu) {
        dangPhatCuu = true;
        amThanhCuu.play().catch(e => console.log("Chờ người dùng tương tác để phát nhạc"));
        amThanhCuu.onended = () => { dangPhatCuu = false; };
    }
}

function resetAudioState(name) {
    // Tùy chọn: Có thể dừng nhạc ngay lập tức nếu AI không còn thấy đối tượng
}

// Yêu cầu người dùng Click vào trang web để kích hoạt quyền phát âm thanh
window.addEventListener("click", () => {
    console.log("Âm thanh đã sẵn sàng");
}, { once: true });

window.addEventListener("DOMContentLoaded", startIPCamera);