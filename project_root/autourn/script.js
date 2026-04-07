const regForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const showReg = document.getElementById("show-register");
const showLog = document.getElementById("show-login");

// Toggle forms
showReg.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.add("hidden");
  regForm.classList.remove("hidden");
  clearAllFieldErrors(loginForm);
});

showLog.addEventListener("click", (e) => {
  e.preventDefault();
  regForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  clearAllFieldErrors(regForm);
});

// Fade in
window.addEventListener("load", () => {
  document.querySelectorAll(".fade-in-element").forEach(el => el.classList.add("visible"));
});

// Login form submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllFieldErrors(loginForm);

  const inputs = loginForm.querySelectorAll("input");
  const email = inputs[0].value.trim();
  const password = inputs[1].value;

  let hasError = false;
  if (!email) {
    showFieldError(inputs[0], 'Введите email');
    hasError = true;
  }
  if (!password) {
    showFieldError(inputs[1], 'Введите пароль');
    hasError = true;
  }
  if (hasError) return;

  try {
    const res = await api('auth.login', {
      method: 'POST',
      body: { email, password }
    });

    if (res.success) {
      showToast('Вход выполнен!');
      setTimeout(() => {
        window.location.href = '../profile/index.html';
      }, 1000);
    } else {
      showToast(res.error || 'Ошибка входа', 'error');
    }
  } catch (err) {
    showToast('Ошибка соединения с сервером', 'error');
  }
});

// Register form submit
regForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllFieldErrors(regForm);

  const inputs = regForm.querySelectorAll("input");
  const username = inputs[0].value.trim();
  const email = inputs[1].value.trim();
  const password = inputs[2].value;

  let hasError = false;
  if (!username) {
    showFieldError(inputs[0], 'Введите имя пользователя');
    hasError = true;
  }
  if (!email) {
    showFieldError(inputs[1], 'Введите email');
    hasError = true;
  }
  if (!password) {
    showFieldError(inputs[2], 'Введите пароль');
    hasError = true;
  } else if (password.length < 6) {
    showFieldError(inputs[2], 'Минимум 6 символов');
    hasError = true;
  }
  if (hasError) return;

  try {
    const res = await api('auth.register', {
      method: 'POST',
      body: { username, email, password }
    });

    if (res.success) {
      showToast('Регистрация прошла успешно!');
      setTimeout(() => {
        window.location.href = '../profile/index.html';
      }, 1000);
    } else {
      showToast(res.error || 'Ошибка регистрации', 'error');
    }
  } catch (err) {
    showToast('Ошибка соединения с сервером', 'error');
  }
});

// Clear errors on input
document.querySelectorAll('.auth-form input').forEach(input => {
  input.addEventListener('input', () => clearFieldError(input));
});
