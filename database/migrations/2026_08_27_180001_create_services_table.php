<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            // Flat category, not a self-referencing parent_id (plan.md §5.1).
            $table->foreignId('category_id')
                ->nullable()
                ->constrained('service_categories')
                ->nullOnDelete();

            $table->string('title');
            $table->string('slug')->unique();
            $table->string('excerpt', 300)->nullable();
            $table->longText('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('featured_image')->nullable();

            $table->decimal('price_from', 12, 2)->nullable();
            $table->string('price_unit')->nullable();

            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);

            $table->string('meta_title')->nullable();
            $table->string('meta_description', 320)->nullable();
            $table->string('og_image')->nullable();

            $table->timestamps();
            // Order line items reference services; never hard-delete.
            $table->softDeletes();

            $table->index(['category_id', 'sort_order']);
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
