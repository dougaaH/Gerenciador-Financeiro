// src/renderer/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message');
    const goToRegisterLink = document.getElementById('go-to-register');
    const exitAppBtn = document.getElementById('exit-app-btn');

    if (goToRegisterLink) {
        goToRegisterLink.addEventListener('click', (event) => {
            event.preventDefault();
            window.api.send('open-register-window');
        });
    }

    if (exitAppBtn) {
        exitAppBtn.addEventListener('click', () => {
            window.api.quitApp();
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;

            messageDiv.textContent = '';

            const { data, error } = await window.api.login(email, password);

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    messageDiv.textContent = 'Por favor, confirme seu cadastro no e-mail que enviamos para você.';
                } else {
                    messageDiv.textContent = 'E-mail ou senha inválidos.';
                }
            } else if (data.user) {
                window.api.notifyLoginSuccess(data);
            }
        });
    }
});