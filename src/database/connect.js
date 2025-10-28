// src/database/connect.js
const { createClient } = require('@supabase/supabase-js');

// As variáveis agora vêm do arquivo .env, carregado no main.js
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
