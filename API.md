# SMS Project API Documentation

This document catalogs the existing HTTP endpoints defined in `routes.js` and related controllers. It is derived from the current codebase (no inferred hidden functionality). Where controller logic was not inspected in detail, behavior is described by filename and handler name.

> NOTE: Authentication/authorization middleware (`checkSignIn`) is defined in `app.js` but not applied to protected routes in `routes.js`. Many endpoints appear accessible without auth unless controllers enforce checks. Review and apply middleware where needed.
> NOTE: Sensitive credentials (e.g. database password in `config.js`) should be moved to environment variables.

## Conventions
- Methods: GET / POST only (no PUT/PATCH/DELETE implemented explicitly).
- File upload: Endpoints using `multer` handle file fields (`tphoto`, `sphoto`, `pphoto`, `ephoto`, `ubook`).
- Rate Limiting: Only paths under `/api/` are rate limited (register/authenticate).
- Sessions: Express-session backed by MySQL store; user identity stored in `req.session`.

## Authentication & User Management
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | /api/register | `registerController.register` | Public registration (rate limited) |
| POST | /api/authenticate | `authenticateController.authenticate` | Login (rate limited) |
| POST | /controllers/register-controller | `registerController.register` | Alternate registration path |
| POST | /controllers/authenticate-controller | `authenticateController.authenticate` | Alternate login path |
| POST | /controllers/forgot-pwd | `authenticateController.forgotPwd` | Password recovery |

## Dashboard & Profile
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /dashboard | `dashboard.dashboardurl` | Dashboard landing |
| GET | /index | `dashboard.admin` | Admin view |
| GET | /index3 | `dashboard.student` | Student view |
| GET | /index4 | `dashboard.parents` | Parent view |
| GET | /index5 | `dashboard.teacher` | Teacher view |
| GET | /test | `dashboard.admin` | Test admin view |
| GET | /test3 | `dashboard.student` | Test student view |
| GET | /test4 | `dashboard.teacher` | Test teacher view |
| GET | /test5 | `dashboard.parents` | Test parent view |
| GET | /profile | `profile.myProfile` | Profile details |
| GET | /logout | `profile.logout` | Logout |

## Students
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /get-student | `allstudent.getStudents` | Fetch student list |
| GET | /all-student | `allstudent.students` | Student listing page data |
| GET | /student-details | `studentDetails.details` | Student detail view |
| GET | /editStudent | `studentDetails.editStudent` | Render edit student form |
| POST | /controller/admitform | `admitform.admission` | New student admission (file `sphoto`) |
| POST | /controller/editStudent | `admitform.editStudent` | Edit student basic info |
| POST | /search_student | `studentDetails.searchStudent` | Search students |
| GET | /controllers/getRollNumber/:sroll | `allstudent.getRollNumber` | Fetch roll number info |
| POST | /controller/student-promotion | `studentpromotion.promotion` | Promote student |

## Teachers
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /teacher-details | `teacheDetails.details` | Teacher detail view |
| GET | /editTeacher | `teacheDetails.editTeacher` | Render edit teacher form |
| GET | /get-teacher-id | `addteacher.get_last_teacher_id` | Latest teacher ID |
| GET | /controllers/get-teacher-id | `addteacher.get_last_teacher_id` | Duplicate path |
| POST | /controller/add-teacher | `addteacher.teacher` | Add teacher (file `tphoto`) |
| POST | /controller/edit-teacher | `addteacher.editTeacher` | Edit teacher (file `tphoto`) |
| POST | /controllers/add-teacher | `addteacher.teacher` | Alternate add teacher (file `tphoto`) |
| POST | /controllers/edit-teacher | `addteacher.editTeacher` | Alternate edit teacher (file `tphoto`) |
| POST | /search_teacher | `teacheDetails.searchTeacher` | Search teachers |

## Parents
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /parents-details | `parentDetails.details` | Parent detail view |
| GET | /editParent | `parentDetails.editParent` | Render edit parent form |
| POST | /controller/add-parents | `addparents.parent` | Add parent (file `pphoto`) |
| POST | /controller/updateParentDetails | `addparents.updateParents` | Update parent data |
| POST | /search_parent | `parentDetails.searchParent` | Search parents |
| GET | /all-parents | `allparents.parents` | All parents list |

## Employees
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /all-employees | `employees.allEmployees` | Employee list |
| GET | /employee-details | `employees.employeeDetails` | Employee detail view |
| POST | /controller/add-employee | `employees.addEmployee` | Add employee (file `ephoto`) |

## Library / Books
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /all-book | `allbook.library` | All books |
| POST | /controller/add-book | `addbook.library` | Add book (file `ubook`) |
| POST | /controllers/updatebook | `addbook.updatebook` | Update book (file `ubook`) |
| POST | /controllers/allbooksearch | `allbooksearch.bsearch` | Search books |

