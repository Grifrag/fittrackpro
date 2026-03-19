-- Migration 001: Add UNIQUE constraint on progress_logs(user_id, log_date)
ALTER TABLE progress_logs
  ADD CONSTRAINT progress_logs_user_date_unique
  UNIQUE (user_id, log_date);
