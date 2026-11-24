<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('moodle_absences', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->nullable();
            $table->string('student_name');
            $table->string('class_name');
            $table->date('date');
            $table->string('reason');
            $table->string('status')->default('UNCONFIRMED');
            $table->boolean('synced_to_webuntis')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moodle_absences');
    }
};
