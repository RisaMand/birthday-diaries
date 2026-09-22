import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { command, rawInput } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // 1. Log command into PostgreSQL database
  try {
    await supabase.from('audit_logs').insert([
      { command: rawInput, ip_address: clientIp }
    ]);
  } catch (err) {
    console.error("DB Log Error:", err);
  }

  // 2. Handle Backend-Driven Commands
  const lower = command.toLowerCase();
  const parts = rawInput.trim().split(/\s+/);

  if (lower === 'ping') {
    return res.status(200).json({
      output: [
        'PING api.shresth22.internal (127.0.0.1): 56 data bytes',
        '64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.42 ms',
        '64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.38 ms',
        '--- api.shresth22.internal ping statistics ---',
        '2 packets transmitted, 2 packets received, 0.0% packet loss'
      ].join('\n')
    });
  }

  if (lower === 'audit') {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('command, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const lines = (logs || []).map(l => `[${l.created_at.slice(11,19)}] ${l.command}`);
    return res.status(200).json({ output: ['[RECENT SERVER AUDIT TRAIL]', ...lines].join('\n') });
  }

  if (parts[0].toLowerCase() === 'cat' && parts[1] === 'secret_2026.txt') {
    const { data } = await supabase
      .from('server_files')
      .select('content')
      .eq('filename', 'secret_2026.txt')
      .single();

    return res.status(200).json({ output: data ? data.content : 'file not found' });
  }

  // Fallback: Let frontend handle standard static commands (whoami, log, neofetch, etc.)
  return res.status(200).json({ passThrough: true });
}