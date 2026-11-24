<script setup>
import { computed, onMounted, ref } from 'vue'

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

onMounted(loadData)

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
  const payload = { student_name: form.get('student_name'), class_name: form.get('class_name'), date: form.get('date'), reason: form.get('reason'), status: 'UNCONFIRMED' }
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
      <header class="h-16 border-b bg-white"><div class="mx-auto flex h-full max-w-7xl items-center justify-between px-6"><div class="flex items-center gap-8"><div class="text-xl font-black text-[#004b87]">ATIW Moodle</div><nav class="flex gap-6 text-sm"><span>Startseite</span><span class="border-b-2 border-sky-500 pb-5 pt-5">Meine Kurse</span></nav></div><div class="flex gap-3"><button @click="mode = 'sync'" class="rounded border px-3 py-2">Zum Sync-Hub</button><button @click="mode = 'webuntis'" class="rounded border px-3 py-2">Zu WebUntis</button></div></div></header>
      <div class="mx-auto max-w-7xl px-10 py-12"><p class="text-sm text-sky-600">Kurse / FST-Klassen</p><h1 class="mt-2 text-3xl font-bold">FST-Klassen</h1><nav class="mt-8 flex gap-8 border-b text-sm"><span class="border-b-2 border-sky-500 pb-3 text-sky-700">Kursbereich</span><span class="pb-3 text-slate-500">Mehr</span></nav>
        <div class="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]"><section><h2 class="mb-4 text-lg font-bold">Stundenplan</h2><div class="overflow-auto rounded-xl border bg-white"><div class="grid grid-cols-[70px_repeat(5,minmax(130px,1fr))]"><div></div><div v-for="day in days" :key="day" class="border-b border-r px-2 py-3 text-center text-xs font-bold">{{ day }}</div><template v-for="time in ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00']" :key="time"><div class="border-b border-r py-12 pr-2 text-right text-xs text-slate-400">{{ time }}</div><div v-for="dayIndex in 5" :key="dayIndex" class="min-h-24 border-b border-r p-1"><div v-if="lessonForDay(dayIndex - 1)" class="h-full rounded-md border-l-4 border-sky-500 bg-sky-50 p-2 text-xs"><p class="font-bold">{{ lessonForDay(dayIndex - 1).subject?.name }}</p><p>{{ lessonForDay(dayIndex - 1).classGroup?.name }}</p><button @click="moodleOpen = true" class="mt-2 text-xs font-bold text-sky-700">Fehlzeit erfassen</button></div></div></template></div></div></section>
          <aside><div class="rounded-xl border bg-white p-5"><h2 class="mb-3 font-bold">Eigene Moodle-Fehlzeiten</h2><div v-for="absence in moodleAbsences" :key="absence.id" class="mb-2 rounded border p-3 text-sm"><p class="font-bold">{{ absence.student_name }}</p><p class="text-slate-500">{{ absence.class_name }} · {{ absence.date }}</p><p class="text-xs text-orange-700">{{ absence.reason }}</p><span class="ml-2 rounded bg-orange-100 px-2 py-1 text-xs">{{ absence.status }}</span></div><p v-if="!moodleAbsences.length" class="text-sm text-slate-400">Noch keine Fehlzeiten erfasst.</p></div></aside></div>
      </div>
    </main>

    <template v-else-if="mode === 'webuntis'">
      <header class="flex h-16 items-center justify-between border-b bg-white px-5"><div class="flex items-center gap-3"><div class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-black text-white">WU</div><div><p class="text-sm font-bold">Untis Demo Schule</p><p class="text-xs text-slate-500">WebUntis</p></div></div><div class="flex gap-2"><button @click="mode = 'sync'" class="rounded bg-sky-600 px-4 py-2 text-sm font-bold text-white">Zum Sync-Hub</button><button @click="mode = 'moodle'" class="rounded border px-4 py-2 text-sm font-bold">Zu Moodle</button></div></header>
      <div class="flex min-h-[calc(100vh-64px)]"><aside class="w-56 border-r bg-white p-3"><button v-for="menu in ['Stundenplan','Fehlzeiten','Klassen','Schüler','Unterricht','Logs','Vergleiche']" :key="menu" @click="activeMenu = menu" :class="['mb-1 w-full rounded px-3 py-2 text-left', activeMenu === menu ? 'bg-orange-50 font-bold text-orange-700' : 'text-slate-600']">{{ menu }}</button></aside><main class="flex-1 p-5"><div class="mb-5 flex justify-between"><h1 class="text-2xl font-bold">{{ activeMenu }}</h1><button v-if="activeMenu === 'Fehlzeiten'" @click="absenceOpen = true" class="rounded bg-orange-600 px-3 py-2 text-sm font-bold text-white">Fehlzeit</button><button v-if="activeMenu === 'Stundenplan'" @click="lessonOpen = true" class="rounded bg-orange-600 px-3 py-2 text-sm font-bold text-white">Stunde</button></div>
        <div v-if="activeMenu === 'Stundenplan'" class="overflow-auto rounded-xl border bg-white"><div class="grid grid-cols-[70px_repeat(5,minmax(140px,1fr))]"><div></div><div v-for="day in days" :key="day" class="border-b border-r px-2 py-3 text-center text-xs font-bold">{{ day }}</div><template v-for="time in ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00']" :key="time"><div class="border-b border-r py-12 pr-2 text-right text-xs text-slate-400">{{ time }}</div><div v-for="dayIndex in 5" :key="dayIndex" class="min-h-24 border-b border-r p-1"><div v-if="lessonForDay(dayIndex - 1)" class="h-full rounded border-l-4 border-orange-400 bg-orange-50 p-2 text-xs"><p class="font-bold">{{ lessonForDay(dayIndex - 1).subject?.name }}</p><p>{{ lessonForDay(dayIndex - 1).room?.name }}</p></div></div></template></div></div>
        <div v-if="activeMenu === 'Fehlzeiten'" class="rounded-xl border bg-white p-5"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th>Schüler</th><th>Klasse</th><th>Datum</th><th>Grund</th><th>Status</th><th></th></tr></thead><tbody><tr v-for="absence in dashboard.absences" :key="absence.id" class="border-b"><td class="py-3 font-bold">{{ absence.studentName }}</td><td>{{ absence.className }}</td><td>{{ absence.date }}</td><td>{{ absence.reason }}</td><td>{{ absence.status }}</td><td><button @click="deleteAbsence(absence)" class="text-xs font-bold text-red-700">Löschen</button></td></tr></tbody></table></div>
        <div v-if="activeMenu === 'Klassen'" class="grid gap-3 md:grid-cols-3"><div v-for="schoolClass in classes" :key="schoolClass.id" class="rounded border bg-white p-4"><p class="font-bold">{{ schoolClass.name }}</p><p class="text-xs text-slate-500">{{ schoolClass.track }}</p></div></div>
        <div v-if="activeMenu === 'Schüler'" class="rounded border bg-white p-5"><input v-model="studentFilter" class="mb-4 w-full rounded border px-3 py-2" placeholder="Schüler suchen"/><table class="w-full text-sm"><thead><tr><th>Schüler</th><th>Klasse</th><th>Richtung</th></tr></thead><tbody><tr v-for="student in visibleStudents" :key="student.id" class="border-b"><td class="py-3 font-bold">{{ student.name }}</td><td>{{ student.className }}</td><td>{{ student.trackCode }}</td></tr></tbody></table></div>
        <div v-if="activeMenu === 'Unterricht'" class="grid gap-3 md:grid-cols-3"><div v-for="subject in subjects" :key="subject.id" class="rounded border bg-white p-4"><p class="font-bold">{{ subject.name }}</p><p class="text-xs text-slate-500">{{ subject.shortName }}</p></div></div>
        <div v-if="activeMenu === 'Logs'" class="rounded border bg-white p-5"><div v-for="log in logs" :key="log.id" class="mb-2 rounded bg-slate-50 p-3 text-sm">{{ log.created_at }} · {{ log.source }} · {{ log.message }}</div></div>
        <div v-if="activeMenu === 'Vergleiche'" class="rounded border bg-white p-5"><div v-for="change in changes" :key="change.id" class="mb-2 rounded bg-slate-50 p-3 text-sm">{{ change.entity_type }} {{ change.entity_id }} – {{ change.change_type }}</div></div>
      </main></div>
    </template>

    <div v-if="absenceOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createAbsence" class="w-full max-w-lg space-y-3 rounded bg-white p-5"><h2 class="font-bold">Neue Fehlzeit</h2><input name="studentName" required class="w-full rounded border px-3 py-2" placeholder="Schülername"/><input name="className" required class="w-full rounded border px-3 py-2" placeholder="Klasse"/><input name="date" type="date" value="2026-11-23" class="w-full rounded border px-3 py-2"/><input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund"/><input name="status" type="hidden" value="UNCONFIRMED"/><button class="rounded bg-orange-600 px-4 py-2 text-white">Speichern</button></form></div>
    <div v-if="lessonOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createLesson" class="w-full max-w-lg space-y-3 rounded bg-white p-5"><h2 class="font-bold">Neue Stunde</h2><select name="subjectId" class="w-full rounded border px-3 py-2"><option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option></select><select name="classGroupId" class="w-full rounded border px-3 py-2"><option v-for="schoolClass in classes" :key="schoolClass.id" :value="schoolClass.id">{{ schoolClass.name }}</option></select><select name="roomId" class="w-full rounded border px-3 py-2"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option></select><select name="timeSlotId" class="w-full rounded border px-3 py-2"><option value="ts_monday_1">Montag 08:00</option></select><input name="teacherId" type="hidden" value="user_teacher_1"/><button class="rounded bg-orange-600 px-4 py-2 text-white">Speichern</button></form></div>
    <div v-if="moodleOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form @submit.prevent="createMoodleAbsence" class="w-full max-w-lg space-y-3 rounded bg-white p-5"><h2 class="font-bold">Fehlzeit in Moodle erfassen</h2><input name="student_name" required class="w-full rounded border px-3 py-2" placeholder="Schülername"/><input name="class_name" required class="w-full rounded border px-3 py-2" placeholder="Klasse"/><input name="date" type="date" value="2026-11-23" class="w-full rounded border px-3 py-2"/><input name="reason" required class="w-full rounded border px-3 py-2" placeholder="Grund"/><button class="rounded bg-sky-600 px-4 py-2 text-white">Speichern</button></form></div>
  </div>
</template>
