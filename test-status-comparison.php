<?php
$webuntisUrl = 'http://localhost:8000/api/absences';
$webuntis = json_decode(file_get_contents($webuntisUrl), true);

if (!is_array($webuntis) || count($webuntis) === 0) {
    fwrite(STDERR, "Keine WebUntis-Daten vorhanden\n");
    exit(1);
}

$student = $webuntis[0]['studentName'] ?? 'Status Testschüler';
$date = $webuntis[0]['date'] ?? '2026-11-23';

$ch = curl_init('http://127.0.0.1:8080/api/sync-hub/moodle/absences');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'student_name' => $student,
        'class_name' => $webuntis[0]['className'] ?? 'FS1A',
        'date' => $date,
        'reason' => 'Statusvergleich-Test',
        'status' => 'EXCUSED',
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);

echo curl_exec($ch);
curl_close($ch);
