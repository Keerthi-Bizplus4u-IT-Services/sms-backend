# Foreign Key Relationships - Visual Reference

## Phase 1: Core Academic Tables (ACTIVE)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CORE ENTITIES                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   teacher   │
│  (tid PK)   │◄──────────┐
└─────────────┘           │
                          │ fk_timetable_teacher
┌─────────────┐           │
│    class    │           │
│  (cid PK)   │◄──────────┼───────┐
└─────────────┘           │       │ fk_timetable_class
      ▲                   │       │
      │                   │       │
      │ fk_section_class  │       │
      │                   │       │
┌─────────────┐           │       │
│   section   │◄──────────┼───────┼───────┐
│ (secid PK)  │           │       │       │ fk_timetable_section
└─────────────┘           │       │       │
      ▲                   │       │       │
      │                   │       │       │
      │ fk_subjects_class │       │       │
      │                   │       │       │
┌─────────────┐           │       │       │
│  subjects   │◄──────────┼───────┼───────┼───────┐
│ (subid PK)  │           │       │       │       │ fk_timetable_subject
└─────────────┘           │       │       │       │
                          │       │       │       │
┌─────────────┐           │       │       │       │
│sessionhours │◄──────────┼───────┼───────┼───────┼───────┐
│ (shid PK)   │           │       │       │       │       │ fk_timetable_sessionhour
└─────────────┘           │       │       │       │       │
                          │       │       │       │       │
                    ┌─────┴───────┴───────┴───────┴───────┴─────┐
                    │            timetable                       │
                    │  teacher_id → teacher(tid)                 │
                    │  class_id → class(cid)                     │
                    │  section_id → section(secid)               │
                    │  subject_id → subjects(subid)              │
                    │  session_hour_id → sessionhours(shid)      │
                    └────────────────────────────────────────────┘
```

## Student & Academic Records

```
┌─────────────┐
│   student   │
│  (uid PK)   │
└──────┬──────┘
       │
       │ fk_student_class
       ▼
┌─────────────┐
│    class    │
│  (cid PK)   │
└─────────────┘
       ▲
       │ fk_student_section
       │
┌─────────────┐
│   section   │
│ (secid PK)  │
└─────────────┘
```

## Exam & Marks System

```
┌─────────────┐
│    exam     │
│  (eid PK)   │◄─────────┐
└─────────────┘          │ fk_marks_exam
                         │
┌─────────────┐          │
│    class    │◄─────────┼────────┐
│  (cid PK)   │          │        │ fk_marks_class
└─────────────┘          │        │
                         │        │
┌─────────────┐          │        │
│   section   │◄─────────┼────────┼────────┐
│ (secid PK)  │          │        │        │ fk_marks_section
└─────────────┘          │        │        │
                         │        │        │
┌─────────────┐          │        │        │
│  subjects   │◄─────────┼────────┼────────┼────────┐
│ (subid PK)  │          │        │        │        │ fk_marks_subject
└─────────────┘          │        │        │        │
                         │        │        │        │
                   ┌─────┴────────┴────────┴────────┴─────┐
                   │              marks                    │
                   │  exam_id → exam(eid)                  │
                   │  class_id → class(cid)                │
                   │  section_id → section(secid)          │
                   │  subject_id → subjects(subid)         │
                   └────────┬──────────────────────────────┘
                            │
                            │ fk_studentmarks_marks
                            ▼
                   ┌────────────────────────────────────────┐
                   │          studentmarks                  │
                   │  mid → marks(mid)                      │
                   │  roll, marks, gid                      │
                   └────────────────────────────────────────┘
```

## Phase 2: Attendance System (ACTIVE)

```
┌─────────────┐
│    class    │
│  (cid PK)   │◄─────────┐
└─────────────┘          │ fk_attendence_class
                         │
┌─────────────┐          │
│   section   │◄─────────┼────────┐
│ (secid PK)  │          │        │ fk_attendence_section
└─────────────┘          │        │
                         │        │
                   ┌─────┴────────┴─────┐
                   │    attendence       │
                   │  class_id           │
                   │  section_id         │
                   │  period, date       │
                   └──────┬──────────────┘
                          │
                          │ fk_addattendence_attendance
                          ▼
                   ┌─────────────────────────┐
                   │   addattendence         │
                   │  attendance_id          │
                   │  student_id             │
                   │  roll, attendence       │
                   └─────────────────────────┘
                          ▲
                          │ fk_addattendence_student
                          │
                   ┌──────┴──────┐
                   │   student   │
                   │  (uid PK)   │
                   └─────────────┘
```

## Phase 2: Exam Scheduling (ACTIVE)

```
┌─────────────┐
│    exam     │
│  (eid PK)   │◄─────────┐
└─────────────┘          │ fk_examschedule_exam
                         │
┌─────────────┐          │
│  subjects   │◄─────────┼────────┐
│ (subid PK)  │          │        │ fk_examschedule_subject
└─────────────┘          │        │
                         │        │
┌─────────────┐          │        │
│    class    │◄─────────┼────────┼────────┐
│  (cid PK)   │          │        │        │ fk_examschedule_class
└─────────────┘          │        │        │
                         │        │        │
                   ┌─────┴────────┴────────┴─────┐
                   │       examschedule           │
                   │  exam_id → exam(eid)         │
                   │  subject_id → subjects       │
                   │  class_id → class(cid)       │
                   │  date, time, maxmarks        │
                   └──────────────────────────────┘
