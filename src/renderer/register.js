// src/renderer/register.js

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message');
    const goToLoginLink = document.getElementById('go-to-login');
    const exitAppBtn = document.getElementById('exit-app-btn');

    // Lógica para o botão "Já tem uma conta? Faça login"
    if (goToLoginLink) {
        goToLoginLink.addEventListener('click', (event) => {
            event.preventDefault(); // Previne o comportamento padrão do link
            window.api.send('open-login-window'); // Envia mensagem para o main process
        });
    }

    // Lógica para o botão "Sair"
    if (exitAppBtn) {
        exitAppBtn.addEventListener('click', () => {
            window.api.quitApp(); // Envia mensagem para o main process para fechar o app
        });
    }

    // Lógica para o formulário de registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = emailInput.value;
            const password = passwordInput.value;

            messageDiv.textContent = ''; // Limpa mensagens anteriores

            const { data, error } = await window.api.register(email, password);

            if (error) {
                messageDiv.textContent = `Erro ao cadastrar: ${error.message}`;
                messageDiv.style.color = 'red';
            } else if (data.user) {
                messageDiv.textContent = 'Cadastro realizado com sucesso! Redirecionando para o login...';
                messageDiv.style.color = 'green';
                setTimeout(() => window.api.send('open-login-window'), 2000); // Redireciona após 2 segundos
            }
        });
    }
});
