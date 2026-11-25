<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const mode = ref('webuntis')
const api = '/api/sync-hub'
const activeMenu = ref('Stundenplan')
const dashboard = ref({ stats: {}, classes: [], absences: [] })
const timetable = ref([])
const classes = ref([])
const subjects = ref([])
const rooms = ref([])
const students = ref([])
const moodleAbsences = ref([])
const comparison = ref({ only_in_webuntis: [], only_in_moodle: [], status_differences: [], matching_records: [], webuntis_count: 0, moodle_count: 0, matching_count: 0, status_difference_count: 0 })
const logs = ref([])
const changes = ref([])
const studentFilter = ref('')
const moodleOpen = ref(false)
const absenceOpen = ref(false)
const lessonOpen = ref(false)
const notice = ref('')

const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

async function loadData() {
  try {
    const [dash, lessons, klass, fach, raum, schueler, moodle, vergleich, logData, changeData] = await Promise.all([
      fetch(`${api}/dashboard`).then(r => r.json()), fetch(`${api}/timetable`).then(r => r.json()),
      fetch(`${api}/classes`).then(r => r.json()), fetch(`${api}/subjects`).then(r => r.json()),
      fetch(`${api}/rooms`).then(r => r.json()), fetch(`${api}/students`).then(r => r.json()),
      fetch(`${api}/moodle/absences`).then(r => r.json()), fetch(`${api}/comparison`).then(r => r.json()),
      fetch(`${api}/sync/logs`).then(r => r.json()), fetch(`${api}/sync/changes`).then(r => r.json()),
    ])
    dashboard.value = dash
    timetable.value = lessons.lessons || []
    classes.value = klass
    subjects.value = fach
    rooms.value = raum
    students.value = schueler.students || []
    moodleAbsences.value = moodle
    comparison.value = vergleich
    logs.value = logData
    changes.value = changeData
  } catch {
    notice.value = 'Daten konnten nicht geladen werden.'
  }
}

onMounted(async () => {
  await loadData()
  await loadSeating()
  if (!Object.keys(seating.value).length) seating.value = initialSeatMap()
})

const visibleStudents = computed(() => {
  const needle = studentFilter.value.toLowerCase()
  return students.value.filter(s => `${s.name} ${s.className} ${s.trackCode}`.toLowerCase().includes(needle)).slice(0, 100)
})

function lessonForDay(dayIndex) {
  const names = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']
  return timetable.value.find(lesson => lesson.timeSlot?.dayOfWeek === names[dayIndex])
}

async function createAbsence(event) {
  const payload = Object.fromEntries(new FormData(event.currentTarget))
  const response = await fetch(`${api}/absences`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (response.ok) { absenceOpen.value = false; await loadData(); notice.value = 'Fehlzeit synchronisiert.' }
}

async function createMoodleAbsence(event) {
  const form = new FormData(event.currentTarget)
  const payload = {
    student_name: form.get('student_name'),
    class_name: form.get('class_name'),
    date: form.get('date'),
    reason: form.get('reason'),
    status: form.get('status'),
  }
  const response = await fetch(`${api}/moodle/absences`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (response.ok) { moodleOpen.value = false; await loadData(); notice.value = 'Moodle-Fehlzeit gespeichert.' }
}

async function createLesson(event) {
  const payload = Object.fromEntries(new FormData(event.currentTarget))
  const response = await fetch(`${api}/lessons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (response.ok) { lessonOpen.value = false; await loadData(); notice.value = 'Stunde synchronisiert.' }
}

async function triggerSync() {
  await fetch(`${api}/sync`, { method: 'POST' })
  await loadData()
  notice.value = 'Synchronisation abgeschlossen.'
}

async function deleteAbsence(absence) {
  if (confirm(`Fehlzeit von ${absence.studentName} löschen?`)) {
    await fetch(`${api}/absences/${absence.id}`, { method: 'DELETE' })
    await loadData()
  }
}

const seatingClass = ref('FIA25A')
const seating = ref({})
const draggedStudentId = ref('')
const selectedSeatAbsence = ref(null)

async function loadSeating() {
  const response = await fetch(`/api/sync-hub/seating/${encodeURIComponent(seatingClass.value)}`)
  if (response.ok) seating.value = (await response.json()).seats || {}
}

const seatingStudents = computed(() => students.value.filter(student => student.className === seatingClass.value))

function studentById(id) {
  return students.value.find(student => student.id === id)
}

function initialSeatMap() {
  const map = {}
  seatingStudents.value.forEach((student, index) => { map[`seat-${index + 1}`] = student.id })
  return map
}

async function saveSeating() {
  await fetch(`/api/sync-hub/seating/${encodeURIComponent(seatingClass.value)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seats: seating.value }),
  })
  notice.value = 'Sitzplan gespeichert.'
}