## Expenses / Accounts / Fees
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /all-expense | `allexpense.expense` | Expense list |
| POST | /controller/add-expense | `addexpense.expense` | Add expense |
| GET | /fee-details | `fee.feedetails` | Fee details |
| GET | /all-fees | `fee.allfeesdetails` | All fee structures |
| POST | /controllers/feeadding | `fee.feeadding` | Add fee structure |
| GET | /controllers/paymentdetails | `fee.paymentdetails` | Payment details |
| POST | /controller/updateFeeStructure | `fee.updateFeeStructure` | Update fee structure |

## Classes / Sections / Timetable
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /all-class | `timetable.schedule` | Class schedule overview |
| GET | /all-classes | `allclasses.getlasssection` | All classes with sections |
| POST | /controller/add-class | `addclass.class` | Add class |
| POST | /deleteSection | `allclasses.deleteSection` | Delete section |
| POST | /controllers/get-section | `classSection.section` | Fetch sections |
| POST | /controllers/get-class | `classSection.sclass` | Fetch classes |
| POST | /controllers/addSection | `section.addsection` | Add section |
| POST | /controllers/allclassessearch | `allclassessearch.search` | Search classes |
| POST | /controllers/addsession | `timetable.addsession` | Add session hours |
| GET | /session-hours | `timetable.getSessions` | List session hours |
| POST | /controllers/getsessions | `timetable.getSessionfortt` | Get sessions for timetable |
| POST | /controllers/addtt | `timetable.addtimetable` | Add timetable |
| GET | /holidays | `timetable.holidays` | List holidays |
| POST | /controllers/calendar | `timetable.addholiday` | Add holiday |
| POST | /controller/updateHolidays | `timetable.updateHolidays` | Update holidays |

## Subjects
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /all-subject | `subjects.getSubjects` | List subjects |
| POST | /controllers/subjects | `subjects.addsubject` | Add subject |
| POST | /controller/updateSubject | `subjects.updateSubject` | Update subject |
| POST | /controllers/subjectSearch | `subjectSearch.search` | Search subjects |
| POST | /controllers/getSubjectforClass | `subjects.getSubjectforClass` | Subjects for a class |

## Attendance
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | /controllers/getclass | `attendence.attendence` | Get attendance class context |
| POST | /controllers/postattendence | `attendence.attend` | Post attendance |
| POST | /controllers/getattendence | `attendence.getattendence` | Get attendance records |
| GET | /getattendancepercentage | `dashboard.getattndpercentage` | Attendance percentage stats |

## Events & Notices
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /post-event | `events.getevent1` | Event posting view |
| GET | /attend-event | `events.getevent` | Event attendance view |
| POST | /controllers/postevent | `events.postevent` | Create event |
| POST | /controllers/attendevent | `events.attendevent` | Attend event |
| POST | /controller/updateevent | `events.updateEvent` | Update event |
| GET | /api/v1/notices | `communicationController.getNotices` | List notices |
| POST | /api/v1/notices | `communicationController.createNotice` | Create notice (posted by auto-populated from authenticated user) |
| DELETE | /api/v1/notices/:nid | `communicationController.deleteNotice` | Delete notice |
| POST | /controllers/noticeSearch | `noticeSearch.search` | Search notices |

## Hostel
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /hostel | `hostel.roomdetails` | Hostel room details |
| POST | /controllers/admin-hostel | `hostel.adminHostel` | Admin hostel ops |
| POST | /controllers/student-hostel | `hostel.studentHostel` | Student hostel ops |
| POST | /controllers/addroom | `hostel.addroom` | Add hostel room |
| POST | /controller/updatehostel | `hostel.updateHostel` | Update hostel info |
| POST | /controllers/hostelSearch | `hostelSearch.search` | Search hostel data |

## Transport
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /transport | `transport.getbusdetails` | Bus details |
| GET | /add-timings | `transport.getbustimings` | Bus timings view |
| POST | /controllers/addtimings | `transport.addtimings` | Add timings |
| POST | /controllers/addbus | `transport.addbus` | Add bus |
| POST | /controllers/getbus | `transport.getbusdetails` | Get bus details |
| POST | /controller/updateTransport | `transport.updateTransport` | Update transport (in code) |
| POST | /controllers/updatetrastimings | `transport.updatetranstimings` | Update timings |
| POST | /controllers/busSearch | `busSearch.search` | Search buses |
| POST | /controllers/busTimeSearch | `busTimeSearch.search` | Search bus timings |

