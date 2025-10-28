// src/renderer/login.js
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const goToRegisterLink = document.getElementById('go-to-register');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    // Usa a função exposta pelo preload.js
    const { data, error } = await window.api.login(email, password);

    if (error) {
        errorMessage.textContent = `Erro: ${error.message}`;
        return;
    }

    if (data.user) {
        // Login bem-sucedido! Notifica o processo principal.
        window.api.notifyLoginSuccess(data);
    }
});

goToRegisterLink.addEventListener('click', () => {
    window.api.send('open-register-window');
});
