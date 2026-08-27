-- Nothing enforced one signup per email; the table had no protection
-- against a script hammering /waitlist with the same address repeatedly.
CREATE UNIQUE INDEX idx_waitlist_email ON waitlist(email);
