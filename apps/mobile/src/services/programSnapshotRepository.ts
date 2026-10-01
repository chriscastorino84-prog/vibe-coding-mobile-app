import { repositoryOperation, type RepositoryResult } from './repositoryResult';
import { getSupabaseClient } from './supabase';
import type { ProgramAggregateMetric, ProgramCycleSnapshot } from '../domain/types';

type SnapshotRow = {
  id: string;
  enrollment_id: string;
  program_version_id: string;
  completed_at: string;
  dashboard_config: Record<string, unknown>;
};

type SnapshotMetricRow = {
  metric_key: string;
  numeric_value: number | null;
  text_value: string | null;
  unit: string | null;
};

function mapSnapshot(row: SnapshotRow, metrics: SnapshotMetricRow[]): ProgramCycleSnapshot {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    programVersionId: row.program_version_id,
    completedAt: row.completed_at,
    dashboardConfig: row.dashboard_config,
    metrics: metrics.map((metric) => ({
      metricKey: metric.metric_key,
      ...(metric.numeric_value === null ? {} : { numericValue: metric.numeric_value }),
      ...(metric.text_value === null ? {} : { textValue: metric.text_value }),
      ...(metric.unit === null ? {} : { unit: metric.unit }),
    })),
  };
}

export async function completeProgramEnrollment(enrollmentId: string): Promise<RepositoryResult<string>> {
  return repositoryOperation('Complete program and create archive snapshot', async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('complete_program_enrollment', {
      p_enrollment_id: enrollmentId,
    });
    if (error) throw error;
    if (typeof data !== 'string') throw new Error('Program completion did not return an archive snapshot ID.');
    return data;
  });
}

export async function loadProgramCycleSnapshot(snapshotId: string): Promise<RepositoryResult<ProgramCycleSnapshot>> {
  return repositoryOperation('Load program archive snapshot', async () => {
    const client = getSupabaseClient();
    const { data: snapshot, error: snapshotError } = await client
      .from('program_cycle_snapshots')
      .select('id, enrollment_id, program_version_id, completed_at, dashboard_config')
      .eq('id', snapshotId)
      .single();
    if (snapshotError) throw snapshotError;

    const { data: metrics, error: metricsError } = await client
      .from('program_cycle_snapshot_metrics')
      .select('metric_key, numeric_value, text_value, unit')
      .eq('snapshot_id', snapshotId)
      .order('metric_key');
    if (metricsError) throw metricsError;
    return mapSnapshot(snapshot as SnapshotRow, (metrics ?? []) as SnapshotMetricRow[]);
  });
}

export async function loadProgramAggregateMetrics(
  programVersionId: string,
): Promise<RepositoryResult<ProgramAggregateMetric[]>> {
  return repositoryOperation('Load aggregate program analytics', async () => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('program_aggregate_metrics')
      .select('program_version_id, metric_key, aggregation_period_start, aggregation_period_end, participant_count, numeric_value, percentage_value')
      .eq('program_version_id', programVersionId)
      .order('aggregation_period_end', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      programVersionId: row.program_version_id,
      metricKey: row.metric_key,
      periodStart: row.aggregation_period_start,
      periodEnd: row.aggregation_period_end,
      participantCount: row.participant_count,
      ...(row.numeric_value === null ? {} : { numericValue: row.numeric_value }),
      ...(row.percentage_value === null ? {} : { percentageValue: row.percentage_value }),
    }));
  });
}
