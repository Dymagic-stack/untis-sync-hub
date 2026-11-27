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

function pad2(value) {
  return String(value).padStart(2, '0')
}

function buildDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function buildWebUntisDemoAbsences(sourceStudents) {
  const statuses = ['UNCONFIRMED', 'CONFIRMED', 'EXCUSED']
  const reasons = ['Krankheit', 'Arzttermin', 'ÖPNV-Ausfall', 'Familientermin', 'Prüfungsvorbereitung']
  const rows = []

  // 40 Datensaetze: in beiden Systemen, gleicher Status
  for (let i = 0; i < 40; i++) {
    const student = sourceStudents[i % sourceStudents.length]
    rows.push({
      id: rows.length + 1,
      studentName: student.name,
      className: student.className,
      date: buildDate(2026, 11, (i % 28) + 1),
      reason: reasons[i % reasons.length],
      status: statuses[i % statuses.length],
    })
  }

  // 25 Datensaetze: in beiden Systemen, aber mit Statusabweichung
  for (let i = 0; i < 25; i++) {
    const student = sourceStudents[(i + 7) % sourceStudents.length]
    rows.push({
      id: rows.length + 1,
      studentName: student.name,
      className: student.className,
      date: buildDate(2026, 12, (i % 20) + 1),
      reason: reasons[(i + 1) % reasons.length],
      status: statuses[i % statuses.length],
    })
  }

  // 20 Datensaetze: nur in WebUntis
  for (let i = 0; i < 20; i++) {
    const student = sourceStudents[(i + 13) % sourceStudents.length]
    rows.push({
      id: rows.length + 1,
      studentName: student.name,
      className: student.className,
      date: buildDate(2026, 10, (i % 20) + 1),
      reason: reasons[(i + 2) % reasons.length],
      status: statuses[(i + 1) % statuses.length],
    })
  }

  return rows
}

let absences = buildWebUntisDemoAbsences(students)

let lessons = [
  { id: 'lesson-1', subjectId: 'subject-1', teacherId: 'teacher-1', roomId: 'room-1', classGroupId: 'class-1', timeSlotId: 'ts-monday-1', subject: subjects[0], room: rooms[0], classGroup: classes[0], timeSlot: { id: 'ts-monday-1', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '09:45' } },
]

let seating = {}

