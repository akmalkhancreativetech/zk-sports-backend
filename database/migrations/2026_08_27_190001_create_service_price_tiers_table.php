<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_price_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('min_qty');
            // Null means "and above"; only valid on the highest tier.
            $table->unsignedInteger('max_qty')->nullable();
            $table->decimal('unit_price', 12, 2);
            $table->timestamps();

            $table->index(['service_id', 'min_qty']);
        });

        Schema::table('services', function (Blueprint $table) {
            $table->unsignedInteger('min_order_quantity')->nullable()->after('price_unit');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('min_order_quantity');
        });

        Schema::dropIfExists('service_price_tiers');
    }
};
