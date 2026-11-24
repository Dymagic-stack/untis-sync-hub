<script setup>
import { computed, onMounted, ref } from 'vue'

const mode = ref('webuntis')
const activeMenu = ref('Stundenplan')
const loading = ref(true)
const notice = ref('')
const dashboard = ref({ stats: {}, classes: [], absences: [] })
const timetable = ref([])
const classes = ref([])
const subjects = ref([])
const rooms = ref([])
const students = ref([])
const studentFilter = ref('')
const absenceOpen = ref(false)
const lessonOpen = ref(false)
const moodleOpen = ref(false)
const syncStatus = ref({ status: 'idle', counts: {} })
const syncLogs = ref([])
const syncChanges = ref([])
const moodleAbsences = ref([])
const systemComparison = ref({ only_in_webuntis: [], only_in_moodle: [], webuntis_count: 0, moodle_count: 0, matching_count: 0 })

const api = '/api/sync-hub'
const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

async function loadData() {
  loading.value = true
  try {
    const [dashRes, timetableRes, classesRes, subjectsRes, roomsRes, studentsRes, statusRes, logsRes, changesRes, moodleRes, comparisonRes] = await Promise.all([
      fetch(`${api}/dashboard`), fetch(`${api}/timetable`), fetch(`${api}/classes`),
      fetch(`${api}/subjects`), fetch(`${api}/rooms`), fetch(`${api}/students`), fetch(`${api}/sync/status`),
      fetch(`${api}/sync/logs`), fetch(`${api}/sync/changes`), fetch(`${api}/moodle/absences`), fetch(`${api}/comparison`),
    ])
    dashboard.value = await dashRes.json()
    timetable.value = (await timetableRes.json()).lessons || []
    classes.value = await classesRes.json()
    subjects.value = await subjectsRes.json()
    rooms.value = await roomsRes.json()
    students.value = (await studentsRes.json()).students || []
    syncStatus.value = await statusRes.json()
    syncLogs.value = await logsRes.json()
    syncChanges.value = await changesRes.json()
    moodleAbsences.value = await moodleRes.json()
    systemComparison.value = await comparisonRes.json()
  } catch (error) {
    notice.value = 'Die Laravel-API ist nicht erreichbar.'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const visibleStudents = computed(() => {
  const needle = studentFilter.value.toLowerCase()
  return students.value.filter((student) =>
    `${student.name} ${student.className} ${student.trackCode}`.toLowerCase().includes(needle),
  ).slice(0, 100)
})

async function triggerSync() {
  const response = await fetch(`${api}/sync`, { method: 'POST' })
  const payload = await response.json()
  syncStatus.value = payload.sync
  await loadData()
  notice.value = 'Synchronisation erfolgreich abgeschlossen.'
}

async function createAbsence(event) {
  const form = new FormData(event.currentTarget)
  const response = await fetch(`${api}/absences`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)),
  })
  if (!response.ok) return
  absenceOpen.value = false
  await loadData()
  notice.value = 'Fehlzeit wurde synchronisiert.'
}

async function createLesson(event) {
  const form = new FormData(event.currentTarget)
  const response = await fetch(`${api}/lessons`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)),
  })
  if (!response.ok) return
  lessonOpen.value = false
  await loadData()
  notice.value = 'Stunde wurde synchronisiert.'
}

function lessonForDay(dayIndex) {
  const names = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
  return timetable.value.find((lesson) => lesson.timeSlot?.dayOfWeek === names[dayIndex])
}

