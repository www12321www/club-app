-- Deleting an event should not be blocked by existing point_logs rows;
-- just detach them (keep the points history, drop the event link)
-- Run in Supabase SQL editor

alter table point_logs drop constraint if exists point_logs_event_id_fkey;

alter table point_logs
  add constraint point_logs_event_id_fkey
  foreign key (event_id) references events (id) on delete set null;
