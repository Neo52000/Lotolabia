-- LotoLab IA — Migration 0004 : Row Level Security sur TOUTES les tables.
-- Principes :
--   * les tirages sont en lecture publique, en écriture service-role uniquement
--     (le service role contourne RLS ; aucune politique d'écriture n'est donc créée) ;
--   * les données utilisateur sont accessibles uniquement à leur propriétaire ;
--   * les tables d'administration sont réservées aux admins (profiles.role = 'admin') ;
--   * les contenus SEO publiés et les emplacements pub actifs sont lisibles publiquement.

alter table public.draws enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_quarantine enable row level security;
alter table public.sync_logs enable row level security;
alter table public.profiles enable row level security;
alter table public.saved_grids enable row level security;
alter table public.favorites enable row level security;
alter table public.user_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.premium_entitlements enable row level security;
alter table public.audit_log enable row level security;
alter table public.seo_contents enable row level security;
alter table public.ad_placements enable row level security;

-- Tirages : lecture publique
create policy "draws_public_read" on public.draws
  for select using (true);

-- Pipeline d'import : admins seulement
create policy "import_jobs_admin_read" on public.import_jobs
  for select using (public.is_admin());

create policy "quarantine_admin_read" on public.import_quarantine
  for select using (public.is_admin());
create policy "quarantine_admin_update" on public.import_quarantine
  for update using (public.is_admin()) with check (public.is_admin());

create policy "sync_logs_admin_read" on public.sync_logs
  for select using (public.is_admin());

-- Profils : propriétaire + admins en lecture ; le rôle n'est PAS modifiable
-- par l'utilisateur (colonne protégée par trigger ci-dessous).
create policy "profiles_owner_read" on public.profiles
  for select using ((select auth.uid()) = id or public.is_admin());
create policy "profiles_owner_update" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Modification du rôle non autorisée.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_role on public.profiles;
create trigger trg_profiles_protect_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- Grilles enregistrées : CRUD propriétaire
create policy "saved_grids_owner_all" on public.saved_grids
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Favoris : CRUD propriétaire
create policy "favorites_owner_all" on public.favorites
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Préférences : CRUD propriétaire
create policy "user_preferences_owner_all" on public.user_preferences
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Notifications : lecture + marquage lu par le propriétaire ;
-- création par le service role uniquement.
create policy "notifications_owner_read" on public.notifications
  for select using ((select auth.uid()) = user_id);
create policy "notifications_owner_update" on public.notifications
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "notifications_owner_delete" on public.notifications
  for delete using ((select auth.uid()) = user_id);

-- Premium : lecture propriétaire + admins ; écriture service-role uniquement.
create policy "premium_owner_read" on public.premium_entitlements
  for select using ((select auth.uid()) = user_id or public.is_admin());

-- Audit : lecture admins ; écriture service-role uniquement.
create policy "audit_log_admin_read" on public.audit_log
  for select using (public.is_admin());

-- Contenus SEO : lecture publique si publié ; gestion admins.
create policy "seo_contents_public_read" on public.seo_contents
  for select using (published = true or public.is_admin());
create policy "seo_contents_admin_write" on public.seo_contents
  for insert with check (public.is_admin());
create policy "seo_contents_admin_update" on public.seo_contents
  for update using (public.is_admin()) with check (public.is_admin());
create policy "seo_contents_admin_delete" on public.seo_contents
  for delete using (public.is_admin());

-- Emplacements pub : lecture publique des emplacements actifs ; gestion admins.
create policy "ad_placements_public_read" on public.ad_placements
  for select using (enabled = true or public.is_admin());
create policy "ad_placements_admin_write" on public.ad_placements
  for insert with check (public.is_admin());
create policy "ad_placements_admin_update" on public.ad_placements
  for update using (public.is_admin()) with check (public.is_admin());
create policy "ad_placements_admin_delete" on public.ad_placements
  for delete using (public.is_admin());
