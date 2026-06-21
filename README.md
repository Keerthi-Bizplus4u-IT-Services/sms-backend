# README #

This README would normally document whatever steps are necessary to get your application up and running.

### What is this repository for? ###

* Quick summary
* Version
* [Learn Markdown](https://bitbucket.org/tutorials/markdowndemo)

### How do I get set up? ###

* Summary of set up
* Configuration
* Dependencies
* Database configuration
* How to run tests
* Deployment instructions

### Demo verification data ###

Run `npm install` inside `backend/` so that both production and dev dependencies (mysql2, bcrypt, jest, faker, etc.) are available.  
Set the database connection details in `backend/.env`, make sure the schema migrations have already been executed, and then populate a realistic dataset that covers every normalized table:

```
npm run seed:demo
```

The script inserts:

* A multi-branch CBSE school (`code=CORP001`) with two campuses and the 2023-2025 academic years.
* Classes for Grades 5-8, Sections A/B, six core subjects per class linked through `class_subjects`, and dedicated teachers, staff, and salary rows.
* At least 20 students per section (160 students total), each with parents, enrollments, promotions, branch transfers, attendance sessions/records, fee structures, student fees/payments, CBSE-style exams (unit, mid-term, annual), exam schedules, marks, and grading scales.

The seed is intentionally defensive: it aborts if a school with the same code already exists so that existing data is not duplicated. Drop or rename the generated school if you need to reseed.

### Staff-only seeding ###

If you already have the school/branch/class data and only want to provision the admin/operations staff records (plus their corresponding users), run:

```
npm run seed:staff
```

This script looks up the school with code `CORP001` (override with `STAFF_SCHOOL_CODE` in `.env`), creates any missing role-based users (library, transport, academics, etc.), and populates the `staff` table for both MAIN and TECHPARK campuses without touching students or other entities.

### Running ad-hoc SQL ###

Whenever you need to run a specific `.sql` file (for example a hotfix migration) against the configured database, use the helper script:

```
npm run db:run-sql -- path/to/file.sql
```

The script loads connection details from `backend/.env` (falling back to the defaults in version control) and executes the entire file with multi-statement support. This keeps the deployment flow consistent whether you are targeting AWS RDS or a local MySQL instance.

### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact
