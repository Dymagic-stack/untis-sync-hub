<?php

namespace Database\Seeders;

use App\Models\MoodleAbsence;
use Illuminate\Database\Seeder;

class DemoAbsenceSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Wenn bereits ausreichend Demo-Daten vorhanden sind, nicht erneut schreiben.
        if (MoodleAbsence::count() >= 80) {
            return;
        }

        MoodleAbsence::query()->delete();

        $students = [
            ['name' => 'Leon Becker', 'class' => 'FIA25A'],
            ['name' => 'Mira Fischer', 'class' => 'FIA25A'],
            ['name' => 'Jonas Weber', 'class' => 'FIA25A'],
            ['name' => 'Emma Keller', 'class' => 'FIA25A'],
            ['name' => 'Noah Schmidt', 'class' => 'FIA25A'],
            ['name' => 'Lina Wagner', 'class' => 'FIA25A'],
            ['name' => 'Paul Hoffmann', 'class' => 'FIA25A'],
            ['name' => 'Sophie Braun', 'class' => 'FIA25A'],
            ['name' => 'Felix Bauer', 'class' => 'FIA25A'],
            ['name' => 'Nele Richter', 'class' => 'FIA25A'],
            ['name' => 'Tom Klein', 'class' => 'FIA25A'],
            ['name' => 'Anna Wolf', 'class' => 'FIA25A'],
            ['name' => 'Luis Neumann', 'class' => 'FIS25B'],
            ['name' => 'Clara Schwarz', 'class' => 'FIS25B'],
            ['name' => 'Elias Zimmermann', 'class' => 'FIS25B'],
            ['name' => 'Mia Hartmann', 'class' => 'FIS25B'],
            ['name' => 'Ben Krüger', 'class' => 'FIS25B'],
            ['name' => 'Julia Lange', 'class' => 'FIS25B'],
            ['name' => 'Max König', 'class' => 'FIS25B'],
            ['name' => 'Lea Werner', 'class' => 'FIS25B'],
            ['name' => 'Finn Krause', 'class' => 'FIS25B'],
            ['name' => 'Emma Schulz', 'class' => 'FIS25B'],
            ['name' => 'Oskar Peters', 'class' => 'FIS25B'],
            ['name' => 'Zoe Meyer', 'class' => 'FIS25B'],
        ];

        $statuses = ['UNCONFIRMED', 'CONFIRMED', 'EXCUSED'];
        $reasons = ['Krankheit', 'Arzttermin', 'ÖPNV-Ausfall', 'Familientermin', 'Prüfungsvorbereitung'];
        $rows = [];

        // 40 Datensätze: in beiden Systemen, gleicher Status.
        for ($i = 0; $i < 40; $i++) {
            $student = $students[$i % count($students)];
            $rows[] = [
                'external_id' => 'demo-match-' . ($i + 1),
                'student_name' => $student['name'],
                'class_name' => $student['class'],
                'date' => sprintf('2026-11-%02d', ($i % 28) + 1),
                'reason' => $reasons[$i % count($reasons)],
                'status' => $statuses[$i % count($statuses)],
                'synced_to_webuntis' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // 25 Datensätze: in beiden Systemen, aber anderer Status als WebUntis.
        for ($i = 0; $i < 25; $i++) {
            $student = $students[($i + 7) % count($students)];
            $rows[] = [
                'external_id' => 'demo-diff-' . ($i + 1),
                'student_name' => $student['name'],
                'class_name' => $student['class'],
                'date' => sprintf('2026-12-%02d', ($i % 20) + 1),
                'reason' => $reasons[($i + 1) % count($reasons)],
                'status' => $statuses[($i + 1) % count($statuses)],
                'synced_to_webuntis' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // 20 Datensätze: nur in Moodle.
        for ($i = 0; $i < 20; $i++) {
            $student = $students[($i + 17) % count($students)];
            $rows[] = [
                'external_id' => 'demo-moodle-only-' . ($i + 1),
                'student_name' => $student['name'],
                'class_name' => $student['class'],
                'date' => sprintf('2026-09-%02d', ($i % 20) + 1),
                'reason' => $reasons[($i + 2) % count($reasons)],
                'status' => $statuses[$i % count($statuses)],
                'synced_to_webuntis' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        MoodleAbsence::insert($rows);
    }
}
