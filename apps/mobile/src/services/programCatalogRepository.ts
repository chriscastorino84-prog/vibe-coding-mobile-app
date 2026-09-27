import { repositoryOperation } from './repositoryResult';
import { getSupabaseClient } from './supabase';

export function loadPublishedPrograms(productKey?: string) {
  return repositoryOperation('Load published programs', async () => {
    const client = getSupabaseClient();
    let query = client.from('programs')
      .select('id, product_key, name, description, program_versions(id, version_number, duration_weeks, training_days_per_week, progression_method, progression_value, program_schedule_rows(id, exercise_id, week_number, day_number, exercise_order, progression_method, progression_value, sets, reps, prescribed_percent))')
      .eq('status', 'published');

    if (productKey) query = query.eq('product_key', productKey);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });
}