## Exams
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /exam-schedule | `exam.examschedule` | Exam schedule view |
| GET | /exam-grade | `exam.examgrades` | Exam grades list |
| GET | /edit-exam-grade | `exam.getexamgradedetails` | Edit grade view |
| POST | /controllers/exams | `exam.exams` | Define exams |
| POST | /controllers/examschedule | `exam.addexam` | Add exam schedule |
| POST | /controllers/addgrade | `exam.addgrade` | Add grade |
| POST | /controllers/addmarks | `exam.addmarks` | Add marks |
| POST | /controllers/postmarks | `exam.postmarks` | Post marks |
| POST | /controllers/getmarks | `exam.getmarks` | Get marks |
| POST | /controller/updateExamGrade | `exam.updateExamGrade` | Update grade |

## Messages & Notifications
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | /controllers/addmessage | `message.addmsg` | Add message |
| POST | /controllers/get-user | `message.users` | List users for messaging |
| GET | /sendemail | `notification.emailnotification` | Send email notification |

## Leaves
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | /controllers/leaves | `leaves.applyleave` | Apply leave |
| POST | /controllers/addleaves | `leaves.addleaves` | Add leave type |
| GET | /controllers/totalleavesinfo | `leaves.totalleavesinfo` | Total leaves info |
| GET | /controllers/availedleavesinfo | `leaves.availedleavesinfo` | Availed leaves info |
| GET | /controllers/getleavesapprovaldata | `leaves.getleavesapprovaldata` | Leaves needing approval |
| GET | /controllers/sendleavesapprovaldata | `leaves.sendleavesapprovaldata` | Approval response |

## School Settings
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /api/v1/schools/:id/settings | `schoolController.getSchoolSettings` | Fetch school profile + feature settings |
| PUT | /api/v1/schools/:id/settings | `schoolController.updateSchoolSettings` | Update school profile + feature settings |

Legacy endpoints below are deprecated and should not be used in v1 clients:

| GET | /controllers/get-school-settings | `schoolSettings.get_school_settings` | Deprecated |
| POST | /controllers/set-school-settings/:transport/:stock/:hostel | `schoolSettings.set_school_settings` | Deprecated |

## Search Endpoints (General)
| Method | Path | Handler | Domain |
|--------|------|---------|--------|
| POST | /controllers/searchbyname | `searchbyname.search` | General name search |
| POST | /controllers/teachersearch | `teachersearch.search` | Teacher search |
| POST | /controllers/parentsearch | `parentsearch.search` | Parent search |
| POST | /controllers/allfeesearch | `allfeesearch.search` | Fees search |

## Contact & Feedback
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /contactus | `contactus.contactus` | Contact form (?) |
| POST | /controllers/contactus | `contactus.contactus` | Submit contact form |
| GET | /feedback | (renders view) | Feedback view |
| GET | /unsubscribe | `mail.unsubscribe` | Unsubscribe email |
| POST | /resubscribe | `mail.resubscribe` | Resubscribe email |
| GET | /unsubscribemail | (renders view) | Unsubscribe view |

## Account Settings
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /account-settings | `accountsettings.renderAccountSettings` | Account settings view |
| POST | /controller/account-settings | `accountsettings.admin` | Account settings update |
| GET | /account-settings-profile | (renders view) | Profile settings view |

## Common / Utility
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | /deletedata | `common.deletedata` | Generic delete helper |
| POST | /controllers/addroom | `hostel.addroom` | (Hostel utility) |

## Miscellaneous (Views only)
Numerous GET endpoints render EJS templates without invoking controller logic (e.g. `/login`, `/register`, `/forgotpwd`, `/add-book`, `/add-expense`, `/add-class`, `/add-teacher`, `/student-promotion`, `/class-routine`, `/map`, `/button`, etc.). These are UI routes rather than JSON APIs.

## Error & Fallback
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| ALL | /* | Final catch-all -> `errorpage.ejs` | Fallback route after earlier matches |
| GET | /health | Inline handler | Database health check |

## Upload Fields Summary
| Field Name | Used In Path |
|------------|--------------|
| `tphoto` | Add/Edit teacher endpoints |
| `sphoto` | Student admission |
| `pphoto` | Add parent |
| `ephoto` | Add employee |
| `ubook` | Add/Update book |

## Security & Improvement Recommendations
- Apply `checkSignIn` middleware to protected routes (students, exams, fees, etc.).
- Consolidate duplicate endpoints (e.g., multiple add/edit teacher routes).
- Use RESTful conventions (PUT/PATCH/DELETE) instead of many POST variants.
- Move `/controllers/*` prefixed paths toward a cleaner versioned namespace (e.g., `/api/v1/...`).
- Remove hardcoded secrets and passwords; load via environment variables.
- Add validation & error handling layers (e.g., `express-validator`).
- Ensure rate limiting applies beyond just `/api/` if brute-force concerns exist for other POST routes.

## Notes
This document is a structural map. For request/response schemas, inspect each controller file and integrate parameter/response definitions (recommended next step).

---
Generated: 2025-11-15
