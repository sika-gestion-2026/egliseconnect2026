const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ufvyihctwithnvrhxeec.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdnlpY2h0d2l0aG52cmh4ZWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0MDM4NTUsImV4cCI6MjA0MDAwMzg1NX0.21YjT5l497oF5x1P6U8eEaIe3O_J7vR8sC7H4N8GkEo');

async function run() {
  const email = 'testpastor_' + Date.now() + '@example.com';
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  console.log('Signup result:', JSON.stringify(data, null, 2));
  console.log('Signup error:', error);
}
run();
