<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sliders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // How the public site fetches a slider, e.g. `home_hero`.
            $table->string('key')->unique();
            $table->boolean('is_active')->default(true);
            $table->boolean('autoplay')->default(true);
            $table->unsignedInteger('interval_ms')->default(5000);
            // string + PHP enum cast, never a MySQL enum (plan.md §3.6 #1).
            $table->string('transition', 20)->default('slide');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sliders');
    }
};
