<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\SyncLog;
use App\Models\SyncChange;
use App\Models\MoodleAbsence;

class SyncHubController extends Controller
{
    private function mockUrl(string $path): string
    {
        return rtrim(env('MOCK_API_URL', 'http://localhost:8000'), '/') . '/' . ltrim($path, '/');
    }

    private function getMock(string $path, array $query = []): array
    {
        $response = Http::timeout(10)->get($this->mockUrl($path), $query);
        $response->throw();
        return $response->json() ?? [];
    }

    public function dashboard(): array
    {
        return $this->getMock('/api/dashboard-stats');
    }

    public function timetable(Request $request): array
    {
        $query = $request->only(['classId', 'teacherId', 'roomId']);
        return $this->getMock('/api/timetable', array_filter($query));
    }

    public function students(Request $request): array
    {
        $query = $request->only(['classId', 'trackCode', 'search']);
        return $this->getMock('/api/students', array_filter($query));
    }

    public function classes(): array
    {
        return $this->getMock('/api/classes');
    }

    public function subjects(): array
    {
        return $this->getMock('/api/subjects');
    }

    public function rooms(): array
    {
        return $this->getMock('/api/rooms');
    }

    public function absences(): array
    {
        return $this->getMock('/api/absences');
    }

    public function createAbsence(Request $request): array
    {
        $validated = $request->validate([
            'studentName' => ['required', 'string', 'max:150'],
            'className' => ['required', 'string', 'max:50'],
            'date' => ['nullable', 'date'],
            'reason' => ['required', 'string', 'max:255'],
            'status' => ['nullable', 'in:UNCONFIRMED,CONFIRMED,EXCUSED'],
        ]);

        $response = Http::timeout(10)->post($this->mockUrl('/api/absences'), $validated);
        $response->throw();
        $created = $response->json() ?? [];

        $log = SyncLog::create(['direction' => 'hub_to_mock', 'source' => 'vue', 'status' => 'synced', 'changes' => 1, 'message' => 'Fehlzeit erstellt']);
        SyncChange::create(['sync_log_id' => $log->id, 'entity_type' => 'absence', 'entity_id' => (string) ($created['id'] ?? ''), 'change_type' => 'created', 'after' => $created]);
        return $created;
    }

    public function createLesson(Request $request): array
    {
        $validated = $request->validate([
            'subjectId' => ['required', 'string'],
            'teacherId' => ['nullable', 'string'],
            'roomId' => ['required', 'string'],
            'classGroupId' => ['required', 'string'],
            'timeSlotId' => ['required', 'string'],
        ]);

        $response = Http::timeout(10)->post($this->mockUrl('/api/timetable/admin/lessons'), $validated);
        $response->throw();
        $created = $response->json() ?? [];

        $log = SyncLog::create(['direction' => 'hub_to_mock', 'source' => 'vue', 'status' => 'synced', 'changes' => 1, 'message' => 'Stunde erstellt']);
        SyncChange::create(['sync_log_id' => $log->id, 'entity_type' => 'lesson', 'entity_id' => (string) ($created['id'] ?? ''), 'change_type' => 'created', 'after' => $created]);
        return $created;
    }

