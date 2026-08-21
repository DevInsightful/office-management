alter table attendance_records
add column if not exists status text not null default 'present';

update attendance_records
set status = 'present'
where status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_status_check'
      and conrelid = 'attendance_records'::regclass
  ) then
    alter table attendance_records
    add constraint attendance_records_status_check
    check (status in ('present', 'half_day'));
  end if;
end
$$;
