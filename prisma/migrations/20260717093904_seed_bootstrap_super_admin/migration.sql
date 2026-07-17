-- Bootstrap the first SUPER_ADMIN.
--
-- Chicken-and-egg: creating an invitation requires MANAGE_USERS, which
-- comes from a User row, which is only created by accepting an
-- invitation. Something has to seed the first one outside the app.
--
-- Kept in the migration (rather than run by hand) so a freshly deployed
-- environment is bootable rather than permanently locked out. Idempotent
-- and non-destructive: it will not overwrite or re-grant if the row is
-- already there, and it does not touch the User row — the profile is
-- still created by the normal first-sign-in path.
INSERT INTO "user_invitations" ("email", "role", "isExternal", "updatedAt")
VALUES ('marketing@b-stay.com', 'SUPER_ADMIN', false, now())
ON CONFLICT ("email") DO NOTHING;
