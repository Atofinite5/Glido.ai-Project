import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = url && serviceKey && !url.includes('your_supabase_url');

let client;
if (isConfigured) {
  client = createClient(url, serviceKey);
  console.log('  \u2713 Connected to Supabase');
} else {
  client = db;
  console.log('  \u26a0 Supabase not configured — using local file storage instead');
}

export const supabase = client;
