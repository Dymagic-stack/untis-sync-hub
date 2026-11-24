const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

let absences = [
  { id: 1, studentName: 'Lena Beispiel', className: 'FIA-24', date: '2026-11-24', reason: 'Krankheit', status: 'UNCONFIRMED' },
  { id: 2, studentName: 'Jonas Muster', className: 'FIA-23', date: '2026-11-24', reason: 'Arzttermin', status: 'CONFIRMED' },
]

const students = [
  { id: 'student-1', name: 'Lena Beispiel', className: 'FIA-24', trackCode: 'FIA' },
  { id: 'student-2', name: 'Jonas Muster', className: 'FIA-23', trackCode: 'FIA' },
]

const classes = [{ id: 'class-1', name: 'FIA-24', track: 'Fachinformatiker Anwendungsentwicklung' }]
const subjects = [{ id: 'subject-1', name: 'Programmierung', shortName: 'PROG' }]
const rooms = [{ id: 'room-1', name: 'Raum 101' }]
const lessons = [{ id: 'lesson-1', subjectId: 'subject-1', subject: subjects[0], roomId: 'room-1', room: rooms[0], classGroupId: 'class-1', classGroup: classes[0], timeSlot: { dayOfWeek: 'MONDAY', startTime: '08:00' } }]

app.get('/api/dashboard-stats', (_req, res) => res.json({ stats: { totalStudents: students.length, totalClasses: classes.length, todayAbsences: absences.length }, classes: classes.map((item) => item.name), absences }))
app.get('/api/timetable', (_req, res) => res.json({ lessons }))
app.get('/api/students', (_req, res) => res.json({ total: students.length, students }))
app.get('/api/classes', (_req, res) => res.json(classes))
app.get('/api/subjects', (_req, res) => res.json(subjects))
app.get('/api/rooms', (_req, res) => res.json(rooms))
app.get('/api/absences', (_req, res) => res.json(absences))

app.post('/api/absences', (req, res) => {
  const absence = { id: Math.max(0, ...absences.map((item) => item.id)) + 1, studentName: req.body.studentName, className: req.body.className, date: req.body.date || new Date().toISOString().slice(0, 10), reason: req.body.reason, status: req.body.status || 'UNCONFIRMED' }
  absences.unshift(absence)
  res.status(201).json(absence)
})

app.put('/api/absences/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = absences.findIndex((item) => item.id === id)
  if (index < 0) return res.status(404).json({ error: 'Not found' })
  absences[index] = { ...absences[index], ...req.body }
  res.json(absences[index])
})

app.delete('/api/absences/:id', (req, res) => {
  const id = Number(req.params.id)
  const absence = absences.find((item) => item.id === id)
  absences = absences.filter((item) => item.id !== id)
  res.json(absence)
})

app.post('/api/timetable/admin/lessons', (req, res) => {
  const lesson = { id: `lesson-${lessons.length + 1}`, ...req.body }
  lessons.push(lesson)
  res.status(201).json(lesson)
})

app.listen(Number(process.env.MOCK_PORT || 8000), '0.0.0.0')