async function updateAbsence(absence) {
  const reason = window.prompt('Neuer Grund', absence.reason)
  if (!reason) return
  await fetch(`${api}/absences/${absence.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, status: absence.status }),
  })
  await loadData()
  notice.value = 'Fehlzeit wurde geändert.'
}

async function deleteAbsence(absence) {
  if (!window.confirm(`Fehlzeit von ${absence.studentName} löschen?`)) return
  await fetch(`${api}/absences/${absence.id}`, { method: 'DELETE' })
  await loadData()
  notice.value = 'Fehlzeit wurde gelöscht.'
}

async function deleteLesson(lesson) {
  if (!window.confirm('Diese Stunde löschen?')) return
  await fetch(`${api}/lessons/${lesson.id}`, { method: 'DELETE' })
  await loadData()
  notice.value = 'Stunde wurde gelöscht.'
}

async function createMoodleAbsence(event) {
  const form = new FormData(event.currentTarget)
  const payload = {
    student_name: form.get('student_name'),
    class_name: form.get('class_name'),
    date: form.get('date'),
    reason: form.get('reason'),
    status: 'UNCONFIRMED',
  }
  const response = await fetch(`${api}/moodle/absences`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  if (!response.ok) return
  moodleOpen.value = false
  await loadData()
  notice.value = 'Moodle-Fehlzeit wurde gespeichert und verglichen.'
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <header v-if="mode === 'sync'" class="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-6">
      <button @click="mode = 'webuntis'" class="rounded-lg border px-3 py-2 text-sm font-semibold">Zur WebUntis-Oberfläche</button>
      <button @click="triggerSync" class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">Synchronisieren</button>
    </header>

    <main v-if="mode === 'sync'" class="mx-auto max-w-6xl p-6">
      <p class="text-sm font-bold uppercase tracking-wider text-sky-600">Sync-Hub</p>
      <h1 class="mb-6 mt-1 text-3xl font-bold text-slate-900">Synchronisierte Daten</h1>
      <section class="grid gap-4 md:grid-cols-4">
        <div v-for="stat in [
          ['Stunden', timetable.length], ['Klassen', classes.length], ['Schüler', students.length], ['Fehlzeiten', dashboard.absences?.length || 0]
        ]" :key="stat[0]" class="rounded-xl border bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">{{ stat[0] }}</p><p class="mt-3 text-3xl font-bold">{{ stat[1] }}</p>
        </div>
      </section>
      <section class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="rounded-xl border border-amber-200 bg-white p-5">
          <h2 class="mb-3 text-lg font-bold text-amber-800">Nur in WebUntis</h2>
          <div v-for="item in systemComparison.only_in_webuntis.slice(0, 20)" :key="item.id" class="mb-2 rounded-lg bg-amber-50 p-3 text-sm">
            <p class="font-bold">{{ item.studentName }}</p><p class="text-slate-500">{{ item.className }} · {{ item.date }}</p>
          </div>
          <p v-if="!systemComparison.only_in_webuntis.length" class="text-sm text-slate-400">Keine Abweichung</p>
        </div>
        <div class="rounded-xl border border-orange-200 bg-white p-5">
          <h2 class="mb-3 text-lg font-bold text-orange-800">Nur in Moodle</h2>
          <div v-for="item in systemComparison.only_in_moodle.slice(0, 20)" :key="item.id" class="mb-2 rounded-lg bg-orange-50 p-3 text-sm">
            <p class="font-bold">{{ item.student_name }}</p><p class="text-slate-500">{{ item.class_name }} · {{ item.date }}</p>
          </div>
          <p v-if="!systemComparison.only_in_moodle.length" class="text-sm text-slate-400">Keine Abweichung</p>
        </div>
      </section>
    </main>

    <template v-else>
      <header class="flex h-16 items-center justify-between border-b bg-white px-5">
        <div class="flex items-center gap-3"><div class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-black text-white">WU</div><div><p class="text-sm font-bold">Untis Demo Schule</p><p class="text-xs text-slate-500">WebUntis</p></div></div>
        <div class="flex gap-2">
          <button @click="mode = 'sync'" class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">Zum Sync-Hub</button>
          <button @click="mode = 'moodle'" class="rounded-lg border px-3 py-2 text-sm font-semibold">Zu Moodle</button>
        </div>
      </header>
      <div class="flex min-h-[calc(100vh-64px)]">
        <aside class="w-56 border-r bg-white p-3">
          <button v-for="menu in ['Stundenplan','Fehlzeiten','Klassen','Schüler','Unterricht','Logs','Vergleiche']" :key="menu" @click="activeMenu = menu" :class="['mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm', activeMenu === menu ? 'bg-orange-50 font-bold text-orange-700' : 'text-slate-600']">{{ menu }}</button>
        </aside>
        <main class="flex-1 p-5">
          <div class="mb-5 flex items-center justify-between"><h1 class="text-2xl font-bold">{{ activeMenu }}</h1>
            <button v-if="activeMenu === 'Fehlzeiten'" @click="absenceOpen = true" class="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white">Fehlzeit</button>
            <button v-if="activeMenu === 'Stundenplan'" @click="lessonOpen = true" class="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white">Stunde</button>
          </div>

          <div v-if="activeMenu === 'Stundenplan'" class="overflow-auto rounded-xl border bg-white">
            <div class="grid grid-cols-[70px_repeat(5,minmax(140px,1fr))]">
              <div></div><div v-for="day in days" :key="day" class="border-b border-r px-2 py-3 text-center text-xs font-bold">{{ day }}</div>
              <template v-for="time in ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00']" :key="time">
                <div class="border-b border-r py-12 pr-2 text-right text-xs text-slate-400">{{ time }}</div>
                <div v-for="(day, dayIndex) in days" :key="day" class="min-h-24 border-b border-r p-1">
                  <div v-if="lessonForDay(dayIndex)" class="rounded-md border-l-4 border-orange-400 bg-orange-50 p-2 text-xs">
                    <p class="font-bold">{{ lessonForDay(dayIndex).subject?.name }}</p><p>{{ lessonForDay(dayIndex).room?.name }}</p><button @click.stop="deleteLesson(lessonForDay(dayIndex))" class="mt-1 text-xs font-bold text-red-700">Löschen</button>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-if="activeMenu === 'Fehlzeiten'" class="rounded-xl border bg-white p-5">
            <table class="w-full text-left text-sm"><thead><tr class="border-b text-xs text-slate-400"><th class="py-3">Schüler</th><th>Klasse</th><th>Datum</th><th>Grund</th><th>Status</th><th>Aktionen</th></tr></thead><tbody>
              <tr v-for="absence in dashboard.absences" :key="absence.id" class="border-b"><td class="py-3 font-semibold">{{ absence.studentName }}</td><td>{{ absence.className }}</td><td>{{ absence.date }}</td><td>{{ absence.reason }}</td><td>{{ absence.status }}</td><td><button @click="updateAbsence(absence)" class="mr-2 text-xs font-bold text-sky-700">Ändern</button><button @click="deleteAbsence(absence)" class="text-xs font-bold text-red-700">Löschen</button></td></tr>
            </tbody></table>
          </div>

          <div v-if="activeMenu === 'Klassen'" class="grid gap-3 md:grid-cols-3"><div v-for="schoolClass in classes" :key="schoolClass.id" class="rounded-xl border bg-white p-4"><p class="font-bold">{{ schoolClass.name }}</p><p class="text-xs text-slate-500">{{ schoolClass.track }}</p></div></div>

          <div v-if="activeMenu === 'Schüler'" class="rounded-xl border bg-white p-5"><input v-model="studentFilter" class="mb-4 w-full rounded-lg border px-3 py-2" placeholder="Name, Klasse oder Ausbildungsrichtung suchen"/><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Schüler</th><th>Klasse</th><th>Richtung</th><th>Status</th></tr></thead><tbody><tr v-for="student in visibleStudents" :key="student.id" class="border-b"><td class="py-3 font-semibold">{{ student.name }}</td><td>{{ student.className }}</td><td>{{ student.trackCode }}</td><td>{{ student.status }}</td></tr></tbody></table></div>

          <div v-if="activeMenu === 'Unterricht'" class="grid gap-3 md:grid-cols-3"><div v-for="subject in subjects" :key="subject.id" class="rounded-xl border bg-white p-4"><p class="font-bold">{{ subject.name }}</p><p class="text-xs text-slate-500">{{ subject.shortName }} · {{ subject.area }}</p></div></div>

          <div v-if="activeMenu === 'Logs'" class="rounded-xl border bg-white p-5"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Zeit</th><th>Quelle</th><th>Richtung</th><th>Status</th><th>Änderungen</th><th>Meldung</th></tr></thead><tbody><tr v-for="log in syncLogs" :key="log.id" class="border-b"><td class="py-3">{{ log.created_at }}</td><td>{{ log.source }}</td><td>{{ log.direction }}</td><td>{{ log.status }}</td><td>{{ log.changes }}</td><td>{{ log.message }}</td></tr></tbody></table></div>

          <div v-if="activeMenu === 'Vergleiche'" class="rounded-xl border bg-white p-5"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Typ</th><th>Datensatz</th><th>Vergleich</th><th>Vorher</th><th>Nachher</th></tr></thead><tbody><tr v-for="change in syncChanges" :key="change.id" class="border-b"><td class="py-3 font-semibold">{{ change.entity_type }}</td><td>{{ change.entity_id }}</td><td>{{ change.change_type }}</td><td>{{ JSON.stringify(change.before || {}) }}</td><td>{{ JSON.stringify(change.after || {}) }}</td></tr></tbody></table></div>
        </main>
      </div>
    </template>

    <div v-if="notice" class="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">{{ notice }}</div>

    <div v-if="absenceOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createAbsence" class="w-full max-w-lg space-y-3 rounded-xl bg-white p-5"><h2 class="text-lg font-bold">Neue Fehlzeit</h2><input name="studentName" required class="w-full rounded border px-3 py-2" placeholder="Schülername"/><input name="className" required class="w-full rounded border px-3 py-2" placeholder="Klasse"/><input name="date" type="date" value="2026-11-23" class="w-full rounded border px-3 py-2"/><input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund"/><input name="status" type="hidden" value="UNCONFIRMED"/><div class="flex justify-end gap-2"><button type="button" @click="absenceOpen = false" class="rounded border px-4 py-2">Abbrechen</button><button class="rounded bg-orange-600 px-4 py-2 font-bold text-white">Speichern</button></div></form></div>

    <div v-if="lessonOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createLesson" class="w-full max-w-lg space-y-3 rounded-xl bg-white p-5"><h2 class="text-lg font-bold">Neue Stunde</h2><select name="subjectId" class="w-full rounded border px-3 py-2"><option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option></select><select name="classGroupId" class="w-full rounded border px-3 py-2"><option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.id">{{ schoolClass.name }}</option></select><select name="roomId" class="w-full rounded border px-3 py-2"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option></select><select name="timeSlotId" class="w-full rounded border px-3 py-2"><option value="ts_monday_1">Montag 08:00</option><option value="ts_monday_2">Montag 09:00</option><option value="ts_tuesday_1">Dienstag 08:00</option></select><input name="teacherId" type="hidden" value="user_teacher_1"/><div class="flex justify-end gap-2"><button type="button" @click="lessonOpen = false" class="rounded border px-4 py-2">Abbrechen</button><button class="rounded bg-orange-600 px-4 py-2 font-bold text-white">Speichern</button></div></form></div>

    <div v-if="moodleOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createMoodleAbsence" class="w-full max-w-lg space-y-3 rounded-xl bg-white p-5"><h2 class="text-lg font-bold">Fehlzeit in Moodle erfassen</h2><input name="student_name" required class="w-full rounded border px-3 py-2" placeholder="Schülername"/><input name="class_name" required class="w-full rounded border px-3 py-2" placeholder="Klasse"/><input name="date" type="date" value="2026-11-23" class="w-full rounded border px-3 py-2"/><input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund"/><div class="flex justify-end gap-2"><button type="button" @click="moodleOpen = false" class="rounded border px-4 py-2">Abbrechen</button><button class="rounded bg-sky-600 px-4 py-2 font-bold text-white">Speichern</button></div></form></div>

    <template v-else-if="mode === 'webuntis'">
      <header class="flex h-16 items-center justify-between border-b bg-white px-5">
        <div class="flex items-center gap-3"><div class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-black text-white">WU</div><div><p class="text-sm font-bold">Untis Demo Schule</p><p class="text-xs text-slate-500">WebUntis</p></div></div>
        <div class="flex gap-2">
          <button @click="mode = 'sync'" class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">Zum Sync-Hub</button>
          <button @click="mode = 'webuntis'" class="rounded-lg border px-3 py-2 text-sm font-semibold">Zu WebUntis</button>
        </div>
      </header>
      <div class="flex min-h-[calc(100vh-64px)]">
        <aside class="w-56 border-r bg-white p-3">
          <button v-for="menu in ['Stundenplan','Fehlzeiten','Klassen','Schüler','Unterricht','Logs','Vergleiche']" :key="menu" @click="activeMenu = menu" :class="['mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm', activeMenu === menu ? 'bg-orange-50 font-bold text-orange-700' : 'text-slate-600']">{{ menu }}</button>
        </aside>
        <main class="flex-1 p-5">
          <div class="mb-5 flex items-center justify-between"><h1 class="text-2xl font-bold">{{ activeMenu }}</h1>
            <button v-if="activeMenu === 'Fehlzeiten'" @click="absenceOpen = true" class="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white">Fehlzeit</button>
            <button v-if="activeMenu === 'Stundenplan'" @click="lessonOpen = true" class="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white">Stunde</button>
          </div>

          <div v-if="activeMenu === 'Stundenplan'" class="overflow-auto rounded-xl border bg-white">
            <div class="grid grid-cols-[70px_repeat(5,minmax(140px,1fr))]">
              <div></div><div v-for="day in days" :key="day" class="border-b border-r px-2 py-3 text-center text-xs font-bold">{{ day }}</div>
              <template v-for="time in ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00']" :key="time">
                <div class="border-b border-r py-12 pr-2 text-right text-xs text-slate-400">{{ time }}</div>
                <div v-for="(day, dayIndex) in days" :key="day" class="min-h-24 border-b border-r p-1">
                  <div v-if="lessonForDay(dayIndex)" class="rounded-md border-l-4 border-orange-400 bg-orange-50 p-2 text-xs">
                    <p class="font-bold">{{ lessonForDay(dayIndex).subject?.name }}</p><p>{{ lessonForDay(dayIndex).room?.name }}</p><button @click.stop="deleteLesson(lessonForDay(dayIndex))" class="mt-1 text-xs font-bold text-red-700">Löschen</button>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-if="activeMenu === 'Fehlzeiten'" class="rounded-xl border bg-white p-5">
            <table class="w-full text-left text-sm"><thead><tr class="border-b text-xs text-slate-400"><th class="py-3">Schüler</th><th>Klasse</th><th>Datum</th><th>Grund</th><th>Status</th><th>Aktionen</th></tr></thead><tbody>
              <tr v-for="absence in dashboard.absences" :key="absence.id" class="border-b"><td class="py-3 font-semibold">{{ absence.studentName }}</td><td>{{ absence.className }}</td><td>{{ absence.date }}</td><td>{{ absence.reason }}</td><td>{{ absence.status }}</td><td><button @click="updateAbsence(absence)" class="mr-2 text-xs font-bold text-sky-700">Ändern</button><button @click="deleteAbsence(absence)" class="text-xs font-bold text-red-700">Löschen</button></td></tr>
            </tbody></table>
          </div>

          <div v-if="activeMenu === 'Klassen'" class="grid gap-3 md:grid-cols-3"><div v-for="schoolClass in classes" :key="schoolClass.id" class="rounded-xl border bg-white p-4"><p class="font-bold">{{ schoolClass.name }}</p><p class="text-xs text-slate-500">{{ schoolClass.track }}</p></div></div>

          <div v-if="activeMenu === 'Schüler'" class="rounded-xl border bg-white p-5"><input v-model="studentFilter" class="mb-4 w-full rounded-lg border px-3 py-2" placeholder="Name, Klasse oder Ausbildungsrichtung suchen"/><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Schüler</th><th>Klasse</th><th>Richtung</th><th>Status</th></tr></thead><tbody><tr v-for="student in visibleStudents" :key="student.id" class="border-b"><td class="py-3 font-semibold">{{ student.name }}</td><td>{{ student.className }}</td><td>{{ student.trackCode }}</td><td>{{ student.status }}</td></tr></tbody></table></div>

          <div v-if="activeMenu === 'Unterricht'" class="grid gap-3 md:grid-cols-3"><div v-for="subject in subjects" :key="subject.id" class="rounded-xl border bg-white p-4"><p class="font-bold">{{ subject.name }}</p><p class="text-xs text-slate-500">{{ subject.shortName }} · {{ subject.area }}</p></div></div>

          <div v-if="activeMenu === 'Logs'" class="rounded-xl border bg-white p-5"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Zeit</th><th>Quelle</th><th>Richtung</th><th>Status</th><th>Änderungen</th><th>Meldung</th></tr></thead><tbody><tr v-for="log in syncLogs" :key="log.id" class="border-b"><td class="py-3">{{ log.created_at }}</td><td>{{ log.source }}</td><td>{{ log.direction }}</td><td>{{ log.status }}</td><td>{{ log.changes }}</td><td>{{ log.message }}</td></tr></tbody></table></div>

          <div v-if="activeMenu === 'Vergleiche'" class="rounded-xl border bg-white p-5"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Typ</th><th>Datensatz</th><th>Vergleich</th><th>Vorher</th><th>Nachher</th></tr></thead><tbody><tr v-for="change in syncChanges" :key="change.id" class="border-b"><td class="py-3 font-semibold">{{ change.entity_type }}</td><td>{{ change.entity_id }}</td><td>{{ change.change_type }}</td><td>{{ JSON.stringify(change.before || {}) }}</td><td>{{ JSON.stringify(change.after || {}) }}</td></tr></tbody></table></div>
        </main>
      </div>
    </template>

    <div v-if="notice" class="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">{{ notice }}</div>

    <div v-if="absenceOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createAbsence" class="w-full max-w-lg space-y-3 rounded-xl bg-white p-5"><h2 class="text-lg font-bold">Neue Fehlzeit</h2><input name="studentName" required class="w-full rounded border px-3 py-2" placeholder="Schülername"/><input name="className" required class="w-full rounded border px-3 py-2" placeholder="Klasse"/><input name="date" type="date" value="2026-11-23" class="w-full rounded border px-3 py-2"/><input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund"/><input name="status" type="hidden" value="UNCONFIRMED"/><div class="flex justify-end gap-2"><button type="button" @click="absenceOpen = false" class="rounded border px-4 py-2">Abbrechen</button><button class="rounded bg-orange-600 px-4 py-2 font-bold text-white">Speichern</button></div></form></div>

    <div v-if="lessonOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createLesson" class="w-full max-w-lg space-y-3 rounded-xl bg-white p-5"><h2 class="text-lg font-bold">Neue Stunde</h2><select name="subjectId" class="w-full rounded border px-3 py-2"><option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option></select><select name="classGroupId" class="w-full rounded border px-3 py-2"><option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.id">{{ schoolClass.name }}</option></select><select name="roomId" class="w-full rounded border px-3 py-2"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option></select><select name="timeSlotId" class="w-full rounded border px-3 py-2"><option value="ts_monday_1">Montag 08:00</option><option value="ts_monday_2">Montag 09:00</option><option value="ts_tuesday_1">Dienstag 08:00</option></select><input name="teacherId" type="hidden" value="user_teacher_1"/><div class="flex justify-end gap-2"><button type="button" @click="lessonOpen = false" class="rounded border px-4 py-2">Abbrechen</button><button class="rounded bg-orange-600 px-4 py-2 font-bold text-white">Speichern</button></div></form></div>

    <div v-if="moodleOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createMoodleAbsence" class="w-full max-w-lg space-y-3 rounded-xl bg-white p-5"><h2 class="text-lg font-bold">Fehlzeit in Moodle erfassen</h2><input name="student_name" required class="w-full rounded border px-3 py-2" placeholder="Schülername"/><input name="class_name" required class="w-full rounded border px-3 py-2" placeholder="Klasse"/><input name="date" type="date" value="2026-11-23" class="w-full rounded border px-3 py-2"/><input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund"/><div class="flex justify-end gap-2"><button type="button" @click="moodleOpen = false" class="rounded border px-4 py-2">Abbrechen</button><button class="rounded bg-sky-600 px-4 py-2 font-bold text-white">Speichern</button></div></form></div>
  </div>
</template>
