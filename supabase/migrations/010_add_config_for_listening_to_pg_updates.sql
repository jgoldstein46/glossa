

create policy "Authenticated users can receive broadcasts"
on "realtime"."messages"
for select
to authenticated
using ( true );


create or replace function public.table_changes()
returns trigger
security definer
language plpgsql
as $$
begin
  perform realtime.broadcast_changes(
    'topic:' || coalesce(NEW.id, OLD.id) ::text,       -- topic - the topic to which you're broadcasting where you can use the topic id to build the topic name
    TG_OP,                                             -- event - the event that triggered the function
    TG_OP,                                             -- operation - the operation that triggered the function
    TG_TABLE_NAME,                                     -- table - the table that caused the trigger
    TG_TABLE_SCHEMA,                                   -- schema - the schema of the table that caused the trigger
    NEW,                                               -- new record - the record after the change
    OLD                                                -- old record - the record before the change
  );
  return null;
end;
$$;

create trigger handle_table_changes
after insert or update or delete
on public.module_generation_status
for each row
execute function table_changes ();

create trigger handle_table_changes
after insert or update or delete
on public.modules
for each row
execute function table_changes ();

create trigger handle_table_changes
after insert or update or delete
on public.sections
for each row
execute function table_changes ();
