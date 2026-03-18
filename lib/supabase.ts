import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nzalcauiiggdonxtrdax.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56YWxjYXVpaWdnZG9ueHRyZGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NjA0NTYsImV4cCI6MjA4MjEzNjQ1Nn0.ZaSKINHBX26IllOXdr5e_XNCu6V6R6sWnHsl_1dw68U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
