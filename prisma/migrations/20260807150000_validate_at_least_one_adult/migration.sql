-- Correct the one rental that predates the rule, then enforce it everywhere.
--
-- 1244 was recorded as 4 occupants of whom 4 were children — no adult to sign,
-- and a taxe de séjour of zero. The previous migration deliberately left it
-- alone because only the agent who took the booking could say what it meant.
-- They have: 4 occupants, 2 of them children.
--
-- Targeted on the reference, which is unique and is the number the correction
-- was given against — not on a shape like `children >= guests`, which would
-- silently catch any other row that happened to match.
UPDATE "rentals" SET "children" = 2
WHERE "reference" = 1244 AND "guests" = 4;

-- With the data clean, the constraint added NOT VALID can cover the rows that
-- already existed. This scans the table once and fails loudly if anything else
-- violates it, which is the point: it is a guarantee only once it holds for
-- every row, not just the ones written from now on.
ALTER TABLE "rentals" VALIDATE CONSTRAINT "rentals_at_least_one_adult";
