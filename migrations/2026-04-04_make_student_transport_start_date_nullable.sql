-- Make start_date nullable in student_transport table
-- Transport assignment is now based on academic year (trimester/yearly), not individual dates
ALTER TABLE student_transport ALTER COLUMN start_date DROP NOT NULL;
