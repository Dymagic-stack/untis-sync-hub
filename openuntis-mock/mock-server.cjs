const express = require('express')
const cors = require('cors')

const app = express()
const port = Number(process.env.MOCK_PORT || 8000)

app.use(cors())
app.use(express.json())

const students = [
  { id: 'student-1', name: 'Leon Becker', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-2', name: 'Mira Fischer', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-3', name: 'Jonas Weber', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-4', name: 'Emma Keller', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-5', name: 'Noah Schmidt', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-6', name: 'Lina Wagner', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-7', name: 'Paul Hoffmann', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-8', name: 'Sophie Braun', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-9', name: 'Felix Bauer', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-10', name: 'Nele Richter', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-11', name: 'Tom Klein', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-12', name: 'Anna Wolf', className: 'FIA25A', trackCode: 'FIA', photoUrl: null },
  { id: 'student-13', name: 'Luis Neumann', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-14', name: 'Clara Schwarz', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-15', name: 'Elias Zimmermann', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-16', name: 'Mia Hartmann', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-17', name: 'Ben Krüger', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-18', name: 'Julia Lange', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-19', name: 'Max König', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-20', name: 'Lea Werner', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-21', name: 'Finn Krause', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-22', name: 'Emma Schulz', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-23', name: 'Oskar Peters', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
  { id: 'student-24', name: 'Zoe Meyer', className: 'FIS25B', trackCode: 'FIS', photoUrl: null },
]

const classes = [
  { id: 'class-1', name: 'FIA25A', track: 'Fachinformatiker Anwendungsentwicklung' },
  { id: 'class-2', name: 'FIS25B', track: 'Fachinformatiker Systemintegration' },
]

const subjects = [
  { id: 'subject-1', name: 'Softwareentwicklung', shortName: 'SWE', area: 'IT' },
  { id: 'subject-2', name: 'IT-Systeme', shortName: 'ITS', area: 'IT' },
]

const rooms = [
  { id: 'room-1', name: 'A101' },
  { id: 'room-2', name: 'B204' },
]

let absences = [
  { id: 1, studentName: 'Leon Becker', className: 'FIA25A', date: '2026-11-24', reason: 'Krankheit', status: 'UNCONFIRMED' },
]

let lessons = [
  { id: 'lesson-1', subjectId: 'subject-1', teacherId: 'teacher-1', roomId: 'room-1', classGroupId: 'class-1', timeSlotId: 'ts-monday-1', subject: subjects[0], room: rooms[0], classGroup: classes[0], timeSlot: { id: 'ts-monday-1', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '09:45' } },
]

let seating = {}

app.get('/', (_req, res) => res.json({ name: 'ATIW OpenUntis Mock', status: 'running' }))
app.get('/api/dashboard-stats', (_req, res) => res.json({ stats: { totalStudents: students.length, totalClasses: classes.length, todayAbsences: absences.length }, classes: classes.map((item) => item.name), absences }))
app.get('/api/students', (req, res) => {
  const needle = String(req.query.search || '').toLowerCase()
  const result = needle ? students.filter((student) => student.name.toLowerCase().includes(needle)) : students
  res.json({ students: result, total: result.length })
})
app.get('/api/classes', (_req, res) => res.json(classes))
app.get('/api/subjects', (_req, res) => res.json(subjects))
app.get('/api/rooms', (_req, res) => res.json(rooms))
app.get('/api/absences', (_req, res) => res.json(absences))
app.get('/api/timetable', (_req, res) => res.json({ lessons }))
app.get('/api/seating/:className', (req, res) => {
  const className = req.params.className
  res.json({ className, seats: seating[className] || {} })
})

app.post('/api/absences', (req, res) => {
  const absence = { id: Math.max(0, ...absences.map((item) => item.id)) + 1, date: new Date().toISOString().slice(0, 10), status: 'UNCONFIRMED', ...req.body }
  absences.unshift(absence)
  res.status(201).json(absence)
})

app.put('/api/absences/:id', (req, res) => {
  const index = absences.findIndex((item) => item.id === Number(req.params.id))
  if (index < 0) return res.status(404).json({ error: 'Fehlzeit nicht gefunden' })
  absences[index] = { ...absences[index], ...req.body }
  return res.json(absences[index])
})

app.delete('/api/absences/:id', (req, res) => {
  const index = absences.findIndex((item) => item.id === Number(req.params.id))
  if (index < 0) return res.status(404).json({ error: 'Fehlzeit nicht gefunden' })
  const removed = absences.splice(index, 1)[0]
  return res.json(removed)
})

app.post('/api/timetable/admin/lessons', (req, res) => {
  const lesson = { id: `lesson-${lessons.length + 1}`, ...req.body, subject: subjects.find((item) => item.id === req.body.subjectId), room: rooms.find((item) => item.id === req.body.roomId), classGroup: classes.find((item) => item.id === req.body.classGroupId) }
  lessons.push(lesson)
  res.status(201).json(lesson)
})

app.put('/api/seating/:className', (req, res) => {
  const className = req.params.className
  seating[className] = req.body.seats || {}
  res.json({ className, seats: seating[className] })
})

app.put('/api/students/:id/photo', (req, res) => {
  const student = students.find((item) => item.id === req.params.id)
  if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' })
  student.photoUrl = req.body.photoUrl || null
  return res.json(student)
})

app.listen(port, '0.0.0.0', () => console.log(`ATIW Mock listening on port ${port}`))