function dragStudent(event, studentId) {
  draggedStudentId.value = studentId
  event.dataTransfer.effectAllowed = 'move'
}

function dropStudent(event, seatNumber) {
  event.preventDefault()
  if (!draggedStudentId.value) return
  const targetSeat = `seat-${seatNumber}`
  const occupant = seating.value[targetSeat]
  const sourceSeat = Object.keys(seating.value).find(seat => seating.value[seat] === draggedStudentId.value)
  const next = { ...seating.value }
  if (occupant) {
    if (sourceSeat) next[sourceSeat] = occupant
  } else if (sourceSeat) {
    delete next[sourceSeat]
  }
  next[targetSeat] = draggedStudentId.value
  seating.value = next
  draggedStudentId.value = ''
}

function studentHasAbsence(studentName) {
  return moodleAbsences.value.find(absence => absence.student_name === studentName)
}

async function uploadStudentPhoto(event, studentId) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    await fetch(`/api/sync-hub/students/${encodeURIComponent(studentId)}/photo`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoUrl: reader.result }),
    })
    await loadData()
  }
  reader.readAsDataURL(file)
}

watch(seatingClass, async () => {
  await loadSeating()
  if (!Object.keys(seating.value).length) seating.value = initialSeatMap()
})

const untisAbsenceTab = ref('Meine Abwesenheiten')
const untisClassFilter = ref('Alle')
const untisStatusFilter = ref('Alle')
const untisAbsenceSearch = ref('')

