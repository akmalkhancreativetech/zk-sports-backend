<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // Null `from_status` marks the row's creation, so a timeline can be
            // rendered without special-casing the first entry.
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);

            // Null when the actor is gone, or when the change was not a person.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('note')->nullable();

            // Append-only: a history row is never edited, so `updated_at` would
            // always equal `created_at`.
            $table->timestamp('created_at')->useCurrent();

            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_histories');
    }
};
