<?php
$ch = curl_init('http://127.0.0.1:8080/api/sync-hub/moodle/absences');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'student_name' => 'Moodle PHP Test',
        'class_name' => 'FS1A',
        'date' => '2026-11-23',
        'reason' => 'Moodle-Testgrund',
        'status' => 'UNCONFIRMED',
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
echo curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
fwrite(STDERR, "\nHTTP $httpCode\n");
