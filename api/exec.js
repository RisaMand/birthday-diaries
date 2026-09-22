import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ output: null });
  }

  const { command, rawInput } = req.body || {};
  if (!command) return res.status(400).json({ output: null });

  try {
    if (command === 'ping') {
      return res.status(200).json({ output: 'pong. backend is live, not just decoration.' });
    }

    if (command === 'reply') {
      const message = (rawInput || '').replace(/^reply\s+/i, '').replace(/^"|"$/g, '').trim();
      if (!message) {
        return res.status(200).json({ output: 'usage: reply "your message here"' });
      }
      const { error } = await supabase.from('replies').insert({ message });
      if (error) throw error;
      return res.status(200).json({ output: 'sent. — logged, not lost.' });
    }

    if (command === 'cat') {
      const key = (rawInput || '').split(/\s+/)[1];
      if (key) {
        const { data } = await supabase
          .from('content')
          .select('value')
          .eq('key', key)
          .single();
        if (data) return res.status(200).json({ output: data.value });
      }
      return res.status(200).json({ output: null });
    }

    return res.status(200).json({ output: null });
  } catch (err) {
    return res.status(200).json({ output: null });
  }
}