    public function sync(): array
    {
        $dashboard = $this->getMock('/api/dashboard-stats');
        $timetable = $this->getMock('/api/timetable');
        $students = $this->getMock('/api/students');
        $absences = $this->getMock('/api/absences');

        $state = [
            'status' => 'synced',
            'last_sync' => now()->toIso8601String(),
            'source' => 'mock',
            'counts' => [
                'students' => $students['total'] ?? 0,
                'lessons' => count($timetable['lessons'] ?? []),
                'absences' => count($absences),
                'classes' => $dashboard['stats']['totalClasses'] ?? 0,
            ],
        ];

        cache()->put('sync_hub_status', $state, now()->addHour());

        $previous = cache()->get('sync_hub_snapshot');
        $currentAbsences = collect($absences)->keyBy(fn ($item) => (string) ($item['id'] ?? ''))->map(fn ($item) => $item)->all();
        $currentLessons = collect($timetable['lessons'] ?? [])->keyBy(fn ($item) => (string) ($item['id'] ?? ''))->map(fn ($item) => $item)->all();

        $changeLog = null;
        $changeCount = 0;

        if (is_array($previous)) {
            $previousAbsences = $previous['absences'] ?? [];
            $previousLessons = $previous['lessons'] ?? [];
            $changeLog = SyncLog::create([
                'direction' => 'mock_to_hub', 'source' => 'mock', 'status' => 'synced',
                'students' => $state['counts']['students'], 'classes' => $state['counts']['classes'],
                'lessons' => $state['counts']['lessons'], 'absences' => $state['counts']['absences'],
                'changes' => 0, 'message' => 'Delta-Synchronisation',
            ]);

            foreach (array_merge(array_diff(array_keys($previousAbsences), array_keys($currentAbsences)), array_diff(array_keys($currentAbsences), array_keys($previousAbsences)), array_keys(array_intersect_key($currentAbsences, $previousAbsences))) as $id) {
                $before = $previousAbsences[$id] ?? null;
                $after = $currentAbsences[$id] ?? null;
                $type = $before === null ? 'created' : ($after === null ? 'deleted' : 'updated');
                if ($type === 'updated' && $before === $after) continue;
                SyncChange::create(['sync_log_id' => $changeLog->id, 'entity_type' => 'absence', 'entity_id' => $id, 'change_type' => $type, 'before' => $before, 'after' => $after]);
                $changeCount++;
            }

            foreach (array_merge(array_diff(array_keys($previousLessons), array_keys($currentLessons)), array_diff(array_keys($currentLessons), array_keys($previousLessons)), array_keys(array_intersect_key($currentLessons, $previousLessons))) as $id) {
                $before = $previousLessons[$id] ?? null;
                $after = $currentLessons[$id] ?? null;
                $type = $before === null ? 'created' : ($after === null ? 'deleted' : 'updated');
                if ($type === 'updated' && $before === $after) continue;
                SyncChange::create(['sync_log_id' => $changeLog->id, 'entity_type' => 'lesson', 'entity_id' => $id, 'change_type' => $type, 'before' => $before, 'after' => $after]);
                $changeCount++;
            }

            $changeLog->update(['changes' => $changeCount]);
        } else {
            SyncLog::create([
                'direction' => 'mock_to_hub', 'source' => 'mock', 'status' => 'synced',
                'students' => $state['counts']['students'], 'classes' => $state['counts']['classes'],
                'lessons' => $state['counts']['lessons'], 'absences' => $state['counts']['absences'],
                'changes' => 0, 'message' => 'Initialer Synchronisationslauf: Basis-Snapshot erstellt',
            ]);
        }

        cache()->put('sync_hub_snapshot', ['absences' => $currentAbsences, 'lessons' => $currentLessons], now()->addDay());
        $state['changes'] = $changeCount;
        cache()->put('sync_hub_status', $state, now()->addHour());
        $state['changes'] = $changeCount;

        return ['status' => 'success', 'message' => 'Delta-Sync erfolgreich abgeschlossen', 'sync' => $state];
    }

    public function status(): array
    {
        return cache()->get('sync_hub_status', [
            'status' => 'idle',
            'last_sync' => null,
            'counts' => [],
            'source' => 'mock',
        ]);
    }

    public function logs(): array
    {
        return SyncLog::withCount('changes')->latest()->limit(100)->get()->toArray();
    }

    public function changes(): array
    {
        return SyncChange::with('log')->latest()->limit(200)->get()->toArray();
    }

    public function updateAbsence(Request $request, string $id): array
    {
        $before = collect($this->getMock('/api/absences'))->firstWhere('id', (int) $id);
        $response = Http::timeout(10)->put($this->mockUrl("/api/absences/$id"), $request->all());
        $response->throw();
        $after = $response->json() ?? [];
        $log = SyncLog::create(['direction' => 'hub_to_mock', 'source' => 'vue', 'status' => 'synced', 'changes' => 1, 'message' => 'Fehlzeit geändert']);
        SyncChange::create(['sync_log_id' => $log->id, 'entity_type' => 'absence', 'entity_id' => $id, 'change_type' => 'updated', 'before' => $before, 'after' => $after]);
        return $after;
    }

    public function deleteAbsence(string $id): array
    {
        $before = collect($this->getMock('/api/absences'))->firstWhere('id', (int) $id);
        $response = Http::timeout(10)->delete($this->mockUrl("/api/absences/$id"));
        $response->throw();
        $removed = $response->json() ?? $before;
        $log = SyncLog::create(['direction' => 'hub_to_mock', 'source' => 'vue', 'status' => 'synced', 'changes' => 1, 'message' => 'Fehlzeit gelöscht']);
        SyncChange::create(['sync_log_id' => $log->id, 'entity_type' => 'absence', 'entity_id' => $id, 'change_type' => 'deleted', 'before' => $before, 'after' => null]);
        return $removed;
    }

    public function updateLesson(Request $request, string $id): array
    {
        $before = collect($this->getMock('/api/timetable')['lessons'] ?? [])->firstWhere('id', $id);
        $response = Http::timeout(10)->put($this->mockUrl("/api/timetable/admin/lessons/$id"), $request->all());
        $response->throw();
        $after = $response->json() ?? [];
        $log = SyncLog::create(['direction' => 'hub_to_mock', 'source' => 'vue', 'status' => 'synced', 'changes' => 1, 'message' => 'Stunde geändert']);
        SyncChange::create(['sync_log_id' => $log->id, 'entity_type' => 'lesson', 'entity_id' => $id, 'change_type' => 'updated', 'before' => $before, 'after' => $after]);
        return $after;
    }

