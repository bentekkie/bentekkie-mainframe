-- Baseline schema matching the existing bentekkie-mainframe v1 database.
-- Uses IF NOT EXISTS / CREATE OR REPLACE so existing production volumes adopt cleanly.

CREATE SEQUENCE IF NOT EXISTS inodes_id_seq;

CREATE TABLE IF NOT EXISTS inodes (
    id integer PRIMARY KEY NOT NULL DEFAULT nextval('inodes_id_seq'),
    parentinode integer REFERENCES inodes (id) ON DELETE CASCADE,
    path text UNIQUE
);

CREATE TABLE IF NOT EXISTS files (
    inode integer REFERENCES inodes (id) ON DELETE CASCADE,
    contents text
);

CREATE TABLE IF NOT EXISTS users (
    username text PRIMARY KEY,
    password text
);

CREATE OR REPLACE FUNCTION isfile(id integer)
RETURNS boolean AS $$
BEGIN
    RETURN exists(SELECT 1 FROM files WHERE inode = id);
END;
$$ LANGUAGE PLPGSQL;
