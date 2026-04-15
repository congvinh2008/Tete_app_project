   // Import Firebase
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { 
      getAuth, 
      createUserWithEmailAndPassword, 
      signInWithEmailAndPassword,
      signOut 
    } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

    // DÁN CONFIG CỦA BẠN VÀO ĐÂY
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      appId: "YOUR_APP_ID"
    };

    // Khởi tạo Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Đăng ký
    window.register = function() {
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;

      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          alert("Đăng ký thành công!");
        })
        .catch((error) => {
          alert(error.message);
        });
    }

    // Đăng nhập
    window.login = function() {
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          alert("Đăng nhập thành công!");
        })
        .catch((error) => {
          alert(error.message);
        });
    }

    // Đăng xuất
    window.logout = function() {
      signOut(auth)
        .then(() => {
          alert("Đăng xuất thành công!");
        })
        .catch((error) => {
          alert(error.message);
        });
    }