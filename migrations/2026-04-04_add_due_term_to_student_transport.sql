-- Add due_term column to student_transport table
-- Transport assignment period: annual, term_1, term_2, term_3, semester_1, semester_2
ALTER TABLE student_transport
ADD COLUMN due_term VARCHAR(20) NOT NULL DEFAULT 'annual';
