import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class PatientsService {
  private supabase;

constructor() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  }

  this.supabase = createClient(url, key);
}

  async getAllPatients() {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('deleted', false);

    if (error) throw new Error(error.message);
    return data;
  }

  async getPatientById(id: string) {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async createPatient(dto: {
    fullName: string;
    birthDate?: string;
    nationalId?: string;
  }) {
    const { data, error } = await this.supabase
      .from('patients')
      .insert([dto])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updatePatient(id: string, dto: any) {
    const { data, error } = await this.supabase
      .from('patients')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}