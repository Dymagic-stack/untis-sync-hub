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
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('direction')->default('mock_to_hub');
            $table->string('source')->default('mock');
            $table->string('status')->default('running');
            $table->unsignedInteger('students')->default(0);
            $table->unsignedInteger('classes')->default(0);
            $table->unsignedInteger('lessons')->default(0);
            $table->unsignedInteger('absences')->default(0);
            $table->unsignedInteger('changes')->default(0);
            $table->text('message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
