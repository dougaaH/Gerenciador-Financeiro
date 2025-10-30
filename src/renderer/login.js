document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const messageEl = document.getElementById('message');
    const goToRegisterLink = document.getElementById('go-to-register');
    const closeWindowBtn = document.getElementById('close-window-btn');

    // 1. Preencher o e-mail se estiver salvo
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
    }

    // 2. Lógica de submit do formulário
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = ''; // Limpa mensagens de erro

        const email = emailInput.value;
        const password = passwordInput.value;

        const { data, error } = await window.api.login(email, password);

        if (error) {
            messageEl.textContent = 'E-mail ou senha inválidos.';
            return;
        }

        // 3. Salvar ou remover o e-mail com base no checkbox
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        // Notifica o processo principal sobre o sucesso
        window.api.notifyLoginSuccess(data);
    });

    // Navegação
    goToRegisterLink.addEventListener('click', () => window.api.send('open-register-window'));
    closeWindowBtn.addEventListener('click', () => window.api.closeWindow());
});