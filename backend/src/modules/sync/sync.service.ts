import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SyncService {
  private supabase;

constructor() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  }

  this.supabase = createClient(url, key);
}

  async pullChanges(cursor: string) {
    // Por ahora, retorna dummy data
    return {
      changes: [],
      newCursor: Date.now().toString(),
    };
  }

  async pushChanges(changes: any[], userId: string) {
    // Por ahora, solo retorna ok
    return { ok: true };
  }
}