const untisAbsences = computed(() => {
  const search = untisAbsenceSearch.value.toLowerCase()
  return (dashboard.value.absences || []).filter(absence => {
    const matchesClass = untisClassFilter.value === 'Alle' || absence.className === untisClassFilter.value
    const matchesStatus = untisStatusFilter.value === 'Alle' || absence.status === untisStatusFilter.value
    const matchesSearch = !search || `${absence.studentName} ${absence.reason} ${absence.className}`.toLowerCase().includes(search)
    return matchesClass && matchesStatus && matchesSearch
  })
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <header v-if="mode === 'sync'" class="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-6">
      <button @click="mode = 'webuntis'" class="rounded border px-3 py-2">Zur WebUntis-Oberfläche</button>
      <div class="flex gap-2"><button @click="mode = 'moodle'" class="rounded border px-3 py-2">Zu Moodle</button><button @click="triggerSync" class="rounded bg-sky-600 px-4 py-2 font-bold text-white">Synchronisieren</button></div>
    </header>

    <main v-if="mode === 'sync'" class="mx-auto max-w-6xl p-6">
      <p class="text-sm font-bold uppercase tracking-wider text-sky-600">Sync-Hub</p><h1 class="mb-6 mt-1 text-3xl font-bold">Synchronisierte Daten</h1>
      <section class="grid gap-4 md:grid-cols-4">
        <div v-for="stat in [['Stunden', timetable.length], ['Klassen', classes.length], ['Schüler', students.length], ['Fehlzeiten', dashboard.absences?.length || 0]]" :key="stat[0]" class="rounded-xl border bg-white p-5"><p class="text-sm text-slate-500">{{ stat[0] }}</p><p class="mt-3 text-3xl font-bold">{{ stat[1] }}</p></div>
      </section>
      <section class="mt-6 grid gap-6 lg:grid-cols-2">
        <details open class="rounded-xl border border-amber-200 bg-white p-5"><summary class="cursor-pointer list-none text-lg font-bold text-amber-800">Nur in WebUntis ({{ comparison.only_in_webuntis.length }})</summary><div class="mt-3 max-h-72 overflow-y-auto pr-2"><div v-for="item in comparison.only_in_webuntis" :key="item.id" class="mb-2 rounded-lg bg-amber-50 p-3"><p class="font-bold">{{ item.studentName }}</p><p class="text-sm text-slate-500">{{ item.className }} · {{ item.date }} · {{ item.status }}</p></div><p v-if="!comparison.only_in_webuntis.length" class="text-sm text-slate-400">Keine Abweichung</p></div></details>
        <details open class="rounded-xl border border-orange-200 bg-white p-5"><summary class="cursor-pointer list-none text-lg font-bold text-orange-800">Nur in Moodle ({{ comparison.only_in_moodle.length }})</summary><div class="mt-3 max-h-72 overflow-y-auto pr-2"><div v-for="item in comparison.only_in_moodle" :key="item.id" class="mb-2 rounded-lg bg-orange-50 p-3"><p class="font-bold">{{ item.student_name }}</p><p class="text-sm text-slate-500">{{ item.class_name }} · {{ item.date }} · {{ item.status }}</p></div><p v-if="!comparison.only_in_moodle.length" class="text-sm text-slate-400">Keine Abweichung</p></div></details>
      </section>
      <section class="mt-6 grid gap-6 lg:grid-cols-2">
        <details open class="rounded-xl border border-red-200 bg-white p-5"><summary class="cursor-pointer list-none text-lg font-bold text-red-800">Statusabweichungen ({{ comparison.status_difference_count }})</summary><div class="mt-3 max-h-72 overflow-y-auto pr-2"><div v-for="item in comparison.status_differences" :key="item.key" class="mb-3 rounded-lg bg-red-50 p-3 text-sm"><p class="font-bold">{{ item.student_name }} · {{ item.date }}</p><div class="mt-2 flex gap-2"><span class="rounded bg-amber-100 px-2 py-1">WebUntis: {{ item.webuntis_status }}</span><span class="rounded bg-orange-100 px-2 py-1">Moodle: {{ item.moodle_status }}</span></div></div><p v-if="!comparison.status_differences.length" class="text-sm text-slate-400">Keine Statusabweichungen</p></div></details>
        <details open class="rounded-xl border border-emerald-200 bg-white p-5"><summary class="cursor-pointer list-none text-lg font-bold text-emerald-800">Statusübereinstimmungen ({{ comparison.matching_count }})</summary><div class="mt-3 max-h-72 overflow-y-auto pr-2"><div v-for="item in comparison.matching_records" :key="item.key" class="mb-2 rounded-lg bg-emerald-50 p-3 text-sm"><p class="font-bold">{{ item.student_name }} · {{ item.date }}</p><p class="mt-1 text-slate-600">Status: {{ item.webuntis_status }}</p></div><p v-if="!comparison.matching_records.length" class="text-sm text-slate-400">Keine Statusübereinstimmung</p></div></details>
      </section>
      <section class="mt-6 grid gap-6 lg:grid-cols-2">
        <details open class="rounded-xl border bg-white p-5"><summary class="cursor-pointer list-none text-lg font-bold">Logs</summary><div class="mt-3 max-h-72 overflow-y-auto pr-2"><div v-for="log in logs" :key="log.id" class="mb-2 rounded bg-slate-50 p-3 text-sm"><b>{{ log.message }}</b><span class="ml-2 text-slate-500">{{ log.source }} · {{ log.changes }} Änderungen</span></div><p v-if="!logs.length" class="text-sm text-slate-400">Keine Logs vorhanden</p></div></details>
        <details open class="rounded-xl border bg-white p-5"><summary class="cursor-pointer list-none text-lg font-bold">Vergleiche</summary><div class="mt-3 max-h-72 overflow-y-auto pr-2"><div v-for="change in changes" :key="change.id" class="mb-2 rounded bg-slate-50 p-3 text-sm"><b>{{ change.entity_type }}</b> {{ change.entity_id }} – {{ change.change_type }}</div><p v-if="!changes.length" class="text-sm text-slate-400">Keine Vergleiche vorhanden</p></div></details>
      </section>
    </main>

    <main v-else-if="mode === 'moodle'" class="min-h-screen bg-[#f2f4f7]">
      <header class="h-16 border-b bg-white">
        <div class="mx-auto flex h-full max-w-[1500px] items-center justify-between px-8">
          <div class="flex items-center gap-8">
            <div class="text-xl font-black text-[#004b87]">ATIW Moodle</div>
            <nav class="flex gap-6 text-sm"><span>Dashboard</span><span>Meine Kurse</span><span class="border-b-2 border-sky-500 pb-5 pt-5 font-bold text-sky-800">Kursbereich</span><span>Teilnehmer</span><span class="text-slate-400">Bewertungen</span></nav>
          </div>
          <div class="flex gap-2"><button @click="mode = 'sync'" class="rounded border px-3 py-2 text-sm">Zum Sync-Hub</button><button @click="mode = 'webuntis'" class="rounded border px-3 py-2 text-sm">Zu WebUntis</button></div>
        </div>
      </header>

      <div class="mx-auto max-w-[1500px] px-8 py-7">
        <div class="mb-5 flex items-end justify-between">
          <div><p class="text-sm text-sky-700">Meine Kurse / FIA25A</p><h1 class="mt-1 text-3xl font-bold">Klassenübersicht – Sitzplan</h1></div>
          <div class="flex gap-2"><button class="cursor-not-allowed rounded border bg-slate-100 px-4 py-2 text-sm text-slate-400" disabled>Anwesenheit</button><button class="cursor-not-allowed rounded border bg-slate-100 px-4 py-2 text-sm text-slate-400" disabled>Bewertungen</button><button class="cursor-not-allowed rounded border bg-slate-100 px-4 py-2 text-sm text-slate-400" disabled>Gruppen</button></div>
        </div>

        <nav class="mb-5 flex gap-7 border-b text-sm"><button class="border-b-2 border-sky-600 pb-3 font-bold text-sky-800">Sitzplan</button><button class="cursor-not-allowed pb-3 text-slate-400" disabled>Teilnehmerliste</button><button class="cursor-not-allowed pb-3 text-slate-400" disabled>Aktivitäten</button><button class="cursor-not-allowed pb-3 text-slate-400" disabled>Kursnotizen</button></nav>

        <div class="grid gap-5 xl:grid-cols-[220px_minmax(620px,1fr)_340px]">
          <aside class="rounded-xl border bg-white p-4">
            <label class="mb-2 block text-xs font-bold uppercase text-slate-500">Klasse filtern</label>
            <select v-model="seatingClass" class="w-full rounded border px-3 py-2 text-sm"><option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.name">{{ schoolClass.name }}</option></select>
            <h2 class="mb-3 mt-5 font-bold">Schüler ({{ seatingStudents.length }})</h2>
            <div class="max-h-[590px] space-y-2 overflow-y-auto pr-1">
              <div v-for="student in seatingStudents" :key="student.id" draggable="true" @dragstart="dragStudent($event, student.id)" :class="['flex cursor-grab items-center gap-2 rounded-lg border p-2', studentHasAbsence(student.name) ? 'opacity-45 grayscale' : 'bg-white']">
                <img v-if="student.photoUrl" :src="student.photoUrl" class="h-9 w-9 rounded-full object-cover" alt=""/><div v-else class="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{{ student.name.split(' ').map(n => n[0]).join('') }}</div>
                <div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{{ student.name }}</p><p class="text-xs text-slate-500">{{ student.className }}</p></div>
                <label title="Foto hochladen" class="cursor-pointer text-slate-400 hover:text-sky-700"><input type="file" accept="image/*" class="hidden" @change="uploadStudentPhoto($event, student.id)"/><span>●</span></label>
              </div>
            </div>
          </aside>

          <section class="rounded-xl border bg-white p-5">
            <div class="mb-4 flex items-center justify-between"><div><h2 class="text-lg font-bold">Sitzplan {{ seatingClass }}</h2><p class="text-xs text-slate-500">Ziehe Schüler auf einen Platz. Der Sitzplan wird gespeichert.</p></div><button @click="saveSeating" class="rounded bg-sky-600 px-4 py-2 text-sm font-bold text-white">Sitzplan speichern</button></div>
            <div class="mb-3 h-8 rounded bg-slate-100 text-center text-xs font-bold leading-8 text-slate-400">TAFEL / LEHRERANSICHT</div>
            <div class="grid grid-cols-4 gap-3">
              <div v-for="seatNumber in 20" :key="seatNumber" @dragover.prevent @drop="dropStudent($event, seatNumber)" :class="['relative flex min-h-24 items-center justify-center rounded-lg border-2 border-dashed p-2', seating[`seat-${seatNumber}`] ? 'border-sky-200 bg-sky-50/40' : 'border-slate-200 bg-slate-50']">
                <template v-if="studentById(seating[`seat-${seatNumber}`])">
                  <div :class="['relative flex w-full flex-col items-center text-center', studentHasAbsence(studentById(seating[`seat-${seatNumber}`]).name) ? 'opacity-40 grayscale' : '']">
                    <img v-if="studentById(seating[`seat-${seatNumber}`]).photoUrl" :src="studentById(seating[`seat-${seatNumber}`]).photoUrl" class="h-12 w-12 rounded-full object-cover shadow" alt=""/><div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">{{ studentById(seating[`seat-${seatNumber}`]).name.split(' ').map(n => n[0]).join('') }}</div>
                    <p class="mt-2 text-xs font-bold">{{ studentById(seating[`seat-${seatNumber}`]).name }}</p>
                    <span v-if="studentHasAbsence(studentById(seating[`seat-${seatNumber}`]).name)" class="mt-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Fehlt</span>
                    <button v-else @click="moodleOpen = true" class="mt-1 text-[10px] font-bold text-sky-700">Fehlzeit erfassen</button>
                  </div>
                </template>
                <span v-else class="text-xs text-slate-300">Platz {{ seatNumber }}</span>
              </div>
            </div>
          </section>

          <aside class="rounded-xl border bg-white p-4">
            <div class="mb-4 flex items-center justify-between"><h2 class="font-bold">Fehlzeiten</h2><button @click="moodleOpen = true" class="rounded bg-sky-600 px-3 py-2 text-sm font-bold text-white">Eintragen</button></div>
            <div class="mb-3 grid grid-cols-2 gap-2"><input type="date" class="rounded border px-2 py-2 text-xs" value="2026-11-25"/><select class="rounded border px-2 py-2 text-xs"><option>Alle Status</option><option>Nicht bestätigt</option><option>Bestätigt</option><option>Entschuldigt</option></select></div>
            <div class="max-h-[540px] space-y-2 overflow-y-auto">
              <div v-for="absence in moodleAbsences.filter(item => item.class_name === seatingClass)" :key="absence.id" class="rounded-lg border p-3"><div class="flex items-start justify-between"><div><p class="text-sm font-bold">{{ absence.student_name }}</p><p class="mt-1 text-xs text-slate-500">{{ absence.date }} · {{ absence.reason }}</p></div><span :class="['rounded px-2 py-1 text-[10px] font-bold', absence.status === 'EXCUSED' ? 'bg-emerald-100 text-emerald-700' : absence.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700']">{{ absence.status }}</span></div></div>
              <p v-if="!moodleAbsences.some(item => item.class_name === seatingClass)" class="rounded-lg bg-slate-50 p-4 text-sm text-slate-400">Keine Fehlzeiten für {{ seatingClass }}.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>

    <template v-else-if="mode === 'webuntis'">
      <header class="flex h-16 items-center justify-between border-b bg-white px-5"><div class="flex items-center gap-3"><div class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-black text-white">WU</div><div><p class="text-sm font-bold">Untis Demo Schule</p><p class="text-xs text-slate-500">WebUntis</p></div></div><div class="flex gap-2"><button @click="mode = 'sync'" class="rounded bg-sky-600 px-4 py-2 text-sm font-bold text-white">Zum Sync-Hub</button><button @click="mode = 'moodle'" class="rounded border px-4 py-2 text-sm font-bold">Zu Moodle</button></div></header>
      <div class="flex min-h-[calc(100vh-64px)]"><aside class="w-56 border-r bg-white p-3"><button v-for="menu in ['Stundenplan','Fehlzeiten','Klassen','Schüler','Unterricht','Logs','Vergleiche']" :key="menu" @click="activeMenu = menu" :class="['mb-1 w-full rounded px-3 py-2 text-left', activeMenu === menu ? 'bg-orange-50 font-bold text-orange-700' : 'text-slate-600']">{{ menu }}</button></aside><main class="flex-1 p-5"><div class="mb-5 flex justify-between"><h1 class="text-2xl font-bold">{{ activeMenu }}</h1><button v-if="activeMenu === 'Fehlzeiten'" @click="absenceOpen = true" class="rounded bg-orange-600 px-3 py-2 text-sm font-bold text-white">Fehlzeit</button><button v-if="activeMenu === 'Stundenplan'" @click="lessonOpen = true" class="rounded bg-orange-600 px-3 py-2 text-sm font-bold text-white">Stunde</button></div>
        <div v-if="activeMenu === 'Stundenplan'" class="overflow-auto rounded-xl border bg-white"><div class="grid grid-cols-[70px_repeat(5,minmax(140px,1fr))]"><div></div><div v-for="day in days" :key="day" class="border-b border-r px-2 py-3 text-center text-xs font-bold">{{ day }}</div><template v-for="time in ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00']" :key="time"><div class="border-b border-r py-12 pr-2 text-right text-xs text-slate-400">{{ time }}</div><div v-for="dayIndex in 5" :key="dayIndex" class="min-h-24 border-b border-r p-1"><div v-if="lessonForDay(dayIndex - 1)" class="h-full rounded border-l-4 border-orange-400 bg-orange-50 p-2 text-xs"><p class="font-bold">{{ lessonForDay(dayIndex - 1).subject?.name }}</p><p>{{ lessonForDay(dayIndex - 1).room?.name }}</p></div></div></template></div></div>
        <div v-if="activeMenu === 'Fehlzeiten'" class="overflow-hidden rounded-sm border border-slate-200 bg-white">
          <div class="flex h-12 items-end gap-8 border-b px-5 text-sm">
            <button @click="untisAbsenceTab = 'Meine Abwesenheiten'" :class="['h-full px-1', untisAbsenceTab === 'Meine Abwesenheiten' ? 'border-b-2 border-red-400 font-medium text-red-500' : 'text-slate-400']">Meine Abwesenheiten</button>
            <button @click="untisAbsenceTab = 'Fehlzeiten'" :class="['h-full px-1', untisAbsenceTab === 'Fehlzeiten' ? 'border-b-2 border-red-400 font-medium text-red-500' : 'text-slate-400']">Fehlzeiten</button>
          </div>

          <div class="flex items-center gap-3 border-b px-5 py-4">
            <button class="text-slate-300" aria-label="Vorheriger Zeitraum">←</button>
            <input type="date" value="2026-11-24" class="rounded border border-slate-200 px-3 py-2 text-xs text-slate-500"/>
            <button class="text-slate-300" aria-label="Nächster Zeitraum">→</button>
            <input v-model="untisAbsenceSearch" placeholder="Select…" class="ml-2 w-52 rounded border px-3 py-2 text-xs"/>
            <select v-model="untisClassFilter" class="ml-2 rounded border px-3 py-2 text-xs"><option>Alle</option><option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.name">{{ schoolClass.name }}</option></select>
            <select v-model="untisStatusFilter" class="ml-2 rounded border px-3 py-2 text-xs"><option>Alle</option><option value="UNCONFIRMED">UNCONFIRMED</option><option value="CONFIRMED">CONFIRMED</option><option value="EXCUSED">EXCUSED</option></select>
            <div class="ml-auto flex items-center gap-3 text-slate-400"><button class="rounded border px-2 py-1 text-xs">▤</button><button class="rounded border px-2 py-1 text-xs">▧</button><button class="rounded border px-2 py-1 text-xs">▣</button></div>
          </div>

          <div class="px-5 py-5">
            <table class="w-full border-collapse text-left text-xs">
              <thead><tr class="h-10 border-b text-slate-500"><th class="w-12"></th><th class="w-28 font-normal">Von</th><th class="w-28 font-normal">Bis</th><th class="font-normal">Abwesenheitsgrund</th><th class="w-44 font-normal">Status</th><th class="w-40 font-normal">Text</th></tr></thead>
              <tbody>
                <tr v-for="absence in untisAbsences" :key="absence.id" class="h-16 border-b border-slate-100"><td><input type="checkbox" class="ml-1"/></td><td><div class="flex items-center gap-2"><span class="text-slate-400">◔</span><span>{{ absence.date }}<br/><span class="text-slate-400">09:55</span></span></div></td><td>{{ absence.date }}<br/><span class="text-slate-400">15:25</span></td><td><p class="font-medium text-slate-700">{{ absence.reason }}</p><p class="mt-1 text-slate-400">{{ absence.studentName }} · {{ absence.className }}</p></td><td><span :class="['rounded px-2 py-1 text-[10px] font-bold text-white', absence.status === 'EXCUSED' ? 'bg-emerald-500' : absence.status === 'CONFIRMED' ? 'bg-sky-500' : 'bg-amber-500']">{{ absence.status === 'EXCUSED' ? 'entschuldigt mit Attest/Fremdbeleg' : absence.status === 'CONFIRMED' ? 'bestätigt' : 'nicht bestätigt' }}</span></td><td class="text-slate-400">{{ absence.status === 'CONFIRMED' ? 'zur Beerdigung' : '—' }}</td></tr>
              </tbody>
            </table>
            <p v-if="!untisAbsences.length" class="py-12 text-center text-sm text-slate-400">Keine Abwesenheiten gefunden.</p>
            <div class="mt-2 border-t px-1 pt-3 text-xs text-slate-500">{{ untisAbsences.length }} Elemente</div>
          </div>

          <div class="border-t px-5 py-4"><button @click="absenceOpen = true" class="rounded-full border px-5 py-2 text-sm text-slate-500">Entschuldigungsschreiben drucken →</button></div>
        </div>
        <div v-if="activeMenu === 'Klassen'" class="grid gap-3 md:grid-cols-3"><div v-for="schoolClass in classes" :key="schoolClass.id" class="rounded border bg-white p-4"><p class="font-bold">{{ schoolClass.name }}</p><p class="text-xs text-slate-500">{{ schoolClass.track }}</p></div></div>
        <div v-if="activeMenu === 'Schüler'" class="rounded border bg-white p-5"><input v-model="studentFilter" class="mb-4 w-full rounded border px-3 py-2" placeholder="Schüler suchen"/><table class="w-full text-sm"><thead><tr><th>Schüler</th><th>Klasse</th><th>Richtung</th></tr></thead><tbody><tr v-for="student in visibleStudents" :key="student.id" class="border-b"><td class="py-3 font-bold">{{ student.name }}</td><td>{{ student.className }}</td><td>{{ student.trackCode }}</td></tr></tbody></table></div>
        <div v-if="activeMenu === 'Unterricht'" class="grid gap-3 md:grid-cols-3"><div v-for="subject in subjects" :key="subject.id" class="rounded border bg-white p-4"><p class="font-bold">{{ subject.name }}</p><p class="text-xs text-slate-500">{{ subject.shortName }}</p></div></div>
        <div v-if="activeMenu === 'Logs'" class="rounded border bg-white p-5"><div v-for="log in logs" :key="log.id" class="mb-2 rounded bg-slate-50 p-3 text-sm">{{ log.created_at }} · {{ log.source }} · {{ log.message }}</div></div>
        <div v-if="activeMenu === 'Vergleiche'" class="rounded border bg-white p-5"><div v-for="change in changes" :key="change.id" class="mb-2 rounded bg-slate-50 p-3 text-sm">{{ change.entity_type }} {{ change.entity_id }} – {{ change.change_type }}</div></div>
      </main></div>
    </template>

    <div v-if="absenceOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createAbsence" class="w-full max-w-lg space-y-3 rounded bg-white p-5"><h2 class="font-bold">Neue Fehlzeit</h2><input name="studentName" required class="w-full rounded border px-3 py-2" placeholder="Schülername"/><input name="className" required class="w-full rounded border px-3 py-2" placeholder="Klasse"/><input name="date" type="date" value="2026-11-23" class="w-full rounded border px-3 py-2"/><input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund"/><input name="status" type="hidden" value="UNCONFIRMED"/><button class="rounded bg-orange-600 px-4 py-2 text-white">Speichern</button></form></div>
    <div v-if="lessonOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createLesson" class="w-full max-w-lg space-y-3 rounded bg-white p-5"><h2 class="font-bold">Neue Stunde</h2><select name="subjectId" class="w-full rounded border px-3 py-2"><option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option></select><select name="classGroupId" class="w-full rounded border px-3 py-2"><option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.id">{{ schoolClass.name }}</option></select><select name="roomId" class="w-full rounded border px-3 py-2"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option></select><select name="timeSlotId" class="w-full rounded border px-3 py-2"><option value="ts_monday_1">Montag 08:00</option></select><input name="teacherId" type="hidden" value="user_teacher_1"/><button class="rounded bg-orange-600 px-4 py-2 text-white">Speichern</button></form></div>
    <div v-if="moodleOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form @submit.prevent="createMoodleAbsence" class="w-full max-w-lg space-y-3 rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-lg font-bold">Fehlzeit erfassen</h2>
        <select name="class_name" v-model="seatingClass" required class="w-full rounded border px-3 py-2"><option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.name">{{ schoolClass.name }}</option></select>
        <select name="student_name" required class="w-full rounded border px-3 py-2"><option value="">Schüler auswählen</option><option v-for="student in seatingStudents" :key="student.id" :value="student.name">{{ student.name }}</option></select>
        <input name="date" type="date" value="2026-11-25" required class="w-full rounded border px-3 py-2"/>
        <input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund: Krankheit, Termin, verspätet …"/>
        <select name="status" class="w-full rounded border px-3 py-2"><option value="UNCONFIRMED">Nicht bestätigt</option><option value="CONFIRMED">Bestätigt</option><option value="EXCUSED">Entschuldigt</option></select>
        <div class="flex justify-end gap-2 pt-2"><button type="button" @click="moodleOpen = false" class="rounded border px-4 py-2">Abbrechen</button><button class="rounded bg-sky-600 px-4 py-2 font-bold text-white">Speichern</button></div>
      </form>
    </div>
  </div>
</template>
