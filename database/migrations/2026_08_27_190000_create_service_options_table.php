<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // string + PHP enum cast, never a MySQL enum (plan.md §3.6 #1).
            $table->string('type', 20)->default('select');
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['service_id', 'sort_order']);
        });

        Schema::create('service_option_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_option_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            // Signed: a value may discount as well as add.
            $table->decimal('price_delta', 12, 2)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['service_option_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_option_values');
        Schema::dropIfExists('service_options');
    }
};
