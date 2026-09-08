<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('slides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('slider_id')->constrained()->cascadeOnDelete();

            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->text('body')->nullable();

            $table->string('image_path');
            $table->string('mobile_image_path')->nullable();
            $table->string('image_alt')->nullable();

            $table->string('cta_label')->nullable();
            $table->string('cta_url')->nullable();
            $table->boolean('cta_new_tab')->default(false);

            $table->string('text_position', 10)->default('left');
            $table->unsignedTinyInteger('overlay_opacity')->default(40);

            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            // Scheduled campaign slides.
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();

            $table->timestamps();

            // Composite lookup pattern for the ordered public read (plan.md §3.6 #5).
            $table->index(['slider_id', 'sort_order']);
            $table->index(['is_active', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('slides');
    }
};
