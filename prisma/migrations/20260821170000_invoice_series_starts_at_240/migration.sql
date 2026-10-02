-- La série des factures reprend à 240.
--
-- The agency has been invoicing before this software existed, and its series
-- has to continue rather than restart: an accountant reading the register
-- should find 239 followed by 240, not a second sequence beginning at 1.
--
-- Safe to set now and only now: no invoice has been issued from here yet, so
-- nothing already carries a number below it. Once one does, this sequence must
-- never be moved backwards — that is how a number gets used twice.
ALTER SEQUENCE invoices_number_seq RESTART WITH 240;

-- The fund calls are a series of their own and start where they start. It is a
-- register the agency has not kept before, so it opens at 1.
