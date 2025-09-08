import dotenv from 'dotenv';
import path from 'path';

// Carrega o arquivo .env da raiz do projeto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
    port: process.env.PORT || 3001,
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
};

export default config;