alter table attendance_records
add column if not exists status text not null default 'present';

update attendance_records
set status = 'present'
where status is null;

alter table attendance_records
drop constraint if exists attendance_records_status_check;

alter table attendance_records
add constraint attendance_records_status_check
check (status in ('present', 'half_day'));
