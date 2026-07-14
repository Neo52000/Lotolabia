-- LotoLab IA — Migration 0005 : durcissement des fonctions SECURITY DEFINER.
--
-- * Les fonctions trigger n'ont pas besoin d'être appelables via l'API REST :
--   on révoque EXECUTE pour anon/authenticated (les triggers continuent de
--   fonctionner : la vérification d'EXECUTE s'applique à la création du
--   trigger, pas à chaque déclenchement).
-- * has_premium(uid) prend un uuid arbitraire et révélerait le statut Premium
--   de n'importe quel utilisateur : réservée au service role.
-- * is_admin() reste exécutable : elle est évaluée dans les politiques RLS
--   avec le rôle de l'appelant et ne révèle que son propre statut.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_self_escalation() from public, anon, authenticated;
revoke execute on function public.has_premium(uuid) from public, anon, authenticated;

-- Index couvrant la clé étrangère de la quarantaine (advisor performance)
create index if not exists idx_quarantine_job on public.import_quarantine (job_id);
