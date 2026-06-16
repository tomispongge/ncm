import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
);

export default async (req: any, res: any) => {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('deleted', false);

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};