function renderMockUi() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ATIW OpenUntis Mock API</title>
  <style>
    :root {
      --bg: #f2f5ee;
      --bg-accent: #d7e9ef;
      --card: #ffffff;
      --ink: #1c232f;
      --muted: #58606f;
      --border: #d6dde4;
      --primary: #0e6f8f;
      --primary-deep: #0b5670;
      --tag: #eef4fa;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: "Segoe UI", "Noto Sans", Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--ink);
      background: radial-gradient(circle at 95% 0%, var(--bg-accent), transparent 35%), var(--bg);
      min-height: 100vh;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 28px 16px 40px; }
    .hero {
      background: linear-gradient(140deg, #f8fdff, #ffffff 40%);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 8px 26px rgba(16, 44, 60, 0.1);
      padding: 20px;
      margin-bottom: 14px;
    }
    h1 { margin: 0 0 8px; font-size: 1.65rem; }
    .lead { margin: 0; color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin: 14px 0;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 11px;
    }
    .k { color: var(--muted); font-size: 0.8rem; margin-bottom: 4px; }
    .v { font-size: 1.18rem; font-weight: 800; }
    .layout {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 12px;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
    }
    .panel {
      border: 1px solid var(--border);
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
    }
    .panel h2 {
      margin: 0;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      font-size: 0.95rem;
      letter-spacing: 0.01em;
    }
    .list { margin: 0; padding: 10px; list-style: none; }
    .list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 9px;
      margin-bottom: 8px;
      padding: 9px 10px;
      font-size: 0.9rem;
    }
    .tag {
      background: var(--tag);
      border: 1px solid #d5e0ec;
      color: #355a7f;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px;
      border-bottom: 1px solid var(--border);
    }
    button {
      border: 0;
      border-radius: 9px;
      background: var(--primary);
      color: #fff;
      padding: 8px 12px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 110ms ease, background 110ms ease;
    }
    button:hover { background: var(--primary-deep); transform: translateY(-1px); }
    pre {
      margin: 0;
      padding: 12px;
      font-family: var(--mono);
      font-size: 0.77rem;
      white-space: pre-wrap;
      max-height: 420px;
      overflow: auto;
      background: #f8fafc;
    }
    .foot {
      margin-top: 12px;
      color: var(--muted);
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>ATIW OpenUntis Mock API</h1>
      <p class="lead">Visualisiert die Mock-Datenquelle fuer den Sync-Hub und bietet schnelle API-Inspektion.</p>
      <div id="stats" class="grid"></div>
    </section>

    <section class="layout">
      <article class="panel">
        <h2>Wichtige Endpunkte</h2>
        <ul class="list">
          <li><span>/api/dashboard-stats</span> <span class="tag">Dashboard</span></li>
          <li><span>/api/students?search=...</span> <span class="tag">Students</span></li>
          <li><span>/api/classes</span> <span class="tag">Classes</span></li>
          <li><span>/api/subjects</span> <span class="tag">Subjects</span></li>
          <li><span>/api/rooms</span> <span class="tag">Rooms</span></li>
          <li><span>/api/absences</span> <span class="tag">Absences</span></li>
          <li><span>/api/timetable</span> <span class="tag">Timetable</span></li>
          <li><span>/api/seating/:className</span> <span class="tag">Seating</span></li>
        </ul>
      </article>

      <article class="panel">
        <h2>Live API Vorschau</h2>
        <div class="controls">
          <button data-endpoint="/api/dashboard-stats">Dashboard</button>
          <button data-endpoint="/api/students">Students</button>
          <button data-endpoint="/api/absences">Absences</button>
          <button data-endpoint="/api/timetable">Timetable</button>
        </div>
        <pre id="preview">Lade Daten ...</pre>
      </article>
    </section>

    <p class="foot">Hinweis: Daten liegen im RAM des Containers. Ein Neustart setzt den Zustand auf den Demo-Seed zurueck.</p>
  </main>

  <script>
    const statsContainer = document.getElementById('stats');
    const preview = document.getElementById('preview');
    const endpointButtons = document.querySelectorAll('button[data-endpoint]');

    function statCard(label, value) {
      return '<div class="card"><div class="k">' + label + '</div><div class="v">' + String(value) + '</div></div>';
    }

    async function loadSummary() {
      const response = await fetch('/api/ui/summary');
      const summary = await response.json();
      statsContainer.innerHTML = [
        statCard('Students', summary.students),
        statCard('Classes', summary.classes),
        statCard('Subjects', summary.subjects),
        statCard('Rooms', summary.rooms),
        statCard('Absences', summary.absences),
        statCard('Lessons', summary.lessons)
      ].join('');
    }

    async function showEndpoint(endpoint) {
      preview.textContent = 'Lade ' + endpoint + ' ...';
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        preview.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        preview.textContent = 'Fehler: ' + error.message;
      }
    }

    endpointButtons.forEach((button) => {
      button.addEventListener('click', () => showEndpoint(button.dataset.endpoint));
    });

    Promise.all([loadSummary(), showEndpoint('/api/dashboard-stats')]).catch((error) => {
      preview.textContent = 'Fehler beim Laden: ' + error.message;
    });
  </script>
</body>
</html>`
}

app.get('/', (req, res) => {
  if (req.accepts(['html', 'json']) === 'json') {
    return res.json({ name: 'ATIW OpenUntis Mock', status: 'running' })
  }

  return res.type('html').send(renderMockUi())
})

app.get('/api/ui/summary', (_req, res) => {
  res.json({
    students: students.length,
    classes: classes.length,
    subjects: subjects.length,
    rooms: rooms.length,
    absences: absences.length,
    lessons: lessons.length,
  })
})

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
