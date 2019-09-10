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
    username text primary key,
    password text
);
CREATE OR REPLACE FUNCTION isfile(id) 
RETURNS boolean AS $$ exists(SELECT 1 from files where inode = id) $$LANGUAGE PLPGSQL;