    public function deleteLesson(string $id): array
    {
        $before = collect($this->getMock('/api/timetable')['lessons'] ?? [])->firstWhere('id', $id);
        $response = Http::timeout(10)->delete($this->mockUrl("/api/timetable/admin/lessons/$id"));
        $response->throw();
        $removed = $response->json() ?? $before;
        $log = SyncLog::create(['direction' => 'hub_to_mock', 'source' => 'vue', 'status' => 'synced', 'changes' => 1, 'message' => 'Stunde gelöscht']);
        SyncChange::create(['sync_log_id' => $log->id, 'entity_type' => 'lesson', 'entity_id' => $id, 'change_type' => 'deleted', 'before' => $before, 'after' => null]);
        return $removed;
    }

    public function moodleAbsences(): array
    {
        return MoodleAbsence::latest()->get()->toArray();
    }

    public function createMoodleAbsence(Request $request): array
    {
        $validated = $request->validate([
            'student_name' => ['required', 'string', 'max:150'],
            'class_name' => ['required', 'string', 'max:50'],
            'date' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:255'],
            'status' => ['nullable', 'in:UNCONFIRMED,CONFIRMED,EXCUSED'],
        ]);

        $validated['status'] = $validated['status'] ?? 'UNCONFIRMED';
        $absence = MoodleAbsence::create($validated);

        $log = SyncLog::create([
            'direction' => 'moodle_to_hub', 'source' => 'moodle', 'status' => 'synced',
            'changes' => 1, 'message' => 'Fehlzeit in Moodle erstellt',
        ]);
        SyncChange::create([
            'sync_log_id' => $log->id, 'entity_type' => 'moodle_absence',
            'entity_id' => (string) $absence->id, 'change_type' => 'created', 'after' => $absence->toArray(),
        ]);

        return $absence->toArray();
    }

    public function systemComparison(): array
    {
        $webuntisAbsences = collect($this->getMock('/api/absences'));
        $moodleAbsences = MoodleAbsence::all();

        $webuntisByName = $webuntisAbsences->keyBy(fn ($item) => strtolower($item['studentName'] ?? '') . '|' . ($item['date'] ?? ''));
        $moodleByName = $moodleAbsences->keyBy(fn ($item) => strtolower($item->student_name) . '|' . $item->date->format('Y-m-d'));

        $onlyInWebUntis = $webuntisAbsences->filter(fn ($item) => !$moodleByName->has(strtolower($item['studentName'] ?? '') . '|' . ($item['date'] ?? '')))->values();
        $onlyInMoodle = $moodleAbsences->filter(fn ($item) => !$webuntisByName->has(strtolower($item->student_name) . '|' . $item->date->format('Y-m-d')))->values();

        $statusDifferences = collect();
        $matchingRecords = collect();

        foreach ($webuntisByName as $key => $webuntisAbsence) {
            if (!$moodleByName->has($key)) {
                continue;
            }

            $moodleAbsence = $moodleByName->get($key);
            $webuntisStatus = strtoupper((string) ($webuntisAbsence['status'] ?? 'UNCONFIRMED'));
            $moodleStatus = strtoupper((string) ($moodleAbsence->status ?? 'UNCONFIRMED'));

            $record = [
                'key' => $key,
                'student_name' => $webuntisAbsence['studentName'] ?? $moodleAbsence->student_name,
                'class_name' => $webuntisAbsence['className'] ?? $moodleAbsence->class_name,
                'date' => $webuntisAbsence['date'] ?? $moodleAbsence->date->format('Y-m-d'),
                'webuntis_status' => $webuntisStatus,
                'moodle_status' => $moodleStatus,
            ];

            if ($webuntisStatus === $moodleStatus) {
                $matchingRecords->push($record);
            } else {
                $statusDifferences->push($record);
            }
        }

        return [
            'only_in_webuntis' => $onlyInWebUntis,
            'only_in_moodle' => $onlyInMoodle,
            'status_differences' => $statusDifferences->values(),
            'matching_records' => $matchingRecords->values(),
            'webuntis_count' => $webuntisAbsences->count(),
            'moodle_count' => $moodleAbsences->count(),
            'matching_count' => $matchingRecords->count(),
            'status_difference_count' => $statusDifferences->count(),
        ];
    }

    public function seating(string $className): array
    {
        $response = Http::timeout(10)->get($this->mockUrl('/api/seating/' . urlencode($className)));
        $response->throw();
        return $response->json() ?? [];
    }

    public function updateSeating(Request $request, string $className): array
    {
        $validated = $request->validate(['seats' => ['required', 'array']]);
        $response = Http::timeout(10)->put($this->mockUrl('/api/seating/' . urlencode($className)), $validated);
        $response->throw();
        return $response->json() ?? [];
    }

    public function updateStudentPhoto(Request $request, string $id): array
    {
        $validated = $request->validate(['photoUrl' => ['nullable', 'string', 'max:1000000']]);
        $response = Http::timeout(10)->put($this->mockUrl('/api/students/' . urlencode($id) . '/photo'), $validated);
        $response->throw();
        return $response->json() ?? [];
    }
}