```

## Phase 2: Financial System (COMMENTED - Pending Validation)

```
┌─────────────┐
│   student   │
│  (uid PK)   │◄─────────┐
└─────────────┘          │ fk_fees_student (COMMENTED)
                         │
┌─────────────┐          │
│    class    │◄─────────┼────────┐
│  (cid PK)   │          │        │ fk_fees_class (COMMENTED)
└─────────────┘          │        │
                         │        │
                   ┌─────┴────────┴─────┐
                   │       fees          │
                   │  student_id         │
                   │  class_id           │
                   │  fee, Paidfee       │
                   └─────────────────────┘

┌─────────────┐
│   student   │
│  (uid PK)   │◄─────────┐
└─────────────┘          │ fk_feetransactions_student (COMMENTED)
                         │
                   ┌─────┴─────────────────┐
                   │   feetransactions     │
                   │  student_id           │
                   │  roll, amountpaid     │
                   │  transdate            │
                   └───────────────────────┘
```

## Phase 2: Library System (COMMENTED - Pending Validation)

```
┌─────────────┐
│   student   │
│  (uid PK)   │◄─────────┐
└─────────────┘          │ fk_library_student (COMMENTED)
                         │
                   ┌─────┴─────────────────┐
                   │      library          │
                   │  student_id           │
                   │  borrower_type        │
                   │  uid, bookname        │
                   │  issuedate, returndate│
                   └───────────────────────┘
```

## Complete Relationship Count

### Phase 1 (Active - 12 FKs)
```
timetable     → teacher       (1 FK)
timetable     → class         (1 FK)  
timetable     → subjects      (1 FK)
timetable     → section       (1 FK)
timetable     → sessionhours  (1 FK)
sessionhours  → class         (1 FK)
sessionhours  → section       (1 FK)
marks         → exam          (1 FK)
marks         → class         (1 FK)
marks         → section       (1 FK)
marks         → subjects      (1 FK)
studentmarks  → marks         (1 FK)
                              -------
                              12 FKs
```

### Phase 2 Active (6 FKs)
```
attendence      → class       (1 FK)
attendence      → section     (1 FK)
addattendence   → student     (1 FK)
addattendence   → attendence  (1 FK)
examschedule    → exam        (1 FK)
examschedule    → subjects    (1 FK)
examschedule    → class       (1 FK)
                              -------
                              7 FKs
```

### Phase 2 Commented (6 FKs - Pending Validation)
```
fees            → student     (1 FK) - COMMENTED
fees            → class       (1 FK) - COMMENTED
feetransactions → student     (1 FK) - COMMENTED
library         → student     (1 FK) - COMMENTED
parent          → student     (1 FK) - COMMENTED
                              -------
                              5 FKs
```

### Grand Total
```
Active FKs:    19
Commented FKs:  5
Total FKs:     24
```

## Key Relationships Summary

### 1-to-Many Relationships
- `class` → `section` (one class has many sections)
- `class` → `student` (one class has many students)
- `class` → `subjects` (one class has many subjects)
- `exam` → `marks` (one exam has many mark records)
- `marks` → `studentmarks` (one mark sheet has many student marks)
- `attendence` → `addattendence` (one attendance session has many student records)

### Many-to-1 Relationships
- `timetable` → `teacher` (many timetable slots reference one teacher)
- `timetable` → `class` (many timetable slots reference one class)
- `student` → `class` (many students belong to one class)
- `fees` → `student` (many fee records for one student)

### Cascade Behaviors

#### ON DELETE CASCADE (Data cleanup)
- Delete `class` → cascades to `section`, `student`, `timetable`, `marks`, etc.
- Delete `teacher` → cascades to `timetable`
- Delete `exam` → cascades to `marks` → cascades to `studentmarks`

#### ON DELETE SET NULL (Soft reference)
- Delete `class` → student.class_id becomes NULL (student remains)
- Delete `section` → student.section_id becomes NULL

## Legend

```
┌─────────┐
│ Table   │ = Database table
│ (PK)    │ = Primary key column
└─────────┘

    ▲
    │      = Foreign key relationship (arrow points to parent)
    │

(COMMENTED) = FK constraint exists in SQL but commented out
```

## Migration Path

```
                Current State                    Phase 1                    Phase 2                  Phase 3 (Future)
                     ↓                              ↓                          ↓                            ↓
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                   │
│  No FKs              →         Core FKs          →        Extended FKs      →       Full Enforcement             │
│  Sentinel values              Dual columns              All tables covered        Legacy columns dropped         │
│  Manual validation            12 active FKs             24 total FKs              NOT NULL constraints           │
│                               Backward compat           Commented where risky     CHECK constraints              │
│                                                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Table Dependencies (Deletion Order)

When dropping tables, follow this order (most dependent → least dependent):

```
Level 4: studentmarks, addattendence, feetransactions
Level 3: marks, attendence, fees, library, parent
Level 2: timetable, examschedule, subjects
Level 1: sessionhours, section, exam, student, teacher
Level 0: class, user, roles
```

When inserting data, reverse this order (least dependent → most dependent).

---

**Note**: This diagram represents the final state after both Phase 1 and Phase 2 migrations.
For current state, check which migrations have been applied.
